# Claude Code Kickoff — mise

> **Name resolved:** the `RECIPE_APP` placeholder has been replaced throughout with `mise`. It appears in the repo name, D1 database, R2 bucket, and Pages project.
>
> Paste this document, then `recipe-app-spec.md`, at the start of Session 1. In later sessions, paste both again plus the session brief you're on — the agent has no memory between sessions.

---

## Role and standing orders

You are building a personal recipe app for two people. It is not a product, has no users beyond two, and will never be commercialized. Optimize for it being finished and used, not for extensibility.

**Standing orders:**

1. **Build only the phase you're asked for.** Do not scaffold ahead. Do not add "while I'm here" features.
2. **Never invent a data format.** If you have not seen a file's actual structure, stub the interface and stop.
3. **Ask before adding a dependency.** The stack below is the whole stack.
4. **No placeholder or mock data in committed code.** If something can't be built yet, stub it with a typed interface that throws.
5. **Stop at each phase boundary** and report what works, what's stubbed, and what you'd verify by hand.
6. Everything in the "Explicitly cut" list of the spec stays cut. If you think one is necessary, say so and stop — don't build it.

---

## Stack and exact bindings

- **Cloudflare Pages** — React + Vite + TypeScript front end
- **Pages Functions** — API, under `/functions/api/`
- **D1** — binding name `DB`, database name `mise-db`
- **R2** — binding name `MEDIA`, bucket name `mise-media`
- **Anthropic API** — secret name `ANTHROPIC_API_KEY`, model `claude-sonnet-4-6`
- **Tailwind** for styling, with the token system below defined in `tailwind.config`

Use these names exactly. Put them in `wrangler.toml` in Session 1 and never rename them.

---

## Design direction

Warm and editorial for browsing. Dark and utilitarian for cooking. The shift between them is the signal that you've stopped browsing and started cooking — make that transition feel deliberate.

### Explicitly avoid

Do **not** produce cream-background-plus-high-contrast-serif-plus-terracotta-accent. That combination (backgrounds near `#F4F1EA`, accents near `#D97757`, a display serif like Playfair) is the current generic default for "warm editorial" and reads as templated. Same for: rounded cards with identical border-radius and soft grey shadows, ALL-CAPS eyebrow labels above headings, meta strings joined with middle dots, arrows appended to button text.

### Palette

Warmth comes from an oat/clay ground and a brown-black ink, not from cream and orange. The two mode accents are the one place with real color, and they carry information:

```
ground      #E4DDCC   warm oat, the browsing background
ground-deep #D6CDB8   raised surfaces, chips, inactive states
ink         #241F1A   warm near-black, all body text
ink-soft    #6B6157   secondary text, metadata
cook        #46583A   deep olive — cook mode accent
bake        #7A3B52   deep plum — bake mode accent
night       #16130F   Cook Mode ground
night-text  #F2ECDF   Cook Mode text
```

Cook and bake accents are the primary way mode is communicated. A recipe carries its accent through its card, detail view, and score screen. Never rely on color alone — pair with the mode label.

### Type

Two families, split by role — chrome versus content:

- **UI and chrome:** a grotesque sans (Inter or Instrument Sans). Navigation, buttons, labels, scores, metadata.
- **Recipe content:** a serif (Newsreader or Source Serif 4). Titles, ingredients, steps. Generous line-height, line length under 70 characters.

This split does real work: controls feel like a tool, the recipe itself feels like something written down. Do not use a high-contrast display serif for headlines.

### Structure

- **Numbered markers are correct here** — recipe steps genuinely are a sequence. This is the one place numbering is earned. Do not number anything that isn't a sequence.
- **Inferred fields** (see spec §3c) must be distinguishable without relying on color: dotted underline plus `ink-soft`, with the mode accent on hover/tap to correct.
- Hierarchy comes from weight and space, not from borders and hairline rules on everything.
- Motion only in response to a tap — opening, confirming, advancing a step. No entrance animations, no hover transitions on cards.

### Copy

Sentence case. Plain verbs. An action keeps its name through the whole flow: the button that says "Cooking this" produces a log entry labeled "Cooking." Empty states say what to do next, not "Nothing here yet."

---

## Decisions already locked — do not revisit

- **Mode detection:** the parser guesses `cook` vs `bake` from the source. One-tap correction in the UI. The capture Shortcut does **not** ask.
- **Dedupe:** aggressive clustering. Merge anything plausibly the same dish. This is safe because **nothing is ever hidden inside a cluster** — every variant stays visible in the detail view, and a "not the same dish" button splits it back out. Under-merging is the worse failure here.
- **No auth.** Two-name picker (`Tommy`, `Jill`) on the cook log. That is the entire user model.
- **No improvised-meal logging.** `cooks.recipe_id` is `NOT NULL`.
- **Backfill is stubbed in Session 1** (see below).
- **Cook Mode has no voice control.** Screen-half tap targets only.

---

## Session structure

Run these as separate sessions. Verify each before moving on.

### Session 1 — Scaffold, schema, manual entry
Repo, `wrangler.toml` with the bindings above, Tailwind token system, D1 migration for the full schema in spec §8, a manual recipe entry form, and a list view. No parsing yet — type the recipe in by hand.

**Done when:** you can add a recipe by hand, see it in the list, and filter by mode.

### Session 2 — Parser
Anthropic API call, mode-aware per spec §3c. Cook mode infers and flags. Bake mode never infers quantities. Outputs the `ingredients_json` / `steps_json` shapes from §8.

**Gate before proceeding:** run it against five real recipes by hand — two cook, two bake, one voice-only clip with a junk caption. Confirm inference flags are correct and the junk one lands in `unparsed`. Do not run the parser at volume until this passes.

### Session 3 — Screenshot ingest
Ingest endpoint accepting an **array** of images plus an optional dictated note and optional source URL. Writes to R2, calls the parser, writes to D1. Then the iOS Shortcut definition (two: one for you, one for Jill).

### Session 4 — Cook logging
"Cooking this" writes a `cooks` row with null scores. Pending-score prompt pinned to the top of the app. Three sliders on one screen, mode-appropriate labels per spec §5, `came_out_right` on bake only, context tap. Then the "keep these changes in your version?" prompt and the versioning logic from §4.

### Session 5 — Cook Mode
Screen wake lock. Screen-half tap targets (left back, right forward — a knuckle must work). One step per screen, large type, that step's ingredients repeated inline. Timer buttons on steps with a parsed `time_min`. Dark palette.

### Session 6 — Tonight
Three cards, three ranking functions per spec §6. Context defaults to most-used and never blocks the view. Dismiss on every card writes a kill signal. Card slots: proven winner / forgotten cold item / wildcard.

### Session 7 — Backfill *(only after the TikTok export arrives)*
Export upload → URL extraction → TikTok oEmbed caption fetch → Pinterest description fetch with blog fallback under ~100 chars → parse → aggressive dedupe → D1.

**Must be chunked or queued.** 300 oEmbed calls plus 300 parses will exceed Workers CPU limits and D1 batch limits in a single request. A naive `for` loop will die partway through and leave a half-imported database. Design for resume.

### Session 8 — Insights *(after ~50 logged cooks)*
Per spec §7.

---

## Session 1 stub requirement

The backfill import module must exist as a **typed interface that throws**, not as an implementation:

```ts
// The TikTok export JSON structure has NOT been observed yet.
// Do not guess at it. This throws until the real file is available.
export async function importFromExport(file: File): Promise<ImportResult> {
  throw new Error("Not implemented — awaiting real TikTok export file");
}
```

Any attempt to write a parser against an imagined export structure is wasted work that will be thrown away.
