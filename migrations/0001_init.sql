-- mise — initial schema
-- Implements spec §8 in full. Nothing here is Session-1-only; the whole schema
-- lands now so later sessions never need a destructive migration.

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
CREATE TABLE recipes (
  id                   TEXT PRIMARY KEY,

  -- 'cook' | 'bake'. Drives parser behavior, scoring labels, and list filters.
  mode                 TEXT NOT NULL
                         CHECK (mode IN ('cook', 'bake')),

  source_type          TEXT
                         CHECK (source_type IN
                           ('tiktok','pinterest','youtube','instagram','cookbook','other')),
  source_url           TEXT,
  creator_handle       TEXT,

  title                TEXT NOT NULL,

  thumbnail_r2_key     TEXT,
  screenshot_r2_keys_json TEXT,          -- JSON array of R2 keys

  raw_caption          TEXT,             -- verbatim source caption
  capture_note         TEXT,             -- dictated note at capture time

  -- [{item, qty, unit, inferred}]
  ingredients_json     TEXT NOT NULL DEFAULT '[]',
  -- [{text, temp_f, time_min, inferred}]
  steps_json           TEXT NOT NULL DEFAULT '[]',

  pan_size             TEXT,
  active_min           INTEGER,
  total_min            INTEGER,
  equipment_json       TEXT,             -- JSON array of strings

  cuisine              TEXT,
  protein              TEXT,
  method               TEXT,

  -- Variants of the same dish share a cluster_id. NULL until clustering runs.
  cluster_id           TEXT,

  -- Set on "my version" rows; points at the immutable source recipe (spec §4).
  parent_recipe_id     TEXT
                         REFERENCES recipes(id) ON DELETE SET NULL,
  is_my_version        INTEGER NOT NULL DEFAULT 0
                         CHECK (is_my_version IN (0, 1)),

  status               TEXT NOT NULL DEFAULT 'cold'
                         CHECK (status IN
                           ('cold','active','unparsed','dismissed','retired')),

  saved_at             TEXT NOT NULL,    -- ISO 8601 UTC
  last_cooked_at       TEXT              -- denormalized on purpose (spec §8)
);

CREATE INDEX idx_recipes_mode           ON recipes (mode);
CREATE INDEX idx_recipes_status         ON recipes (status);
CREATE INDEX idx_recipes_cluster        ON recipes (cluster_id);
CREATE INDEX idx_recipes_parent         ON recipes (parent_recipe_id);
CREATE INDEX idx_recipes_saved_at       ON recipes (saved_at);
-- Tonight reads last_cooked_at on every load.
CREATE INDEX idx_recipes_last_cooked_at ON recipes (last_cooked_at);

-- ---------------------------------------------------------------------------
-- cooks
-- ---------------------------------------------------------------------------
-- NOTE ON `again`:
-- Spec §8 writes `again INT NOT NULL`, but spec §5 says a cooks row is created
-- when you tap "Cooking this", with null scores, and scored later. Those two
-- cannot both hold. `again` is nullable here so the pending-score flow in
-- Session 4 works; the "required" part of §5 is enforced in the UI at scoring
-- time, and `scored_at IS NOT NULL` is what marks a cook as scored.
-- Flagged for confirmation before Session 4.
--
-- recipe_id NOT NULL is locked by the kickoff doc: no improvised-meal logging.
CREATE TABLE cooks (
  id                   TEXT PRIMARY KEY,

  recipe_id            TEXT NOT NULL
                         REFERENCES recipes(id) ON DELETE CASCADE,

  cooked_by            TEXT
                         CHECK (cooked_by IN ('Tommy', 'Jill')),
  context              TEXT
                         CHECK (context IN ('solo', 'pair', 'hosting')),

  started_at           TEXT NOT NULL,    -- ISO 8601 UTC, written on "Cooking this"
  scored_at            TEXT,             -- NULL until scored

  again                INTEGER CHECK (again BETWEEN 1 AND 5),
  taste                INTEGER CHECK (taste BETWEEN 1 AND 5),
  effort               INTEGER CHECK (effort BETWEEN 1 AND 5),

  -- bake only; NULL on cook-mode recipes
  came_out_right       INTEGER CHECK (came_out_right IN (0, 1)),

  modifications        TEXT,
  notes                TEXT,
  photo_r2_key         TEXT
);

CREATE INDEX idx_cooks_recipe      ON cooks (recipe_id);
CREATE INDEX idx_cooks_started_at  ON cooks (started_at);
-- Pending-score prompt looks for cooks with no scored_at.
CREATE INDEX idx_cooks_pending     ON cooks (scored_at) WHERE scored_at IS NULL;

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
  recipe_id            TEXT NOT NULL
                         REFERENCES recipes(id) ON DELETE CASCADE,
  tag                  TEXT NOT NULL,
  PRIMARY KEY (recipe_id, tag)
);

CREATE INDEX idx_tags_tag ON tags (tag);
