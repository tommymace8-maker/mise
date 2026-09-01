import type { Mode } from "../types";

/**
 * Mode is never communicated by color alone — the accent always travels with
 * the label (kickoff doc, palette section).
 */
export const MODE_LABEL: Record<Mode, string> = {
  cook: "Cooking",
  bake: "Baking",
};

/** Tailwind class fragments, kept here so the accent stays consistent across
 *  card, detail view, and later the score screen. */
export const MODE_ACCENT: Record<
  Mode,
  { text: string; border: string; bg: string }
> = {
  cook: { text: "text-cook", border: "border-cook", bg: "bg-cook" },
  bake: { text: "text-bake", border: "border-bake", bg: "bg-bake" },
};
