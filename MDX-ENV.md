# MDX Environments

Notes are written as typed MDX blocks: `<Definition slug="span">`,
`<Theorem slug="rank-nullity" of="rank,nullity">`, `<Proof of="rank-nullity">`,
`<Example difficulty="exam">`. The **environment engine** (`mdx-env`) reads
those blocks at build time, numbers and indexes them, resolves the slugs they
cite into a course-wide index, and renders them with a rail mark, footnotes and
an ask menu. Everything that knows about the course's structure (exports, the
reading dock, threads, the terminal, OG images) starts from what this module
extracts.

The engine is subject-neutral. Which kinds exist, what they are called, how they
look and how prompts talk about them comes from a **pack** (`EnvPack`); the
course picks its pack in `course.config.ts`. MATH1251 uses the math pack
(Definition, Theorem, Proof, Example, …); a programming pack (Concept, Exercise,
Solution, …) exists alongside it.

`mdx-env` sits just above the foundation layer: it imports `markdown`, `result`
and the `course.config` binding (for the pack), and is imported by `packs`
(for the contract), `course`, `compile`, `export`, `relations` and `site`.

## Layout

```
src/lib/mdx-env/
  pack.ts              EnvPack contract, ENV_RELATIONS, ENV_STYLES, ENGINE_TAGS, assertEnvPack
  kinds.ts             createEnvRegistry(pack); the course's registry (ENV) and its helpers
  remark.ts            remarkMdxEnv: validates, indexes and rewrites each page
  page-envs.ts         PageEnvs: what remark leaves on each page; id helpers
  slug.ts              slug, slug-list and thread-tag parsers
  tenet.ts             TenetIndex: slugs → environments, citations (cited by)
  thread.ts            ThreadIndex: threads and their members
  statement-html.ts    StatementView: a statement as a fragment plus a preview
  env-meta.ts          EnvView, RecallView: what one rendered environment needs
  kind-view.ts         per-kind pages ("Theorems from …"): records, URLs, TOC
  kind-view-tree.ts    adds kind views to the sidebar tree while one is open
  target.ts            PromptTarget (built by export, carried by EnvView)
src/lib/packs/
  math/env.ts          MATH1251's kinds, difficulties and prompt wording
  code/env.ts          a programming pack (not used by this course)
src/components/mdx-env/
  mdx.tsx              getEnvMdxComponents: one component per kind + KindFilter, Prose, Recall, Statement
  env.tsx              Env: the environment frame
  mark.tsx             EnvMark: the vertical rail label
  mark-measure.ts      shared ResizeObserver and word-height cache for EnvMark
  footnotes.tsx        uses, see, cited by and difficulty under an environment
  recall.tsx           Recall: a restatement of an environment from elsewhere
  statement.tsx        Statement, StatementHtml
src/components/mdx/
  index.tsx            getMDXComponents: Fumadocs defaults + env + thread components + Mermaid
  mermaid.tsx          Mermaid: server-rendered text diagrams
course.config.ts       env: mathEnv
```

## Authoring

### Environments

Each kind in the pack is an MDX element named by its `label`. With the math
pack: `Definition`, `Theorem`, `Lemma`, `Proposition`, `Corollary`, `Method`,
`Proof`, `Example`.

```mdx
<Theorem slug="rank-nullity" of="rank,nullity" thread="dimension-count:the count">
## Rank–nullity

<Statement>
For a linear map $T: V \to W$ with $V$ finite-dimensional,
$\operatorname{rank} T + \operatorname{nullity} T = \dim V$.
</Statement>

Notes, remarks, pictures…
</Theorem>

<Proof of="rank-nullity">
Extend a basis of $\ker T$ …
</Proof>
```

| Attribute | Value | Rules |
|---|---|---|
| `slug` | one slug | required unless the kind has `optionalSlug` (math: Example, Proof); `^[a-z][a-z0-9-]*$`; unique on the page and across the course |
| `of` | comma-separated slugs | meaning depends on the kind's relation: uses, proves or practises (below); every slug must exist |
| `see` | comma-separated slugs | "see also"; every slug must exist |
| `difficulty` | one of the pack's difficulties | only on practice kinds (math: `challenge`, `exam`, `routine`) |
| `thread` | `slug[:role]; slug[:role]` | membership in threads, with an optional role (inline Markdown); each thread once |

All metadata attributes must be static strings: no `{expressions}` and no
spread attributes on an environment. `id` is always set by the engine (below);
an authored `id` is overwritten.

Inside an environment:

- the **first heading** is its title (untitled kinds such as Proof have none
  and are labelled by their kind instead); every heading with an id is
  recorded for the table of contents and kind views;
- a `<Statement>` child is its **statement**: the short form used in recalls,
  previews, thread stations, the dock and exports;
- everything else is its **body**.

### Other elements

| Element | Attributes | What it does |
|---|---|---|
| `<Recall of="slug" />` | `of` (one slug, required) | restates the environment `slug` (title and statement) with a link to the original; counts as a citation |
| `<Thread slug="…" summary="…">` | `slug`, `summary` (both required) | defines a thread; must start with a heading (its title), the rest is prose about the idea. Meaning and drawing: RELATIONS.md |
| `<ThreadMap />` | none | the list of all threads (RELATIONS.md) |
| `<Statement>` | none | marks an environment's statement (above) |
| ` ```mermaid ` | | a diagram, turned into `<Mermaid chart>` by `remarkMdxMermaid` and rendered as box-drawing text on the server |

Environments, `Recall`, `Thread` and `ThreadMap` must be **direct children of
the document**: not inside a list, a callout or another environment. The build
fails otherwise.

### Ids

| Node | Id | Example |
|---|---|---|
| environment | `<kind>-<n>`, counted per kind per page | `theorem-3` |
| recall | `recall-<slug>-<n>`, counted per slug per page | `recall-span-1` |
| thread | `thread-<slug>` | `thread-dimension-count` |

The id is the anchor of the element on its page; `pageUrl#id` is the node id
used by exports, the dock and threads.

## What the engine extracts

`remarkMdxEnv` runs on every page, once in the corpus-meta pass and once in the
MDX compile (see COMPILE.md). It:

1. rejects environments, recalls and threads that are not direct children;
2. walks the top-level children in order, reading each environment (id, slug,
   `of`, `see`, difficulty, thread tags, headings, title, statement, body),
   recall and thread, and failing the build on any invalid attribute;
3. rewrites the tree: each environment is wrapped in
   `<KindFilter kind="…">`, each run of other content in `<Prose>`, threads and
   thread maps in `<Prose>`; recalls and ESM stay as they are;
4. leaves the result on the file as `file.data.envs`.

`PageEnvs` (`page-envs.ts`):

| Field | Contents |
|---|---|
| `entries` | `EnvOccurrence` per environment: `id`, `kind`, `of`, `see`, `threads`, `headings`, and when present `slug`, `title`, `difficulty`, `statement`, `body` (Markdown) |
| `recalls` | `{ id, of }` per recall |
| `threads` | `{ id, slug, summary, title }` per thread definition |
| `segments` | the page in order: prose (as Markdown), environment ids and recall ids; exports rebuild page documents from it |

Bodies, statements, titles and prose are serialised back to Markdown with GFM,
MDX and the course's syntaxes (`TO_MARKDOWN_EXTENSIONS`, see MARKDOWN.md).

## Course indexes

`getCorpus` (COMPILE.md) builds two indexes from every page's `PageEnvs`:

**`TenetIndex`** (`tenet.ts`): `bySlug` maps each slug to its `Tenet` (kind,
page, occurrence id, `of`, `see`, difficulty, title fragment, compiled
statement with a 220-character preview). `citedBy` maps each slug to every
environment that lists it in `of` or `see` and every recall of it. Defining a
slug twice, or citing one that doesn't exist, fails the build
(`registerTenets`, `assertTenetIndex`).

**`ThreadIndex`** (`thread.ts`): each `<Thread>` definition, with members
collected from the `thread` attributes of environments anywhere in the course,
sorted by reading order. Each member carries its role and its compiled
statement, so members need no slug. A tag naming an undefined thread fails the
build.

Titles fall back to the slug (or the kind label) as a literal fragment when an
environment has no heading.

## The pack

### Contract (`EnvPack`)

| Field | What it decides |
|---|---|
| `kinds` | keyed by kind name (the id prefix: `theorem-1`); each kind is an `EnvKindConfig` (below) |
| `difficulties` | levels a practice kind may set with `difficulty` |
| `derivation` | wording of the `derive` prompt intent: terminal word, menu label, prompt openers, task text (EXPORT.md) |
| `prompts` | environment-level task texts (`explain`, `explainPractice`, `quizPractice`, `check`) and the noun for one environment (`subject`) |
| `summary` | the line under the `llms.txt` heading |

| `EnvKindConfig` field | Meaning |
|---|---|
| `label` | MDX tag and singular label (`Theorem`) |
| `plural` | plural label; lower-cased, the kind-view URL segment (`theorems`) |
| `code` | two-letter mark used when the rail is too short for the word, in thread stations and on OG images (`TH`) |
| `of` | the relation the `of` attribute expresses (below) |
| `style` | visual weight: `plain`, `emphasis` (inverted mark, bold title) or `subdued` (muted mark, tighter spacing) |
| `decoration` | optional `underline` or `overline` on the rail word |
| `endMark` | draws a square end mark under the rail (a QED box) |
| `optionalSlug` | the kind may omit `slug` |
| `untitled` | written without a heading; rendered as a `div` labelled by `label` (`aria-label`) instead of a `section` (headings are not stripped) |

**Roles come from `of`, never from kind names:**

| `of` | Role | Engine behaviour |
|---|---|---|
| `uses` | plain | lists prerequisites |
| `proves` | derivation (Proof, Solution) | attached under what it proves in exports and prompt context; offers the `derive` intent; ones without a title are labelled "<Label> of <target>" in exports |
| `practises` | practice (Example, Exercise) | may set `difficulty`; gets the practice explain and quiz texts |

How the math pack maps onto it:

| Kind | Code | `of` | Style | Extras |
|---|---|---|---|---|
| Theorem, Proposition, Corollary, Lemma | TH, PR, CR, LM | uses | emphasis | |
| Definition | DF | uses | plain | underline |
| Method | MT | uses | plain | overline |
| Example | EG | practises | plain | optional slug |
| Proof | PF | proves | subdued | optional slug, untitled, end mark |

### Validation

`createEnvRegistry` calls `assertEnvPack`, so a bad pack fails the first import
of `kinds.ts`, i.e. the build. It rejects:

- kind names that are not lower-case words or that the engine uses itself
  (`page`, `recall`, `thread`);
- labels that are not PascalCase or that the engine defines (`ENGINE_TAGS`:
  `KindFilter`, `Prose`, `Recall`, `Statement`, `Thread`, `ThreadMap`);
- duplicate codes, labels or plurals (plurals compared lower-cased), and plurals
  that are not letters and hyphens (they name URLs);
- unknown relations or styles;
- a derivation intent that is not one lower-case word (`export/prompt.ts`
  checks it against the other intents' words; EXPORT.md);
- difficulties that are blank, padded or repeated, or missing when the pack has
  a practice kind.

### Registry (`kinds.ts`)

`createEnvRegistry(pack)` returns the API the rest of the code uses;
`ENV = createEnvRegistry(course.env)` is the course's, and its members except
`practiceLabels` and `pack` are re-exported:

| Member | Purpose |
|---|---|
| `ENV_KINDS` (`kinds`) | every kind, in pack order (OG census order, MDX registration) |
| `getEnvConfig(kind)` | the kind's config; throws on an unknown kind |
| `getKindLabel(kind, plural?)` | singular or plural label |
| `getKindViewSlug(kind)` | the kind-view URL segment |
| `envKindFromTag(tag)` | the kind for an MDX element name, or `undefined` |
| `isDerivation(kind)`, `isPractice(kind)` | roles; `false` for unknown kinds, so `"page"` and `"thread"` pass through |
| `parseDifficulty(value)` | a `ParseResult` against the pack's difficulties |
| `practiceLabels` | labels of practice kinds, for error messages |
| `pack` | the pack itself, for its wording |

`remarkMdxEnv({ env })` accepts another registry, so the plugin can run against
any pack.

## Kind views

Every page gets one generated page per kind it contains:
`/algebra/vector-spaces/spans/definitions` lists only the definitions of
`/algebra/vector-spaces/spans`. With the current content that is
241 kind views over 62 pages.

- **Records** (`kind-view.ts`, `kindViewsFromPages`): URL `<page>/<plural>`,
  title "Definitions from Spans", tab title `[DEFINITIONS] Spans`, a chip, a
  description and terminal aliases. A kind view is skipped when a real page
  already exists at its URL.
- **Rendering**: the docs page renders the same MDX body with `viewKind` set.
  `KindFilter` renders only environments of that kind; `Prose` and `Recall`
  render nothing. `getKindViewToc` keeps only the TOC entries whose headings
  belong to that kind. Metadata, canonical URL and indexing are SITE.md's.
- **Navigation**: the rail mark of each environment on a notes page links to
  its kind view ("View all theorems on this page"). Kind views are not in the
  sidebar tree until one is open: then `withActiveKindViewPages` turns the
  parent page into a folder holding its kind views, so the reader can switch
  between them.

## Rendering

`getMDXComponents` (`components/mdx/index.tsx`) merges the Fumadocs defaults,
`getEnvMdxComponents`, `getThreadMdxComponents` (RELATIONS.md) and `Mermaid`.
The docs page passes the page's `PageEnvs`, title and URL, the tenet, thread and
course indexes, the thread map, a prompt-target lookup and, on kind views, the
view kind.

`getEnvMdxComponents` builds a `PageEnvContext` once per page and registers one
component per kind under its label. Each resolves an `EnvView`
(`env-meta.ts`): the occurrence's metadata, the resolved `uses`, `see` and
`cited by` refs (excluding the environment itself), and its prompt target.

**`Env`** (`env.tsx`) draws the frame: a two-column grid with the rail on the
left and the body on the right, `section` (or `div` with an `aria-label` for
untitled kinds), `id` for the anchor, and `data-env-kind` / `data-env-style`
hooks for CSS. When the environment has a prompt target it is wrapped in
`AskShare` (EXPORT.md): right-clicking it opens the ask menu, and touch
screens get a visible `[ASK AI]` button instead.

**`EnvMark`** (`mark.tsx`) is the rail: `[THEOREM]` set vertically, a hatched
rule down the rest of the rail, and the end mark if the kind has one. If the
environment is shorter than the word, the mark switches to the kind's code
(`[TH]`). The word's height is measured once per decoration, style and word
with a hidden probe (`mark-measure.ts`), cached, and re-measured after web fonts
load; one shared `ResizeObserver` watches every environment. On notes pages the
mark links to the kind view; in a recall it links to the original.

**`Footnotes`** lists, numbered, the environments its `of` names (what it uses,
proves or practises, by kind), those it points to with `see`, and the first four
that cite it, de-duplicated, with an "N more" link to the page (where the
reading dock lists every citation). Practice kinds show their difficulty above.

**`Recall`** renders an `Env` of the original's kind containing its title and
statement, linked back with "Go to original". It renders nothing on kind
views.

## Design decisions

**1. Environments are top-level siblings.** Requiring every environment,
recall and thread to be a direct child of the document makes a page a flat
sequence of prose and environments. That is what lets the plugin number them,
record `segments` in reading order for exports, and filter a page down to one
kind with a wrapper instead of walking nested trees. Nested environments are a
build error, not a silently unindexed block.

**2. Metadata is static.** `slug`, `of`, `see`, `difficulty`, `thread` and
`summary` must be literal strings because they are read by a remark pass that
never evaluates JavaScript (the corpus-meta pass, COMPILE.md). An expression
attribute would be invisible to the index, so it is rejected.

**3. Citations use slugs, not URLs.** An environment names what it builds on by
slug, and slugs are unique across the course. Moving a theorem to another page
changes no citation, and a typo or a deleted slug fails the build instead of
producing a dead link.

**4. Anchors are generated per kind.** Ids are `theorem-3`, not the slug,
because many environments (examples, proofs) have no slug, and a uniform scheme
keeps anchors predictable. The cost: inserting a theorem above another shifts
the latter's anchor. Node ids in exports and the dock are built from these
anchors, so they move too; slugs are the stable handle.

**5. Statements are separate from bodies.** A statement is the part worth
repeating: in a recall, a preview, a thread station, the dock and prompt
context. Marking it with `<Statement>` lets all of those use a short Markdown
fragment, rendered without MDX (MARKDOWN.md), instead of compiling and
truncating the whole body.

**6. Recall restates from the index.** A recall shows the original's title
and statement from the tenet index rather than transcluding its MDX. That keeps
recalls cheap, consistent with previews, and countable as citations, so a
definition knows which later pages recall it.

**7. Kind views reuse the page's body.** A kind view is the same compiled page
rendered with a filter, not a separate document. There is one body module per
page, kind views can't drift from their page, and adding a kind view costs no
compile. The cost is that a kind view loads the full page body and discards
most of it.

**8. Kind views stay out of the sidebar until used.** 241 extra entries would
bury the notes. They appear only beside the one being read, and are reached
from the rail marks and the terminal (search folds their hits into the parent
page).

**9. The engine names no kind.** Code asks the registry about roles
(`isDerivation`, `isPractice`), properties (`decoration`, `endMark`, `style`)
and wording (`pack.derivation`, `pack.prompts`). A pack with Solution instead
of Proof gets derivation behaviour, a different end mark rule or no
decorations without engine changes. Relation names in exports (`proves`,
`proved_by`) are the exception (Limitations).

**10. Packs are validated at load.** `assertEnvPack` runs when the registry is
created, so an ambiguous pack (two kinds with the same plural would share a URL;
a kind called `page` would collide with page nodes) stops the build with a list
of problems instead of producing subtle collisions.

**11. Kinds and difficulties are `string`.** The engine can't know a course's
names at compile time. Unknown tags are not environments, looking up an unknown
kind throws, and role checks return `false`. `Strand` is still a literal union;
`EnvKind` already isn't.

**12. Wrappers are invisible to the stringifier.** `KindFilter`, `Prose` and
`Thread` carry `_stringify: "children-only"`, so Fumadocs' structured data and
search text contain their contents but not the wrapper tags.

**13. Only the frame is a client component.** `Env` and `EnvMark` are client
components (the ask menu and the measurement need the DOM), but the body is
passed as `children`, so the MDX content itself stays server-rendered HTML.

**14. The rail measures itself.** Whether a vertical word fits depends on the
rendered height of the environment, which CSS can't compare with the word's
length. Measuring once per word and sharing one observer keeps it cheap even on
pages with dozens of environments.

## Performance

- Parsing and indexing happen at build time; at request time nothing in this
  module runs except rendering prerendered pages (which happens at build too).
- `remarkMdxEnv` runs twice per page (corpus-meta pass and MDX compile); see
  COMPILE.md for why and what it costs.
- Statements are compiled to fragments, with previews, once per slug in the
  tenet index, not per use (thread members compile their own once more).
- `EnvMark` measurement is cached by key and invalidated only when fonts load;
  `ResizeObserver` callbacks re-check only the environments that resized.
- Kind views add no compile work. They are not prerendered: each renders the
  full page body on its first request and is then cached (COMPILE.md).

## Limitations

- Inserting an environment shifts the anchors of later ones of the same kind,
  which breaks external links to them.
- Environments can't nest, and `Recall`/`Thread` can't appear inside lists or
  callouts.
- Thread membership can only be declared on environments, not on prose.
- Export relation names (`proves`/`proved_by`, …) are fixed by the engine; packs
  can't relabel them.
- The code pack is not used by this course; `Lemma` is defined but unused in the
  content.

## Changing things

**A kind for this course:** add it to `lib/packs/math/env.ts`. Its MDX tag,
kind view, rail mark, OG census code, exports, dock entries and prompts follow.

**A new subject:** write a pack next to `packs/math` (see `packs/code`) and point
`course.config.ts`'s `env` at it. Add a Markdown syntax under the pack if the
subject needs one (MARKDOWN.md).

**A new attribute:** add it to `METADATA_ATTRIBUTES` (so it must be static),
read it in `readEnv`, store it on `EnvOccurrence`, and carry it into `Tenet` or
`EnvView` where it is needed.

**A new role:** add it to `ENV_RELATIONS`, give it engine behaviour (a role check
in `kinds.ts`, its edges in the export graph), and use it from a pack.

**A new engine element:** add its tag to `ENGINE_TAGS` in `pack.ts` (no pack can
then claim the name, and `remark.ts` accepts it as an `EngineTag`), handle it in
`rewriteDocument`, add it to `ROOT_ELEMENTS` if it must be top-level, and
register its component.

## Invariants

- Nothing outside `lib/packs` names a kind; code asks the registry.
- Environments, recalls and threads are direct children of the document.
- Metadata attributes are static strings.
- Every slug is defined once in the course, and every cited slug exists.
- Every thread tag names a defined thread.
- Ids are generated: `<kind>-<n>`, `recall-<slug>-<n>`, `thread-<slug>`.
- Kind-view URLs are `<page>/<lower-cased plural>` and never shadow a real page.
- The pack passes `assertEnvPack`.
- `course.config.ts` and packs import only `pack.ts` from this module.
