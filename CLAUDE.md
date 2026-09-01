# Mise — instructions for Claude Code

Read `docs/claude-code-kickoff.md` and `docs/recipe-app-spec.md` before doing
anything. They are the source of truth; this file is a pointer, not a summary.

## Standing orders

1. Build only the session you're asked for. Do not scaffold ahead. No "while
   I'm here" features.
2. Never invent a data format. If you have not seen a file's actual structure,
   stub the interface and stop.
3. Ask before adding a dependency. The stack in the kickoff doc is the whole
   stack.
4. No placeholder or mock data in committed code. If something can't be built
   yet, stub it with a typed interface that throws.
5. Stop at each session boundary and report what works, what's stubbed, and
   what to verify by hand.
6. Everything in "Explicitly cut" (spec §10) stays cut. If you think one is
   necessary, say so and stop — don't build it.

## Locked names — never rename

| Thing | Name |
|---|---|
| D1 binding | `DB` |
| D1 database | `mise-db` |
| R2 binding | `MEDIA` |
| R2 bucket | `mise-media` |
| Anthropic secret | `ANTHROPIC_API_KEY` |
| Model | `claude-sonnet-4-6` |

## Where things are

```
docs/          the two source documents — read both, every session
migrations/    D1 schema, spec §8, complete as of 0001
functions/api/ Pages Functions
src/           React front end
src/import/    backfill stub — do not implement until the export file exists
src/types.ts   mirrors the schema; change both in the same commit
```

## Design constraints that are easy to violate

- No cream background + high-contrast display serif + terracotta accent. That
  combination is the generic default and is explicitly ruled out.
- Tailwind's default color palette is replaced, not extended. Only the eight
  tokens in `tailwind.config.ts` exist. A stray `bg-orange-500` fails the build.
- Sans (Instrument Sans) is chrome. Serif (Newsreader) is recipe content.
- Mode is never communicated by color alone — the accent always travels with
  the label.
- Numbered markers only for genuine sequences: recipe steps. Nothing else.
- Motion only in response to a tap. No entrance animations, no card hover.
- Sentence case. No all-caps eyebrow labels, no middle-dot meta strings, no
  arrows appended to button text.
- Empty states say what to do next.

## Session status

- Session 1 — done. Scaffold, bindings, tokens, schema, manual entry, list
  with mode filter.
- Sessions 2–8 — not started. See the kickoff doc for each brief.

## Open question carried into Session 4

`cooks.again` is nullable in the migration. Spec §8 says `NOT NULL`, spec §5
says the row is written with null scores on "Cooking this". Both cannot hold.
Nullable was chosen so the pending-score flow works; the requirement is
enforced in the UI at scoring time. Confirm before building Session 4.
