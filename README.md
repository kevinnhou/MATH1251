# MATH[1251]

Lecture notes for MATH1251 Mathematics 1B (UNSW Sydney), built as a **course
engine**: a Next.js 16 and Fumadocs site that turns a folder of MDX notes into a
linked, searchable, installable course. The notes are written as typed
environments (definitions, theorems, proofs, examples, …) that cite each other;
the engine indexes those citations into a graph and uses it everywhere: a
reading dock that shows what a passage builds on and leads to, threads that
follow one idea across the course, a keyboard-driven terminal in the sidebar,
offline reading, and Markdown and prompt exports for LLMs.

Nothing in the engine names MATH1251. The course is described in two files at
the repo root (`course.config.ts`, `course.markdown.ts`), and the subject's
vocabulary (which environment kinds exist, how prompts talk about them, TeX)
comes from a **pack**. The code is organised so that a second course (another
maths course, a programming course, a commerce course) can reuse the engine
unchanged, and so that the engine can later be split into packages.

## Running

| Script | What it does |
|---|---|
| `bun dev` | development server |
| `bun run build` | production build: every page and export is prerendered |
| `bun start` | serve the production build |
| `bun run types:check` | route typegen, then `tsc` for the app and for the service worker (`tsconfig.sw.json`) |
| `bun run check` / `bun run fix` | Ultracite (Biome) lint and format |

A Husky pre-commit hook runs `ultracite fix` and re-stages the files that were
staged.

## Layout

```
content/docs/               the notes: one folder per strand, meta.json gives the order
course.config.ts            the course: name, strands, theme, repo, env pack, tutor rules
course.markdown.ts          the Markdown syntaxes the notes use beyond GFM (math: TeX)
source.config.ts            Fumadocs MDX collection and remark/rehype plugins
next.config.ts              MDX, Serwist, build revision, /graph redirect
src/proxy.ts                Markdown negotiation: rewrites strand URLs to their exports
src/app/                    routes: pages, exports, search, OG images, PWA (see SITE.md)
src/components/<module>/    React UI, one folder per module
src/lib/<module>/           logic, one folder per module
tsconfig.sw.json            separate compile of the service worker
*.md                        module docs (index below)
```

## The course binding

Everything course-specific lives in two files, read through tsconfig path
aliases so the engine never imports them by relative path:

| Alias | File | Read by |
|---|---|---|
| `course.config` | `course.config.ts` | `lib/course/config.ts` (as `course`) and `lib/mdx-env/kinds.ts` (the env pack); `next.config.ts`, outside the engine, imports it by relative path for the `/graph` redirect |
| `course.markdown` | `course.markdown.ts` | `lib/markdown/syntaxes.ts` |

`course.config.ts` satisfies `CourseConfig` (`lib/course/types.ts`):

| Field | Used for |
|---|---|
| `code` | PWA short name, wordmark (`MATH` + `[1251]`, split at the first digit), terminal history key |
| `name` | site name in page titles, the manifest, the application name and Apple web-app title |
| `title` | full course title: heading of `llms.txt`, `course` field of every export, the tutor role in prompts |
| `description` | web manifest description |
| `home` | the strand whose index is the home page (`/` and `/graph` redirect there; it is the PWA start URL and the terminal's default directory); its pages are titled with `name` instead of a strand tag |
| `strands` | top-level content folders in display order: `id` (URL segment), `label` (tags, OG chip, export headings), `accent` (OG colour) |
| `repo` | GitHub link in the layout and the "SOURCE" link to each page's MDX file in the ask panel |
| `theme` | light and dark background colours: viewport theme colour, manifest, app icons |
| `env` | the environment pack (kinds, difficulties, prompt wording; see MDX-ENV.md) |
| `tutor` | subject-specific rules appended to the role of every LLM prompt (see EXPORT.md) |

Two checks fail the build when the config and the content disagree:
`lib/course/config.ts` throws if `home` is not a strand, and `assertStrands`
(`lib/course/strands.ts`, called from `getCorpus`) throws unless the strands
match the top-level folders in `content/docs/meta.json`, in the same order.

`lib/course/config.ts` and `lib/course/strands.ts` derive the values the rest of
the code uses: `course`, `homeRoute`, `repoUrl`, `wordmark`, `STRANDS`,
`STRAND_LABELS`, `STRAND_ACCENTS`, `isStrand`, `getStrand` and the `Strand`
type (the literal union of the configured ids).

`course.markdown.ts` exports the list of `MarkdownSyntax` plugins (see
MARKDOWN.md). It is a separate file because client components read the config
(the header, the course routes provider, the terminal): if the syntax list lived
in `course.config.ts`, KaTeX would be bundled into every one of them.

## Modules

Each module is a folder under `src/lib` and, when it has UI, `src/components`
(some UI folders take another name: `components/mdx` belongs to `mdx-env`,
`components/threads` to `relations`, `components/sidebar` to `terminal`).

| Module | What it is | Doc |
|---|---|---|
| `markdown` | renders short Markdown fragments (titles, statements, previews) outside MDX; the syntax contract | MARKDOWN.md |
| `mdx-env` | the environment engine: typed MDX blocks, slugs, citations, recall, kind views | MDX-ENV.md |
| `packs` | subject packs: math (kinds, TeX), code (kinds) | MDX-ENV.md, MARKDOWN.md |
| `course` | the course binding, strands, the page catalog and route index sent to the client | README.md, COMPILE.md |
| `compile` | build pipeline: corpus metadata, the Fumadocs loader, lazy page bodies | COMPILE.md |
| `export` | the export graph, Markdown and JSON exports, LLM prompts, the ask panel | EXPORT.md |
| `relations` | the course outline, the reading dock, threads and the threads page | RELATIONS.md |
| `terminal` | the sidebar terminal: commands, directories, search, and the sidebar built on it | TERMINAL.md |
| `pwa` | service worker, caches, offline page, saved pages | PWA.md |
| `site` | composition: the corpus, page assembly, metadata, OG images, the shell | SITE.md, COMPILE.md |
| `client`, `cn`, `result`, `url` | foundation helpers (below) | README.md |

### Layering

Modules form layers; a `lib/` module imports only from lower layers, so the
graph has no cycles and each module could become a package:

```
foundation   client  cn  markdown  pwa  result  url
             mdx-env
             packs
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
- The engine reaches the course only through the two aliases. The binding files
  in turn import only **contracts** (`lib/course/types.ts`,
  `lib/mdx-env/pack.ts`, `lib/markdown/syntax.ts`) and packs. Each contract
  imports nothing from the engine except another contract (`course/types.ts`
  takes `EnvPack` from `pack.ts`), holds only types apart from the pack
  validator in `pack.ts`, and is kept apart from the code that reads the binding
  (`lib/course/config.ts`, `lib/mdx-env/kinds.ts`, `lib/markdown/syntaxes.ts`);
  the packs add only `lib/markdown/element.ts`, so the binding never imports
  anything that imports it back.
- Route constants live with the module that serves the route
  (`export/urls.ts`, `course/urls.ts`, `pwa/protocol.ts`, `relations/urls.ts`,
  `compile/source.ts`, `site/docs-page.ts`).

Nothing checks these rules automatically: keep them when adding imports.

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
colours, repo, home) are config, and subject vocabulary is a pack. Engine code
asks the registry about roles (`isDerivation`, `isPractice`) instead of naming
kinds, so a pack with `Solution` instead of `Proof` behaves the same. The cost is
indirection: wording such as the prompt texts lives in the pack, not next to the
code that uses it.

**Kind vocabulary and Markdown syntax are chosen separately.** A course picks
its env pack in `course.config.ts` and its syntaxes in `course.markdown.ts`, so
a commerce course can use TeX without theorem kinds, and a maths course could
swap KaTeX for another renderer without touching its kinds.

**Static first.** Every notes page, export, thread page, OG image and the
catalog is prerendered, and nothing is revalidated (`revalidate = false`). Kind
views and their OG images render once on first request and are then cached the
same way; only search and the proxy run on every request. That is what makes the
site cheap to host and readable offline, and it is why derived data (the graph,
the catalog) is computed once per build (see COMPILE.md).

**Layers over convenience.** `lib/` modules import downwards only, even where an
upward import would be shorter (route handlers pass the export graph into
`lib/export/server.ts` rather than the export module fetching the corpus). This
keeps the planned split into `packages/*` mechanical.

**One home per concern.** Each module owns its route constants, its UI and its
doc; shared types sit at the lowest layer that needs them (`PromptTarget` lives
in `mdx-env/target.ts` because environments carry their prompt target).

## Limitations

The engine is not yet fully course-independent. Known gaps before a second
course or a Turborepo split:

- Per-course assets are still global: the logomark (an integral sign), app and
  PWA icons, fonts, the `katex.css` import in `app/layout.tsx` and KaTeX rules
  in `app/global.css`; the terminal highlighter skips `.katex-mathml`.
- The `content/docs` path is hardcoded in `source.config.ts` and the source link.
- `Strand` is a literal union taken from the config; in a package it has to
  become `string`.
- Export relation names (`proves`/`proved_by`, …) are fixed by the engine;
  packs can't relabel them.
- The example anchor in the `llms.txt` conventions (`#thm-y`) is math-flavoured.
- `lib/export` and `lib/client` mix React hooks with server-safe code; as
  packages they need separate `./server` and `./client` entry points.
- The code pack (`lib/packs/code`) is not used by this course.

## Changing things

**A new course:** copy the repo layout with its own `content/docs`; write
`course.config.ts` (strands matching `meta.json`, a pack for `env`) and
`course.markdown.ts` (`[]` if plain GFM is enough). Replace the assets listed
under Limitations.

**A new strand:** add the folder and list it in `content/docs/meta.json` and in
`strands`, in the same order. Routes, the proxy, labels, OG accents and exports
follow.

**A new module:** give it a folder under `src/lib` (and `src/components` if it
has UI), place it in the layering above everything it imports, keep its route
constants in its own `urls.ts`, and add a doc.

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
| COMPILE.md | from MDX on disk to prerendered output: corpus metadata, the loader, lazy bodies, the corpus, client data, build performance |
| MARKDOWN.md | fragment rendering, the `MarkdownSyntax` contract, TeX and KaTeX |
| MDX-ENV.md | environments: authoring syntax, the engine, `EnvPack` and the packs, rendering |
| EXPORT.md | the export graph, Markdown/JSON exports, prompts and intents, the ask panel |
| RELATIONS.md | the course outline, the reading dock, threads and the threads page |
| TERMINAL.md | the terminal, its commands and search, and the sidebar |
| PWA.md | the service worker, caching per route, offline behaviour, saved pages |
| SITE.md | page assembly, metadata and OG images, the shell, theming, the request map |
