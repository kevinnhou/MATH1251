# Architecture

How the repo is put together: the three parts and how they reach each other,
the engine's modules and their layering, the decisions behind the shape, and
the rules that keep it that way. Each module has its own doc; this one is the
map.

## Three parts

| Part | Is | Lives in |
|---|---|---|
| **Engine** | the environment engine, compile pipeline, exports and prompts, relations and threads, terminal, site shell, PWA, engine elements, engine prompt texts, fonts | `src/` |
| **Domains** | a subject's components (environments such as Theorem and Proof, others such as Mermaid) and its notation (TeX) | `packages/domain-*` ([Writing a domain](../domains.md)) |
| **Course** | config, content, logomark, readme, golden outputs, and the domains it lists | the course files ([Configuring a course](../course/config.md)) |

Dependencies point one way:

- a course imports domains;
- domains import only the engine's types, through the `engine` alias;
- the engine reaches the course only through the `course.*` aliases, and never
  imports `packages/` or names a domain, a component, a course or a strand.

## Repository layout

```
content/docs/               the notes: one folder per strand, meta.json gives the order
course.config.ts            the course: name, strands, theme, repo, domains, tutor rules, summary, schedule
course.server.ts            each listed domain's server.ts: notation and export methods
course.components.ts        each listed domain's components.tsx: renderers
course.css                  each listed domain's styles.css
course/logomark.tsx         the course's mark; icons, PWA icons and OG images are drawn from it
packages/domain-*/          domains
source.config.ts            the Fumadocs MDX collection and the remark/rehype plugins
next.config.ts              MDX, Serwist, BUILD_REVISION
bunfig.toml                 hoisted linker, so domain dependencies resolve from the root
src/engine.ts               the `engine` alias: the types domains and course files may import
src/proxy.ts                Markdown negotiation: rewrites strand URLs to their exports
src/app/                    routes ([Site](site.md#request-map))
src/components/<module>/    React UI, one folder per module
src/lib/<module>/           logic, one folder per module
scripts/golden.ts           the golden-output check
test/                       bun tests and the golden outputs
tsconfig.sw.json            separate compile of the service worker
docs/                       these docs
```

`package.json` keeps a generic name (`course`), so courses never edit it.

## The course binding

| Alias | File | Read by |
|---|---|---|
| `course.config` | `course.config.ts` | `lib/course/config.ts` (as `course`) and `lib/mdx-env/kinds.ts` (the domains) |
| `course.server` | `course.server.ts` | `lib/markdown/syntaxes.ts` (syntaxes) and `lib/export/components.ts` (export methods) |
| `course.components` | `course.components.ts` | `components/mdx/index.tsx` |
| `course/*` | `course/logomark.tsx` | `components/site` (header, OG image, app icon) and the offline page |
| relative `@import` | `course.css` | `app/global.css` |
| `@kevinnhou/domain-*` | `packages/domain-*` | course files only |
| `engine` | `src/engine.ts` | domains and course files (types only) |

`lib/course/config.ts` and `lib/course/strands.ts` derive what the rest of the
engine uses: `course`, `homeRoute`, `repoUrl`, `schedule`, `wordmark`,
`STRANDS`, `STRAND_LABELS`, `STRAND_ACCENTS`, `isStrand`, `getStrand` and the
`Strand` type (the literal union of the configured ids). `lib/course/config.ts`
types `schedule` as `Schedule`, and `lib/markdown/syntaxes.ts` reads
`course.server` through a wide type, so a course's literal config (one schedule,
domains without syntaxes) still type-checks.

## Modules

Each module is a folder under `src/lib` and, when it has UI, `src/components`.

| Module | What it is | UI folder | Doc |
|---|---|---|---|
| `markdown` | short Markdown fragments rendered outside MDX; the syntax contract | `components/markdown` | [Markdown](markdown.md) |
| `mdx-env` | the environment engine: the registry, the remark pass, slugs, citations, recalls, kind views | `components/mdx-env`, `components/mdx` | [Environments](environments.md) |
| `course` | the course binding, strands, the page catalog and route index sent to the client | `components/course` | this doc, [Compile](compile.md#client-data) |
| `compile` | the build pipeline: corpus metadata, the Fumadocs loader, lazy page bodies | | [Compile](compile.md) |
| `export` | the export graph, Markdown and JSON exports, component export methods, prompts, the ask panel | `components/export` | [Export](export.md) |
| `relations` | the course outline, the reading dock, threads and the threads page | `components/relations`, `components/threads` | [Relations](relations.md) |
| `terminal` | the sidebar terminal: commands, directories, search | `components/terminal`, `components/sidebar` | [Terminal](terminal.md) |
| `pwa` | the service worker protocol, caches, offline page, saved pages | `components/pwa` | [PWA](pwa.md) |
| `site` | composition: the corpus, page assembly, metadata, OG images, the shell | `components/site` | [Site](site.md), [Compile](compile.md#the-corpus) |
| `client`, `cn`, `result`, `url` | foundation helpers (below) | | this doc |

### Layering

A `lib/` module imports only from lower layers, so the graph has no cycles:

```
foundation   client  cn  markdown  pwa  result  url
             mdx-env
             course
             compile  export
             relations
             terminal
top          site
```

- `lib/` never imports `components/` or `app/`; `components/` never imports
  `app/`.
- A component module may import any `lib/` module, but only `components/site`
  and `components/sidebar` (the shell) may read `lib/site`. Feature UI gets
  corpus data as props, so it never depends on how the site is composed.
- Component modules don't import each other in loops.
- The engine reaches the course only through the `course.*` aliases and never
  imports `packages/`. Course files import only domains and `engine` types;
  domains import only `engine` types, their own files and npm packages. A
  domain's `index.ts` has no runtime imports, and no client module reaches a
  `server.ts`.
- The contracts domains implement (`mdx-env/component.ts`, `markdown/syntax.ts`,
  `export/domain.ts`) hold only types and constants, and are kept apart from
  the code that reads the binding (`mdx-env/kinds.ts`, `markdown/syntaxes.ts`,
  `export/components.ts`), so a binding never imports anything that imports it
  back.
- Route constants live with the module that serves the route
  (`export/urls.ts`, `course/urls.ts`, `pwa/protocol.ts`, `relations/urls.ts`,
  `compile/source.ts`, `site/docs-page.ts`).

`test/imports.test.ts` checks all of these except the route-constant rule.

### Foundation helpers

| File | Contents |
|---|---|
| `lib/client/actions.ts` | `isEditableTarget`, `isModifiedKey`, `isPrintableKey`, clipboard writes (`copyText`, `copyPendingText` for text still being fetched), `fetchText` |
| `lib/client/keybinds.ts` | every site-wide hotkey: search (⌘K / Ctrl+K), `/`, section digits, WASD/arrow `moveKey`, `cursorKey`, `stepWithin`, `focusSibling` ([Keys](terminal.md#keys)) |
| `lib/client/resource.ts` | `jsonResource(url)`: a fetch-once JSON store with `load`, `preload` and a `useResource` hook (used for `catalog.json`) |
| `lib/cn.ts` | `cn`, re-exported from `cnfast` |
| `lib/result.ts` | `ParseResult<T>` and `isRecord` |
| `lib/url.ts` | `toAbsoluteUrl`, `isSafeInternalUrl` |

## How a build flows

1. **Metadata pass** (before bundling): a remark-only pass over every page
   writes `.source/corpus-meta.ts`: frontmatter, environments, search
   structure, links ([Compile](compile.md)).
2. **The corpus** (once per worker): `getCorpus()` builds every index from the
   metadata: slugs and citations, threads, the export graph, the course
   outline, the thread map, the catalog and the route index.
3. **Static generation:** every notes page (the only consumer of compiled
   bodies), OG image, export, thread page and data file is rendered from the
   corpus and prerendered. Nothing revalidates.
4. **At request time** only search, the Markdown proxy, and the first request
   for each kind view (then cached) run code.

## Design decisions

### The baseline

1. **The engine stays in the repo; courses are clones.** Next needs route files
   inside the app, so a packaged engine would need generated route stubs and a
   CLI to write them. Cloning avoids all of it, and `git merge` carries engine
   fixes (such as a Next security update) to each course.
2. **Clone plus a `baseline` remote, not a template repo, fork or subtree.** A
   GitHub template repo has no shared history, so the first merge conflicts on
   every file. GitHub won't fork a repo into the account that owns it. A subtree
   would need `src/app` under a prefix, which Next can't use.
3. **Every domain ships in the baseline.** Courses share one `package.json` and
   lockfile, so merges don't conflict on dependencies. Unlisted domains are
   never imported, so they add nothing to a build.
4. **Engine docs live apart from the course readme.** `README.md` belongs to
   the course and `docs/` to the engine, so neither side's edits conflict with
   the other's.
5. **No graph across courses.** Each course builds and deploys alone. A link to
   another course is an absolute URL and stays prose.

### Domains

6. **Domains are packages reached through a tsconfig alias.** Fumadocs bundles
   `source.config.ts` with esbuild and leaves real packages for Node to load,
   and Node refuses to strip types under `node_modules`. The alias makes esbuild
   bundle the domain source instead: no build step, and the folders still have
   real package boundaries. esbuild applies `paths` before deciding what is
   external, so the config pass resolves the `course.*` aliases too, with no
   injected metadata pass.
7. **Entries split by where code runs.** `course.config` reaches browser
   bundles (`components/course/provider.tsx`, `components/mdx-env/env.tsx`), so
   `index.ts` must be plain data. KaTeX and export methods must never reach the
   browser, so they go in `server.ts`. The config pass can't load React or CSS,
   so renderers and styles have their own entries.
8. **Notation and environments are chosen separately.** A course lists domains'
   `index.ts` in its config and their `server.ts` in `course.server.ts`, so a
   commerce course can take TeX without theorem environments.
9. **One concept: the component.** Environments and other components are both
   tags a domain provides; an environment is a component with a graph role.
10. **Each component brings its own wording and export methods, with engine
    defaults.** Pack-wide fields (one derive label, one difficulty scale, one
    set of prompts) can't be merged across two domains; per-component ones need
    no merge rules. The cost is indirection: wording lives with the component,
    not beside the code that uses it.
11. **The engine names no kind.** Code asks the registry about roles
    (`isDerivation`, `isPractice`), properties and wording, so a domain with
    Solution instead of Proof behaves the same. Export code asks a component for
    its method by tag and falls back to the default; adding a component never
    edits `lib/export`.
12. **Roles are engine-fixed.** They carry behaviour (prerequisites,
    derivations, practice), so a new role is an engine change.
13. **Neutral relation IDs, component labels.** IDs are what machines read and
    must mean the same in every course; labels are what readers see and belong
    to the subject.
14. **Components read the graph, never write it.** One graph keeps the dock,
    threads and terminal (which never run export methods) in agreement with the
    documents. Anything that must be cited, numbered or listed is an
    environment.
15. **Literal props.** Exports are built from metadata, never by running a
    page, so export methods can only see values written in the source.
16. **Search uses text content.** A search method would run before the graph
    exists, and isn't worth a second code path.
17. **The engine owns the environment frame.** Every environment looks and
    behaves like one, whatever its domain.

### The engine

18. **The course is data.** Course values (name, strands, colours, repo, home,
    schedule) are config; subject vocabulary comes from domains. Teaching order
    is config too: it is a fact about how a course is taught and the only
    course-shaped assumption in `relations`.
19. **Static first.** Every notes page, export, thread page, OG image and the
    catalog is prerendered, and nothing revalidates (`revalidate = false`). Kind
    views and their OG images render once on first request and are then cached
    the same way; only search and the proxy run on every request. That makes the
    site cheap to host and readable offline, and is why derived data is
    computed once per build ([Compile](compile.md)).
20. **One graph for everything relational.** The export graph is the only
    source of relations: the dock, threads, terminal, documents, prompts and
    `graph.json` all read it.
21. **Layers over convenience.** `lib/` modules import downwards only, even
    where an upward import would be shorter (route handlers pass the export
    graph into `lib/export/server.ts` rather than the export module fetching
    the corpus).
22. **One home per concern.** Each module owns its route constants, its UI and
    its doc; shared types sit at the lowest layer that needs them
    (`PromptTarget` lives in `mdx-env/target.ts` because environments carry
    their prompt target).

## Invariants

- No engine code names a domain, a component, a course or a strand. It asks
  about roles (`isDerivation`, `isPractice`).
- Domains import nothing from the engine but `engine` types.
- The engine reaches a course only through the `course.*` aliases, and never
  imports `packages/` directly.
- `index.ts` is plain data; `server.ts` and its imports never reach a browser
  bundle.
- No JSX survives the metadata pass.
- The export graph is the only source of relations.
- Export methods are deterministic, read the graph only through their reader
  and link only through `link(id)`; a thrown error fails the build and names
  the component.
- Relation IDs are spelled only in `export/model.ts`.
- A course edits only the course files.

## Conventions

- **Code:** Biome via Ultracite (tabs, double quotes, sorted imports and
  Tailwind classes). Comments only where a tool needs them (lint directives,
  triple-slash references). Prefer `satisfies` for config objects and
  `ParseResult` over throwing in parsers.
- **Commits:** conventional prefixes (`feat:`, `fix:`, `refactor:`, `docs:`,
  `perf:`).
- **Docs:** [How these docs are written](../README.md#how-these-docs-are-written).

## Verifying changes

| Check | Catches | Misses |
|---|---|---|
| `bun run check` | lint and formatting | |
| `bun run types:check` | type errors, in the app and the service worker | |
| `bun test` | broken layering (`imports.test.ts`); the component pass: literal and `export const` props, computed props, unknown JSX, tables, occurrences inside environments, list indentation (`components.test.ts`) | everything else |
| `bun run golden` | changes to 17 sample exports | prompt text, most documents, HTML |

For a refactor that must not change behaviour, the golden set isn't enough:

1. **Snapshot every build output.** Before and after, copy every `*.body` under
   `.next/server/app` (skip `sw.js*`, which carries `BUILD_REVISION`) and
   `diff -rq` them: about 1,900 files on MATH1251.
2. **Compare HTML.** Prerendered HTML differs between builds only by the build
   ID, chunk hashes and UUIDs; normalise those, then compare.
3. **Dump every prompt.** Prompts are built in the browser from the context
   JSON, so no build output contains them. A scratch script importing
   `@/lib/export/prompt` can print `intentsFor`, `intentLabel`, `intentPhrase`
   and `promptUrl` for every context and intent. Run it with
   `bun --tsconfig-override ./tsconfig.json <script>` so the `@/` and
   `course.*` aliases resolve.
4. **Exercise what the content doesn't.** MATH1251 has one domain-component
   occurrence and no `context` methods, so its outputs barely touch component
   placement or the engine's fallback wording. For changes there, run the old
   and new code side by side in a scratch copy, on synthetic pages and a test
   domain that has export methods and components without `ask`; and plant a bug
   once to prove the comparison can fail.

## Changing things

**A new module:** give it a folder under `src/lib` (and `src/components` if it
has UI), place it in the layering above everything it imports and in `LAYERS`
in `test/imports.test.ts`, keep its route constants in its own `urls.ts`, and
add a doc under `docs/engine/`.

**A new role or relation:** an engine change across modules: `ROLES`
(`mdx-env/component.ts`), a role check in `mdx-env/kinds.ts`, `ROLE_EDGES` and
the relation tables in `export/model.ts` ([Export](export.md#changing-things)),
`DEPENDENCY_EDGES` if it is a prerequisite, and `PAGE_LINK_RELATIONS`
(`relations/build.ts`) if it should link pages.

**A new course value:** add an optional field with a default to `CourseConfig`
(`lib/course/types.ts`), so existing courses keep building after a merge, and
document it in [Configuring a course](../course/config.md).

**A new route:** [Site](site.md#changing-things).
