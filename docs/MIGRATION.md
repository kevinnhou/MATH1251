# Migration

Turns this repo into a **baseline** that any course can be cloned from, with
subject-specific behaviour in **domains**: packages of components that plug
into the engine. A course is a clone of the baseline with its own config,
content and domains; the functionality is the same everywhere.

This replaces the earlier plan: a published engine, the `engine sync` CLI,
generated `.engine/` files, templates, fixtures, a `notation-tex` package and a
polyrepo. Because the engine stays in the repo, these are dropped too:
`binding.d.ts`, an injected metadata pass, `Strand` as `string`, `#lib/*`
package imports and split server/client entry points.

## Terms

| Term | Means |
|---|---|
| **engine** | the subject-agnostic app in `src/` |
| **domain** | a workspace package in `packages/domain-*` that provides components |
| **component** | an MDX tag a domain provides (`<Theorem>`, `<Mermaid>`) |
| **environment** | a component with a graph role; the code calls its type a *kind* |
| **engine component** | an MDX tag the engine itself provides (`<Thread>`, `<Recall>`, …) |
| **course** | one set of notes: the course files below |
| **baseline** | the repo every course is cloned from |

## Architecture

### Three parts

| Part | Is | Lives in |
|---|---|---|
| **Engine** | mdx-env, compile, export, relations, threads, terminal, site, PWA, engine components, engine prompt texts, fonts | `src/` |
| **Domains** | a subject's components (environments such as Theorem and Proof, other components such as Mermaid and Plot) and its notation (TeX) | `packages/domain-*` |
| **Course** | config, content, logomark, the domains it lists | the course files |

Dependencies point one way:
- A course imports domains.
- Domains import only the engine's types, through the `engine` alias.
- The engine reaches the course only through the `course.*` aliases.

### Domains are workspace packages

```
packages/domain-math/
  package.json      name, exports, its own deps (katex, remark-math, …)
  index.ts          components as plain data: safe in the browser
  server.ts         export methods and notation plugins: server only
  components.tsx    React renderers
  styles.css        its CSS, with `@source "./"` for Tailwind
```

- **Imported by name** (`@kevinnhou/domain-math`). A tsconfig `paths` entry maps
  those names to the package folders, so the Fumadocs config pass (esbuild),
  Turbopack and `tsc` all use the TypeScript source with no build step. Bun
  `workspaces` installs each domain's dependencies.
- **Types come from the `engine` alias**, a single barrel of engine types. Use
  `import type` plus `satisfies`. There is no runtime helper, so domains never
  depend on engine code.
- **The baseline ships every domain**: `domain-math` (maths environments and
  TeX), `domain-diagrams` (Mermaid) and `domain-code` (code environments). A
  course lists the ones it uses and may delete the rest after cloning.
- **Moving a domain out** to its own repo later means moving the folder and
  adding a build step (`tsc` to `dist/`).

**Notation is chosen separately from environments.** A course can take TeX
without maths environments: list `domain-math`'s `server.ts` in
`course.server.ts` and its `styles.css` in `course.css`, but leave it out of
`domains`.

### Components

Every component is built from optional parts. Anything a component leaves out
falls back to the engine default.

| Part | Entry | Default |
|---|---|---|
| graph role (`uses`, `derives`, `practises`) | `index.ts` | none: not an environment |
| display: code, label, plural, style, decoration, end mark, optional slug | `index.ts` | as today's `EnvKindConfig` |
| title for untitled derivations | `index.ts` | `<Label> of <target>` |
| relation labels ("Proves" / "Proved by", "Solves" / "Solved by") | `index.ts` | the engine's labels |
| ask wording: label, phrase and task per action; its subject phrase ("this result") | `index.ts` | the engine's wording for its role |
| difficulty scale (practice components) | `index.ts` | none: no difficulty |
| renderer | `components.tsx` | environments: the engine draws the body |
| `markdown`: documents and `llms-full.txt` | `server.ts` | environments: the engine format; others: text content |
| `context`: LLM prompt context, plus optional extra blocks | `server.ts` | same as `markdown` |

**The engine's defaults are neutral.** `domain-math` sets today's maths wording
on its components, so MATH1251's output doesn't change.

**Which component's wording is used.** Ask actions use the wording of the
component being asked about. The `derive` action on a result uses its
derivation's component: a theorem proved by a Proof says "Walk the proof", an
exercise with a Solution says "Walk the solution".

**Difficulties are per component.** A practice environment's `difficulty` is
checked against its own component's scale. Maths' `Example` keeps
routine/exam/challenge and code's `Exercise` keeps warm-up/core/stretch.

**Environments always sit inside the engine's frame.** An environment's
renderer draws only its body. The frame keeps the dock's active mark, the rail,
footnotes and the ask menu working for every environment without per-domain
code.

**Search, previews, dock titles and thread stations always use the text
content.** They are built in the metadata pass, before the graph exists.

**`markdown` and `context` run when exports are rendered** and get full
context:
- the surface: page, environment, kind view, thread, `llms-full`, context
- the page, the enclosing environment and the neighbouring segments
- read access to the export graph (nodes, relations, prerequisites, derivations, threads)
- `resolve(slug)` and `link(id)`, so every link is a node ID

They read the graph and never add to it: only environments create nodes and
edges. Extra `context` blocks carry a tier and are packed by the same rules as
every other block (EXPORT.md, Context tiers).

**Props** must be literal values (`domain={[-2, 2]}`) or name a literal
`export const` in the same page. A prop naming a slug is checked against the
tenet index and creates no edge.

**Where a component may sit.** Inside a list item, a component's export is
indented to fit. Inside a table it is a build error.

**Combining domains.** The registry merges the components of every listed
domain and checks the result as `assertEnvPack` does today: tags, codes, labels
and plurals must be unique across all of them.

**Engine components** stay in the engine: `Thread`, `ThreadMap`, `Recall`,
`Statement`, `KindFilter`, `Prose`. Fumadocs' default components (`Callout`,
`Tabs`, `Cards`) stay registered for the page, but content can't use them until
a domain wraps them (see Limitations).

### Roles and relations

- **Three roles**, defined by the engine. A domain assigns one to each
  environment and can't add another.
  - `uses`: a dependency. Feeds prerequisites, "builds on" / "leads to" and page links.
  - `derives`: a derivation (proof, solution). Attached under its target in documents, offers the `derive` action.
  - `practises`: practice. Has a difficulty, "practised in" and the practice prompts.
- **Relation IDs** are engine-wide and neutral: `uses`/`used_by`,
  `derives`/`derived_by`, `practises`/`practised_by`, `contains`/`part_of`,
  `see_also`, `references`/`referenced_by`, `recalls`/`recalled_by`. They
  appear in `graph.json`, `llms.txt` and prompt contexts.
- **Relation labels** are what readers see in documents and the dock. They come
  from the component.
- **The export graph is the only source of relations.** The dock, threads,
  terminal, documents, prompts and `graph.json` all read it.

### Wording

| Text | Comes from |
|---|---|
| course title, name, description, tutor rules, strand labels | `course.config.ts` |
| `llms.txt` summary line | `course.config.ts` (`summary`), default generated from the components' plurals |
| environment labels, codes, relation labels, untitled-derivation titles | the component |
| ask labels, phrases and tasks; difficulties | the component, else the engine's default for its role |
| tutor role preamble, thread prompts, document shape, frontmatter keys, relation IDs, URL scheme | engine |

### Course files

A course edits only these. Everything else is engine and changes in the
baseline.

| File | Holds | Reached through |
|---|---|---|
| `course.config.ts` | everything it holds today (code, name, title, description, home, repo, strands, theme, tutor), plus `domains` (each domain's `index.ts`), `summary` and `schedule` | `course.config` alias |
| `course.server.ts` | each domain's `server.ts` | `course.server` alias |
| `course.components.ts` | each domain's components | `course.components` alias |
| `course.css` | each domain's `styles.css` | relative `@import` from `app/global.css` |
| `course/logomark.tsx` | the logomark; icons, PWA icons and OG images are drawn from it | `course/*` alias |
| `content/docs/` | the notes | `contentDir` |
| `README.md` | the course's own readme | |
| `test/golden/` | the course's golden outputs: whichever export files it tracks | `bun run golden` |

`schedule` is `"parallel"` (default: chapter *k* of every strand is taught at
the same time) or `"sequential"` (strands taught one after another). It decides
thread rows and route order.

The engine docs (the module docs, this file, the engine part of today's
README) live in `docs/`. `package.json` keeps a generic name, so courses never
edit it.

### Updating courses from the baseline

Create a course by cloning the baseline into a new repo, then
`git remote add baseline <url>`. To update:

```
git fetch baseline && git merge baseline/main
git checkout baseline/main -- bun.lock && bun install
bun run types:check && bun run build
```

Rules that keep merges clean:
- A course never edits engine files. Fix it in the baseline, then merge.
- The baseline never edits course files after creation, and new config fields
  get defaults.
- If a course deleted a domain that the baseline later changed, keep the
  deletion (`git rm -r packages/domain-<name>`).
- Optional: in each course, add `.gitattributes` entries
  `course.* course/** content/** test/golden/** README.md merge=ours` and run
  `git config merge.ours.driver true` once.

## Design decisions

1. **The engine stays in the repo; courses are clones.** Next needs route files
   inside the app, so a packaged engine needs generated route stubs and a CLI
   to write them. Cloning avoids all of it, and `git merge` carries engine
   fixes (such as a Next security update) to each course.
2. **Clone plus a `baseline` remote, not a template repo, fork or subtree.**
   - A GitHub template repo has no shared history, so the first merge conflicts
     on every file.
   - GitHub won't fork a repo into the account that owns it.
   - A subtree would need `src/app` under a prefix, which Next can't use.
3. **Domains are packages reached through a tsconfig alias.** Fumadocs bundles
   `source.config.ts` with esbuild and leaves real packages for Node to load,
   and Node refuses to strip types under `node_modules`. The alias makes
   esbuild bundle the domain source instead. No build step, and the folders
   still have real package boundaries.
4. **No injected metadata pass.** esbuild applies tsconfig `paths` before
   deciding what is external, so the config pass already resolves the
   `course.*` aliases. Injection was only needed for a packaged engine.
5. **Every domain ships in the baseline.** Courses then share one
   `package.json` and lockfile, so merges don't conflict on dependencies.
   Unlisted domains are never imported, so they add nothing to a build.
6. **Entries split by where code runs.**
   - `course.config` reaches browser bundles (`components/course/provider.tsx`,
     `components/mdx-env/env.tsx`), so `index.ts` must be plain data.
   - KaTeX and export methods must never reach the browser, so they go in
     `server.ts`.
   - The config pass can't load React or CSS, so renderers and styles have
     their own entries.
7. **One concept: the component.** Environments and other components are both
   tags a domain provides. An environment is a component with a graph role.
8. **Each component brings its own wording and export methods, with engine
   defaults.** Pack-wide fields (one derive label, one difficulty scale, one set
   of prompts) can't be merged across two domains. Per-component ones need no
   merge rules.
9. **Export code never names a tag.** It asks the component for its method and
   falls back to the default. Adding a component never edits `lib/export`.
10. **Components read the graph, never write it.** One graph keeps the dock,
    threads and terminal (which never run export methods) in agreement with
    the documents. Anything that must be cited, numbered or listed is an
    environment.
11. **Literal props.** Exports are built from metadata, never by running a
    page, so export methods can only see values written in the source.
12. **Search uses text content.** A search method would run before the graph
    exists, and it isn't worth a second code path.
13. **The engine owns the environment frame.** Every environment looks and
    behaves like one, whatever its domain.
14. **Neutral relation IDs, component labels.** IDs are what machines read and
    must mean the same in every course. Labels are what readers see and belong
    to the subject. The rename happens before the baseline is cut, while it is
    one change instead of one merge per course.
15. **Roles are engine-fixed.** They carry behaviour (prerequisites,
    derivations, practice), so a new role is an engine change.
16. **Teaching order is course config.** It is a fact about how a course is
    taught and the only course-shaped assumption in `relations`.
17. **No graph across courses.** Each course builds and deploys alone. A link
    to another course is an absolute URL and stays prose.
18. **Engine docs live apart from the course readme.** `README.md` belongs to
    the course and the docs belong to the engine, so neither side's edits
    conflict with the other's.

## Limitations

These are intentional.

- **Props:** component props must be literals; a computed prop can't reach an
  export.
- **Placement:** components can't sit inside tables.
- **Search:** search, previews, dock titles and thread stations only see a
  component's text content.
- **Relations:** components can't add nodes or edges, and a domain can't add a
  role.
- **Frame:** a domain can't replace the environment frame, only the body.
- **Clashes:** two listed domains can't define the same tag, code, label or
  plural. A rename option in the config comes when a course first needs one.
- **Unknown JSX fails the build.** Fumadocs' default components (`Callout`,
  `Tabs`, `Cards`) count as unknown; using one means a domain wrapping it
  first.
- **Engine-wide settings:** relation IDs, the frontmatter schema (`ideas`,
  `tags`), the `content/docs` path, the tutor role preamble, the thread prompts
  and the fonts are the same in every course.
- **Engine changes go through the baseline.** A course gets an engine change
  only by merging `baseline/main`. A course that edits engine files will hit
  conflicts.
- **Domains outside baseline clones** need a build step first.
- **Threads:** thread documents and contexts carry no relations (EXPORT.md,
  Limitations).

## Changing things

- **A new domain:** add `packages/domain-<name>` with the layout above,
  importing only `engine` types. Do it in the baseline so every course gets it.
- **A new component:** add its data to `index.ts`, its renderer to
  `components.tsx`, and, if its export should differ from its text content, a
  `markdown` / `context` method to `server.ts`. Courses that list the domain
  pick it up.
- **A new environment:** a component with a graph role. Its citations reach the
  graph, exports, the dock and threads with no other change.
- **A new course:** clone the baseline and add the `baseline` remote. Edit the
  course files (strands must match `content/docs/meta.json`), and delete the
  domains it doesn't use.
- **Adding or removing a domain in a course:** edit `domains`,
  `course.server.ts`, `course.components.ts` and `course.css`.
- **A new role or relation:** an engine change touching `ROLES`
  (`mdx-env/component.ts`), `ROLE_EDGES` and the relation tables in
  `export/model.ts`, `DEPENDENCY_EDGES` and
  `PAGE_LINK_RELATIONS` (`relations/build.ts`). See EXPORT.md and RELATIONS.md,
  Changing things.

## Invariants

- No engine code names a domain's component, a domain, a course or a strand.
  It asks about roles (`isDerivation`, `isPractice`).
- Domains import nothing from the engine but `engine` types.
- The engine reaches a course only through the `course.*` aliases, and never
  imports `packages/` directly.
- `index.ts` is plain data. `server.ts` and its imports never reach a browser
  bundle.
- No JSX survives the metadata pass.
- The export graph is the only source of relations.
- Export methods are deterministic: no network, clock or randomness. A thrown
  error fails the build and names the component.
- Export methods link only through `link(id)` and read the graph only through
  the reader they're given.
- Relation IDs are spelled only in `export/model.ts`.
- A course edits only the course files.

## Plan

Each phase is one PR into `main` (or several where noted). Snapshots stay
unchanged unless the phase says otherwise, and each phase updates the docs it
affects.

### 0. Guardrails

- [x] Golden outputs: after `next build`, compare `graph.json`, `llms.txt`,
      `llms-full.txt` and a sample of page, environment, kind-view, thread and
      context documents from `.next/server/app/` against committed copies.
      Exclude `sw.js` and anything carrying `BUILD_REVISION`.
- [x] Import test (`bun test`): README.md Layering, no `lib/` module importing
      `components/` or `app/`, no component-module cycles. From phase 1, also
      the domain and course rules in Invariants.
- [x] CI (GitHub Actions): install, build, `types:check`, `bun test`, Biome.

Done: `scripts/golden.ts` (`bun run golden`, `--update`) checks 17 files
against `test/golden/` (excluded from Biome, which would reformat the JSON).
`test/imports.test.ts` has the domain and course rules from the start.
`.github/workflows/ci.yml` also runs the golden check; it has not run on
GitHub yet.

### 1. Domains as packages

Today's shape and behaviour, moved. `EnvPack` stays until phase 2 replaces it.

- [x] `src/lib/packs/{math,code}` → `packages/domain-{math,code}` with the
      layout above. Move the KaTeX deps (`katex` and its override,
      `rehype-katex`, `remark-math`, `micromark-extension-math`,
      `mdast-util-math`) to `domain-math`'s `package.json`.
- [x] Bun `workspaces`, `paths` entries for `@kevinnhou/domain-*` and `engine`,
      and the types barrel behind `engine`. Confirm `next dev`, `next build`
      and `tsc` resolve them, and that the domains' dependencies resolve from
      `.source/` (the config pass loads them from the repo root; use Bun's
      hoisted linker if they don't).
- [x] `course.markdown.ts` → `course.server.ts`. Add `course.components.ts`
      (read by `components/mdx/index.tsx`) and `course.css` (imported by
      `app/global.css`).
- [x] KaTeX CSS (`app/layout.tsx:4`, the `.katex` rules in `app/global.css`)
      → `domain-math/styles.css`. Check that KaTeX fonts still load. The
      terminal's `.katex-mathml` skip (`components/terminal/highlight.tsx`)
      becomes a selector the notation provides.

Done, with these choices:
- The `katex` override stays in the root `package.json` with a literal
  version (`^0.18.4`): Bun applies overrides only from the root, and without
  it `rehype-katex` would pull an older KaTeX than the CSS.
- `bunfig.toml` sets `linker = "hoisted"`, so every domain's dependencies sit
  in the root `node_modules` where the config pass and Tailwind find them.
  The config pass bundles the domain source and leaves its npm imports
  external, as decision 4 expects.
- The domains copy the three hast helpers they used from
  `lib/markdown/element.ts`, so they import no engine code.
- Instead of a selector, the notation marks hidden text: `domain-math` sets
  `data-search-skip` on KaTeX's MathML and the highlighter skips
  `[data-search-skip]`. It changes `catalog.json` (the attribute appears in
  rendered titles); nothing else changed.

### 2. Components

- [x] Replace `EnvPack` with per-component specs: today's `EnvKindConfig`
      fields plus the role, untitled-derivation title, relation labels, ask
      wording and difficulty scale. Engine defaults are neutral, and
      `domain-math` carries today's wording so snapshots don't change.
- [x] `CourseConfig.domains` replaces `env`. The registry merges every listed
      domain's components and runs the uniqueness checks.
- [x] One engine `derive` action. Each derivation component supplies its label,
      phrase and task. The domain's own intent word, and its uniqueness check
      (`export/prompt.ts`), go.
- [x] Practice environments check `difficulty` against their own component's
      scale.
- [x] `summary` moves to `course.config.ts`, defaulting to one generated from
      the components.
- [x] Rename what's left of "pack" in code and docs, so `grep -rniw 'packs\?'`
      finds nothing.

Done, with these choices:
- Components are keyed by tag in `index.ts`; the kind is the tag in kebab
  case and `label` defaults to the tag. `untitledTitle` is a template
  (`{label} of {targets}`). See MDX-ENV.md, Domains and components.
- The role is named `derives` here already; the relation ID followed in
  phase 4.
- `PromptTarget.hasDerivation` became `derivation` (the derivation's kind),
  so the client can word `derive` from that component. This changes every
  context JSON and `catalog.json` on purpose; the blocks are unchanged, and
  every prompt (all intents, labels and phrases over all 943 contexts) was
  compared with the old code and is identical.
- `grep` still finds "pack" in this file, which describes the old model.

### 3. Export methods

- [x] The metadata pass records each component occurrence: tag, literal props,
      children, enclosing environment, position. Fail on computed props, on
      components inside tables, and on JSX that is neither a listed component
      nor an engine component.
- [x] `getCorpus` checks slug props against the tenet index.
- [x] Export rendering calls each component's `markdown` / `context` with full
      context, falling back to the defaults. Indent output inside list items.
- [x] `Mermaid` → `packages/domain-diagrams`: its renderer and
      `beautiful-mermaid`, `remarkMdxMermaid` as a plugin in its `server.ts`,
      and a `markdown` method that returns a ```` ```mermaid ```` fence. Remove
      both from the engine (`source.config.ts`, `components/mdx`). This fixes
      the JSX leak in `/core/concept-map`, so that snapshot changes on purpose.

Done, with these choices:
- Lower-case JSX (HTML tags) is allowed. Every domain component, not only
  those with export methods, fails inside a table.
- Components are serialised twice in the metadata pass: as text content in
  `statement`, `body` and titles (what search, previews and the dock read),
  and as placeholders in prose segments and an environment's `templates`
  (what `lib/export/components.ts` fills). See MDX-ENV.md and EXPORT.md,
  Components.
- An environment's renderer in `components.tsx` is passed in as its body,
  inside the engine frame.
- `test/components.test.ts` covers literal and `export const` props, computed
  props, unknown JSX, tables, occurrences inside environments and list
  indentation.
- Only `/core/concept-map` and `llms-full.txt` changed.

### 4. Engine cleanup

Can be several PRs.

- [x] Rename the relation `proves`/`proved_by` → `derives`/`derived_by`, and
      the role. Touches `export/model.ts`, `export/build.ts`,
      `export/context.ts`, `export/query.ts`, `mdx-env/kinds.ts`,
      `mdx-env/pack.ts`, the domains' components and the docs. Replace the
      hardcoded IDs in `context.ts`, `query.ts` and `build.ts` with the
      constants from `model.ts`. Snapshots change on purpose.
- [x] `schedule` in config, read by `alignedRows` and `routeMembers`
      (`relations/thread-map.ts`) and the threads wording
      (`components/threads/marks.tsx`).
- [x] Logomark (`components/site/logomark.tsx`) → `course/logomark.tsx`; its
      readers (`header.tsx`, `og-image.tsx`, `app-icon.tsx`,
      `(docs)/~offline/page.tsx`) import it through the alias. Delete
      `app/favicon.ico`, since `icon.tsx` generates one.
- [x] Derive the `#thm-y` example in `llms.txt` (`export/documents.ts`) from
      the course's components. Generate the "Transitive `uses`/`proves`" line
      from the dependency edges.
- [x] Review the engine prompt texts (the tutor `ROLE` and `THREAD_TOUR` in
      `export/prompt.ts`) for maths wording.
- [x] Delete the `{ proof: "derive" }` alias (`export/use-prompt.ts`), the
      tracked `.env` (nothing reads it) and the `/graph` redirect
      (`next.config.ts`).
- [x] Move the module docs, this file and the engine part of README.md into
      `docs/`. README.md keeps only the course blurb, and its Limitations point
      here. Give `package.json` a generic name.

Done, with these choices:
- Relation IDs are spelled only in `export/model.ts`, which adds `EDGE` and
  `RELATION` constants for the other modules (including the dock and
  `relations/build.ts`). `graph.json`, `llms.txt` and every document's
  prerequisites line changed on purpose; nothing else did.
- `schedule` works through a chapter **term** (the slot it is taught in):
  the chapter number under `"parallel"`, its position in the tree under
  `"sequential"`. Rows, route order, the diagram's solid/transit lines and
  the route strips key on it (RELATIONS.md, Aligned rows). MATH1251's thread
  pages render identically.
- The `llms.txt` example anchor is the first `uses` component's
  `<kind>-1` (`corollary-1` here); the prerequisites line reads
  "`uses`/`derives`/`practises`".
- `ROLE` now says "an idea or result" instead of "a result"; `THREAD_TOUR`
  had no maths wording.
- `package.json` is named `course`.

### 5. Prove it

- [x] In a scratch copy, configure a code course on `domain-code`: one strand,
      a few pages using every component, one component with export methods,
      `schedule: "sequential"`. It must build with no engine edits and no
      maths anywhere. Fix whatever it needs in the engine and note each fix
      here.

Done. `domain-code` gained `Output` (a command and its output, exported as a
` ```console ` block) so the course had a component with an export method.
The copy deleted `domain-math` and `domain-diagrams`, listed only
`domain-code`, and built with no maths in any output; its exports, prompts
(exercises offer "Walk the solution"), labels ("Solves" / "Solved by") and
list-item indentation were checked. A second strand was added briefly to
check `sequential` ordering across strands. Engine fixes:
1. `lib/course/config.ts` types `schedule` as `Schedule`: the literal type
   of a course's `schedule` made the other branch a type error.
2. `lib/markdown/syntaxes.ts` reads `course.server` through a wide type: a
   course whose domains have no `syntax` failed `tsc`.

Also learned: deleting a domain from a clone changes `bun.lock` (Bun drops
its workspace entry), and the clone needs a real `bun install` (Turbopack
won't follow a symlinked `node_modules`).

### 6. Cut the baseline

- [ ] Decide whether `Recall` stays.
- [ ] New baseline repo from this one. Its first commit replaces the course
      files with a sample: a `course.config.ts`, a small `content/` (two
      strands, cross-citing environments, one thread), a placeholder logomark,
      every domain.
- [ ] This repo becomes the MATH1251 course: add the `baseline` remote and run
      `git merge -s ours baseline/main` once, so the sample commit never
      replaces MATH1251's files. Later merges bring only engine changes.

## Open

- Whether `Recall` stays. Decide before phase 6, or every course inherits it.
