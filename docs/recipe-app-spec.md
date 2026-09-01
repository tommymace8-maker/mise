# Recipe App — Build Spec v1

**Status:** for review. Nothing built yet.

---

## 1. What this is

A personal recipe system for two people. It ingests recipes from anywhere (mostly social video), makes them actually cookable, tells you what to make tonight, and learns what you like from how you score what you cook.

**Three jobs, in the order they come online:**

1. **Archive you can cook from** — everything in one place, parsed well enough to use at the stove
2. **Decide what to make tonight** — three answers in five seconds, cold, at 5:47pm
3. **Learn what's good** — surfaces forgotten saves and gaps in what you cook

Jobs 1 and 2 ship together. Job 3 is data-gated and comes online around month two.

---

## 2. Users and modes

Two people, one shared pool, no accounts, no login.

- **Tommy** — cooking, most of the volume, 4–5 nights/week
- **Jill** — baking

`mode` (`cook` | `bake`) is a property of the recipe. It drives parser behavior, scoring labels, and a filter chip on every list. `cooked_by` is a two-option picker on the cook log. That's the entire multi-user model.

**Why mode matters:** baking and cooking fail differently. A wrong inferred garlic quantity is harmless. A wrong inferred flour quantity ruins the bake and then poisons the score with a data error. So the parser behaves differently by mode.

---

## 3. Ingestion

Two paths, one parser.

### 3a. Bulk backfill (the ~300-item backlog)

This runs once, at launch, and it's the reason the app has value on day one.

```
TikTok data export (JSON)  ─┐
Pinterest data export      ─┼──▶ URL list ──▶ caption fetch ──▶ parse ──▶ dedupe ──▶ D1
Manual URL paste           ─┘
```

- **TikTok:** Settings → Account → Download your data returns your favorites list with URLs and timestamps. Free, no API key.
- **Caption resolution:** TikTok oEmbed (`/oembed?url=`) is public and unauthenticated — returns caption, thumbnail, creator handle.
- **Pinterest:** export gives pins with descriptions, board names, destination links. If a pin description is under ~100 chars, fetch the linked page and parse that instead. (Boards are a dumping ground — no usable tags from board names.)
- **Cost:** a few hundred text parses ≈ $2–5 total. Non-issue.

### 3b. Ongoing capture

**Screenshot-first.** Works identically on TikTok, Pinterest, Instagram, YouTube, a cookbook page, a photo of a handwritten card, a text from your mom. One code path, no per-platform parsers, can't break when a platform changes an API.

- iOS Shortcut → share sheet → POST to ingest endpoint. Two taps.
- **Accepts an array of images** — long captions need 2–3 screenshots, parser stitches them in one call. Built day one; expensive to retrofit.
- **Optional dictated note at capture.** One field. "She used gochujang not sriracha, ~20 min at 400." This is the cheap fix for voice-only TikToks where the screenshot has nothing useful — solves most of that problem with zero transcription infrastructure.
- URL, if present in the share, is stored for link-back and attribution only. Never a parsing dependency.

### 3c. Parser behavior

Anthropic API, vision or text depending on input. Outputs structured JSON.

**Cook mode:** infers missing quantities, temps, times, pan sizes. Every inferred field carries `inferred: true` and renders in a distinct color. You correct it the first time you cook it; the correction becomes truth.

**Bake mode:** never infers quantities. Missing values render as a blank labeled "not in source." Additionally extracts pan size, oven temp, and rest/proof times as first-class fields — those are the variables that decide the outcome.

**The parse is the archive.** Creators delete videos constantly. Store the parsed recipe, verbatim caption, thumbnail, and source screenshots. Do **not** store video — legal exposure, storage cost, and unnecessary.

### 3d. Auto-reject (no manual triage)

Roughly a third of any large save pile isn't a recipe — pure emoji captions, restaurants, voiceover-only clips. If the parser can't extract at least an ingredient list and one step, the item gets status `unparsed`: kept, searchable, never surfaced in Tonight. No decision required from you.

### 3e. Dedupe and cluster

**Critical at 300 items.** You have not saved 300 dishes. You've saved ~120 dishes and ~180 duplicates — six smash burgers, four baked feta pastas, three chilis.

After parsing, cluster by dish similarity. Each cluster collapses to one entry with **variants**. The detail view shows what differs between versions, which is more useful than any single one — the deltas between four people's takes on a dish *are* the technique.

Realistic funnel: **300 raw → ~200 parseable → ~120 distinct dishes.** Browsable in one sitting, which is the outcome triage would have produced without you doing triage.

---

## 4. Versioning

- **Source recipe** — immutable. Exactly what the creator posted. Never edited.
- **My version** — created on first cook, mutable, updated after each cook.

After each cook, one prompt: *"Keep any of these changes in your version?"* Tap yes on "half the sugar," and next cook shows your version with a link back to the original.

Two reasons this is non-negotiable at the schema level:

1. After 18 months the valuable artifact isn't a rating, it's *your* version of a dish after five attempts, plus the diff showing how it got there.
2. It fixes a scoring bug — a 3 on attempt one and a 5 on attempt three aren't the same dish. Version-scoped cooks make that a legible trend instead of noise.

Retrofitting this later means untangling a year of free-text modification notes. Build it in.

---

## 5. Scoring

Created **when you start cooking**, not after. Open a recipe → tap "Cooking this" → a `cooks` row is written with null scores. Next app open, top of screen: *"How was the miso salmon?"*

Filling a blank you already made is a fraction of the activation energy of creating a record from scratch. At 4–5 cooks/week this is the difference between a habit and abandonment.

**One screen, three sliders, no typing required.**

| | Cook mode | Bake mode |
|---|---|---|
| Slider 1 | Taste (1–5, optional) | Taste (1–5, optional) |
| Slider 2 | Effort (1–5, optional) | Difficulty (1–5, optional) |
| Slider 3 | **Make again (1–5, required)** | **Make again (1–5, required)** |
| Extra | — | Came out right? y/n |

- All scales are 1–5. You can't reliably tell a 6 from a 7, and mixed scales slow entry.
- **Make again** is the only required field — it's the actual question this app exists to answer.
- **Came out right** (bake only) separates "bad recipe" from "my oven runs hot." That distinction is the whole ballgame in baking.
- Modifications and notes are optional and dictatable.
- Each cook records its **context** with one tap (see §6).

---

## 6. Contexts

Weeknights solo, weekends hosting. Effort is a cost on Tuesday and a *feature* on Saturday — a three-hour braise is a bad weeknight rec and a great dinner-party one. A single ranking would bury exactly the dishes you want when hosting.

Three contexts: **Solo / Us two / Hosting.**

| Context | Ranking emphasis |
|---|---|
| Solo | taste ÷ effort, hard recency penalty |
| Us two | balanced, moderate recency penalty |
| Hosting | taste + "make again", effort **not** penalized |

Recorded on each cook. Over time "reliably impressive for guests" emerges from your own history instead of your memory.

**Hosting scope is deliberately narrow — picking the dish only.** Explicitly cut: timing multiple dishes, recipe scaling, guest-history tracking.

---

## 7. Screens

### Tonight (home)
Pull surface, never push. No notifications, no daily digest, no weekly planning — decision timing is random, so the app must work cold with zero setup.

- Context defaults to your most common; one tap to change. Never blocks the view.
- Optional time-budget chip (15 / 30 / 60+).
- **Three cards:**
  1. **Proven winner** — high "make again," not cooked recently
  2. **Forgotten** — a cold/backlog item matching the context *(this is the "surface stuff I saved and forgot" mechanism)*
  3. **Wildcard** — untried, fits the budget
- Every card has **dismiss**. Dismiss = kill signal, cook = keep signal. **This is passive triage** — the backlog gets sorted as a byproduct of using the app, never as a chore.

### Saved
Grid. Filters: mode, context fit, time, cuisine, protein, method, status. Search across parsed text.

### Cook Mode
Greasy hands is a hard requirement, and it's where most recipe apps quietly fail.

- **Screen wake lock** — phone must not sleep mid-braise. Non-negotiable.
- **Tap targets are screen halves** — left back, right forward. A knuckle works. No small buttons, no precision scrolling.
- One step per screen, large type.
- Ingredients for *that step* repeated inline — no scrolling back up.
- Steps with a parsed `time_min` render a timer button.
- Voice control considered and **rejected**: kitchens are loud, ASR fails on short commands, screen-half taps solve it with none of the complexity.

### Log
Cook history. Pending-score prompt pinned at top. Filter by person and mode.

### Insights *(month two)*
- Avg score by method / cuisine / protein
- Score by creator — which accounts are worth following
- **Coverage gaps** — "you kept 34 Italian, 2 Thai, zero braises"
- Taste profile paragraph, generated from cook history
- Saved 40+ days, never cooked — aspiration vs. reality

---

## 8. Schema

```sql
recipes (
  id, mode,                     -- 'cook' | 'bake'
  source_type,                  -- 'tiktok'|'pinterest'|'youtube'|'instagram'|'cookbook'|'other'
  source_url, creator_handle,
  title, thumbnail_r2_key, screenshot_r2_keys_json,
  raw_caption, capture_note,
  ingredients_json,             -- [{item, qty, unit, inferred}]
  steps_json,                   -- [{text, temp_f, time_min, inferred}]
  pan_size, active_min, total_min, equipment_json,
  cuisine, protein, method,
  cluster_id,                   -- variants of the same dish
  parent_recipe_id,             -- set on "my version"
  is_my_version BOOL,
  status,                       -- 'cold'|'active'|'unparsed'|'dismissed'|'retired'
  saved_at, last_cooked_at
)

cooks (
  id, recipe_id NOT NULL, cooked_by, context,   -- 'solo'|'pair'|'hosting'
  started_at, scored_at,
  again INT NOT NULL,           -- 1-5
  taste INT, effort INT,        -- 1-5, nullable
  came_out_right BOOL,          -- bake only
  modifications TEXT, notes TEXT, photo_r2_key
)

tags (recipe_id, tag)
```

`last_cooked_at` is denormalized on purpose — Tonight queries it every load and shouldn't need a join.

---

## 9. Stack

- **Cloudflare Pages** — React/Vite front end
- **Pages Functions** — API
- **D1** — database
- **R2** — screenshots, thumbnails, cook photos
- **Anthropic API** — parsing, clustering, taste profile
- **iOS Shortcut** — capture

Same stack as Minot. No new-stack tax.

---

## 10. Explicitly cut

Named so they don't creep back in at week two:

Grocery lists · meal planning calendars · pantry inventory · nutrition/macros · multi-user auth · social/sharing · video download or storage · audio transcription · push notifications · weekly planning view · offline PWA · voice control in Cook Mode · hosting timing coordination · recipe scaling · guest-history tracking · logging improvised meals

**Grocery lists are the specific thing that turns a weekend build into a three-month build** — they drag in ingredient normalization, unit conversion, and store logic.

---

## 11. Build order

| # | Phase | Est. |
|---|---|---|
| 1 | Schema + manual entry + list view | 1 evening |
| 2 | Parser (mode-aware, inference flags) | 1 evening |
| 3 | Bulk backfill: export upload → caption fetch → parse → dedupe | 1 day |
| 4 | Screenshot ingest + iOS Shortcut | 1 evening |
| 5 | Cooking this → pending cook → 3-tap score | 1 evening |
| 6 | Cook Mode (wake lock, screen-half taps, timers) | 1 evening |
| 7 | Tonight screen + contexts + dismiss | 1 day |
| 8 | Insights + taste profile | after ~50 cooks |

**Phases 1–7 are the product.** Backfill moved ahead of the Shortcut because the backlog is the reason the app has value on day one.

Phase 8 waits for data — at 4–5 cooks/week that's roughly two months. Building it earlier means tuning charts against fake data.

---

## 12. Open questions

1. **Naming.** No name yet.
2. **Parser guesses cook vs. bake, or Shortcut asks?** Recommend: parser guesses. ~95% accurate from the screenshot, and one fewer tap at capture beats 5% accuracy on a correctable field.
3. **Cluster confidence threshold.** How aggressive should dedupe be? Over-merging hides real variation; under-merging leaves the backlog cluttered. Suggest starting conservative and adding a "these are different dishes" split button.
4. **What happens to `unparsed` items?** Currently invisible-but-searchable. Alternative: a low-priority queue where a screenshot could rescue one. Probably leave it alone.
