# Export

The export module turns the course into material for language models and
other programs. It builds one **export graph** of nodes (pages and
environments) joined by typed edges, and renders every export from it: a
Markdown document and a ranked prompt context per node, `llms.txt`,
`llms-full.txt` and `graph.json`. It also owns the "Ask AI" prompts: the
graph decides which prompts a node offers, the browser packs the node's
context into a provider URL (ChatGPT, Claude, Cursor), and the ask panel,
the page header buttons and the terminal's ask commands launch them. There
is no API key and no backend: every export is a static file and every prompt
is an ordinary link.

`lib/export` sits in the `compile`/`export` layer. It reads the foundation
(`lib/client`, `lib/url`), `mdx-env` (the kind registry, tenet and thread
indexes, `PromptTarget`) and `course` (config, strands, `catalogRoute`).
`relations` (the dock and course index read `model.ts` and `query.ts`),
`terminal` (`prompt.ts`, `client.ts`, `urls.ts`) and `site` (`getCorpus()`
builds the graph) sit above it. `components/export` is used by the docs page,
`components/mdx-env` (every environment) and `components/threads` (every
thread section). Layering rules are in README.md.

## Layout

```
src/lib/export/
  model.ts           nodes, edges, relation names, tiers, PromptContext
  build.ts           buildExportGraph: page envs + tenets + threads > ExportGraph
  query.ts           graph readers: children, derivations, relationsOf, prerequisites
  urls.ts            export routes; node ID <> file path, both formats
  format.ts          frontmatter, links, relation lines
  documents.ts       Markdown: page, environment, kind view, thread, llms.txt
  context.ts         prompt targets and ranked prompt context
  prompt.ts          intents, providers, task text, URL-budget packing (client-safe)
  server.ts          server-only: resolve a file path, render it, static params, graph.json
  client.ts          browser: cached fetches, openPrompt
  use-prompt.ts      usePrompt: remembered intent and provider, launch, blocked state
  use-copy.ts        useCopyMarkdown: copy a node's Markdown with status

src/components/export/
  ask-panel.tsx      AskPopup (sentence with two reels), BlockedLink, EXPORT_BUTTON_CLASS
  page-actions.tsx   PageActions: the page header's "Ask AI" popover
  copy-markdown.tsx  LLMCopyButton: the page header's "Copy Markdown"
  share.tsx          AskShare: right-click panel and corner hint (environments, threads)
  llm-logos.tsx      provider logos (and the GitHub logo)

src/app/llms.mdx/docs/[[...slug]]/route.ts     Markdown per node
src/app/llms.mdx/context/[[...slug]]/route.ts  prompt context per node
src/app/llms.txt/route.ts                      index
src/app/llms-full.txt/route.ts                 every page document
src/app/graph.json/route.ts                    nodes, edges, threads

src/lib/mdx-env/target.ts        PromptTarget (lives below export so mdx-env and course can carry it)
src/lib/packs/math/env.ts        derivation and prompts: the pack's prompt wording
src/lib/site/corpus.ts           builds the graph once per worker; catalog targets
src/lib/site/text-response.ts    text/plain inline response (SITE.md)
src/lib/terminal/commands.ts     md, gpt/chatgpt, claude, cursor (parsing: TERMINAL.md)
src/components/terminal/run.ts   CommandRuntime: loadMarkdown, openPrompt
```

## The export graph

`buildExportGraph(pages, tenets, resolvePageHref, kindViews, threadIndex)`
(`build.ts`) runs once per worker inside `getCorpus()` (COMPILE.md), after
the tenet index and `createThreadIndex`. Its input is corpus metadata only:
each page's frontmatter, its `PageEnvs` from `remarkMdxEnv` (MDX-ENV.md) and
its extracted link hrefs. It never loads a compiled page body.

```ts
interface ExportGraph {
  nodes: Map<id, ExportNode>;            // pages and environments
  edges: ExportEdge[];                   // { kind, source, target }
  outgoing, incoming: Map<id, ExportEdge[]>;
  position: Map<id, number>;             // stable sort key, see below
  segments: Map<pageId, ExportSegment[]>;// each page's prose, envs and recalls in order
  kindViews: Map<id, ExportKindView>;    // side map, not nodes
  threads: Map<id, ExportThread>;        // side map, not nodes
  threadsOf: Map<envId, { thread, role? }[]>;
}
```

### Nodes and IDs

A node ID is the node's site path, so every ID is also a link on the site.

| Target | ID | Example |
|---|---|---|
| page | page URL | `/algebra/complex-numbers/complex-polynomials` |
| environment | page URL `#` anchor | `/algebra/complex-numbers/complex-polynomials#theorem-1` |
| kind view | kind-view URL | `/algebra/complex-numbers/complex-polynomials/proofs` |
| thread | defining page URL `#thread-<slug>` | `/core#thread-coordinates` |

Anchors come from `remarkMdxEnv`: `<kind>-<n>` per kind in source order,
`thread-<slug>` for a `<Thread>` section, `recall-<slug>-<n>` for a recall.
Pages and environments are `ExportNode`s. Kind views and threads are kept in
side maps (see [Design decisions](#design-decisions)), but get their own
files and prompt targets like nodes.

| `ExportNode` field | Set for | Notes |
|---|---|---|
| `id`, `type`, `kind`, `title`, `label` | all | `type` is `page` or `env`; `kind` is the env kind or `"page"` |
| `strand` | nodes on a strand page | absent for a page outside every strand folder |
| `description`, `ideas`, `tags` | pages | frontmatter; empty ones are left out |
| `page`, `slug`, `difficulty` | environments | `slug` only if the env declares one |
| `statement`, `body` | environments | Markdown source rebuilt by `remarkMdxEnv` |

`label` is what every export and prompt shows: the page title,
`Theorem. Remainder theorem`, or the bare kind label when untitled.
`labelDerivations` then relabels each untitled environment that has
outgoing `proves` edges: `Proof of Theorem. Remainder theorem`, or
`Proof of Lemma. A and Lemma. B` (`Intl.ListFormat`) when it proves several.
All 55 proofs in MATH1251 are untitled and relabelled this way.

`position` is each node's index in `nodes`: source-file order from
fumadocs' `getPages()` (alphabetical by path, so a chapter's `index.mdx`
sorts among its children), each page followed by its environments in source
order. It is only a stable tie-breaker for relation lists; it is **not**
reading order. Reading order lives in `relations` (`courseOrder`, RELATIONS.md)
and in each page's `segments`.

`segments` keeps a page's body as it reads: prose (Markdown serialised at
compile time), its own environments and its recalls, the last two as node IDs
(a recall's ID is the original environment's). Segments whose node is missing
are dropped at build time, so a page document can be rendered from the graph
alone.

### Side maps: kind views and threads

**Kind views** (`ExportKindView`: `id`, `kind`, `label`, `parentId`) are
registered for every `KindViewRef` whose parent page is a node (MDX-ENV.md
decides which kind views exist). The label is
`<Plural> from <page label>`, e.g. `Proofs from Complex polynomials`.

**Threads** (`ExportThread`) mirror the `ThreadIndex` (RELATIONS.md owns
what threads mean): members whose node is missing are dropped and members
stay in course order. `threadsOf` indexes memberships by environment.

| `ExportThread` field | Notes |
|---|---|
| `id` | `<defining page>#thread-<slug>`, the section's anchor (`/core#…` in MATH1251) |
| `label`, `title` | the heading as plain text, and as Markdown source |
| `summary` | Markdown source of the `summary` attribute |
| `pageId`, `slug` | the defining page and the slug |
| `members` | `{ id, role? }`: the environment's node ID and its role (Markdown source) |

### Edges and relations

| Edge | From > to | Emitted for | Forward / backward name |
|---|---|---|---|
| `contains` | page > its env | every environment | `contains` / `part_of` |
| `uses` | env > tenet | `of` on a kind whose `of` is `uses` | `uses` / `used_by` |
| `proves` | env > tenet | `of` on a kind whose `of` is `proves` | `proves` / `proved_by` |
| `practises` | env > tenet | `of` on a kind whose `of` is `practises` | `practises` / `practised_by` |
| `see` | env > tenet | `see` | `see_also` / `see_also` |
| `references` | page > page | a prose link from a strand page that resolves to a strand page | `references` / `referenced_by` |
| `recalls` | page > original env | `<Recall of>` of an environment on another page | `recalls` / `recalled_by` |

The edge kind for an `of` citation is the citing kind's `of` field in the
course's pack (`EnvPack.kinds`, MDX-ENV.md). A kind with `of: "proves"` is a
**derivation** (math: Proof) and one with `of: "practises"` is **practice**
(math: Example). Export code asks `isDerivation`/`isPractice`; it never
names a kind. Which edges count as dependencies (`DEPENDENCY_EDGES`: `uses`,
`proves`, `practises`) is set here; RELATIONS.md covers how the dock reads
them.

The builder drops edges whose ends are not both nodes, self-loops and
duplicates (same kind, source and target). MATH1251 builds 697 nodes
(76 pages, 621 environments) and 1,945 edges: 621 `contains`, 391
`references`, 370 `practises`, 363 `uses`, 121 `recalls`, 55 `proves`,
24 `see`.

`RELATION_NAMES`, `RELATION_LABELS` and `RELATION_ORDER` in `model.ts` are
the only place relation names are spelled; documents, contexts, `llms.txt`
and `graph.json` all read them. `relationsOf(graph, id, names)` reads both
directions, keeps one entry per (name, node), and sorts by `names` order,
then `position`. `see` has the same name both ways, so a mutual `see` lists
once.

**Derivations.** `derivationsOf(id)` is every node with a `proves` edge to
`id`. `attachedDerivations(node)` is that list, or nothing when the node is
itself a derivation. It is the one decision behind the proofs printed under
a theorem in its Markdown, the proof blocks in its prompt context and its
`hasDerivation` flag.

### Prerequisites

`prerequisites(graph, id)` (`query.ts`) returns transitive dependencies with
their distance.

- **Start set:** a page's environments; for an environment, itself plus its
  derivations, so what a proof uses counts as the theorem's.
- **Distance:** breadth-first steps from the start set along
  `DEPENDENCY_EDGES`.
- **Order:** depth-first post-order, so foundations come before what builds
  on them.
- **Excluded:** the start set and, for a page, its own environments. An
  environment's list can include other environments on its page.

The Markdown keeps the 40 nearest (`PREREQUISITE_LIMIT`), printed
foundations first, and ends with `- +N more distant prerequisites`. The
prompt context sorts them nearest first, so the URL budget drops the most
distant ones first. The reading dock's "builds on" list (`needs`) uses the
same function (RELATIONS.md).

## Files and routes

| Route | Content | Rendered by |
|---|---|---|
| `/llms.mdx/docs/<page>/content.md` | page document | `pageDocument` |
| `/llms.mdx/docs/<page>/<anchor>.md` | environment document | `envDocument` |
| `/llms.mdx/docs/<page>/<plural>/content.md` | kind-view document | `kindViewDocument` |
| `/llms.mdx/docs/<page>/thread-<slug>.md` | thread document | `threadDocument` |
| `/llms.mdx/context/…/<same>.json` | prompt context for the same targets | `renderPromptContext` |
| `/llms.txt` | index: conventions, data links, threads, pages by strand | `indexDocument` |
| `/llms-full.txt` | every page document, by URL | `llmsFullText` |
| `/graph.json` | every node, edge and thread | `exportGraphJson` |

Every route is static (`revalidate = false`). The two per-node routes
prerender every page, environment, kind view and thread
(`exportStaticParams`) and set `dynamicParams = false`, so an unknown path is
a 404 without running any code. MATH1251 produces 943 files per format:
76 pages, 621 environments, 241 kind views, 5 threads.

`urls.ts` maps between IDs and files both ways. `nodeFileSegments(id, format)`
splits the path into folders and names the file after the anchor, or
`content` when there is none; `parseNodeFile(segments, format)` reverses it.
A kind view's ID has no anchor, so its files sit in a folder named after the
plural; a thread's anchor puts its files next to the defining page's
environment files. `content` is therefore a reserved anchor:
`nodeFileSegments` throws on it, which fails the build (no current anchor
scheme can produce it). Build export URLs with `nodeMarkdownUrl` and
`nodeContextUrl`, never by concatenating paths.

`resolveExportTarget(graph, segments, format)` (`server.ts`) parses the path
and looks the ID up in `nodes`, then `kindViews`, then `threads`. All three
come from one build, so an ID that resolves always renders.

Markdown, `llms.txt` and `llms-full.txt` are served by `textFileResponse` as
`text/plain; charset=utf-8` with `Content-Disposition: inline` and a file name:
for a node, a flat one from `nodeFileName`
(`algebra-complex-numbers-complex-polynomials-theorem-1.md`). Contexts and
`graph.json` are `application/json`. `src/proxy.ts` also serves a page's
`content.md` for `/<page>.md` and for `Accept: text/markdown` (SITE.md); it
depends on `docsContentRoute` and the `content.md` name.

## Markdown documents

Every document is YAML frontmatter, a level-1 heading, a body, then
`## Prerequisites` and `## Relations` when they have entries. Frontmatter
keys always come in `FRONTMATTER_KEYS` order (`id`, `type`, `kind`,
`title`, `course`, `strand`, `strand_label`, `page`, `slug`, `difficulty`,
`markdown`, `tags`, `ideas`); empty values are left out, and a string is
JSON-quoted only when it would not read as plain YAML. Links point at node
IDs, never at `.md` files.

| Type | Frontmatter | Body | Prerequisites | Relations |
|---|---|---|---|---|
| page | `id type title course strand strand_label markdown tags ideas` | description, then `segments` in order: prose as written; each environment as a level-3 card (ID and difficulty line, `#### Statement`, body, at most 8 links per relation, `CARD_RELATION_LIMIT`); each recall as a `### Recall:` card linking and quoting the original | yes | all except `contains`/`part_of` |
| env | `id type kind title course strand page slug difficulty markdown` | `From [page].`, `## Statement`, the body (headed `## Proof` for a derivation, `## Notes` after a statement, otherwise unheaded), then a `## Proof` section per attached derivation | yes | all except `contains`/`part_of`, then a `- Thread:` line per thread |
| kind view | `id type kind title course strand page markdown` | one line linking the page, then a level-2 card per environment of the kind | no | no |
| thread | `id type title course page slug markdown` | the summary, a line naming the defining page and the number of places, then one `##` section per place: role, page, statement | no | no |

Derivation headings use the kind's label (`getKindLabel`), so a programming
pack's Solution prints `## Solution`.

A real environment document
(`/llms.mdx/docs/algebra/complex-numbers/complex-polynomials/theorem-1.md`):

```markdown
---
id: /algebra/complex-numbers/complex-polynomials#theorem-1
type: env
kind: theorem
title: Remainder theorem
course: "MATH1251 Mathematics 1B (UNSW Sydney)"
strand: algebra
page: /algebra/complex-numbers/complex-polynomials
slug: remainder-theorem
markdown: /llms.mdx/docs/algebra/complex-numbers/complex-polynomials/theorem-1.md
---

# Theorem. Remainder theorem

From [Complex polynomials](/algebra/complex-numbers/complex-polynomials).

## Statement

When $p(z)$ is divided by $z-\alpha$, the remainder is the complex number $p(\alpha)$.

## Proof

Polynomial division gives
…

## Prerequisites

Transitive `uses`/`proves` dependencies defined elsewhere, foundations first.

- [Definition. Complex number](/algebra/complex-numbers/complex-arithmetic#definition-1) (in [Complex arithmetic](/algebra/complex-numbers/complex-arithmetic))
- [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1) (in [Complex polynomials](/algebra/complex-numbers/complex-polynomials))
- [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3) (in [Complex polynomials](/algebra/complex-numbers/complex-polynomials))

## Relations

- Uses: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3)
- Proved by: [Proof of Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#proof-1)
- Used by: [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)
```

The theorem has no body of its own; `## Proof` is its attached derivation.

### `llms.txt` and `llms-full.txt`

`indexDocument` writes the course title, the pack's `summary`, conventions (ID
scheme, Markdown and context file paths with an example on the first non-home
strand, the thread ID pattern, the document shape, every relation name), links
to `graph.json`, `llms-full.txt` and `catalog.json`, every thread with its
summary and number of places, then one section per strand (`STRAND_LABELS`)
listing its pages by URL with their description and a census of environment
kinds. Pages outside every strand would go under `## Optional`; MATH1251 has
none. From the build (111 lines, 19.5 KB):

```markdown
# MATH1251 Mathematics 1B (UNSW Sydney)

> Lecture notes as a graph of pages and math environments (definitions, theorems, proofs, examples, …) linked by typed relations.

## Conventions

- Node IDs are site paths: a page is `/strand/page`, an environment is `/strand/page#anchor`. Every link in the exports points at a node ID.
- Markdown for any node: `/llms.mdx/docs/algebra/x/content.md` for a page, `/llms.mdx/docs/algebra/x/thm-y.md` for one environment.
…

## Data

- [Knowledge graph](/graph.json): every node and typed edge as JSON
- [Full notes](/llms-full.txt): every page document concatenated
- [Catalog](/catalog.json): page and kind-view index used by site search

## Threads

- [Coordinates and linear structure](/llms.mdx/docs/core/thread-coordinates.md): A basis turns vectors and maps into columns and matrices; a good basis makes the calculation simple. (5 places)
…

## Algebra

- [Complex polynomials](/llms.mdx/docs/algebra/complex-numbers/complex-polynomials/content.md): Complex coefficients, roots, factorisation and real factors. — 5 definitions, 6 examples, 5 theorems, 4 proofs, 1 corollary, 2 propositions
```

`llms-full.txt` is every page document (not environment, kind-view or
thread documents) in URL order, joined by blank lines: 1.1 MB.

### `graph.json`

```ts
{
  course: string;                      // course.title
  edges: { kind, source, target }[];
  nodes: (ExportNode minus body and statement, plus markdown: string)[];
  relations: typeof RELATION_NAMES;    // the name of each edge from either end
  threads: (ExportThread & { markdown: string })[];
}
```

Bodies and statements are left out; each node's `markdown` URL has the full
text. The file is 577 KB. Nothing on the site reads it; it is for external
consumers, linked from `llms.txt`.

## Prompts

A prompt is a provider URL with the whole prompt in its query string. It is
assembled from three pieces, each computed where its inputs are:

1. **Target** (`PromptTarget`, server, at render): `id`, `label`, `kind`,
   `type`, `hasDerivation`. Small, already on the page, and enough to decide
   which intents to offer.
2. **Context** (`PromptContext`, server, at build): the target plus ranked
   `blocks`, served as `/llms.mdx/context/….json` and fetched on demand.
3. **Prompt** (`prompt.ts`, browser, on click): context + intent + provider
   + `window.location.origin`, packed into at most 8,000 URL characters.

```mermaid
flowchart LR
    graph["exportGraph<br/>(getCorpus)"] --> targets["envTarget / pageTarget /<br/>kindViewTarget / threadTarget"]
    targets --> catalog["catalog.json<br/>(terminal)"]
    targets --> page["page.tsx<br/>PageActions"]
    targets --> mdx["MDX options<br/>AskShare on envs, recalls, threads"]
    graph --> ctx["envContext / pageContext /<br/>kindViewContext / threadContext"] --> file["/llms.mdx/context/….json"]
    catalog & page & mdx --> open["openPrompt(target, intent, provider)"]
    file -. "fetched, ≤ 3 s" .-> open
    open --> url["provider URL in a new tab"]
```

### Targets

`context.ts` is the only place that decides target facts, and each context
builder spreads its target, so a target and its context always agree.

| Type | `kind` | `label` | `hasDerivation` | Reaches the client through |
|---|---|---|---|---|
| `env` | env kind | node label | it is a derivation, or a derivation proves it | `page.tsx` passes `promptTarget` into the MDX options; `resolveEnv`/`resolveRecall` set `EnvView.prompt`; `Env` wraps itself in `AskShare` when it is set |
| `page` | `"page"` | page title | `false` (the derivation kind view offers the walk) | `page.tsx` > `PageActions`; `CatalogPage.prompt` |
| `kind-view` | the view's kind | `Proofs from <page>` | the kind is a derivation | the same, on kind-view pages |
| `thread` | `"thread"` | plain title | `false` | MDX options > `ThreadSection` > `ThreadFrame` > `AskShare` |

A recall's target is the original environment's. `remarkMdxEnv` gives every
recall an anchor, so every recall has the panel. On the page, a missing
target is a 404 (`promptTargetFor(…) ?? notFound()`). The catalog carries a
target for each of its 317 entries (76 pages, 241 kind views); a route
outside the catalog is a `RoutePage` with none.

### Context tiers

The server splits each target's material into short blocks, each with a
tier. Tier order (`CONTEXT_TIERS`) is the order blocks are kept, and so the
order they are dropped from the end.

| Tier | Heading in the prompt | `env` | `page` | `kind-view` | `thread` |
|---|---|---|---|---|---|
| `core` | none | heading line (label, page, strand, ID, difficulty); statement; body unless it is notes; each attached derivation; notes last | heading line and description; key ideas; contents | `<label> (<page ID>), without the surrounding lecture prose.`; contents | title, ID and summary; the places in order with role and page |
| `relations` | `Direct links:` | proves, uses, practises, recalls, references, see also; then each thread it is in, with role and summary | the same outgoing names (in practice recalls, references) | none | none |
| `details` | `Statements:` | none | each environment's statement | each environment's statement and body | each place's statement, with its role |
| `prerequisites` | `Prerequisites the student may assume (nearest first):` | label, plus the statement when it is at most 600 characters | the same, for the page | the parent page's | none |
| `backlinks` | `Used elsewhere:` | used by, practised by, recalled by, referenced by | the same | none | none |

Relation and backlink blocks list titles only (`Uses: A; B.`): they point
the tutor at the material rather than quote it. `proved_by` is not among
them because the proofs are already in `core`. The context for the theorem
above, from the build:

```json
{
  "blocks": [
    { "text": "Theorem. Remainder theorem on \"Complex polynomials\" (Algebra · /algebra/complex-numbers/complex-polynomials#theorem-1)", "tier": "core" },
    { "text": "Statement:\nWhen $p(z)$ is divided by $z-\\alpha$, the remainder is the complex number $p(\\alpha)$.", "tier": "core" },
    { "text": "Proof:\nPolynomial division gives\n\n$$\np(z)=(z-\\alpha)q(z)+r,\n$$\n\n…", "tier": "core" },
    { "text": "Uses: Definition. Polynomial root.", "tier": "relations" },
    { "text": "- Definition. Polynomial root: A number $\\alpha\\in\\mathbb C$ is a *root* of $p$ if\n\n$$\np(\\alpha)=0.\n$$", "tier": "prerequisites" },
    { "text": "- Definition. Complex polynomial: …", "tier": "prerequisites" },
    { "text": "- Definition. Complex number: …", "tier": "prerequisites" },
    { "text": "Used by: Theorem. Factor theorem.", "tier": "backlinks" }
  ],
  "hasDerivation": true,
  "id": "/algebra/complex-numbers/complex-polynomials#theorem-1",
  "kind": "theorem",
  "label": "Theorem. Remainder theorem",
  "type": "env"
}
```

The file repeats the target for a model that fetches it directly. The client
reads only `blocks` and keeps the target it already holds.

### Packing

`buildPrompt` writes three tagged sections:

```
<role>
You are a tutor for MATH1251 Mathematics 1B (UNSW Sydney).
Ground every answer in <context>: keep its notation, names and methods, …
<course.tutor> Do not echo these tags.
</role>

<context title="Theorem. Remainder theorem" source="https://<origin>/algebra/…#theorem-1" markdown="https://<origin>/llms.mdx/docs/algebra/…/theorem-1.md">
Theorem. Remainder theorem on "Complex polynomials" (Algebra · …)

Statement:
…

Direct links:

Uses: Definition. Polynomial root.

Prerequisites the student may assume (nearest first):

- Definition. Polynomial root: …

[N lower-priority item(s) omitted for length; full notes: <markdown URL>]
</context>

<task intent="explain">
Explain this result: what it says, why it is true, …
</task>
```

1. Block text is sanitised so it cannot close `</role>`, `</context>` or
   `</task>` (any case, any inner whitespace); attribute values are escaped.
2. Blocks are sorted by tier, stable within a tier.
3. The budget is `URL_LIMIT` (8,000) less the full provider URL of the empty
   frame, less a reserve for the longer of the two closing notes (the
   omission note counted with every block omitted, or the "No excerpt is
   included. Fetch …" note).
4. Each block is added if it, plus its tier heading when it opens the tier,
   fits. Encoded lengths add up because `URLSearchParams` encodes character
   by character, so each block is measured once.
5. A `core` block that does not fit is cut instead, while the remaining
   budget exceeds its prefix plus `TRUNCATION_FLOOR` (one block break and
   two markers): at a paragraph boundary, or failing that by binary search
   that never splits a surrogate pair, ending in
   `[… truncated; the full text is at the markdown URL]`.
6. A block from any other tier that does not fit is skipped, and packing
   carries on, so a shorter block after it, even from a later tier, can
   still get in.
7. The context ends with the omission note, or, when no block fit at all,
   the "fetch the Markdown URL" note.

Because notes come after proofs in `core`, a long note is cut before any
proof is. Replaying the packing over the built context files (explain,
Claude, a short origin): the frame takes about 1,170 encoded characters and
the reserve about 235, leaving about 6,600 for blocks; about 120 of the 943
targets drop at least one block (mostly long environments and kind views),
and about a dozen environments have a `core` block cut.

### Intents

`PROMPT_INTENTS` is `explain`, `derive`, `quiz`, `check`, in menu order.

| Intent | Terminal word | Label | Opener in the panel | Offered when |
|---|---|---|---|---|
| `explain` | `explain` | Explain | Explain | always (the default) |
| `derive` | pack `derivation.intent` (math: `proof`) | pack `derivation.label` (Walk the proof) | `derivation.phrase` (Walk the proof of), or `selfPhrase` (Walk through) when the target's kind is a derivation (a proof, or a Proofs kind view) | `hasDerivation` |
| `quiz` | `quiz` | Quiz me | Quiz me on | always |
| `check` | `check` | Check my work | Check my work on | `env` targets |

So an environment offers explain, quiz and check, plus derive when it is or
has a proof; a page, a non-derivation kind view and a thread offer explain
and quiz; a Proofs kind view offers explain, derive and quiz.
`intentsFor(target)` is the only availability check: the panel shows only
what it returns and the terminal rejects anything else.

Task text by target:

| Intent | `env` | `env`, practice kind | `page`, `kind-view` | `thread` |
|---|---|---|---|---|
| `explain` | pack `prompts.explain` | pack `prompts.explainPractice` | engine: a short map of how the ideas build, then ask where to start | engine: state the shared idea, walk the places in order, say where the analogy stops, summarise |
| `derive` | pack `derivation.task` | pack `derivation.task` | pack `derivation.task` (derivation kind views only; pages never offer it) | not offered |
| `quiz` | engine, about the pack's `prompts.subject` (this result) | pack `prompts.quizPractice` | engine, about "this material" (`quizPractice` for a practice kind view) | engine: questions about the links between places |
| `check` | pack `prompts.check` | pack `prompts.check` | not offered | not offered |

The role's last line is `course.tutor` from `course.config.ts`, followed
by "Do not echo these tags."
The panel names the subject with `subjectPhrase`: `this page`,
`this thread`, `these proofs` for a kind view, `this theorem` for an
environment.

The pack supplies everything about `derive` except its internal name.
`assertEnvPack` (MDX-ENV.md) requires `derivation.intent` to be one
lower-case word, and `prompt.ts` throws on load if it equals another
intent's word (`explain`, `quiz`, `check`), so `intentFromWord` can never
confuse the two. The check lives here, next to the words, because
`mdx-env` cannot import `export`.

### Providers

| Provider | Endpoint | Query key | Terminal names |
|---|---|---|---|
| `chatgpt` | `https://chatgpt.com/` | `prompt` | `gpt`, `chatgpt` |
| `claude` (default) | `https://claude.ai/new` | `q` | `claude` |
| `cursor` | `https://cursor.com/link/prompt` | `text` | `cursor` |

## Client

`client.ts` is the only browser code that fetches exports. Surfaces and the
terminal pass it node IDs, never URLs.

- **Caching:** `loadMarkdown(id)` and the context loader keep one promise
  per ID for the page's lifetime (module-level maps). A failed load is
  evicted, so the next attempt retries.
- **Timeout:** each fetch aborts after 8 s (`FETCH_TIMEOUT_MS`). The files
  are static, so a slower response means a stalled connection.
- **Validation:** a context must be an object whose `blocks` all have a
  string `text` and a known tier (`isContextBlocks`), or the load fails.
- **Fallback:** the prompt's context load never rejects. On any failure
  (offline, timeout, 404, a format the running code does not recognise) it
  returns the target with no blocks: the intent and task stay right and the
  prompt asks the model to fetch the Markdown URL.
- **Prefetch:** `prefetchContext(id)` warms the context when the pointer or
  focus reaches "Ask AI" or an environment's hint, and when a panel opens.
  `prefetchMarkdown(id)` runs only when an `AskShare` panel opens, since its
  `COPY .MD` is the only copy that can follow.

### Opening a prompt

`openPrompt({ target, intent, provider })`:

1. calls `window.open("about:blank", "_blank")` synchronously, before its
   first `await`, while the click or key press still counts as a user
   gesture;
2. writes `Preparing the prompt for <Provider>…` into the blank tab (same
   origin, so it can);
3. races the context load against 3 s (`PROMPT_WAIT_MS`), falling back to
   the link-only context; a slow fetch carries on and warms the cache;
4. builds the URL with `promptUrl`;
5. sets `opener = null` and calls `location.replace(url)`, so the provider
   page cannot reach the site's window and Back does not return to the
   blank tab.

If the tab was blocked (or closed during the wait) it returns
`{ status: "blocked", url }`; otherwise `{ status: "opened" }`. It never
rejects. Callers must not `await` anything before calling it, which is why
intents are decided from the target in hand, never from fetched data.

### `usePrompt` and stored preferences

`usePrompt(target)` returns the offered `intents`, the current `intent` and
`provider`, their setters, `launch`, `prefetch`, and `blocked`
(`{ provider, url }` after a blocked launch, cleared by the next launch or
`dismissBlocked`).

Intent and provider are stored in `localStorage` (`export:intent`,
`export:provider`, defaulting to `explain` and `claude`) through a small
store read with `useSyncExternalStore`: every surface on the page shares
it, and the `storage` event syncs other tabs. A student who quizzes
themselves in ChatGPT keeps doing so from page to page. The server snapshot
is the default, and storage errors (private mode, blocked storage) fall back
to it silently.

- The store holds engine intent names (`derive`), not pack words, so a
  change of pack or of the pack's word never invalidates it.
- A target that does not offer the stored intent shows `explain` without
  overwriting the stored choice.
- A stored `proof` reads as `derive`. `proof` was the intent's internal name
  before the engine/pack split; the alias keeps those stored preferences
  working and costs nothing for other packs.

### `useCopyMarkdown`

`useCopyMarkdown(id)` copies through `copyPendingText(loadMarkdown(id))`,
which hands the clipboard a `ClipboardItem` holding a promise, so Safari
keeps the click's gesture while the file loads, and falls back to
`writeText` after the fetch. Status goes `idle` > `copying` > `copied`
(reset after 1.5 s) or `failed` (after 2.5 s); clicks while copying are
ignored.

## Surfaces

### Page header

`page.tsx` renders `PageActions` ("Ask AI", a `Popover.Trigger`) and
`LLMCopyButton` ("Copy Markdown") under the description, for pages and
kind views alike, as flat mono buttons (`EXPORT_BUTTON_CLASS`) that lift onto
the site's offset shadow on hover or while open. `PageActions` passes a
GitHub `SOURCE` link on pages (not on kind views) and shows `BlockedLink`
beside the buttons after a blocked launch. The copy button reads
`Copying…`, `Copied` or `Couldn't copy. Offline?`.

### Environments, recalls and threads (`AskShare`)

`AskShare({ target, group, className, children })` wraps its children in a
`display: contents` element that listens for `contextmenu`, and passes them
a hint element to place.

- **Right click** opens the panel at the pointer (a virtual anchor), below
  and start-aligned. It is ignored when an inner `AskShare` already handled
  the event (`defaultPrevented`: an environment inside a thread keeps its
  own panel), when the event comes from outside the element's DOM (React
  bubbles events from the portaled popup), with Shift held, or when the
  click is inside a text selection in the element; the browser's menu then
  shows.
- **The hint** reads `[RIGHT CLICK]`, or `[ASK AI]` on coarse pointers,
  where it shows at 40% opacity. On fine pointers it shows only while its
  `group/<name>` is hovered or focused (`group`: `mdx-env` or `thread`; the
  reveal classes are written out in `HINT_REVEAL` because Tailwind needs
  literal class names). Clicking it opens the panel above the hint,
  end-aligned, and focus returns to it on close. After a blocked launch the
  hint becomes `[POP-UP BLOCKED · OPEN <PROVIDER>]` until clicked.
- The `Popover.Root` is mounted on first open only, so the busiest page
  (10 environments and 22 recalls) does not mount 32 popovers.

Placement: environments put the hint in their bottom-right corner
(`Env`, MDX-ENV.md); a thread section puts it at the right of its COMPARE
header (`ThreadFrame`, RELATIONS.md).

### The ask panel (`AskPopup`)

Both surfaces render `AskPopup` inside their own `Popover.Root`, passing
only the anchor and placement. The panel is one sentence built from the
current choices, with the intent and the provider as **reels**:

```
                               ChatGPT             ghosted neighbours
  Explain ⇅  this theorem in   Claude ⇅            the sentence
  Walk the proof of            Cursor
  ───────────────────────────────────────────────
  [COPY .MD] [VIEW .MD]                     ASK ↵
```

- A reel is a `role="spinbutton"` (`aria-valuetext` is the phrase). Click
  advances and wraps; ↑/↓/Home/End move without wrapping; the wheel steps
  once per 40 px of travel; a ghosted neighbour (one step away, 30%
  opacity) can be clicked. The column slides into place and the choice is
  saved at once.
- The intent reel takes focus on open, so Enter asks straight away with the
  remembered choices. Enter on either reel, or `ASK`, launches and closes.
- The footer has `COPY .MD` (only from `AskShare`, since the page header has
  its own button), `VIEW .MD` (the Markdown in a new tab) and `SOURCE`
  (page header on pages only).

## Terminal ask commands

TERMINAL.md owns parsing, resolution and output rendering; the semantics are
here.

```
claude [explain|proof|quiz|check] <page|.>     (also gpt, chatgpt, cursor)
md <page|.>
```

- The usage line is built from each intent's word. `askArguments` takes the
  first argument as the intent when `intentFromWord` matches it (case
  insensitive); otherwise the whole argument is the page and the intent is
  `explain`. No page means the current page.
- Targets are catalog entries (pages and kind views) and their `prompt`.
  The terminal cannot target an environment or a thread.
- An intent the target does not offer is an error listing what is:
  `claude: "check" is not available here; try explain, quiz.` In practice
  `check` never applies in the terminal and `proof` only on a Proofs kind
  view.
- On success it prints `Opened <title> in Claude (Explain).` and closes the
  drawer; when blocked it prints the same link as an `Open Claude` action.
- Tab on the first argument offers matching intents (with their labels),
  then pages; after an intent it completes pages.
- `md` prints the page's Markdown through `loadMarkdown`, so it shares the
  cache and timeout with "Copy Markdown".
- `run.ts` awaits `catalogResource.load()` before running any command. With
  the catalog cached that is a microtask and the gesture survives; on a
  cold, slow load a strict browser (Safari) may block the tab, and the
  fallback link is printed instead.

## Offline

The service worker has no rule for the export files' `fetch` requests (see
PWA.md for the caching rules), so offline "Copy Markdown" and `md` fail and
say so, and prompts fall back to the link-only context (the provider needs
the network anyway). A Markdown file opened as a page (`VIEW .MD`, a typed
URL) is a navigation, and the worker treats it like any other page
navigation (PWA.md).

## Design decisions

1. **One graph, every export rendered from it.** Markdown, contexts,
   `llms*`, `graph.json`, prompt targets, the catalog's targets and the
   dock's relations all read the same `ExportGraph`. Two renderers can
   never disagree about a relation, a label or a prerequisite. The cost is
   that the graph carries every statement and body in server memory, and
   must be built once per worker in `getCorpus()`, not per route. Exports
   are rebuilt from remark output (COMPILE.md), never from compiled bodies;
   reading a body here would pull every page chunk into these routes.

2. **IDs are site paths, and every link in an export is an ID** (`llms.txt`
   aside: its index links the `.md` files and data routes). A link
   works on the site, resolves in `graph.json` and maps to its `.md` file
   by one documented rule (`llms.txt` states it). The cost is that a model
   following a link reaches HTML unless it applies the rule. Pointing links
   at `.md` files instead would break the `graph.json` lookup.

3. **Export URLs are derived, never stored.** `PromptContext`,
   `CatalogPage` and terminal output carry IDs, and `urls.ts` derives file
   paths both ways. Moving the routes is a change to one file (plus the app
   folders), and no stored data goes stale. The anchor-or-`content` file
   name is why `content` is reserved and throws.

4. **Kind views and threads are side maps, not nodes.** A kind view is a
   filter over one page and a thread is an aggregation over environments.
   As nodes they would need edges of their own, appear in `pagesOf`,
   prerequisites and `graph.json`, and duplicate content. The cost is that
   `resolveNode` tries three maps and every switch in `server.ts` handles
   four target types (`satisfies never` makes the compiler list them).

5. **Roles come from `of`, labels from the pack.** Derivation and practice
   are read off the kind's relation, and every name the reader sees (kind
   labels, derivation wording, prompt texts, the `llms.txt` summary) comes
   from the pack. A new subject needs no export change. The relation names
   themselves (`proves`/`proved_by`) are still engine-fixed.

6. **Untitled derivations are relabelled at build time.** "Proof" alone is
   useless in a relation list, a prompt or a terminal message, so
   `labelDerivations` writes "Proof of …" into the node once and every
   surface inherits it. It keys on an empty title and `proves` edges, not on
   a kind name or the pack's `untitled` flag.

7. **One function decides what is attached.** `attachedDerivations` drives
   the env document's proof sections, the context's proof blocks and
   `hasDerivation`, so the Markdown, the prompt and the offered intents
   agree. A derivation gets none, so a proof's document never nests itself.

8. **Everything is a static file.** Both per-node formats prerender all 943
   targets with `dynamicParams = false`. Any static host can serve them,
   unknown paths cost nothing, and the client caches are just HTTP. The
   cost is build output: 1,886 of the build's 2,062 static outputs.
   Allowing dynamic params would make every probe of
   `/llms.mdx/…` run the corpus.

9. **Targets travel with the page; contexts are fetched on demand.**
   `openPrompt` must open its tab before any `await`, so whatever decides
   the offered intents must already be on the page: five small fields per
   environment. The context (2.5 KB median, up to 58 KB) is fetched only on
   hover, focus or open. Deciding availability from the fetched file would
   need an `await` before `window.open` and the browser would block the tab.

10. **Rank on the server, pack in the browser.** The budget depends on the
    provider's endpoint, the intent's task text and the origin, and the
    absolute URLs must name whatever host serves the site (production,
    previews, localhost). Packing at build time would need every
    combination and a known origin. The cost is that `prompt.ts`, the role
    and the task texts ship in a client chunk.

11. **Prompts are plain provider URLs.** No API key, no backend and no
    account on the site; the student uses their own assistant. The limit is
    URL length: `URL_LIMIT` is 8,000, a conservative bound under the 8 KiB
    request-line limit many servers and proxies apply. Tiers, the omission
    note and the Markdown URL in the frame make the cut graceful.

12. **Only `core` is truncated; other tiers are kept or skipped whole.**
    Half a prerequisite list or half a statement misleads more than a
    missing one, and the omission note says something was left out.
    Skipping instead of stopping lets a short later block (a backlink line)
    use leftover space. Notes go after proofs so the note is cut first.
    Prerequisites go nearest first so the least relevant fall off.

13. **The closing note is reserved up front.** Reserving the longer of the
    two notes before packing means the note always fits, whatever was
    dropped, and blocks are measured once.

14. **Notes cannot break the frame.** Closing tags in block text are
    escaped and attribute values are escaped, so a statement that mentions
    `</context>` cannot end the context early and turn the rest into
    instructions.

15. **The tab opens first and is navigated later.** `about:blank` keeps the
    gesture and shows a placeholder while the context loads. `noopener`
    cannot be used, because `window.open` then returns `null` and the tab
    could not be navigated, so `opener` is cleared by hand before leaving
    the site's origin. `location.replace` keeps the placeholder out of
    history.

16. **Prompt paths never fail.** The context loader swallows errors, the
    wait is capped at 3 s and `openPrompt` never rejects, so surfaces have
    no `catch` and a student always gets a usable prompt. A context in a
    format the running code does not recognise (a stale client after a
    deploy) is treated as missing rather than sent half-understood.

17. **Choices are shared and sticky.** One store per preference, shared by
    every surface and tab, holding engine names. A target that lacks the
    stored intent displays `explain` without writing it, so visiting a page
    does not reset a student's "check" on environments. The `proof` alias
    stays until stored preferences from before the rename no longer matter.

18. **Right click is the environment trigger.** A visible button on every
    environment would clutter dense pages; the hint appears only on hover
    or focus (always, dimmed, on touch). Shift + right click and right
    clicking a selection keep the browser menu, so copying text still works.

19. **Markdown is served as inline plain text.** `text/markdown` made
    browsers download the file instead of showing it; `text/plain` with
    `Content-Disposition: inline` shows it in the tab (`VIEW .MD`) and still
    gives a sensible name when saved.

20. **`graph.json` has no bodies.** It is the map, at 577 KB; the text is
    one `markdown` URL away. Including statements and bodies would roughly
    match `llms-full.txt` in size and duplicate it.

## Performance

| When | What |
|---|---|
| build, once per worker | `buildExportGraph` inside the memoised `getCorpus()` (COMPILE.md) |
| build, per output | each of the 1,886 per-node files renders one document or context from the graph; `llms-full.txt` renders the 76 page documents again. Nothing is memoised per node (`prerequisites` and `relationsOf` re-walk small neighbourhoods); the whole static generation (2,062 outputs, 7 workers) takes about 5 s |
| render, per page | `promptTargetFor` for the page and each environment, recall and thread: about 2 KB of targets in the RSC payload at the median page, 5.7 KB at most (33 targets) |
| request | nothing; every export is a prerendered file |
| client, on intent | one context fetch per ID per page load (cached promise); Markdown only on copy, `md` or panel open |
| client, on click | packing: a sort and one encoded-length measure per block |

Sizes from the build: Markdown files 3.6 MB in total (median 2.3 KB,
largest 65 KB, `/algebra/linear-transformations/seen`); contexts 3.1 MB
(median 2.5 KB, largest 58 KB, that chapter's Examples kind view);
`llms.txt` 19.5 KB; `llms-full.txt` 1.1 MB; `graph.json` 577 KB.

**Bundle boundary.** `prompt.ts`, `client.ts`, `urls.ts`, `model.ts` and the
two hooks are imported by client components; `model.ts` brings in the kind
registry and so the course pack. `build.ts`, `query.ts`, `documents.ts`,
`context.ts` and `format.ts` are server-side by use only; `server.ts` is the
module routes and pages import, and it is guarded by `server-only`. Importing
`documents.ts` or `context.ts` from a client component would ship the
renderers; importing `server.ts` fails the build.

## Limitations

- **URL budget.** About one target in eight loses some context to the
  8,000-character limit; the model gets the Markdown URL instead, which it
  may or may not fetch. There is no per-provider limit.
- **The terminal reaches pages and kind views only.** Its usage line and
  completions still list every intent word, including `check`, which no
  catalog target offers.
- **Kind-view contexts are coarse.** Their prerequisites are the whole
  parent page's, not the view's environments', and a `details` block for an
  environment without a statement (every proof) starts with `Proof:` but
  not the proof's label, so it is tied to its theorem only by the order of
  the contents list.
- **Practice kind views** get `prompts.quizPractice`, which is worded for one
  example.
- **Wording drift in documents.** The prerequisites heading says
  "`uses`/`proves` dependencies" though `practises` is followed too, and
  `llms.txt` says prerequisites come "from other pages" though an
  environment's can be on its own page. Its example anchor `thm-y` does not
  follow the `<kind>-<n>` scheme, its "every link points at a node ID" is
  not true of its own index links, and its thread pattern is always
  `<home>#thread-<slug>` though a thread's ID uses its defining page.
- **"Blocked" also covers a closed tab.** A student who closes the
  placeholder tab during the wait sees the pop-up-blocked link.
- **Relation names are engine-fixed**; packs cannot relabel them.
- **Thread documents** have no prerequisites or relations, and thread
  contexts no relation tiers.
- **Offline**, nothing this module fetches is cached.
- **Packaging.** `lib/export` mixes React hooks with server-safe code; a
  package split needs separate server and client entry points.
- `/llms.txt` has no route constant in `urls.ts`; the other four routes
  do, and the `app/` folder names must match them by hand.

## Changing things

**New intent.** Add it to `PROMPT_INTENTS` and give it an entry in
`PROMPT_INTENT_SPECS` (`applies`, `label`, `phrase`, `task`, `word`, and
`threadTask` if threads should not get the shared thread tour); the type
checker asks for the entry. The word-uniqueness check, the panel, the
terminal usage line, Tab completion and the availability check follow.

**New provider.** Add it to `LLM_PROVIDERS`; the type checker then asks for
`LLM_PROVIDER_LABELS`, `PROVIDER_ENDPOINTS`, `LOGOS` (`llm-logos.tsx`) and
`ASK_COMMANDS` (`lib/terminal/commands.ts`). Check the endpoint accepts a URL
of `URL_LIMIT` characters.

**New target type.** Extend `PromptTarget` (`lib/mdx-env/target.ts`), add a
side map to `ExportGraph` if it is not a node, extend `ExportTarget` and
`resolveNode`, add a case to each switch in `server.ts`, its IDs to
`exportStaticParams`, a `*Target`, a `*Context` and a `*Document` function,
a case in `subjectPhrase`, and handle it in the specs' `task` functions
(`taskText` routes only threads separately). `subjectPhrase` falls back to
`getKindLabel`, which throws on a kind the registry does not know, so a new
`kind` literal needs its own branch there.

**New fact an intent depends on.** Add it to `PromptTarget` and set it in
the four `*Target` functions in `context.ts`. Never work it out in a
component or from a fetched file.

**New edge kind.** Add it to `EXPORT_EDGE_KINDS`; the build then fails until
it is in `RELATION_NAMES`, `RELATION_LABELS` and `RELATION_ORDER`. Emit it
in `build.ts`. Add it to `DEPENDENCY_EDGES` only if it is a prerequisite,
and to `OUTGOING`/`INCOMING` in `context.ts` only if prompts should mention
it. Document lists and the `llms.txt` relations line follow. A new `of` role
also needs `ENV_RELATIONS` (MDX-ENV.md) and possibly `PAGE_LINK_RELATIONS`
(RELATIONS.md).

**New tier.** Add it to `CONTEXT_TIERS` (its position is the packing order)
and `TIER_HEADINGS`, and emit blocks for it in `context.ts`. Until they
reload, clients running older code reject the new tier and send link-only
prompts.

**New frontmatter key.** Add it to `FRONTMATTER_KEYS` at the position it
should print, and pass it from the document function.

**Moving a route.** Change the constant in `urls.ts` and move the matching
`app/` folder; `src/proxy.ts` follows `docsContentRoute`.

## Invariants

- Every export URL comes from `urls.ts`; every link inside an export is a
  node ID, except `llms.txt`'s index links; no stored model holds an export
  URL.
- The graph is built once per worker, in `getCorpus()`, from corpus metadata
  only; nothing in this module loads a compiled page body.
- Export code never names a kind; roles come from `isDerivation` and
  `isPractice`, wording from the pack.
- Relation names are spelled only in `model.ts`.
- Target facts (`hasDerivation`, `label`, `kind`, `type`) are decided only in
  `context.ts`, and each context spreads its target.
- `attachedDerivations` alone decides which derivations belong to a node,
  for both Markdown and context.
- Every ID in `exportStaticParams` resolves through `resolveExportTarget`,
  and no anchor is `content`.
- Graph readers throw on an unknown ID or a node without a position rather
  than return an empty result.
- `intentsFor` is the only availability check, used by the panel and the
  terminal alike.
- `openPrompt` is called before any `await` in a user-triggered handler;
  it and the context loader never reject.
- Stored preferences hold engine intent names; reads accept the `proof`
  alias.
- `server.ts` stays `server-only`; client components import only `prompt.ts`,
  `client.ts`, `urls.ts`, `model.ts` and the hooks.
