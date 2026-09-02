/// <reference types="@cloudflare/workers-types" />

import type { Ingredient, Mode, Step } from "../../src/types";

export interface ParseInput {
  text?: string;
  capture_note?: string;
  /** Session 3 fills this in. Typed now so the signature is stable. */
  images?: { data: string; mediaType: string }[];
}

export interface ParseOutput {
  status: "cold" | "unparsed";
  mode: Mode;
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  pan_size: string | null;
  active_min: number | null;
  total_min: number | null;
  cuisine: string | null;
  protein: string | null;
  method: string | null;
}

const SYSTEM_PROMPT = `You are a recipe parser. Given source text (a social media caption, recipe description, or dictated note), extract a structured recipe.

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

If you cannot extract at least one ingredient AND at least one step, call save_parsed_recipe with empty arrays for both — do not guess a recipe that isn't there.

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
} as const;

type ToolInput = {
  mode: Mode;
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  pan_size: string | null;
  active_min: number | null;
  total_min: number | null;
  cuisine: string | null;
  protein: string | null;
  method: string | null;
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export async function parseRecipe(
  input: ParseInput,
  apiKey: string,
): Promise<ParseOutput> {
  const parts: string[] = [];
  if (input.text) parts.push(input.text);
  if (input.capture_note) parts.push(`Note: ${input.capture_note}`);

  const content: ContentBlock[] = [];

  if (input.images && input.images.length > 0) {
    for (const img of input.images) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      });
    }
  }

  if (parts.length > 0) {
    content.push({ type: "text", text: parts.join("\n\n") });
  }

  if (content.length === 0) {
    return emptyUnparsed();
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; name: string; input: unknown }
    >;
  };

  const toolCall = data.content.find(
    (block) => block.type === "tool_use" && block.name === "save_parsed_recipe",
  );

  if (!toolCall || toolCall.type !== "tool_use") {
    return emptyUnparsed();
  }

  const parsed = toolCall.input as ToolInput;

  if (parsed.ingredients.length === 0 || parsed.steps.length === 0) {
    return emptyUnparsed();
  }

  return {
    status: "cold",
    mode: parsed.mode,
    title: parsed.title,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    pan_size: parsed.pan_size ?? null,
    active_min: parsed.active_min ?? null,
    total_min: parsed.total_min ?? null,
    cuisine: parsed.cuisine ?? null,
    protein: parsed.protein ?? null,
    method: parsed.method ?? null,
  };
}

function emptyUnparsed(): ParseOutput {
  return {
    status: "unparsed",
    mode: "cook",
    title: "",
    ingredients: [],
    steps: [],
    pan_size: null,
    active_min: null,
    total_min: null,
    cuisine: null,
    protein: null,
    method: null,
  };
}
