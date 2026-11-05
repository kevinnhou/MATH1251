# Course engine

A Next.js 16 and Fumadocs site that turns a folder of MDX notes into a linked,
searchable, installable course. Notes are written as typed environments
(definitions, theorems, proofs, examples, …) that cite each other; the engine
indexes those citations into a graph and uses it everywhere: a reading dock
that shows what a passage builds on and leads to, threads that follow one idea
across the course, a keyboard-driven terminal in the sidebar, offline reading,
and Markdown and prompt exports for LLMs.

This repo is a **baseline**: every course is a clone of it with its own course
files (config, content, logomark) and the **domains** it lists. The engine
(`src/`) and the domains (`packages/domain-*`) are the same in every course.
MIGRATION.md describes the model, the course files and how a course takes
engine updates from the baseline.

## Running

| Script | What it does |
|---|---|
| `bun dev` | development server |
| `bun run build` | production build: every page and export is prerendered |
| `bun start` | serve the production build |
| `bun run types:check` | route typegen, then `tsc` for the app and for the service worker (`tsconfig.sw.json`) |
| `bun run check` / `bun run fix` | Ultracite (Biome) lint and format |
| `bun test` | the import rules (`test/imports.test.ts`) and the component pass (`test/components.test.ts`) |
| `bun run golden` | after a build, compares every file in `test/golden/` (the course's chosen exports) with the build; `--update` rewrites them, `--add <path>` starts tracking one |

A Husky pre-commit hook runs `ultracite fix` and re-stages the files that were
staged. CI (`.github/workflows/ci.yml`) runs lint, tests, the build, the golden
check and `types:check`.

## Layout

```
content/docs/               the notes: one folder per strand, meta.json gives the order
course.config.ts            the course: name, strands, theme, repo, domains, tutor rules, summary, schedule
course.server.ts            each listed domain's server.ts: notation and export methods
course.components.ts        each listed domain's components.tsx: renderers
course.css                  each listed domain's styles.css
course/logomark.tsx         the course's mark; icons, PWA icons and OG images are drawn from it
packages/domain-*/          domains: workspace packages of components (MIGRATION.md, Domains)
source.config.ts            Fumadocs MDX collection and remark/rehype plugins
next.config.ts              MDX, Serwist, build revision
src/engine.ts               the `engine` alias: the types domains and course files may import
src/proxy.ts                Markdown negotiation: rewrites strand URLs to their exports
src/app/                    routes: pages, exports, search, OG images, PWA (see SITE.md)
src/components/<module>/    React UI, one folder per module
src/lib/<module>/           logic, one folder per module
scripts/golden.ts           the golden-output check
test/                       bun tests and the golden outputs
tsconfig.sw.json            separate compile of the service worker
docs/                       these docs
```

## The course binding

The engine reaches the course only through tsconfig path aliases, never by
relative path:

| Alias | File | Read by |
|---|---|---|
| `course.config` | `course.config.ts` | `lib/course/config.ts` (as `course`) and `lib/mdx-env/kinds.ts` (the domains) |
| `course.server` | `course.server.ts` | `lib/markdown/syntaxes.ts` (syntaxes) and `lib/export/components.ts` (export methods) |
| `course.components` | `course.components.ts` | `components/mdx/index.tsx` |
| `course/*` | `course/logomark.tsx` | `components/site` (header, OG image, app icon) and the offline page |
| (relative `@import`) | `course.css` | `app/global.css` |

Domains are imported by name (`@kevinnhou/domain-math`); a `paths` entry maps
those names to `packages/domain-*`, so every build step uses the TypeScript
source. Course files and domains import engine types only, through `engine`.

`course.config.ts` satisfies `CourseConfig` (`lib/course/types.ts`):

| Field | Used for |
|---|---|
| `code` | PWA short name, wordmark (`MATH` + `[1251]`, split at the first digit), terminal history key |
| `name` | site name in page titles, the manifest, the application name and Apple web-app title |
| `title` | full course title: heading of `llms.txt`, `course` field of every export, the tutor role in prompts |
| `description` | web manifest description |
| `home` | the strand whose index is the home page (`/` redirects there; it is the PWA start URL and the terminal's default directory); its pages are titled with `name` instead of a strand tag |
| `strands` | top-level content folders in display order: `id` (URL segment), `label` (tags, OG chip, export headings), `accent` (OG colour) |
| `repo` | GitHub link in the layout and the "SOURCE" link to each page's MDX file in the ask panel |
| `theme` | light and dark background colours: viewport theme colour, manifest, app icons |
| `domains` | each listed domain's `index.ts` (MDX-ENV.md) |
| `tutor` | subject-specific rules appended to the role of every LLM prompt (see EXPORT.md) |
| `summary` | optional: the line under the `llms.txt` heading; generated from the environments' plurals when absent |
| `schedule` | optional: `"parallel"` (default; chapter *k* of every strand is taught at the same time) or `"sequential"` (strands one after another); decides thread-map columns and route order (RELATIONS.md) |

Two checks fail the build when the config and the content disagree:
`lib/course/config.ts` throws if `home` is not a strand, and `assertStrands`
(`lib/course/strands.ts`, called from `getCorpus`) throws unless the strands
match the top-level folders in `content/docs/meta.json`, in the same order.

`lib/course/config.ts` and `lib/course/strands.ts` derive the values the rest of
the code uses: `course`, `homeRoute`, `repoUrl`, `schedule`, `wordmark`,
`STRANDS`, `STRAND_LABELS`, `STRAND_ACCENTS`, `isStrand`, `getStrand` and the
`Strand` type (the literal union of the configured ids).

The config is split from `course.server.ts` because client components read the
config (the header, the course routes provider, the terminal): a domain's
`index.ts` is plain data, and its `server.ts` (KaTeX, export methods) never
reaches a browser bundle.

## Modules

Each module is a folder under `src/lib` and, when it has UI, `src/components`
(some UI folders take another name: `components/mdx` belongs to `mdx-env`,
`components/threads` to `relations`, `components/sidebar` to `terminal`).

| Module | What it is | Doc |
|---|---|---|
| `markdown` | renders short Markdown fragments (titles, statements, previews) outside MDX; the syntax contract | MARKDOWN.md |
| `mdx-env` | the environment engine: components and the registry, typed MDX blocks, slugs, citations, recall, kind views | MDX-ENV.md |
| `course` | the course binding, strands, the page catalog and route index sent to the client | README.md, COMPILE.md |
| `compile` | build pipeline: corpus metadata, the Fumadocs loader, lazy page bodies | COMPILE.md |
| `export` | the export graph, Markdown and JSON exports, component export methods, LLM prompts, the ask panel | EXPORT.md |
| `relations` | the course outline, the reading dock, threads and the threads page | RELATIONS.md |
| `terminal` | the sidebar terminal: commands, directories, search, and the sidebar built on it | TERMINAL.md |
| `pwa` | service worker, caches, offline page, saved pages | PWA.md |
| `site` | composition: the corpus, page assembly, metadata, OG images, the shell | SITE.md, COMPILE.md |
| `client`, `cn`, `result`, `url` | foundation helpers (below) | README.md |

The domains in `packages/` are documented with the module they plug into:
components in MDX-ENV.md, syntaxes in MARKDOWN.md, export methods in
EXPORT.md.

### Layering

Modules form layers; a `lib/` module imports only from lower layers, so the
graph has no cycles:

```
foundation   client  cn  markdown  pwa  result  url
             mdx-env
             course
             compile  export
             relations
             terminal
top          site
```

The rules that keep it that way:

- `lib/` never imports `components/` or `app/`; `components/` never imports
  `app/`.
- A component module may import any `lib/` module, but only `components/site`
  and `components/sidebar` (the shell) may read `lib/site`. Feature UI receives
  corpus data as props, so it never depends on how the site is composed.
- Component modules don't import each other in loops.
- The engine reaches the course only through the `course.*` aliases and never
  imports `packages/` or names a domain. Course files import only domains and
  `engine` types; domains import only `engine` types, their own files and npm
  packages. A domain's `index.ts` has no runtime imports, and no client module
  reaches a `server.ts`.
- The contracts domains implement (`mdx-env/component.ts`,
  `markdown/syntax.ts`, `export/domain.ts`) hold only types and constants, and
  are kept apart from the code that reads the binding (`mdx-env/kinds.ts`,
  `markdown/syntaxes.ts`, `export/components.ts`), so a binding never imports
  anything that imports it back.
- Route constants live with the module that serves the route
  (`export/urls.ts`, `course/urls.ts`, `pwa/protocol.ts`, `relations/urls.ts`,
  `compile/source.ts`, `site/docs-page.ts`).

`test/imports.test.ts` checks all of these except the route-constant rule.

### Foundation helpers

| File | Contents |
|---|---|
| `lib/client/actions.ts` | `isEditableTarget`, `isModifiedKey`, `isPrintableKey`, clipboard writes (`copyText`, `copyPendingText` for text still being fetched), `fetchText` |
| `lib/client/keybinds.ts` | shared hotkeys: search (⌘K / Ctrl+K), `/`, section digits, WASD/arrow `moveKey`, `cursorKey`, `stepWithin`, `focusSibling` (the full key map is in TERMINAL.md) |
| `lib/client/resource.ts` | `jsonResource(url)`: a fetch-once JSON store with `load`, `preload` and a `useResource` hook (used for `catalog.json`) |
| `lib/cn.ts` | `cn`, re-exported from `cnfast` |
| `lib/result.ts` | `ParseResult<T>` and `isRecord` |
| `lib/url.ts` | `toAbsoluteUrl`, `isSafeInternalUrl` |

## Design decisions

**The engine is generic; the course is data.** Course values (name, strands,
colours, repo, home, schedule) are config, and subject vocabulary comes from
the domains' components. Engine code asks the registry about roles
(`isDerivation`, `isPractice`) instead of naming kinds, so a domain with
`Solution` instead of `Proof` behaves the same. The cost is indirection:
wording such as the prompt texts lives with the component, not next to the
code that uses it.

**Notation and environments are chosen separately.** A course lists domains'
`index.ts` in `course.config.ts` and their `server.ts` in `course.server.ts`,
so a commerce course can take `domain-math`'s TeX without its theorem
environments.

**Static first.** Every notes page, export, thread page, OG image and the
catalog is prerendered, and nothing is revalidated (`revalidate = false`). Kind
views and their OG images render once on first request and are then cached the
same way; only search and the proxy run on every request. That is what makes the
site cheap to host and readable offline, and it is why derived data (the graph,
the catalog) is computed once per build (see COMPILE.md).

**Layers over convenience.** `lib/` modules import downwards only, even where an
upward import would be shorter (route handlers pass the export graph into
`lib/export/server.ts` rather than the export module fetching the corpus).

**One home per concern.** Each module owns its route constants, its UI and its
doc; shared types sit at the lowest layer that needs them (`PromptTarget` lives
in `mdx-env/target.ts` because environments carry their prompt target).

## Limitations

- The fonts and the `content/docs` path are engine-wide.
- `Strand` is a literal union taken from the config.
- `lib/export` and `lib/client` mix React hooks with server-safe code.
- The rest are design limits of the domain model: MIGRATION.md, Limitations.

## Changing things

**A new course, domain, component or environment:** MIGRATION.md, Changing
things.

**A new strand:** add the folder and list it in `content/docs/meta.json` and in
`strands`, in the same order. Routes, the proxy, labels, OG accents and exports
follow.

**A new module:** give it a folder under `src/lib` (and `src/components` if it
has UI), place it in the layering above everything it imports (and in
`LAYERS` in `test/imports.test.ts`), keep its route constants in its own
`urls.ts`, and add a doc.

## Conventions

- Code: Biome via Ultracite (tabs, double quotes, sorted imports and Tailwind
  classes). Comments only where a tool needs them (lint directives,
  triple-slash references). Prefer `satisfies` for config objects and
  `ParseResult` over throwing in parsers.
- Docs: one per module, British spelling, sections in roughly the same order:
  overview, Layout, the module's own concepts, Design decisions, Performance,
  Limitations, Changing things, Invariants.
- Commits: conventional prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `perf:`).

## Docs

| Doc | Covers |
|---|---|
| MIGRATION.md | the baseline, domains and components, course files, updating courses |
| COMPILE.md | from MDX on disk to prerendered output: corpus metadata, the loader, lazy bodies, the corpus, client data, build performance |
| MARKDOWN.md | fragment rendering, the `MarkdownSyntax` contract, TeX and KaTeX |
| MDX-ENV.md | environments: authoring syntax, components and the registry, the engine, rendering |
| EXPORT.md | the export graph, Markdown/JSON exports, component export methods, prompts and intents, the ask panel |
| RELATIONS.md | the course outline, the reading dock, threads and the threads page |
| TERMINAL.md | the terminal, its commands and search, and the sidebar |
| PWA.md | the service worker, caching per route, offline behaviour, saved pages |
| SITE.md | page assembly, metadata and OG images, the shell, theming, the request map |
