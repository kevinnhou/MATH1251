---
name: notes
description: >-
  Converts lecture slides into notes MDX under content/docs using
  math-env components (Definition, Theorem, Method, Example, Proof, Recall).
  Use when generating or rewriting course notes from slides, adding tenets or
  editing content/docs MDX.
---

# Notes

Turn lecture slides into notes pages. Do not dump the deck, and do not condense it into slogans. Build a coherent mental model: why each object is introduced, what it uses and what uses it, when it is the right tool, and which other formulation is the same fact.

Read [syntax.md](syntax.md) before writing any MDX. Read [register.md](register.md) before writing prose. Do not load `clear-prose` or other destlop skills.

## Workflow

1. **Source.** Read the slides (and the existing notes page if this is a rewrite). Treat those as the source of truth.
2. **Slugs.** Grep `slug="` under `content/docs` so new `of` / `see` / `Recall` targets exist, and so new slugs are unique site-wide.
3. **Partition (internal).** Map the chapter into tenets and the prose that earns them. Pedagogical order, not exam order. Do not emit that map as a TOC or a “you will learn” list.
4. **Write.** Interleave situating prose with environments. Name → fact → proof → procedure → instance, then `Recall` when a later method needs an earlier tenet in view. Copy the *shape* of the specimen in [syntax.md](syntax.md), not a live notes chapter.
5. **Wire.** `of` for uses / instance / proves. `see` for a sibling, contrast, or other formulation. Keep both sparse.
6. **Check.** Self-check below. Then `bun run types:check` (or watch `bun run dev`) so remark can fail on nested envs, bad slugs, and unknown targets.

## Self-check

- Every always-graph kind (`Definition`, `Theorem`, `Lemma`, `Proposition`, `Corollary`, `Method`) has a unique slug matching `^[a-z][a-z0-9-]*$`.
- No `<Prose>`, `<KindFilter>`, `id`, or nested env / `Recall`.
- `<Statement>` holds the claim or procedure; notes sit outside it.
- `Proof` is untitled, `of` the fact, and is an argument rather than a vibe.
- `Example` has `difficulty` (`routine` | `exam` | `challenge`) and `of` what it illustrates.
- Why / uses / when / other-view are answerable from the page without Why / When / Connections headings.
- No invented theorems, exam weightings, or course policy.
