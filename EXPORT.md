# Export

The notes are exported as a graph of **nodes** (pages and math environments)
joined by typed **edges**. Every export is rendered from that one graph:
Markdown documents, ranked prompt context, `llms.txt`, `llms-full.txt` and
`graph.json`. The same graph drives the "Open in ChatGPT / Claude / Cursor"
prompts on pages, on environments and in the terminal.

## Layout

```
src/lib/export/              export logic (pure except corpus.ts and the client files)
  model.ts                   nodes, edges, relations, prompt target and context types
  build.ts                   site corpus > export graph
  query.ts                   graph traversal: children, proofs, relations, prerequisites
  urls.ts                    node ID <> file URL, for both formats
  format.ts                  frontmatter, links, relation lines
  documents.ts               Markdown renderers (page, env, kind view, llms.txt)
  context.ts                 prompt targets and ranked prompt context
  prompt.ts                  intents, providers, prompt text, URL budget packing
  corpus.ts                  server-only: binds renderers to the site corpus, for routes
  client.ts                  browser: cached fetches, fallback context, openPrompt
  use-prompt.ts              React hook: remembered intent and provider, launch, blocked pop-up state
  use-copy.ts                React hook: copy a node's Markdown, with copying/copied/failed status

src/lib/site/corpus.ts       builds exportGraph once, next to the site graph and catalog
src/lib/site/config.ts       docsContentRoute, docsContextRoute, exportGraphRoute, llmsFullRoute

src/app/llms.mdx/docs/[[...slug]]/route.ts      Markdown per node
src/app/llms.mdx/context/[[...slug]]/route.ts   prompt context per node
src/app/llms.txt/route.ts                       index
src/app/llms-full.txt/route.ts                  every page document
src/app/graph.json/route.ts                     nodes and edges

src/components/mdx/ask-panel.tsx       AskPopup: the shared ask panel (sentence + reels) in a popover; header button style, blocked link
src/components/mdx/page-actions.tsx    page "Ask AI" popover
src/components/mdx/copy-markdown.tsx   page "Copy Markdown" button
src/components/math-env/share.tsx      environment popover (right click or the corner hint)
src/lib/terminal/commands.ts           `gpt`, `claude`, `cursor`, `md`
```

## Nodes and IDs

A node ID is the node's site path:

| Node | ID | Example |
|---|---|---|
| page | page URL | `/algebra/complex-numbers/complex-polynomials` |
| environment | page URL + `#` + anchor | `/algebra/complex-numbers/complex-polynomials#theorem-1` |
| kind view | kind-view URL | `/algebra/complex-numbers/complex-polynomials/proofs` |

Pages and environments are graph nodes (`ExportNode`). Kind views are not.
They are a filter over one page's environments, but they do get their own
Markdown file, context file and prompt target. The graph keeps them in a side
map, `kindViews` (`ExportKindView`: `id`, `kind`, `label`, `parentId`), keyed
by view URL, so traversal, `pagesOf` and `graph.json` never meet them.

Every link inside an export points at a node ID, so any link can be looked up
in `graph.json`.

`ExportNode` fields:

| Field | Set for | Notes |
|---|---|---|
| `id`, `type`, `kind`, `title`, `label` | all | `kind` is the environment kind, or `"page"` |
| `strand` | all in a strand | absent for optional pages |
| `description`, `ideas`, `tags` | pages | from frontmatter |
| `page`, `slug`, `difficulty` | environments | `slug` is the tenet slug, if declared |
| `statement`, `body` | environments | Markdown source rebuilt from remark output |

`label` is what the exports display: the page title, `Theorem. Title`, or just
`Theorem` when untitled. An untitled proof that proves something is relabelled
`Proof of Theorem. Title`, or `Proof of Lemma. A and Lemma. B` when it proves
several (`labelProofs` in `build.ts`).

The graph also keeps each page's reading order in `segments`: prose, its own
environments and its recalls, the last two as node IDs (a recall's ID is the
original's). Segments whose node is missing are dropped when the graph is built,
so every export, page documents included, renders from the graph alone.

## Edges

| Edge kind | From > to | Source | Read forwards / backwards |
|---|---|---|---|
| `contains` | page > its environment | every environment | `contains` / `part_of` |
| `uses` | env > tenet in its `of` | `of` on a non-proof | `uses` / `used_by` |
| `proves` | proof > tenet in its `of` | `of` on a proof | `proves` / `proved_by` |
| `see` | env > tenet in its `see` | `see` | `see_also` / `see_also` |
| `references` | page or env > page or env | `reference` edges of the site graph (prose links) | `references` / `referenced_by` |
| `recalls` | page > original environment | `<Recall of>` on another page | `recalls` / `recalled_by` |

`buildExportGraph` drops edges whose ends are not both nodes, as well as
self-loops and duplicates (same kind, source and target). It also indexes
`outgoing`, `incoming` and `position` (reading order: each page, then its
environments), so relations sort stably. It registers every kind view whose
parent page is a node and drops the rest.

`RELATION_NAMES`, `RELATION_LABELS` and `RELATION_ORDER` in `model.ts` are the
only place relation names are spelled. The documents, the context and
`graph.json` all read from them.

### Prerequisites

`prerequisites(graph, id)` (`query.ts`) collects transitive dependencies:
everything reachable through `uses` and `proves` edges.

- **Start set:** for a page, its environments. For an environment, the
  environment itself plus its proofs, so a proof's dependencies count as the
  theorem's.
- **Distance:** the number of `uses`/`proves` steps from the start set, found
  breadth-first.
- **Order:** a depth-first post-order, so foundations come before the results
  that build on them.
- **Excluded:** the start set itself and, for a page, the page's own
  environments.

The Markdown documents keep the nearest 40 (`PREREQUISITE_LIMIT`) in
foundations-first order and add `+N more distant prerequisites` for the rest.
The prompt context sorts them nearest first, so the URL budget reaches the most
distant ones last.

## Formats and routes

All routes are static (`revalidate = false`). The per-node routes prerender
every page, environment and kind view (`exportStaticParams`) and set
`dynamicParams = false`, so an unknown path returns 404. The build produces 938
files per format: 76 pages, 621 environments and 241 kind views.

| Route | Content | Built by |
|---|---|---|
| `/llms.mdx/docs/<page>/content.md` | page document | `pageDocument` |
| `/llms.mdx/docs/<page>/<anchor>.md` | environment document | `envDocument` |
| `/llms.mdx/docs/<page>/<kind>/content.md` | kind-view document | `kindViewDocument` |
| `/llms.mdx/context/…/*.json` | the same paths, prompt context | `renderPromptContext` |
| `/llms.txt` | index: conventions, data links, pages by strand | `indexDocument` |
| `/llms-full.txt` | every page document, sorted by URL | `llmsFullText` |
| `/graph.json` | every node and edge | `exportGraphJson` |

`urls.ts` maps between IDs and files in both directions:
`nodeFileSegments(id, format)` and `parseNodeFile(segments, format)`, where the
file name is the anchor, or `content` for a page. That makes `content` a
reserved anchor: `nodeFileSegments` throws on it, which fails the build. Build
every export URL with `nodeMarkdownUrl` or `nodeContextUrl`. Never concatenate
paths yourself.
`nodeFileName` gives the flat download name used in `Content-Disposition`
(`a-b-thm-x.md`).

The routes resolve a request with `resolveExportTarget(segments, format)`. It
looks the ID up in the export graph's `nodes`, then in its `kindViews`. Both
are built together, so an ID that resolves always renders.

### Markdown documents

Page, environment and kind-view documents all have the same shape:

```
---
id, type, kind, title, course, strand, strand_label, page, slug, difficulty, markdown, tags, ideas
---

# Label

description / body

## Prerequisites      (if any)
## Relations          (if any)
```

Frontmatter keys always appear in `FRONTMATTER_KEYS` order, and empty keys are
left out. Strings are quoted only when they would not parse as plain YAML.

- **Page:** the page's `graph.segments` in order. Prose stays as Markdown, and each
  environment becomes a level-3 *card* with its ID, difficulty, statement, body
  and at most 8 links per relation (`CARD_RELATION_LIMIT`). A recall becomes a
  `Recall:` card that links the original and quotes its statement. The page's
  relations leave out `contains`.
- **Environment:** `From [page]`, then `## Statement`, then the body (under
  `## Proof` for a proof, `## Notes` after a statement, and with no heading
  otherwise), then a `## Proof` section for each proof of it. Its relations
  leave out `part_of`.
- **Kind view:** one level-2 card per environment of that kind, without the
  lecture prose, prerequisites or relations.

Documents are rebuilt from the graph (built from `envs`) and never from the compiled body
(see COMPILE.md §7).

Example (`/llms.mdx/docs/algebra/complex-numbers/complex-polynomials/theorem-1.md`):

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
…
## Proof
…
## Prerequisites

Transitive `uses`/`proves` dependencies defined elsewhere, foundations first.

- [Definition. Complex number](/algebra/…/complex-arithmetic#definition-1) (in [Complex arithmetic](/algebra/…/complex-arithmetic))
…

## Relations

- Uses: [Definition. Polynomial root](…#definition-3)
- Proved by: [Proof of Theorem. Remainder theorem](…#proof-1)
- Used by: [Theorem. Factor theorem](…#theorem-2)
```

### `graph.json`

```ts
{
  course: string;
  edges: { kind, source, target }[];
  nodes: (ExportNode without body/statement & { markdown: string })[];
  relations: typeof RELATION_NAMES;   // how to name each edge from either end
}
```

Bodies are left out to keep the file small. Each node's `markdown` URL gives the
full text.

## Prompts

A prompt is an ordinary provider URL with the prompt in its query string, so no
API key or backend is needed. There are three pieces:

1. **Target** (`PromptTarget`): `id`, `label`, `kind`, `type` and `hasProof`.
   It is small, computed on the server, and available before anything is
   fetched. It decides which intents are offered.
2. **Context** (`PromptContext`): the target plus ranked `blocks`. The file
   repeats the target for a model that fetches it directly, but the client
   reads only `blocks` and keeps the target it already holds. The Markdown URL is not stored: `prompt.ts` derives it from the
   ID with `nodeMarkdownUrl`. It is fetched from `/llms.mdx/context/…` when the prompt
   is opened.
3. **Prompt** (`prompt.ts`): the context, an intent and a provider, packed into
   a URL of at most 8000 characters.

```mermaid
flowchart LR
    graph["exportGraph<br/>(site/corpus.ts)"] --> target["envTarget / pageTarget /<br/>kindViewTarget"]
    target --> catalog["catalog.json<br/>(terminal)"]
    target --> page["page.tsx<br/>(PageActions)"]
    target --> env["EnvView.prompt<br/>(EnvShare)"]
    graph --> ctx["envContext / pageContext /<br/>kindViewContext"] --> file["/llms.mdx/context/…json"]
    catalog & page & env --> open["openPrompt(target, intent, provider)"]
    file -. fetched .-> open
    open --> url["provider URL"]
```

### Targets

`context.ts` is the only place that decides target facts. The context
builders spread the matching target, so a target and its context always agree.

| Type | `hasProof` | `label` |
|---|---|---|
| `env` | it is a proof, or something proves it | node label |
| `page` | always `false`: the proofs kind view offers the walk | page title |
| `kind-view` | the view's kind is `proof` | `Proofs from <page>` |

Targets reach each surface without a fetch:

- **Page and kind-view header:** `page.tsx` calls `promptTargetFor(id)`, and a
  missing target is a 404.
- **Environments:** `page.tsx` passes `promptTargetFor` into the MDX options.
  `resolveEnv` and `resolveRecall` (`env-meta.ts`) set `EnvView.prompt`, and
  `Env` renders `EnvShare` only when it is set. A recall's target is the
  original environment. Only anchored environments get one, and no recall in
  the content currently has an anchor.
- **Terminal:** every `CatalogPage` has a `prompt`, which is `null` only for the
  placeholder standing in for a route outside the catalog.

### Context tiers

The server splits each node's material into short blocks. Each block has a
tier, which sets the order in which blocks are kept or dropped:

| Tier | Heading in the prompt | `env` | `page` | `kind-view` |
|---|---|---|---|---|
| `core` | none | heading, statement, body, every proof, then notes | heading, key ideas, contents | summary, contents |
| `relations` | `Direct links:` | proves, uses, recalls, references, see also | same | none |
| `details` | `Statements:` | none | each environment's statement | each environment's statement and body |
| `prerequisites` | `Prerequisites the student may assume (nearest first):` | label, plus the statement if it is at most 600 characters | same | of the parent page |
| `backlinks` | `Used elsewhere:` | used by, recalled by, referenced by | same | none |

The relation and backlink blocks list titles only (`Uses: A; B.`), because they
point the tutor to the material rather than quote it.

### Packing

`buildPrompt` produces three tagged sections:

```
<role>     course tutor, grounded in <context>, LaTeX, no invented policy
<context title="…" source="<absolute id>" markdown="<absolute .md URL>">
           blocks, each tier's heading before its first block
           [N lower-priority item(s) omitted for length; full notes: <md URL>]
<task intent="…">
           intent-specific instructions
```

The frame is measured first. Blocks are sorted by tier (`CONTEXT_TIERS`
order, stable within a tier), then each is added if it fits in `URL_LIMIT`
(8000 encoded characters), less the space reserved for the closing note.
Percent-encoding works character by character, so encoded lengths add up and
each block is measured once. A `core` block that doesn't fit is cut at a
paragraph boundary (or, failing that, with a binary search that never splits a
surrogate pair) and ends with a truncation marker. A block from another tier
that doesn't fit is skipped, and packing carries on, so a shorter block after
it (even from a later tier) can still get in.

An environment's notes come after its proofs in `core`, so a long note is
truncated before any proof is. The context ends with either the omission note
or, when no block fits at all, a note asking the model to fetch the Markdown
URL. The reserve covers the longer of the two.

Block text is sanitised so it cannot close `</role>`, `</context>` or
`</task>`. Attribute values are escaped.

### Intents

| Intent | Label | Offered for | Task |
|---|---|---|---|
| `explain` | Explain | everything (the default) | env: what it says, why, what it rests on. Example: work it step by step. Page or view: a map of the ideas, then ask where to start |
| `proof` | Walk the proof | `hasProof` | step by step, naming the result each step uses, checking in with the student |
| `quiz` | Quiz me | everything | one question at a time. Examples are posed as exercises, with hints on request |
| `check` | Check my work | environments | ask for the student's attempt and check it line by line, without solving first |

`intentsFor(target)` is the only availability check. The menus show only the
intents it returns, and the terminal rejects any other intent, listing the ones
that are available. The ask panel phrases each intent with `intentPhrase` and
the target with `subjectPhrase`.

### Providers

| Provider | Endpoint | Query key |
|---|---|---|
| `chatgpt` | `https://chatgpt.com/` | `prompt` |
| `claude` | `https://claude.ai/new` | `q` |
| `cursor` | `https://cursor.com/link/prompt` | `text` |

## Client

`client.ts` is the only browser module that fetches exports. The surfaces and
the terminal (`md`, `gpt`, `claude`, `cursor`, through `CommandRuntime`) pass it
node IDs, never URLs.

- **Caching:** `loadMarkdown(id)` and the context loader keep one promise per
  ID. A failed load is evicted, so the next attempt retries.
- **Timeout:** each fetch is aborted after 8 s (`FETCH_TIMEOUT_MS`). The files
  are static, so a slower response means the connection has stalled.
- **Fallback:** `loadPromptContext(target)` never rejects. It always returns
  the target it was given, with the file's `blocks`. If the file cannot be
  loaded (offline, timed out, 404, or a stale format that fails
  `isContextBlocks`), the blocks are empty. The intent and task
  text stay correct, and the prompt links to the Markdown instead of quoting it.
- **Prefetch:** `prefetchContext(id)` warms the context cache when the pointer
  or focus reaches the `Ask AI` button or an environment's corner hint, and
  again when a panel opens. The Markdown is only needed to copy it, so
  `prefetchMarkdown(id)` runs only when an environment's panel (which has
  `COPY .MD`) opens.

### Opening a prompt

`openPrompt({ target, intent, provider })` calls
`window.open("about:blank")` **synchronously**, before its first `await`,
while the click or keypress still counts as a user gesture. The new tab shares
the site's origin, so it shows `Preparing the prompt for <Provider>…` instead of
sitting blank. Only then does it load the context, waiting at most 3 s
(`PROMPT_WAIT_MS`) before using the fallback context; the fetch carries on and
warms the cache. It then clears `opener` and calls `location.replace` with the
provider URL. If the browser blocked the tab, it returns
`{ status: "blocked", url }` instead. It never rejects.

Callers must not `await` anything before calling it. That is why each surface
decides intents from the target it already holds rather than from the fetched
context.

| Surface | Launch | Blocked pop-up |
|---|---|---|
| `PageActions` | `usePrompt` | `[POP-UP BLOCKED · OPEN <PROVIDER>]` beside the header buttons |
| `EnvShare` | `usePrompt` | the `[RIGHT CLICK]` hint becomes `[POP-UP BLOCKED · OPEN <PROVIDER>]` until clicked |
| terminal `gpt`/`claude`/`cursor` | `runtime.openPrompt` | message output with an `Open <provider>` action |

`usePrompt(target)` holds the intent and provider, `launch`, `prefetch` and
`blocked`. Both choices are shared by every surface and kept in `localStorage`
(`export:intent`, `export:provider`, defaulting to `explain` and `claude`), so
a student who quizzes themselves in ChatGPT keeps doing that from page to
page. A target that doesn't offer the stored intent shows `explain` without
overwriting it.

### Ask panel

Both surfaces render `AskPopup` (`ask-panel.tsx`) inside their own Base UI
`Popover.Root`, passing only where it is anchored. It is one sentence built from
the current choices:

```
            Walk the proof of                 ChatGPT        <- ghosted neighbours
  [Explain ⇅]  this theorem in  [Claude ⇅]                   <- the sentence
            Quiz me on                        Cursor
  ──────────────────────────────────────────────────
  [COPY .MD] [VIEW .MD]                          [ASK ↵]
```

- The intent and the provider are **reels** (`role="spinbutton"`): click to
  advance, click a ghosted neighbour to jump to it, scroll the wheel over it,
  or press ↑/↓/Home/End. The value rolls into place and is saved at once.
- The intent reel is focused on open, so Enter asks straight away with the
  remembered choices. Enter on either reel, or the `ASK` button, launches and
  closes the popover.
- The footer holds the bracket links: `COPY .MD` (environments only, since the
  page header has its own button) and `VIEW .MD`, plus `SOURCE` on pages.

The page header shows `Ask AI` then `Copy Markdown`, as flat mono buttons that
lift onto the site's offset shadow on hover or while open. An environment opens
the panel at the pointer on right click, or above its corner hint
(`[RIGHT CLICK]`, or `[ASK AI]` on touch screens). Shift + right click, or
right clicking inside a text selection, keeps the browser's own menu.

`useCopyMarkdown(id)` copies through `copyPendingText`, which hands the
clipboard a promised `ClipboardItem` so Safari keeps the click's gesture while
the file loads, and reports copying, copied or failed.

### Terminal

```
claude [explain|proof|quiz|check] <page|.>
```

`askArguments` treats the first argument as the intent if it names one.
Otherwise the whole argument is the page query and the intent is `explain`.
Pressing Tab on the first argument offers matching intents first, then pages.
After an intent, Tab completes pages against the rest of the line. Usage errors
print the descriptor's usage line, the same one `help` shows. `md <page|.>`
prints the page's Markdown export through `loadMarkdown`, so it shares the
cache and timeout with "Copy Markdown". Both commands resolve their page with
`notesTarget`, which yields the catalog page's `PromptTarget`
(`CatalogPage.prompt`, `null` only for the placeholder of a route outside the
catalog); its ID is all they need.

`run.ts` awaits `catalogResource.load()` before running a command. With the
catalog cached this adds only a microtask, and the gesture survives. On a cold,
slow load a strict browser (Safari) may block the tab, and the terminal then
prints the fallback link.

### Offline

The service worker does not cache `llms*`, `.md` or context files (see PWA.md).
Offline, "Copy Markdown" fails (and says so), and prompts use the fallback context (links
only), which the provider can't open offline anyway.

## Changing things

**New intent:** add it to `PROMPT_INTENTS` and `PROMPT_INTENT_LABELS`, give it a
rule in `INTENT_APPLIES` and a case in `taskText` (the `satisfies never` there
fails the build until you do). The menus, the terminal usage line and Tab
completion pick it up automatically.

**New provider:** add it to `LLM_PROVIDERS`, `LLM_PROVIDER_LABELS` and
`PROVIDER_ENDPOINTS`, add a logo in `llm-logos.tsx`, and give it terminal names
in `ASK_COMMANDS` (`commands.ts`); the command, usage line and `help` follow. Keep `URL_LIMIT` within the new endpoint's
limit.

**New fact an intent depends on:** add it to `PromptTarget`, set it in the
three `*Target` functions. Do not work it out again in a component.

**New edge kind:** add it to `EXPORT_EDGE_KINDS`, `RELATION_NAMES`,
`RELATION_LABELS` and `RELATION_ORDER` (the build fails until every relation
name is in all three), and emit it in `build.ts`. Add it to
`DEPENDENCY_EDGES` only if it should count as a prerequisite, and to the
`OUTGOING`/`INCOMING` lists in `context.ts` only if prompts should mention it.

**New tier:** add it to `CONTEXT_TIERS` (the order there is the packing order)
and `TIER_HEADINGS`.

**Changing the context format:** `isContextBlocks` rejects blocks it doesn't
recognise, and those fall back to link-only prompts. A deploy never breaks a
prompt, but a client with stale code may send links only until it reloads.

## Invariants

- Every export URL comes from `urls.ts`, and every link in an export is a node ID.
  No model stores an export URL: `PromptContext`, `CatalogPage` and terminal
  output carry the node ID, and the URL is derived where it is used.
- `hasProof` and the other intent facts are decided only in `context.ts`, from
  the target the surface holds, never from a fetched file.
- Which proofs belong to a node is decided by `attachedProofs` (`query.ts`) for
  both the Markdown and the prompt context: none for a proof itself.
- Graph readers throw on an unknown node ID or a node without a position, rather
  than returning an empty result.
- The export graph is built once per worker, in `getCorpus()` (see COMPILE.md §6).
- `openPrompt` is called before any `await` in a user-triggered handler.
- `loadPromptContext` and `openPrompt` never reject. Surfaces don't need a
  `catch`.
