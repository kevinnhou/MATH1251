# Environments

The **environment engine** (`mdx-env`) reads the typed blocks notes are written
in (`<Definition slug="span">`, `<Proof of="rank-nullity">`) at build time,
numbers and indexes them, resolves the slugs they cite into a course-wide
index, and renders them with a rail mark, footnotes and an ask menu.
Everything that knows about the course's structure (exports, the reading dock,
threads, the terminal, OG images) starts from what this module extracts.

The engine is subject-neutral: which tags exist, what they are called, how they
look and how prompts talk about them comes from domains. The authoring syntax
is in [Writing notes](../course/writing.md); the component contract is in
[Writing a domain](../domains.md#components). This doc covers what the engine
does with them.

`mdx-env` sits just above the foundation layer: it imports `markdown`, `result`
and the `course.config` binding (for the domains), and is imported by `course`,
`compile`, `export`, `relations` and `site`. Domains reach its contract
(`component.ts`) only as types, through `engine`.

## Files

```
src/lib/mdx-env/
  component.ts         the component contract (Domain, EnvironmentSpec, ComponentSpec, AskSpec), ROLES, ENV_STYLES, ENGINE_TAGS
  kinds.ts             createComponentRegistry(domains): merges and validates; the course's registry (ENV) and its helpers
  remark.ts            remarkMdxEnv: validates, indexes and rewrites each page
  occurrences.ts       collectComponents: domain component occurrences, and the text and template serialisers
  props.ts             literal prop values: literalConstants (export const), expressionValue
  page-envs.ts         PageEnvs: what remark leaves on each page; id helpers; component placeholders
  slug.ts              slug, slug-list and thread-tag parsers
  tenet.ts             TenetIndex: slugs → environments, citations (cited by); assertComponentSlugs
  thread.ts            ThreadIndex: threads and their members
  statement-html.ts    StatementView: a statement as a fragment plus a preview
  env-meta.ts          EnvView, RecallView: what one rendered environment needs
  kind-view.ts         per-kind pages ("Theorems from …"): records, URLs, TOC
  kind-view-tree.ts    adds kind views to the sidebar tree while one is open
  target.ts            PromptTarget (built by export, carried by EnvView)
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
```

## The remark pass

`remarkMdxEnv` runs on every page, once in the metadata pass and once in the
MDX compile ([Compile](compile.md#two-passes)). It:

1. rejects environments, recalls, threads and thread maps that are not direct
   children of the document;
2. finds every other component (`collectComponents`, `occurrences.ts`): fails
   on unknown JSX, on components inside tables and on non-literal props, and
   records each occurrence's tag, props, children (as text content) and
   position;
3. walks the top-level children in order, reading each environment (id, slug,
   `of`, `see`, difficulty, thread tags, headings, title, statement, body),
   recall and thread, and failing the build on any invalid attribute;
4. rewrites the tree: each environment is wrapped in `<KindFilter kind="…">`,
   each run of other content in `<Prose>`, threads and thread maps in
   `<Prose>`; recalls and ESM stay as they are;
5. leaves the result on the file as `file.data.envs`.

Lower-case JSX (HTML tags) is allowed anywhere. Every domain component, not
only those with export methods, fails inside a table. `remarkMdxEnv({ env })`
accepts another registry, so the plugin can run against any set of domains
(`test/components.test.ts` does).

### `PageEnvs`

| Field | Contents |
|---|---|
| `entries` | `EnvOccurrence` per environment: `id`, `kind`, `of`, `see`, `threads`, `headings`, and when present `slug`, `title`, `difficulty`, `statement`, `body` (Markdown), `templates` |
| `components` | `ComponentOccurrence` per domain component: `tag`, `props`, `children` (text content), `segment`, and `env` when it sits in one |
| `recalls` | `{ id, of }` per recall |
| `threads` | `{ id, slug, summary, title }` per thread definition |
| `segments` | the page in order: prose (as Markdown), environment ids and recall ids; exports rebuild page documents from it |

Bodies, statements, titles and prose are serialised back to Markdown with GFM,
MDX and the course's syntaxes (`TO_MARKDOWN_EXTENSIONS`). **Components are
serialised twice:**

- in `statement`, `body` and titles a component becomes its **text content**
  (its children): what search, previews, dock titles and thread stations see;
- prose segments, and an environment's `templates.statement` and
  `templates.body` (kept only when they differ from the text form), hold a
  **placeholder** instead (`componentPlaceholder(n)`), which the exports replace
  with the component's `markdown` or `context` output
  ([Export](export.md#components)).

Each occurrence records the `segment` it sits in (prose run, environment or
thread) and its enclosing environment, so an export method can see its
neighbours.

## Course indexes

`getCorpus` ([Compile](compile.md#the-corpus)) builds two indexes from every
page's `PageEnvs`:

**`TenetIndex`** (`tenet.ts`): `bySlug` maps each slug to its `Tenet` (kind,
page, occurrence id, `of`, `see`, difficulty, title fragment, compiled
statement with a 220-character preview). `citedBy` maps each slug to every
environment that lists it in `of` or `see` and every recall of it. Defining a
slug twice, or citing one that doesn't exist, fails the build
(`registerTenets`, `assertTenetIndex`); `assertComponentSlugs` does the same
for components' slug props.

**`ThreadIndex`** (`thread.ts`): each `<Thread>` definition, with members
collected from the `thread` attributes of environments anywhere in the course,
sorted by reading order. Each member carries its role and its compiled
statement, so members need no slug. A tag naming an undefined thread fails the
build.

Titles fall back to the slug (or the kind label) as a literal fragment when an
environment has no heading.

## The registry

`createComponentRegistry(domains)` (`kinds.ts`) merges every listed domain's
components, validates them ([Validation](../domains.md#validation)) and returns
the API the rest of the code uses. `ENV = createComponentRegistry(course.domains)`
is the course's, so a bad or clashing domain fails the first import of
`kinds.ts`, i.e. the build. Most members are re-exported:

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

## Kind views

Every page gets one generated page per kind it contains:
`/algebra/vector-spaces/spans/definitions` lists only the definitions of
`/algebra/vector-spaces/spans`. MATH1251 has 241 kind views over 62 pages.

- **Records** (`kind-view.ts`, `kindViewsFromPages`): URL `<page>/<plural>`,
  title "Definitions from Spans", tab title `[DEFINITIONS] Spans`, a chip, a
  description and terminal aliases. A kind view is skipped when a real page
  already exists at its URL.
- **Rendering:** the docs page renders the same MDX body with `viewKind` set.
  `KindFilter` renders only environments of that kind; `Prose` and `Recall`
  render nothing. `getKindViewToc` keeps only the TOC entries whose headings
  belong to that kind. Metadata, the canonical URL and indexing are in
  [Site](site.md#metadata-and-og-images).
- **Navigation:** each environment's rail mark on a notes page links to its
  kind view ("View all theorems on this page"). Kind views are not in the
  sidebar tree until one is open: then `withActiveKindViewPages` turns the
  parent page into a folder holding its kind views, so the reader can switch
  between them.

## Rendering

`getMDXComponents` (`components/mdx/index.tsx`) merges the Fumadocs defaults,
`getEnvMdxComponents`, `getThreadMdxComponents` ([Relations](relations.md#thread-sections))
and the domains' components from `course.components.ts`. A domain renderer
whose tag is an environment is passed to `getEnvMdxComponents` as that
environment's body, so it draws inside the engine's frame; the others are
registered as they are. The docs page passes the page's `PageEnvs`, title and
URL, the tenet, thread and course indexes, the thread map, a prompt-target
lookup and, on kind views, the view kind.

`getEnvMdxComponents` builds a `PageEnvContext` once per page and registers one
component per kind under its label. Each resolves an `EnvView` (`env-meta.ts`):
the occurrence's metadata, the resolved `uses`, `see` and `cited by` refs
(excluding the environment itself), and its prompt target.

**`Env`** (`env.tsx`) draws the frame: a two-column grid with the rail on the
left and the body on the right, `section` (or `div` with an `aria-label` for
untitled kinds), `id` for the anchor, and `data-env-kind` / `data-env-style`
hooks for CSS. When the environment has a prompt target it is wrapped in
`AskShare` ([Export](export.md#environments-recalls-and-threads-askshare)):
right-clicking it opens the ask menu, and touch screens get a visible `[ASK AI]`
button instead.

**`EnvMark`** (`mark.tsx`) is the rail: `[THEOREM]` set vertically, a hatched
rule down the rest of the rail, and the end mark if the kind has one. If the
environment is shorter than the word, the mark switches to the kind's code
(`[TH]`). The word's height is measured once per decoration, style and word
with a hidden probe (`mark-measure.ts`), cached, and re-measured after web
fonts load; one shared `ResizeObserver` watches every environment. On notes
pages the mark links to the kind view; in a recall it links to the original.

**`Footnotes`** lists, numbered, the environments its `of` names (what it uses,
derives or practises, by kind), those it points to with `see`, and the first
four that cite it, de-duplicated, with an "N more" link to the page (where the
reading dock lists every citation). Practice kinds show their difficulty above.

**`Recall`** renders an `Env` of the original's kind containing its title and
statement, linked back with "Go to original". It renders nothing on kind
views.

## Design decisions

1. **Environments are top-level siblings.** Requiring every environment,
   recall and thread to be a direct child of the document makes a page a flat
   sequence of prose and environments. That lets the plugin number them,
   record `segments` in reading order for exports, and filter a page to one
   kind with a wrapper instead of walking nested trees. Nesting is a build
   error, not a silently unindexed block.
2. **Metadata is static.** `slug`, `of`, `see`, `difficulty`, `thread` and
   `summary` must be literal strings because they are read by a remark pass
   that never evaluates JavaScript. An expression attribute would be invisible
   to the index, so it is rejected.
3. **Citations use slugs, not URLs.** Slugs are unique across the course.
   Moving a theorem to another page changes no citation, and a typo or a
   deleted slug fails the build instead of producing a dead link.
4. **Anchors are generated per kind.** Ids are `theorem-3`, not the slug,
   because many environments (examples, proofs) have no slug, and a uniform
   scheme keeps anchors predictable. The cost: inserting a theorem above
   another shifts the latter's anchor, and node ids in exports and the dock
   move with it. Slugs are the stable handle.
5. **Statements are separate from bodies.** A statement is the part worth
   repeating: in a recall, a preview, a thread station, the dock and prompt
   context. Marking it with `<Statement>` lets all of those use a short
   Markdown fragment rendered without MDX, instead of compiling and truncating
   the whole body.
6. **Recall restates from the index.** A recall shows the original's title and
   statement from the tenet index rather than transcluding its MDX. That keeps
   recalls cheap, consistent with previews, and countable as citations, so a
   definition knows which later pages recall it.
7. **Kind views reuse the page's body.** A kind view is the same compiled page
   rendered with a filter, not a separate document. There is one body module
   per page, kind views can't drift from their page, and adding one costs no
   compile. The cost: a kind view loads the full page body and discards most
   of it.
8. **Kind views stay out of the sidebar until used.** 241 extra entries would
   bury the notes. They appear only beside the one being read, and are reached
   from the rail marks and the terminal (search folds their hits into the
   parent page).
9. **The engine names no kind.** Code asks the registry about roles,
   properties (`decoration`, `endMark`, `style`) and each component's wording
   (`ask`, `relation`, `untitledTitle`).
10. **Domains are validated at load.** The registry checks the merged
    components when it is created, so an ambiguous set (two kinds with the same
    plural would share a URL; two domains defining `Example` would clash; a
    kind called `page` would collide with page nodes) stops the build with a
    list of problems instead of producing subtle collisions.
11. **Kinds and difficulties are `string`.** The engine can't know a course's
    names at compile time. Unknown tags are not environments, looking up an
    unknown kind throws, and role checks return `false`. (`Strand`, by
    contrast, is a literal union taken from the config.)
12. **Wrappers are invisible to the stringifier.** `KindFilter`, `Prose` and
    `Thread` carry `_stringify: "children-only"`, so Fumadocs' structured data
    and search text contain their contents but not the wrapper tags.
13. **Only the frame is a client component.** `Env` and `EnvMark` are client
    components (the ask menu and the measurement need the DOM), but the body is
    passed as `children`, so the MDX content itself stays server-rendered HTML.
14. **The rail measures itself.** Whether a vertical word fits depends on the
    rendered height of the environment, which CSS can't compare with the word's
    length. Measuring once per word and sharing one observer keeps it cheap
    even on pages with dozens of environments.

## Performance

- Parsing and indexing happen at build time; at request time nothing in this
  module runs except rendering (which happens at build too).
- `remarkMdxEnv` runs twice per page ([Compile](compile.md#design-decisions)).
- Statements are compiled to fragments, with previews, once per slug in the
  tenet index, not per use (thread members compile their own once more).
- `EnvMark` measurement is cached by key and invalidated only when fonts load;
  `ResizeObserver` callbacks re-check only the environments that resized.
- Kind views add no compile work. They are not prerendered: each renders the
  full page body on its first request and is then cached.

## Limitations

In [Limitations](../limitations.md#authoring).

## Changing things

**A new environment or component:** a domain change ([Writing a domain](../domains.md#recipes)).

**A new attribute:** add it to `METADATA_ATTRIBUTES` (so it must be static),
read it in `readEnv`, store it on `EnvOccurrence`, and carry it into `Tenet` or
`EnvView` where it is needed. Document it in
[Writing notes](../course/writing.md#attributes).

**A new role:** add it to `ROLES`, give it engine behaviour (a role check in
`kinds.ts`, `ROLE_EDGES` and its edges in the export graph), and use it from a
domain ([Architecture](architecture.md#changing-things)).

**A new engine element:** add its tag to `ENGINE_TAGS` in `component.ts` (no
domain can then claim the name, and `remark.ts` accepts it as an `EngineTag`),
handle it in `rewriteDocument`, add it to `ROOT_ELEMENTS` if it must be
top-level, and register its component.

## Invariants

- Nothing outside `packages/` names a component or kind; code asks the registry.
- Environments, recalls, threads and thread maps are direct children of the
  document.
- Metadata attributes are static strings.
- Every slug is defined once in the course, and every cited slug exists.
- Every thread tag names a defined thread.
- Ids are generated: `<kind>-<n>`, `recall-<slug>-<n>`, `thread-<slug>`.
- Kind-view URLs are `<page>/<lower-cased plural>` and never shadow a real page.
- The merged components pass the registry's checks.
- Every JSX element is a listed component, an engine element or an HTML tag;
  component props are literals.
- Both runs of `remarkMdxEnv` produce the same `envs`.
- Domains import only `component.ts` types from this module, through `engine`.
