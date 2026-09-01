# Mise

A personal recipe system for two people. Session 1 of 8.

Read `docs/claude-code-kickoff.md` and `docs/recipe-app-spec.md` first — they
are the source of truth for everything here.

## What's in this session

- React + Vite + TypeScript front end, Tailwind with the locked token system
- `wrangler.toml` with the locked bindings: `DB` → `mise-db`, `MEDIA` → `mise-media`
- D1 migration for the complete schema in spec §8
- Manual recipe entry form
- List view with a cook/bake filter
- Backfill import as a typed stub that throws

Sessions 2–8 are not started. Nothing is scaffolded ahead.

## Getting it running

### 1. Install

```bash
npm install
```

### 2. Local, no Cloudflare account needed

Local D1 is a SQLite file under `.wrangler/`. Nothing touches your account.

```bash
npm run db:migrate:local
npm run pages:dev            # builds, then serves on http://127.0.0.1:8788
```

That is enough to add recipes, see them listed, and filter by mode.

For front-end work with hot reload, run two terminals:

```bash
npx wrangler pages dev        # terminal 1 — API + local D1 on :8788
npm run dev                   # terminal 2 — UI on :5173, /api proxied to :8788
```

### 3. Cloudflare — needs you at the keyboard

I can't run these; they need your login.

```bash
npx wrangler login                        # opens a browser
npx wrangler d1 create mise-db            # prints a database_id
```

Paste that `database_id` into `wrangler.toml`, replacing
`REPLACE_ME_AFTER_WRANGLER_D1_CREATE`. Then:

```bash
npx wrangler r2 bucket create mise-media
npm run db:migrate:remote
npx wrangler pages deploy
```

`ANTHROPIC_API_KEY` is not needed until Session 2. When you get there:

```bash
npx wrangler pages secret put ANTHROPIC_API_KEY
```

## Layout

```
docs/            the two source documents
migrations/      D1 schema — 0001 is the complete spec §8
functions/api/   Pages Functions
  recipes.ts     GET (with ?mode=) and POST
  _shared.ts     Env bindings and input validation
src/
  types.ts       mirrors the schema — change both together
  lib/           API client, mode accent tokens
  components/    RecipeForm, RecipeList, ModeFilter
  import/        backfill stub — do not implement yet
```

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/recipes` | All browsable recipes, newest first |
| `GET` | `/api/recipes?mode=cook` | `cook`, `bake`, or `all` |
| `POST` | `/api/recipes` | Manual entry. Always writes `inferred: false` |

`unparsed` and `dismissed` recipes are excluded from the list (spec §3d).
Nothing writes those yet.
