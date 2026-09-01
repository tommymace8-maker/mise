/// <reference types="@cloudflare/workers-types" />

import {
  type Env,
  badRequest,
  int,
  json,
  oneOf,
  parseJsonColumn,
  str,
} from "./_shared";
import type {
  Ingredient,
  Mode,
  Recipe,
  SourceType,
  Step,
} from "../../src/types";

const MODES = ["cook", "bake"] as const;
const SOURCE_TYPES = [
  "tiktok",
  "pinterest",
  "youtube",
  "instagram",
  "cookbook",
  "other",
] as const;

/** Raw shape of a recipes row as D1 returns it. */
interface RecipeRow {
  id: string;
  mode: Mode;
  source_type: SourceType | null;
  source_url: string | null;
  creator_handle: string | null;
  title: string;
  thumbnail_r2_key: string | null;
  screenshot_r2_keys_json: string | null;
  raw_caption: string | null;
  capture_note: string | null;
  ingredients_json: string;
  steps_json: string;
  pan_size: string | null;
  active_min: number | null;
  total_min: number | null;
  equipment_json: string | null;
  cuisine: string | null;
  protein: string | null;
  method: string | null;
  cluster_id: string | null;
  parent_recipe_id: string | null;
  is_my_version: number;
  status: Recipe["status"];
  saved_at: string;
  last_cooked_at: string | null;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    mode: row.mode,
    source_type: row.source_type,
    source_url: row.source_url,
    creator_handle: row.creator_handle,
    title: row.title,
    thumbnail_r2_key: row.thumbnail_r2_key,
    screenshot_r2_keys: parseJsonColumn<string[]>(row.screenshot_r2_keys_json, []),
    raw_caption: row.raw_caption,
    capture_note: row.capture_note,
    ingredients: parseJsonColumn<Ingredient[]>(row.ingredients_json, []),
    steps: parseJsonColumn<Step[]>(row.steps_json, []),
    pan_size: row.pan_size,
    active_min: row.active_min,
    total_min: row.total_min,
    equipment: parseJsonColumn<string[]>(row.equipment_json, []),
    cuisine: row.cuisine,
    protein: row.protein,
    method: row.method,
    cluster_id: row.cluster_id,
    parent_recipe_id: row.parent_recipe_id,
    is_my_version: row.is_my_version === 1,
    status: row.status,
    saved_at: row.saved_at,
    last_cooked_at: row.last_cooked_at,
  };
}

/**
 * GET /api/recipes
 * GET /api/recipes?mode=cook
 * GET /api/recipes?mode=bake
 *
 * Mode filter only. Everything else in the spec §7 filter list belongs to a
 * later session.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");

  let mode: Mode | null = null;
  if (modeParam !== null && modeParam !== "all") {
    mode = oneOf(modeParam, MODES);
    if (mode === null) {
      return badRequest("mode must be cook, bake, or all");
    }
  }

  // 'unparsed' and 'dismissed' items exist but are not browsable (spec §3d).
  const base = `
    SELECT * FROM recipes
    WHERE status NOT IN ('unparsed', 'dismissed')
  `;

  const stmt = mode
    ? env.DB.prepare(`${base} AND mode = ?1 ORDER BY saved_at DESC`).bind(mode)
    : env.DB.prepare(`${base} ORDER BY saved_at DESC`);

  const { results } = await stmt.all<RecipeRow>();
  return json({ recipes: results.map(rowToRecipe) });
};

/**
 * POST /api/recipes — manual entry.
 *
 * Manual entry never sets inferred: true. Inference is the parser's job and
 * arrives in Session 2.
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

  const mode = oneOf(b.mode, MODES);
  if (mode === null) return badRequest("mode must be cook or bake");

  const title = str(b.title);
  if (title === null) return badRequest("A recipe needs a title");

  // Ingredients
  const rawIngredients = Array.isArray(b.ingredients) ? b.ingredients : [];
  const ingredients: Ingredient[] = [];
  for (const raw of rawIngredients) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const item = str(r.item);
    if (item === null) continue; // drop blank rows the form left behind
    ingredients.push({
      item,
      qty: str(r.qty),
      unit: str(r.unit),
      inferred: false,
    });
  }

  // Steps
  const rawSteps = Array.isArray(b.steps) ? b.steps : [];
  const steps: Step[] = [];
  for (const raw of rawSteps) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const text = str(r.text);
    if (text === null) continue;
    steps.push({
      text,
      temp_f: int(r.temp_f),
      time_min: int(r.time_min),
      inferred: false,
    });
  }

  const equipment = Array.isArray(b.equipment)
    ? b.equipment.map(str).filter((s): s is string => s !== null)
    : [];

  const id = crypto.randomUUID();
  const savedAt = new Date().toISOString();

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
       ?1, ?2, ?3, ?4, ?5, ?6,
       NULL, NULL, ?7, ?8,
       ?9, ?10,
       ?11, ?12, ?13, ?14,
       ?15, ?16, ?17,
       NULL, NULL, 0, 'cold',
       ?18, NULL
     )`,
  )
    .bind(
      id,
      mode,
      oneOf(b.source_type, SOURCE_TYPES),
      str(b.source_url),
      str(b.creator_handle),
      title,
      str(b.raw_caption),
      str(b.capture_note),
      JSON.stringify(ingredients),
      JSON.stringify(steps),
      str(b.pan_size),
      int(b.active_min),
      int(b.total_min),
      equipment.length > 0 ? JSON.stringify(equipment) : null,
      str(b.cuisine),
      str(b.protein),
      str(b.method),
      savedAt,
    )
    .run();

  const row = await env.DB.prepare(`SELECT * FROM recipes WHERE id = ?1`)
    .bind(id)
    .first<RecipeRow>();

  if (row === null) {
    return json({ error: "Recipe was written but could not be read back" }, 500);
  }

  return json({ recipe: rowToRecipe(row) }, 201);
};
