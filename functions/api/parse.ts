/// <reference types="@cloudflare/workers-types" />

import { type Env, badRequest, json, str } from "./_shared";
import { parseRecipe } from "../lib/parser";

/**
 * POST /api/parse
 * Body: { text: string, capture_note?: string }
 * Returns: ParseOutput
 *
 * Hand-test endpoint for the Session 2 gate. Session 3's ingest function
 * calls parseRecipe() directly — not through this endpoint.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Body must be JSON");
  }
  if (typeof body !== "object" || body === null) {
    return badRequest("Body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  const text = str(b.text);
  if (text === null) return badRequest("text is required");

  try {
    const result = await parseRecipe(
      { text, capture_note: str(b.capture_note) ?? undefined },
      env.ANTHROPIC_API_KEY,
    );
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
};
