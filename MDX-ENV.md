# MDX Environments

Notes are written as typed MDX blocks (`<Theorem slug="…" of="…">`,
`<Exercise difficulty="core">`, …). The **engine** (`mdx-env`) parses, indexes,
links and renders them; a **pack** says which kinds a subject writes and how
prompts talk about them. A course picks its pack in `course.config.ts` and its
Markdown syntaxes (TeX, …) in `course.markdown.ts`, independently, so a commerce
course can use math syntax without theorem kinds.

## Layout

```
src/lib/mdx-env/                 engine (no subject-specific names)
  pack.ts                        EnvPack contract, ENV_RELATIONS, ENV_STYLES, assertEnvPack
  kinds.ts                       createEnvRegistry(pack), the course's registry (ENV)
  remark.ts                      remarkMdxEnv: reads envs, recalls, threads; rewrites the tree
  page-envs.ts                   PageEnvs: what remark leaves on each page
  tenet.ts, slug.ts              slug index, citations, resolved refs
  kind-view.ts, kind-view-tree.ts  per-kind pages ("Theorems from …")
  env-meta.ts, statement-html.ts, thread.ts, target.ts
src/components/mdx-env/          Env, EnvMark, Footnotes, Recall, Statement; getEnvMdxComponents

src/lib/markdown/syntax.ts       MarkdownSyntax contract
src/lib/markdown/syntaxes.ts     the course's syntaxes, hooked into each stage
src/lib/course/types.ts          CourseConfig contract

src/lib/packs/math/env.ts        MATH1251's kinds (Theorem, Proof, Example, …) and prompt wording
src/lib/packs/math/markdown/     TeX: remark-math, KaTeX, plain-text and search hooks
src/lib/packs/code/env.ts        programming kinds (Concept, Exercise, Solution, …), unused here

course.config.ts                 env: mathEnv
course.markdown.ts               [mathMarkdown]
```

The engine reaches the course's pack only through the `course.config` and
`course.markdown` aliases, so `mdx-env` and `markdown` never import `packs`.
The bindings in turn import only contracts (`course/types.ts`,
`mdx-env/pack.ts`, `markdown/syntax.ts`) and packs, never a module that reads
them back; both rules are enforced by `src/architecture.test.ts`. `course.markdown` is separate from
`course.config` because client code reads the config: putting KaTeX behind it
would ship KaTeX to every client bundle.

## The pack contract (`EnvPack`)

| Field | What it decides |
|---|---|
| `kinds` | keyed by kind name (prefixes ids: `theorem-1`). Each kind: `label` (the MDX tag), `plural` (the kind-view slug), `code` (compact mark), `of`, `style`, and optional `decoration`, `endMark`, `optionalSlug`, `untitled` |
| `difficulties` | levels a practice kind may set with `difficulty` |
| `derivation` | the `derive` intent: terminal word, menu label, prompt openers, task text |
| `prompts` | env-level task texts (`explain`, `explainPractice`, `quizPractice`, `check`) and the subject noun |
| `summary` | the line under the `llms.txt` heading |

**Roles come from `of`, never from kind names.**

| `of` | Role | Engine behaviour |
|---|---|---|
| `uses` | plain | cites prerequisites |
| `proves` | derivation (Proof, Solution) | attached under what it proves in exports and prompt context; offers `derive`; untitled ones are labelled "<Label> of <target>" |
| `practises` | practice (Example, Exercise) | may set `difficulty`; gets the practice explain/quiz texts |

`style` is visual weight: `emphasis` inverts the mark (theorem-like), `subdued`
mutes it (proof-like), `plain` is neither. The word on the mark is the label in
upper case.

`assertEnvPack` rejects a pack the engine cannot address: kind names that are
not lower-case or are reserved (`page`, `recall`, `thread`), labels that are not
PascalCase or that the engine defines (`Recall`, `Thread`, `ThreadMap`,
`Statement`, `KindFilter`, `Prose`), duplicate codes, labels or plurals, and
plurals that are not letters and hyphens (they name kind-view URLs). It also
rejects a derivation intent that is not one lower-case word or that the export
layer already uses (`explain`, `quiz`, `check`), and difficulties that repeat,
are blank or padded, or are missing when the pack has a practice kind.

## The Markdown syntax contract (`MarkdownSyntax`)

Short fragments (titles, statements, search previews, the dock) are rendered
outside MDX by `lib/markdown`; a syntax plugs into every stage of that path as
well as the MDX page pipeline:

| Field | Stage |
|---|---|
| `fromMarkdown` | parsing fragments (`parse.ts`) |
| `toMarkdown` | serialising env bodies back to Markdown (`remark.ts`) |
| `literals` | plain text and truncation length of the leaf nodes it adds (`plain.ts`, `truncate.ts`) |
| `atom` | rendered elements kept whole when flattened to one line (`hast.ts`) and matched as one unit by search (`highlight.ts`) |
| `render` | rewriting a sanitised fragment (TeX → KaTeX) (`render.ts`) |
| `remarkPlugins`, `rehypePlugins` | MDX pages and corpus-meta, before the site's own plugins (`source.config.ts`) |

Each stage reads the course's syntaxes through `syntaxes.ts`, never
`course.markdown` directly.

## Extending

- **A kind for this course:** add it to `src/lib/packs/math/env.ts`. Its tag,
  kind view, OG census code, exports, dock and prompts follow.
- **A new subject:** write a pack next to `packs/math` (see `packs/code`) and
  point `course.config.ts`'s `env` at it; add a syntax under the pack and list it
  in `course.markdown.ts` if the subject needs one, or export `[]`.
- **A new role:** add it to `ENV_RELATIONS` and give it engine behaviour; packs
  can then use it. Export relation names (`proves`/`proved_by`) are engine-fixed
  for now.

## Invariants

- Nothing outside `src/lib/packs/` names a kind; code asks the registry
  (`isDerivation`, `isPractice`, `getKindLabel`, …).
- `EnvKind` and `Difficulty` are `string`: the engine cannot know a course's
  names at compile time. Unknown tags are not environments; looking up an
  unknown kind throws, and role checks (`isDerivation`, `isPractice`) return
  `false` for it, so `"page"` and `"thread"` targets pass through safely.
- `remarkMdxEnv` takes `{ env }` to run against another pack.
