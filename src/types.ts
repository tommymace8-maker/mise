/**
 * Shared types. These mirror migrations/0001_init.sql exactly — if you change
 * one, change the other in the same commit.
 */

export type Mode = "cook" | "bake";

export type SourceType =
  | "tiktok"
  | "pinterest"
  | "youtube"
  | "instagram"
  | "cookbook"
  | "other";

export type RecipeStatus =
  | "cold"
  | "active"
  | "unparsed"
  | "dismissed"
  | "retired";

export type CookContext = "solo" | "pair" | "hosting";

export type CookedBy = "Tommy" | "Jill";

/** ingredients_json element shape (spec §8). */
export interface Ingredient {
  item: string;
  qty: string | null;
  unit: string | null;
  /** Parser-inferred rather than present in the source. Always false on manual entry. */
  inferred: boolean;
}

/** steps_json element shape (spec §8). */
export interface Step {
  text: string;
  temp_f: number | null;
  time_min: number | null;
  inferred: boolean;
}

/** A recipes row, with JSON columns already parsed. */
export interface Recipe {
  id: string;
  mode: Mode;

  source_type: SourceType | null;
  source_url: string | null;
  creator_handle: string | null;

  title: string;

  thumbnail_r2_key: string | null;
  screenshot_r2_keys: string[];

  raw_caption: string | null;
  capture_note: string | null;

  ingredients: Ingredient[];
  steps: Step[];

  pan_size: string | null;
  active_min: number | null;
  total_min: number | null;
  equipment: string[];

  cuisine: string | null;
  protein: string | null;
  method: string | null;

  cluster_id: string | null;
  parent_recipe_id: string | null;
  is_my_version: boolean;

  status: RecipeStatus;

  saved_at: string;
  last_cooked_at: string | null;
}

/** What the manual entry form sends. The server fills in ids and timestamps. */
export interface NewRecipeInput {
  mode: Mode;
  title: string;

  source_type?: SourceType | null;
  source_url?: string | null;
  creator_handle?: string | null;

  ingredients: Ingredient[];
  steps: Step[];

  pan_size?: string | null;
  active_min?: number | null;
  total_min?: number | null;
  equipment?: string[];

  cuisine?: string | null;
  protein?: string | null;
  method?: string | null;

  raw_caption?: string | null;
  capture_note?: string | null;
}

/** A cooks row. Nothing in Session 1 writes one; the type exists because the
 *  schema does, and the migration is final. */
export interface Cook {
  id: string;
  recipe_id: string;
  cooked_by: CookedBy | null;
  context: CookContext | null;
  started_at: string;
  scored_at: string | null;
  again: number | null;
  taste: number | null;
  effort: number | null;
  came_out_right: boolean | null;
  modifications: string | null;
  notes: string | null;
  photo_r2_key: string | null;
}
