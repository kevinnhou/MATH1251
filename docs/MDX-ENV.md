# MDX Environments

Notes are written as typed MDX blocks: `<Definition slug="span">`,
`<Theorem slug="rank-nullity" of="rank,nullity">`, `<Proof of="rank-nullity">`,
`<Example difficulty="exam">`. The **environment engine** (`mdx-env`) reads
those blocks at build time, numbers and indexes them, resolves the slugs they
cite into a course-wide index, and renders them with a rail mark, footnotes and
an ask menu. Everything that knows about the course's structure (exports, the
reading dock, threads, the terminal, OG images) starts from what this module
extracts.

The engine is subject-neutral. Which MDX tags exist, what they are called, how
they look and how prompts talk about them comes from **domains**: workspace
packages (`packages/domain-*`) that provide **components**. A component with a
graph role is an **environment** (its type is a *kind*); the others (such as
`<Mermaid>` or code's `<Output>`) are plain components. The course lists its
domains in `course.config.ts` (`domains`). MATH1251 lists `domain-math`
(Definition, Theorem, Proof, Example, …) and `domain-diagrams` (Mermaid);
`domain-code` (Concept, Exercise, Solution, Output, …) ships beside them.
MIGRATION.md describes the domain layout and why it is shaped this way.

`mdx-env` sits just above the foundation layer: it imports `markdown`, `result`
and the `course.config` binding (for the domains), and is imported by
`course`, `compile`, `export`, `relations` and `site`. Domains reach its
contract (`component.ts`) only as types, through the `engine` alias.

## Layout

```
src/lib/mdx-env/
  component.ts         the component contract (Domain, EnvironmentSpec, ComponentSpec, AskSpec), ROLES, ENV_STYLES, ENGINE_TAGS
  kinds.ts             createComponentRegistry(domains): merges and validates; the course's registry (ENV) and its helpers
  remark.ts            remarkMdxEnv: validates, indexes and rewrites each page
  occurrences.ts       collectComponents: domain component occurrences, and the text and template serialisers
  props.ts             literal prop values: literalConstants (export const), expressionValue
  page-envs.ts         PageEnvs: what remark leaves on each page; id helpers; component placeholders
  slug.ts              slug, slug-list and thread-tag parsers
  tenet.ts             TenetIndex: slugs → environments, citations (cited by)
  thread.ts            ThreadIndex: threads and their members
  statement-html.ts    StatementView: a statement as a fragment plus a preview
  env-meta.ts          EnvView, RecallView: what one rendered environment needs
  kind-view.ts         per-kind pages ("Theorems from …"): records, URLs, TOC
  kind-view-tree.ts    adds kind views to the sidebar tree while one is open
  target.ts            PromptTarget (built by export, carried by EnvView)
packages/domain-math/index.ts      maths environments, their wording and difficulties
packages/domain-code/index.ts      code environments and Output
packages/domain-diagrams/index.ts  Mermaid
src/components/mdx-env/
  mdx.tsx              getEnvMdxComponents: one component per kind (a domain body inside the frame) + KindFilter, Prose, Recall, Statement
  env.tsx              Env: the environment frame
  mark.tsx             EnvMark: the vertical rail label
  mark-measure.ts      shared ResizeObserver and word-height cache for EnvMark
  footnotes.tsx        uses, see, cited by and difficulty under an environment
  recall.tsx           Recall: a restatement of an environment from elsewhere
  statement.tsx        Statement, StatementHtml
src/components/mdx/
  index.tsx            getMDXComponents: Fumadocs defaults + env + thread components + the domains' components
course.config.ts       domains: [math, diagrams]
course.components.ts   each domain's components.tsx (renderers)
```

## Authoring

### Environments

Each environment is an MDX element named by its component's tag. With
`domain-math`: `Definition`, `Theorem`, `Lemma`, `Proposition`, `Corollary`,
`Method`, `Proof`, `Example`.

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
| `of` | comma-separated slugs | meaning depends on the component's role: uses, derives or practises (below); every slug must exist |
| `see` | comma-separated slugs | "see also"; every slug must exist |
| `difficulty` | one of the component's difficulties | only on practice components with a scale (math's Example: `challenge`, `exam`, `routine`; code's Exercise: `warm-up`, `core`, `stretch`) |
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
| ` ```mermaid ` | | with `domain-diagrams`: a diagram, turned into `<Mermaid chart>` by `remarkMdxMermaid` and rendered as box-drawing text on the server; exports write it back as a fence |
| any other component | literal props | a domain's component (below); may sit anywhere except inside a table |

Environments, `Recall`, `Thread` and `ThreadMap` must be **direct children of
the document**: not inside a list, a callout or another environment. The build
fails otherwise.

Every other JSX element must be a component of a listed domain, an engine
element or a lower-case HTML tag; anything else fails the build (so Fumadocs'
`Callout`, `Tabs` and `Cards` need a domain wrapping them first). A
component's props must be literals (`domain={[-2, 2]}`, `label="f"`, a bare
`smooth`) or name a literal `export const` on the same page; spreads and
computed expressions fail the build, because exports are built from metadata
and never run the page.

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
2. finds every other component (`collectComponents`, `occurrences.ts`): fails on unknown JSX, on
   components inside tables and on non-literal props, and records each
   occurrence's tag, props, children (as text content) and position;
3. walks the top-level children in order, reading each environment (id, slug,
   `of`, `see`, difficulty, thread tags, headings, title, statement, body),
   recall and thread, and failing the build on any invalid attribute;
4. rewrites the tree: each environment is wrapped in
   `<KindFilter kind="…">`, each run of other content in `<Prose>`, threads and
   thread maps in `<Prose>`; recalls and ESM stay as they are;
5. leaves the result on the file as `file.data.envs`.

`PageEnvs` (`page-envs.ts`):

| Field | Contents |
|---|---|
| `entries` | `EnvOccurrence` per environment: `id`, `kind`, `of`, `see`, `threads`, `headings`, and when present `slug`, `title`, `difficulty`, `statement`, `body` (Markdown), `templates` |
| `components` | `ComponentOccurrence` per domain component: `tag`, `props`, `children` (text content), `segment`, and `env` when it sits in one |
| `recalls` | `{ id, of }` per recall |
| `threads` | `{ id, slug, summary, title }` per thread definition |
| `segments` | the page in order: prose (as Markdown), environment ids and recall ids; exports rebuild page documents from it |

Bodies, statements, titles and prose are serialised back to Markdown with GFM,
MDX and the course's syntaxes (`TO_MARKDOWN_EXTENSIONS`, see MARKDOWN.md).
Components are serialised twice. In `statement`, `body` and titles a component
becomes its **text content** (its children); that is what search, previews,
dock titles and thread stations see. Prose segments, and an environment's
`templates.statement`/`templates.body` (kept only when they differ), hold a
**placeholder** instead (`componentPlaceholder(n)`), which the exports replace
with the component's `markdown` or `context` output (EXPORT.md, Components).

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

## Domains and components

### Contract (`component.ts`)

A domain's `index.ts` default-exports a `Domain`: `{ components }`, keyed by
MDX tag. It is plain data, because `course.config.ts` (which lists it) reaches
browser bundles. Every field is optional except where noted; anything left out
falls back to the engine default.

| `EnvironmentSpec` field | Meaning | Default |
|---|---|---|
| `role` (required) | `uses`, `derives` or `practises` (below); its presence makes the component an environment | |
| `code` (required) | two-letter mark used when the rail is too short for the word, in thread stations and on OG images (`TH`) | |
| `plural` (required) | plural label; lower-cased, the kind-view URL segment (`theorems`) | |
| `style` (required) | `plain`, `emphasis` (inverted mark, bold title) or `subdued` (muted mark, tighter spacing) | |
| `label` | singular label | the tag |
| `decoration` | `underline` or `overline` on the rail word | none |
| `endMark` | a square end mark under the rail (a QED box) | none |
| `optionalSlug` | the environment may omit `slug` | slug required |
| `untitled` | written without a heading; rendered as a `div` labelled by `label` | a `section` |
| `untitledTitle` | label of an untitled derivation, with `{label}` and `{targets}` | `{label} of {targets}` |
| `relation` | `{ label, inverse }` for its role's relation in documents and prompts ("Proves" / "Proved by") | the engine's labels |
| `ask` | wording per ask action (`explain`, `derive`, `quiz`, `check`: `label`, `phrase`, `task`; `derive` also `selfPhrase`) and `subject` ("this result") | the engine's wording for its role (EXPORT.md) |
| `difficulties` | the scale a practice environment's `difficulty` is checked against | none: no difficulty |

The kind is the tag in kebab case (`Theorem` → `theorem`, `WorkedExample` →
`worked-example`); it prefixes ids (`theorem-1`) and appears in exports.

A plain component's `ComponentSpec` has one optional field, `slugProps`: props
that name a slug. `getCorpus` checks them against the tenet index
(`assertComponentSlugs`); they create no edge. Its renderer is in the domain's
`components.tsx` and its export methods in `server.ts` (EXPORT.md). An
environment may also have a renderer in `components.tsx`: it draws only the
body, inside the engine's frame.

**Roles, never tag names, carry behaviour:**

| Role | Is | Engine behaviour |
|---|---|---|
| `uses` | a dependency | lists prerequisites; feeds "builds on" / "leads to" |
| `derives` | a derivation (Proof, Solution) | attached under its target in exports and prompt context; offers the `derive` action, worded by this component; untitled ones are labelled by `untitledTitle` |
| `practises` | practice (Example, Exercise) | may set `difficulty` from its own scale; gets the practice explain and quiz texts |

How `domain-math` maps onto it:

| Component | Code | Role | Style | Extras |
|---|---|---|---|---|
| Theorem, Proposition, Corollary, Lemma | TH, PR, CR, LM | uses | emphasis | |
| Definition | DF | uses | plain | underline |
| Method | MT | uses | plain | overline |
| Example | EG | practises | plain | optional slug; challenge/exam/routine |
| Proof | PF | derives | subdued | optional slug, untitled, end mark; "Proves" / "Proved by"; "Walk the proof" |

`domain-math` sets MATH1251's prompt wording on its components, so this
course's prompts are unchanged.

### Validation

`createComponentRegistry` merges the components of every listed domain and
validates them, so a bad or clashing domain fails the first import of
`kinds.ts`, i.e. the build. It rejects:

- tags that are not PascalCase or that the engine defines (`ENGINE_TAGS`:
  `KindFilter`, `Prose`, `Recall`, `Statement`, `Thread`, `ThreadMap`);
- a tag, kind, code, label or plural used twice, across all domains (plurals
  compared lower-cased), and plurals that are not letters and hyphens (they
  name URLs);
- kinds the engine uses itself (`page`, `recall`, `thread`);
- unknown roles or styles;
- difficulties on a component that is not a practice, or that are blank,
  padded or repeated.

### Registry (`kinds.ts`)

`createComponentRegistry(domains)` returns the API the rest of the code uses;
`ENV = createComponentRegistry(course.domains)` is the course's, and most of its
members are re-exported:

| Member | Purpose |
|---|---|
| `ENV_KINDS` (`kinds`) | every environment kind, in the order the domains list them (OG census order, MDX registration) |
| `envs` | each environment's resolved `EnvConfig` (spec plus `kind`, `tag`, `label`) |
| `components` | plain components by tag |
| `getEnvConfig(kind)` | the kind's config; throws on an unknown kind |
| `getKindLabel(kind, plural?)` | singular or plural label |
| `getKindViewSlug(kind)` | the kind-view URL segment |
| `envKindFromTag(tag)` | the kind for an MDX element name, or `undefined` |
| `isDerivation(kind)`, `isPractice(kind)` | roles; `false` for unknown kinds, so `"page"` and `"thread"` pass through |
| `parseDifficulty(kind, value)` | a `ParseResult` against that kind's scale |
| `practiceLabels` | tags of practice environments with a scale, for error messages |

`remarkMdxEnv({ env })` accepts another registry, so the plugin can run against
any set of domains (`test/components.test.ts` does).

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
`getEnvMdxComponents`, `getThreadMdxComponents` (RELATIONS.md) and the
domains' components from `course.components.ts`. A domain renderer whose tag
is an environment is passed to `getEnvMdxComponents` as that environment's
body, so it draws inside the engine's frame; the others are registered as they
are.
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
derives or practises, by kind), those it points to with `see`, and the first four
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
and each component's wording (`ask`, `relation`, `untitledTitle`). A domain
with Solution instead of Proof gets derivation behaviour, its own wording, a
different end mark rule or no decorations without engine changes. Relation IDs
in exports are neutral (`derives`/`derived_by`); what readers see comes from
the component.

**10. Domains are validated at load.** The registry checks the merged
components when it is created, so an ambiguous set (two kinds with the same
plural would share a URL; two domains defining `Example` would clash; a kind
called `page` would collide with page nodes) stops the build with a list of
problems instead of producing subtle collisions.

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
- Relation IDs (`derives`/`derived_by`, …) are fixed by the engine; a component
  relabels only what readers see.
- `domain-code` is not used by this course; `Lemma` is defined but unused in
  the content.
- Component props must be literals, components can't sit inside tables, and a
  component can't add nodes or edges (MIGRATION.md, Limitations).

## Changing things

**A new environment:** add a component with a `role` to a domain's `index.ts`
(in the baseline). Its MDX tag, kind view, rail mark, OG census code, exports,
dock entries and prompts follow.

**A new component:** add it to the domain's `index.ts`, its renderer to
`components.tsx` and, if its export should differ from its text content, a
`markdown`/`context` method to `server.ts` (EXPORT.md).

**A new subject:** add `packages/domain-<name>` (see `domain-code`) and list it
in `course.config.ts`, `course.server.ts`, `course.components.ts` and
`course.css`. Add a Markdown syntax to its `server.ts` if the subject needs one
(MARKDOWN.md).

**A new attribute:** add it to `METADATA_ATTRIBUTES` (so it must be static),
read it in `readEnv`, store it on `EnvOccurrence`, and carry it into `Tenet` or
`EnvView` where it is needed.

**A new role:** add it to `ROLES`, give it engine behaviour (a role check in
`kinds.ts`, `ROLE_EDGES` and its edges in the export graph), and use it from a
domain.

**A new engine element:** add its tag to `ENGINE_TAGS` in `component.ts` (no domain can
then claim the name, and `remark.ts` accepts it as an `EngineTag`), handle it in
`rewriteDocument`, add it to `ROOT_ELEMENTS` if it must be top-level, and
register its component.

## Invariants

- Nothing outside `packages/` names a component or kind; code asks the registry.
- Environments, recalls and threads are direct children of the document.
- Metadata attributes are static strings.
- Every slug is defined once in the course, and every cited slug exists.
- Every thread tag names a defined thread.
- Ids are generated: `<kind>-<n>`, `recall-<slug>-<n>`, `thread-<slug>`.
- Kind-view URLs are `<page>/<lower-cased plural>` and never shadow a real page.
- The merged components pass the registry's checks.
- Every JSX element is a listed component, an engine element or an HTML tag;
  component props are literals.
- Domains import only `component.ts` types from this module, through `engine`.
