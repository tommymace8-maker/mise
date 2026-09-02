#!/usr/bin/env node
/**
 * Pinterest backfill — reads the Pinterest data export HTML,
 * fetches each recipe page, parses via Anthropic API, writes to the app.
 *
 * Usage:
 *   node scripts/backfill-pinterest.mjs /path/to/pinterest/pins/0001.html
 *
 * Requires:
 *   - Dev server running at http://localhost:8788 (npm run pages:dev)
 *   - ANTHROPIC_API_KEY in .dev.vars (read from that file automatically)
 *   - Node 18+
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_URL = "http://localhost:8788";
const MODEL = "claude-sonnet-4-6";
const BATCH_SIZE = 3; // concurrent fetches
const DELAY_MS = 1000; // between batches

// ---------------------------------------------------------------------------
// Load API key from .dev.vars
// ---------------------------------------------------------------------------

function loadApiKey() {
  const devVarsPath = resolve(__dirname, "../.dev.vars");
  if (!existsSync(devVarsPath)) {
    throw new Error(".dev.vars not found — add ANTHROPIC_API_KEY=sk-ant-... to it");
  }
  const contents = readFileSync(devVarsPath, "utf8");
  const match = contents.match(/^ANTHROPIC_API_KEY=(.+)$/m);
  if (!match) throw new Error("ANTHROPIC_API_KEY not found in .dev.vars");
  return match[1].trim();
}

// ---------------------------------------------------------------------------
// Parse the Pinterest HTML export
// ---------------------------------------------------------------------------

function parsePinterestExport(html) {
  const pins = [];
  // Each pin block: pinterest URL, then details and canonical link
  const pinPattern =
    /<a href="(https:\/\/www\.pinterest\.com\/pin\/[^"]+)">[^<]+<\/a>\s*<br>\s*Title:\s*([^\n<]*)<br>\s*Details:\s*([^\n<]*)<br>[\s\S]*?Canonical Link:\s*(?:<a href="([^"]+)">[^<]+<\/a>|No data)/g;

  let m;
  while ((m = pinPattern.exec(html)) !== null) {
    const canonicalUrl = m[4] || null;
    if (!canonicalUrl) continue;

    const details = m[3].trim().replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

    pins.push({
      pinUrl: m[1].trim(),
      details: details === "No data" ? null : details,
      canonicalUrl,
    });
  }
  return pins;
}

// ---------------------------------------------------------------------------
// Fetch a recipe page and extract text
// ---------------------------------------------------------------------------

async function fetchRecipeText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; mise-backfill/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Try JSON-LD recipe schema first — many recipe sites have it
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const schemas = Array.isArray(data) ? data : [data];
      for (const schema of schemas) {
        const recipe = schema["@type"] === "Recipe" ? schema :
          (schema["@graph"] || []).find((n) => n["@type"] === "Recipe");
        if (recipe) {
          return extractFromJsonLd(recipe);
        }
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }

  // Fall back: strip HTML tags and take up to 4000 chars of body text
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return body.slice(0, 4000);
}

function extractFromJsonLd(recipe) {
  const parts = [];
  if (recipe.name) parts.push(`Title: ${recipe.name}`);
  if (recipe.description) parts.push(recipe.description);

  const ingredients = recipe.recipeIngredient || [];
  if (ingredients.length > 0) {
    parts.push("Ingredients:");
    parts.push(...ingredients.map((i) => `- ${i}`));
  }

  const instructions = recipe.recipeInstructions || [];
  if (instructions.length > 0) {
    parts.push("Instructions:");
    for (const step of instructions) {
      if (typeof step === "string") parts.push(step);
      else if (step.text) parts.push(step.text);
      else if (step["@type"] === "HowToSection") {
        for (const s of step.itemListElement || []) {
          if (s.text) parts.push(s.text);
        }
      }
    }
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Call Anthropic API (mirrors functions/lib/parser.ts)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a recipe parser. Given source text (a social media caption, recipe description, or web page content), extract a structured recipe.

Determine whether this is a COOK or BAKE recipe:
- Bake: precise measurements matter and wrong inferences ruin the result (bread, pastry, cake, cookies, anything with flour and leavening)
- Cook: everything else

COOK MODE rules:
- Infer any missing quantities, temperatures, times, or pan sizes that a reasonable home cook would use.
- Set inferred: true on every field you infer, false on every field stated in the source.

BAKE MODE rules:
- NEVER infer quantities. If a quantity is missing, set qty: null.
- Temperatures, times, and pan sizes that are stated explicitly: extract. If missing: leave null. Do NOT infer them.
- Set inferred: false on all fields. Bake mode never sets inferred: true.

If you cannot extract at least one ingredient AND at least one step, call save_parsed_recipe with empty arrays for both.

Call save_parsed_recipe with everything you extract.`;

const TOOL = {
  name: "save_parsed_recipe",
  description: "Save the parsed recipe structure.",
  input_schema: {
    type: "object",
    required: ["mode", "title", "ingredients", "steps"],
    properties: {
      mode: { type: "string", enum: ["cook", "bake"] },
      title: { type: "string" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          required: ["item", "qty", "unit", "inferred"],
          properties: {
            item: { type: "string" },
            qty: { type: ["string", "null"] },
            unit: { type: ["string", "null"] },
            inferred: { type: "boolean" },
          },
        },
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          required: ["text", "temp_f", "time_min", "inferred"],
          properties: {
            text: { type: "string" },
            temp_f: { type: ["number", "null"] },
            time_min: { type: ["number", "null"] },
            inferred: { type: "boolean" },
          },
        },
      },
      pan_size: { type: ["string", "null"] },
      active_min: { type: ["number", "null"] },
      total_min: { type: ["number", "null"] },
      cuisine: { type: ["string", "null"] },
      protein: { type: ["string", "null"] },
      method: { type: ["string", "null"] },
    },
  },
};

async function parseWithClaude(text, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: [{ type: "text", text }] }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const toolCall = data.content?.find(
    (b) => b.type === "tool_use" && b.name === "save_parsed_recipe"
  );
  if (!toolCall) return null;
  return toolCall.input;
}

// ---------------------------------------------------------------------------
// Write to app via POST /api/recipes
// ---------------------------------------------------------------------------

async function saveRecipe(parsed, sourceUrl, pinUrl) {
  const body = {
    mode: parsed.mode,
    title: parsed.title,
    source_type: "pinterest",
    source_url: sourceUrl,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    pan_size: parsed.pan_size ?? null,
    active_min: parsed.active_min ?? null,
    total_min: parsed.total_min ?? null,
    cuisine: parsed.cuisine ?? null,
    protein: parsed.protein ?? null,
    method: parsed.method ?? null,
  };

  const res = await fetch(`${APP_URL}/api/recipes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /api/recipes failed ${res.status}: ${text}`);
  }

  return await res.json();
}

// ---------------------------------------------------------------------------
// Process one pin
// ---------------------------------------------------------------------------

async function processPin(pin, apiKey, index, total) {
  const label = `[${index + 1}/${total}] ${pin.canonicalUrl}`;
  try {
    const text = await fetchRecipeText(pin.canonicalUrl);
    if (!text || text.length < 50) {
      console.log(`  SKIP  ${label} — page too short`);
      return { status: "skipped", url: pin.canonicalUrl };
    }

    const parsed = await parseWithClaude(text, apiKey);
    if (!parsed || parsed.ingredients.length === 0 || parsed.steps.length === 0) {
      console.log(`  UNPARSED  ${label}`);
      return { status: "unparsed", url: pin.canonicalUrl };
    }

    await saveRecipe(parsed, pin.canonicalUrl, pin.pinUrl);
    console.log(`  ✓  ${label} — "${parsed.title}" (${parsed.mode})`);
    return { status: "saved", url: pin.canonicalUrl, title: parsed.title, mode: parsed.mode };
  } catch (err) {
    console.log(`  ERROR  ${label} — ${err.message}`);
    return { status: "error", url: pin.canonicalUrl, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const htmlPath = process.argv[2] || "/Users/tommymace/Downloads/pinterest/pins/0001.html";

  if (!existsSync(htmlPath)) {
    console.error(`File not found: ${htmlPath}`);
    process.exit(1);
  }

  const apiKey = loadApiKey();
  const html = readFileSync(htmlPath, "utf8");
  const pins = parsePinterestExport(html);

  console.log(`Found ${pins.length} pins with recipe URLs`);
  console.log(`Processing in batches of ${BATCH_SIZE}...\n`);

  const results = { saved: 0, unparsed: 0, skipped: 0, error: 0 };

  for (let i = 0; i < pins.length; i += BATCH_SIZE) {
    const batch = pins.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((pin, j) => processPin(pin, apiKey, i + j, pins.length))
    );
    for (const r of batchResults) results[r.status] = (results[r.status] || 0) + 1;

    if (i + BATCH_SIZE < pins.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`
Done.
  Saved:    ${results.saved}
  Unparsed: ${results.unparsed}
  Skipped:  ${results.skipped}
  Errors:   ${results.error}
`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
