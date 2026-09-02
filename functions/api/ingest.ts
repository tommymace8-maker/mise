/// <reference types="@cloudflare/workers-types" />

import { type Env, json, str } from "./_shared";
import { parseRecipe } from "../lib/parser";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let result = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(result);
}

/**
 * POST /api/ingest
 *
 * Accepts multipart/form-data:
 *   images[]  — one or more image files (JPEG/PNG/WEBP/GIF)
 *   note      — optional dictated note
 *   source_url — optional source URL
 *
 * Uploads images to R2, calls the parser, writes to D1.
 * Returns 201 + recipe on success, 200 + { status: 'unparsed' } if the
 * parser can't find a recipe, 400 on bad input.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected multipart/form-data" }, 400);
  }

  const note = str(form.get("note"));
  const sourceUrl = str(form.get("source_url"));

  // Collect image files
  const imageEntries = form.getAll("images[]");
  const files: File[] = imageEntries.filter((e): e is File => e instanceof File);

  if (files.length === 0) {
    return json({ error: "At least one image is required" }, 400);
  }

  const recipeId = crypto.randomUUID();
  const savedAt = new Date().toISOString();

  // Upload to R2 and build parser input in one pass
  const r2Keys: string[] = [];
  const parserImages: { data: string; mediaType: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const mediaType = ALLOWED_TYPES[file.type] ?? "image/jpeg";
    const buffer = await file.arrayBuffer();

    const key = `screenshots/${recipeId}/${i}.jpg`;
    await env.MEDIA.put(key, buffer, { httpMetadata: { contentType: mediaType } });
    r2Keys.push(key);

    parserImages.push({ data: toBase64(buffer), mediaType });
  }

  // Parse
  const parsed = await parseRecipe(
    {
      images: parserImages,
      capture_note: note ?? undefined,
    },
    env.ANTHROPIC_API_KEY,
  );

  const screenshotKeysJson = JSON.stringify(r2Keys);

  if (parsed.status === "unparsed") {
    // Store the screenshots so the item is searchable; never surface it.
    await env.DB.prepare(
      `INSERT INTO recipes (
         id, mode, source_type, source_url, creator_handle, title,
         thumbnail_r2_key, screenshot_r2_keys_json, raw_caption, capture_note,
         ingredients_json, steps_json,
         pan_size, active_min, total_min, equipment_json,
         cuisine, protein, method,
         cluster_id, parent_recipe_id, is_my_version, status,
         saved_at, last_cooked_at
       ) VALUES (
         ?1, 'cook', NULL, ?2, NULL, '',
         NULL, ?3, NULL, ?4,
         '[]', '[]',
         NULL, NULL, NULL, NULL,
         NULL, NULL, NULL,
         NULL, NULL, 0, 'unparsed',
         ?5, NULL
       )`,
    )
      .bind(recipeId, sourceUrl, screenshotKeysJson, note, savedAt)
      .run();

    return json({ status: "unparsed" }, 200);
  }

  // Save the full recipe
  await env.DB.prepare(
    `INSERT INTO recipes (
       id, mode, source_type, source_url, creator_handle, title,
       thumbnail_r2_key, screenshot_r2_keys_json, raw_caption, capture_note,
       ingredients_json, steps_json,
       pan_size, active_min, total_min, equipment_json,
       cuisine, protein, method,
       cluster_id, parent_recipe_id, is_my_version, status,
       saved_at, last_cooked_at
     ) VALUES (
       ?1, ?2, NULL, ?3, NULL, ?4,
       NULL, ?5, NULL, ?6,
       ?7, ?8,
       ?9, ?10, ?11, NULL,
       ?12, ?13, ?14,
       NULL, NULL, 0, 'cold',
       ?15, NULL
     )`,
  )
    .bind(
      recipeId,
      parsed.mode,
      sourceUrl,
      parsed.title,
      screenshotKeysJson,
      note,
      JSON.stringify(parsed.ingredients),
      JSON.stringify(parsed.steps),
      parsed.pan_size,
      parsed.active_min,
      parsed.total_min,
      parsed.cuisine,
      parsed.protein,
      parsed.method,
      savedAt,
    )
    .run();

  const row = await env.DB.prepare(`SELECT * FROM recipes WHERE id = ?1`)
    .bind(recipeId)
    .first();

  if (row === null) {
    return json({ error: "Recipe was written but could not be read back" }, 500);
  }

  return json({ status: "cold", recipe: row }, 201);
};
