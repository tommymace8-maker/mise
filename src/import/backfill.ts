/**
 * Bulk backfill (spec §3a, Session 7).
 *
 * THIS IS A STUB ON PURPOSE.
 *
 * The TikTok data export JSON structure has NOT been observed yet. Writing a
 * parser against an imagined shape is work that gets thrown away the moment
 * the real file arrives, and worse, it looks finished. So: typed interface,
 * throws, nothing else.
 *
 * Do not implement this until the real export file is in hand. When it is,
 * Session 7 also has to solve resumability — 300 oEmbed calls plus 300 parses
 * will exceed Workers CPU limits and D1 batch limits in one request, and a
 * naive loop dies partway through and leaves a half-imported database.
 */

import type { Recipe } from "../types";

/** Where a backfilled item came from. */
export type ImportSource = "tiktok-export" | "pinterest-export" | "manual-urls";

export interface ImportSkip {
  /** The URL or identifier that was skipped. */
  ref: string;
  reason: "no-caption" | "not-a-recipe" | "fetch-failed" | "parse-failed";
}

export interface ImportResult {
  source: ImportSource;
  /** Items found in the export before any filtering. */
  found: number;
  /** Items that parsed into a usable recipe. */
  imported: number;
  /** Items kept with status 'unparsed' (spec §3d). */
  unparsed: number;
  /** Items collapsed into an existing cluster (spec §3e). */
  merged: number;
  skipped: ImportSkip[];
  /** Newly created recipe rows. */
  recipes: Recipe[];
}

/**
 * Parse a platform data export into recipes.
 *
 * @throws Always, until the real export file has been observed.
 */
export async function importFromExport(
  _file: File,
  _source: ImportSource,
): Promise<ImportResult> {
  throw new Error(
    "Not implemented — awaiting real TikTok export file. Do not guess at the export structure.",
  );
}
