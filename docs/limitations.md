# Limitations

What the engine deliberately doesn't do, grouped by area. Each is a trade-off
made on purpose; the reasons are in the linked docs' design decisions.
[Known issues](#known-issues) at the end are bugs, not choices.

## Courses

- **Engine-wide settings.** The fonts, the `content/docs` path (`contentDir`),
  the frontmatter schema (`ideas`, `tags`), relation IDs, the tutor role's
  preamble, the thread prompts and the URL scheme are the same in every course.
  Changing one is an engine change.
- **Engine changes go through the baseline.** A course gets an engine change
  only by merging `baseline/main`; a course that edits engine files will hit
  conflicts ([Starting a course](course/start.md#take-engine-updates)).
- **No graph across courses.** Each course builds and deploys alone; a link to
  another course is an absolute URL and stays prose.
- **One docs collection.** Corpus-meta, `source.ts` and `content.ts` assume a
  single corpus, and `getDocsCollection` throws otherwise.
- **`Strand` is a literal union** taken from the config, so code can't handle a
  strand that isn't configured.
- **One schedule for all strands.** A course is all `"parallel"` or all
  `"sequential"`; two strands side by side and a third after them can't be
  expressed.
- **One mark for every image.** The header, favicon, app icons, PWA icons and
  OG images are all drawn from `course/logomark.tsx`; a course can't give them
  different art. Only their background comes from `theme`.
- **`theme` is kept in step by hand** with the Fumadocs neutral preset's
  backgrounds.

## Authoring

- **Anchors shift.** Inserting an environment shifts the anchors of later ones
  of the same kind, which breaks links to them from outside the site. Slugs are
  the stable handle ([Writing notes](course/writing.md#ids-and-anchors)).
- **Flat pages.** Environments can't nest, and `Recall`, `Thread` and
  `ThreadMap` can't appear inside lists, quotes or callouts.
- **Static metadata and literal props.** Environment attributes must be static
  strings and component props literals (or a literal `export const`); a
  computed value can't reach the index or an export.
- **No components in tables.**
- **Unknown JSX fails the build.** Fumadocs' `Callout`, `Tabs` and `Cards` count
  as unknown until a domain wraps them.
- **Threads are joined by environments only**, not by prose.
- **Markdown links aren't checked.** A link to a missing page adds no relation
  and no error. Citations (`of`, `see`, `Recall`) are checked.

## Domains and components

- **Components can't add nodes or relations**, and a domain can't add a role.
  Anything that must be cited, numbered or listed is an environment.
- **The frame is the engine's.** A domain can replace an environment's body, not
  its frame (rail, footnotes, ask menu).
- **No clashes, and no renaming.** Two listed domains can't define the same tag,
  code, label or plural. `domain-math` and `domain-code` both define `Example`
  and the code `PF`, so they can't be listed together today; a rename option in
  the config comes when a course first needs one.
- **Relation IDs are engine-fixed**; a component relabels only what readers see.
- **Text content only, outside exports.** Search, previews, dock titles and
  thread stations see a component's children, never its export output, and
  `graph.json` keeps the text content too.
- **Domains outside a baseline clone need a build step** (`tsc` to `dist/`).

## Build

- **Remark runs twice per page** (metadata pass and MDX compile), so every
  remark plugin's cost is paid twice and both runs must agree
  ([Compile](engine/compile.md#design-decisions)).
- **Corpus-meta has no cache.** Every build and every dev save re-processes all
  pages; the cost grows linearly with the corpus.
- **Rehype output exists only in the docs page.** The TOC from `rehypeToc`,
  rendered KaTeX and highlighted code exist only in body chunks; a non-page
  route that needs equivalent data must get it from a remark plugin.
- **Kind views aren't prerendered.** Each renders on its first request and is
  then cached, and loads its full page body to show a part of it.

## Markdown

- **No remark transforms on fragments.** A syntax can add micromark and mdast
  extensions to fragments, but not block-level plugins.
- **`simplifyTex` is regex rewrites**, good enough for plain text and search but
  not a TeX parser: nested braces in `\frac` are not handled.
- **Fixed-size caches, no metrics.** A corpus much larger than MATH1251 would
  churn the 512-entry LRUs.

## Exports and prompts

- **URL budget.** About one target in eight loses some context to the
  8,000-character limit; the model gets the Markdown URL instead, which it may
  or may not fetch. There is no per-provider limit.
- **The terminal reaches pages and kind views only.** Its usage line and
  completions still list every intent, including `check`, which no catalog
  target offers.
- **Kind-view contexts are coarse.** Their prerequisites are the whole parent
  page's, not the view's environments', and a `details` block for an
  environment without a statement (every proof) starts with `Proof:` but not
  the proof's label, so it is tied to its theorem only by the order of the
  contents list.
- **Practice kind views** get the practice quiz task, which is worded for one
  problem.
- **Threads carry no relations.** Thread documents have no prerequisites or
  relations, and thread contexts no relation tiers.
- **"Blocked" also covers a closed tab.** A student who closes the placeholder
  tab during the wait sees the pop-up-blocked link.
- **Offline, nothing this module fetches is cached** ([Export](engine/export.md#offline)).
- **`/llms.txt` has no route constant** in `urls.ts`; the other four routes do,
  and the `app/` folder names must match them by hand.
- **Mixed modules.** `lib/export` and `lib/client` mix React hooks with
  server-safe code.

## Relations and threads

- **One thread in the address.** With several threads shown, only the first is
  kept in the URL, so a reload drops the others.
- **The diagram scrolls sideways on phones** once slots reach 16px; a vertical
  layout would avoid that.
- **The dock covers prose on narrow screens.** At rest the cutout covers the
  bottom-right of the prose, and only a tap opens it.
- **No previews from the page.** Hovering a prose link, footnote or recall
  doesn't preview its statement in the bay, and "builds on" rows navigate
  instead of expanding.
- **Footnotes repeat the bay.** An environment's footnotes list what the bay
  shows.
- **Tuning is unverified.** The dock's and diagram's tuning values
  ([Tuning](engine/relations.md#tuning)) haven't been checked systematically in
  browsers.

## Terminal and search

- **Search needs the network**; offline the terminal says it can't run.
- **Cold starts pay for the index.** The search index lives in the server
  process, so the first search after a cold start builds it.
- **No composition.** No pipes, and no arguments beyond an assistant's intent
  and one page or directory.
- **Directories come from pages.** An empty chapter folder doesn't exist for
  `cd`.
- **History is per tab** (`sessionStorage`).

## Offline

- **Quota errors clear a whole cache**, not just the oldest entries
  (`purgeOnQuotaError`).
- **Safari deletes site data** after 7 days without a visit, unless the site was
  added to the Home Screen.
- **Old saved pages can lose their JavaScript.** The `static` cache holds a few
  builds' files; a page saved many deploys ago stays readable as HTML but may
  not hydrate.
- **Slow isn't unreachable.** A request that only times out (rather than
  failing) isn't counted as unreachable, so greying waits for a real failure or
  the offline page.
- **Open tabs across a deploy** that lazy-load a chunk removed from the server
  still fail, as they would without a worker.
- **What doesn't work offline:** search, Copy Markdown, full prompt context, OG
  images, icons not yet loaded, and `/threads` unless visited
  ([PWA](engine/pwa.md#offline)).

## Site

- **The OG image uses Satori's default font**, not the site's.

## Known issues

Bugs, not choices. Neither occurs in MATH1251's content.

- **A block component mid-sentence gives invalid Markdown.** A component whose
  export is a block (such as `<Output>`'s ` ```console ` fence or a Mermaid
  diagram) used inline produces "Body with ```console…" in the exports. A fix:
  fail the build when a block component is used inline.
- **Mid-line components in lists aren't indented.** A multi-line export from a
  component that doesn't start its line inside a list item or quote
  (`1. nested <Ref />`) isn't indented, so it breaks the list. Indentation only
  applies when the component starts the line (`LINE_PREFIX`,
  `export/components.ts`).
- **`llms.txt` wording drift.** It says prerequisites come "from other pages",
  though an environment's can be on its own page; its "every link points at a
  node ID" isn't true of its own index links; and its thread pattern is always
  `<home>#thread-<slug>`, though a thread's ID uses its defining page.
- **Thread sections the dock follows** get `data-dock-active`, but nothing
  styles it yet.
