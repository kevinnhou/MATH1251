# Site

The shell that turns the corpus into pages. It owns the app routes that render
documents (the root and docs layouts, the docs page, OG images, icons and the
home redirect), page metadata, the header and wordmark, the Fumadocs layout
configuration, Markdown content negotiation, and the global stylesheet. It is
the top of the layering: `lib/site` composes every other module, and only the
routes (`app/`) and the shell components (`components/site`,
`components/sidebar`) may read it.

The corpus itself (`lib/site/corpus.ts`) is in [Compile](compile.md#the-corpus); the sidebar
inside the layout is in [Terminal](terminal.md#the-sidebar). This doc covers how the pieces are put on the
page.

## Files

```
src/app/
  layout.tsx                  root layout: fonts, global.css, metadata, viewport, PWA and Fumadocs providers
  page.tsx                    / → redirect to the home strand
  (docs)/layout.tsx           docs layout: course routes, relations, terminal, Fumadocs DocsLayout
  (docs)/[...slug]/page.tsx   a notes page or a kind view
  og/docs/[...slug]/route.tsx OG image for a page or kind view
  icon.tsx, apple-icon.tsx    32 px icon and 180 px Apple touch icon (pwa.md for the PWA icons)
  fonts/                      Alliance No.2 woff2 files, loaded by layout.tsx
  global.css                  theme tokens and the CSS hooks every module styles through
src/lib/site/
  corpus.ts                   getCorpus, resolveDocsPage, docsStaticParams (compile.md)
  docs-page.ts                describeDocsPage: titles, metadata, OG text, OG image URLs
  layout.ts                   baseOptions: GitHub link, transparent nav
  text-response.ts            textFileResponse: inline plain-text responses for exports
src/components/site/
  docs-layout.tsx             VirtualDocsLayout: DocsLayout with the custom slots, tabs and kind-view tree
  header.tsx                  Header: logomark and the SUBJECT[number] wordmark
  subnav.tsx                  Subnav: the mobile header bar
  og-image.tsx                OgImage, toOgImageProps
  app-icon.tsx                AppIcon: the logomark on the theme background
src/proxy.ts                  Markdown content negotiation
next.config.ts                MDX, Serwist, BUILD_REVISION
course/logomark.tsx           Logomark: the course's mark (SVG), read through the `course/*` alias
```

## Request map

| Route | Serves | Rendering | Owner |
|---|---|---|---|
| `/` | redirect to the home strand (`/core`) | static | [Site](site.md) |
| `/<strand>/…` | a notes page | prerendered | [Site](site.md) |
| `/<strand>/…/<kinds>` | a kind view | first request, then cached | [Site](site.md), [Environments](environments.md) |
| `/<strand>/….md`, or `Accept: text/markdown` | the page's Markdown (rewritten by `proxy.ts`) | static target | [Site](site.md), [Export](export.md) |
| `/og/docs/…/image.png` | OG image for a page (kind views on first request) | prerendered | [Site](site.md) |
| `/threads`, `/threads/<slug>` | the threads page | prerendered | [Relations](relations.md) |
| `/~offline` | the offline page | `force-static` | [PWA](pwa.md) |
| `/llms.txt`, `/llms-full.txt` | course index and full text for LLMs | prerendered | [Export](export.md) |
| `/llms.mdx/docs/…`, `/llms.mdx/context/…` | per-node Markdown and prompt context | prerendered | [Export](export.md) |
| `/graph.json` | the export graph | prerendered | [Export](export.md) |
| `/catalog.json` | the page catalog | prerendered | [Compile](compile.md) |
| `/api/search` | full-text search | on request | [Terminal](terminal.md) |
| `/serwist/sw.js` | the service worker | built at static generation | [PWA](pwa.md) |
| `/manifest.webmanifest`, `/pwa-icon/<variant>` | manifest and PWA icons | prerendered | [PWA](pwa.md) |
| `/icon`, `/apple-icon` | icon, touch icon | prerendered | [Site](site.md) |

## Layouts and providers

```
<html>                          fonts: Alliance No.2 (local), Geist Mono (--font-geist-mono)
  PwaProvider                   service worker registration, page saving (pwa.md)
    RootProvider                Fumadocs theme and framework; search dialog disabled
      (docs)/layout
        CourseRoutesProvider    the route index, from getCorpus().routes (compile.md)
          RelationsProvider     the current page's dock, published by ReadingDock (relations.md)
            TerminalProvider    terminal state, catalog, window keys (terminal.md)
              VirtualDocsLayout Fumadocs DocsLayout: header, sidebar slot, tabs, page tree
                page
```

The order is load-bearing. The terminal sits above `DocsLayout` so it can read
the course routes and the page's relations and survive navigation; the sidebar
sits inside `DocsLayout` and binds to the terminal ([Terminal](terminal.md#the-sidebar)).
`RelationsProvider` sits above both because the page's `ReadingDock` publishes
its dock there and the terminal's `relations` command reads it. The offline page
and the threads pages are inside `(docs)`, so they get the sidebar and terminal
too.

`VirtualDocsLayout` (`docs-layout.tsx`) configures `DocsLayout`:

- `tree`: the labelled page tree from `buildSidebarTree()` (built on the server,
  [Terminal](terminal.md)), passed through `withActiveKindViewPages` so the open kind view
  and its siblings appear under their page ([Environments](environments.md));
- slots: `Subnav` as the mobile header, `Sidebar` as the sidebar root (with
  Fumadocs' provider and trigger), no search trigger;
- `nav.title`: `Header`; the GitHub link from `baseOptions`;
- tabs: Fumadocs builds one tab per strand from the root folders (with the
  Lucide icon named in each strand's `meta.json`); the transform wraps each
  icon in brackets and tags it for the CSS.

## The docs page

`app/(docs)/[...slug]/page.tsx` serves both notes pages and kind views:

1. `resolveDocsPage(slug)` finds the page or kind view (`notFound()` otherwise).
2. `loadPageContent(page.path)` loads the compiled body and its TOC; this is
   the only place a body is loaded ([Compile](compile.md)).
3. `promptTargetFor` gives the page's (or kind view's) prompt target for the
   page actions ([Export](export.md)); `buildPageDock` builds this page's reading dock
   ([Relations](relations.md)).
4. It renders `DocsPage` with:
   - the title and description as Markdown labels (`MarkdownLabel`, server
     rendered);
   - `PageActions` (the ask menu; on notes pages its panel also has a "SOURCE"
     link from `contentSourceUrl`: the page's file on GitHub at the configured
     branch),
     `LLMCopyButton`, and on a kind view a "Back to <page>" link;
   - the MDX body in `DocsBody data-prose`, with `getMDXComponents` given the
     relative-link resolver, the page's environments, the course indexes, the
     thread map, a prompt-target lookup and, on kind views, the view kind
     ([Environments](environments.md#rendering));
   - the TOC, filtered to the kind on a kind view (`getKindViewToc`), in the
     `clerk` style;
   - `ReadingDock`, keyed by page URL so its state resets between pages.

Page frontmatter (schema in `source.config.ts`):

| Field | Used for |
|---|---|
| `title` | heading, `<title>`, sidebar, catalog, exports, OG image (Markdown allowed) |
| `description` | lede under the title, meta description, OG image (Markdown allowed) |
| `icon` | Lucide icon name (tab and tree icons, through `lucideIconsPlugin`) |
| `full` | full-width page without the TOC column |
| `ideas` | the "ideas" list on the OG image and in exports |
| `tags` | export frontmatter ([Export](export.md)) |

## Metadata and OG images

`describeDocsPage(resolved)` (`docs-page.ts`) returns both the page metadata and
the text for its OG image, so the two can't disagree:

| | Notes page | Kind view |
|---|---|---|
| `<title>` | `MATH[1251] Title` on the home strand, `[ALGEBRA] Title` elsewhere (the strand's label, upper-cased) | the view's tab title, `[THEOREMS] Title` |
| description | the page description as plain text | the view description ("All theorems from …") |
| canonical, robots | default | canonical to the parent page; `noindex, follow` |
| OG image | `/og/docs/<slugs>/image.png` | `/og/docs/<slugs>/<kinds>/image.png` |
| OG chip | the strand tag | the view chip (`THEOREMS`) |
| OG census | every kind on the page | the view kind |

`OgImage` (`og-image.tsx`) is a 1200 × 630 `ImageResponse`: the strand's accent
colour (`STRAND_ACCENTS`, falling back to the home strand's), the logomark and
wordmark, the chip, the title, the description (dropped when it repeats the
title), the page's `ideas`, and a census of environment codes and counts
(`[TH] 4`, `[DF] 7`, …) in the order the domains list their components.

The wordmark is the course code split at its first digit (`wordmark` in
`lib/course/config.ts`): `MATH` and `[1251]`, used by `Header` and the OG image
alike.

## Markdown negotiation

`proxy.ts` (Next's request proxy) rewrites, for every strand:

- `/<strand>/….md` → `/llms.mdx/docs/<strand>/…/content.md`, always;
- `/<strand>/…` → the same file when the request prefers Markdown
  (`isMarkdownPreferred`, from the `Accept` header), with `Vary: Accept`.

So an agent can fetch any page as Markdown at its own URL. The strands come from
the config, so a new strand is negotiated without changes here. The Markdown
itself is in [Export](export.md#markdown-documents).

## Theming and global CSS

The palette is Fumadocs' neutral preset (`fumadocs-ui/css/neutral.css`) with
Tailwind 4. `course.theme` (light and dark background colours) sets only the
browser theme colour, the manifest colours and the app icon background; it
should match the preset's backgrounds.

`app/global.css` holds the few rules Tailwind classes can't express, grouped by
the module that owns the hook:

| Hooks | Owner | What |
|---|---|---|
| `--relations-builds-on`, `--relations-leads-to`, `--relations-thread` | [Relations](relations.md) | relation colours, light and dark |
| `.tab-icon`, `.tab-option` | [Site](site.md) | the bracketed strand tabs |
| `.mdx-env*`, `[data-env-style]` | [Environments](environments.md) | environment titles, statements, footnotes, the dock highlight rail (`.mdx-env::before`) |
| `[data-dock*]`, `[data-route-track]`, `[data-thread-row]` | [Relations](relations.md) | dock surface, corner cutout, swap animation, route strips |
| `[data-terminal-pane*]`, `[data-terminal-cascade]`, `[data-tree-content]`, `[data-tree-pinned]`, `[data-rail-mark]` | [Terminal](terminal.md) | pane cross-fade, tree expand/collapse and pinning |
| `.md-fragment-*` | [Markdown](markdown.md) | fragment sizing in context; formula sizing (`.katex*`) is in `domain-math/styles.css`, reached through `course.css` |
| `[data-prose]` | [Site](site.md) | the prose column width (48rem) |
| `.prose` headings | [Site](site.md) | heading anchors and display math in headings |
| `#nd-toc`, `[data-toc]` | [Site](site.md) | TeX in TOC links (overflow, formula size) |

Global choices: scrollbars are hidden everywhere (scrolling still works), scroll
locking adds no scrollbar compensation, weight synthesis is off, animations
respect `prefers-reduced-motion`, and print hides the dock rail.

## Design decisions

1. **One route serves notes pages and kind views.** A kind view is the parent
   page's body rendered with a filter, so it shares the route, the body module and
   the layout. `resolveDocsPage` tells them apart, and every difference (TOC,
   actions, metadata, OG text) is a branch on `resolved.kind`, not a separate
   page.

2. **Metadata and OG text come from one function.** `describeDocsPage` builds
   both, so a title change can't update one and not the other, and the OG route
   needs nothing but the resolved page.

3. **Kind views are not indexed.** Their content is a subset of the parent
   page; a canonical link and `noindex` keep search engines on the notes page
   while links still count.

4. **Providers above the layout, sidebar inside it.** State that must survive
   navigation or be shared between the page and the sidebar (routes, relations,
   terminal) lives above `DocsLayout`; Fumadocs owns the layout's own state
   (collapse, drawer), which the sidebar reaches through its slot. [Terminal](terminal.md)
   explains the binding.

5. **Labels are rendered on the server.** Titles, descriptions and tree labels
   may contain TeX. `MarkdownLabel` and `buildSidebarTree` render them to HTML on
   the server, so no client bundle carries the Markdown pipeline or KaTeX.

6. **Markdown is negotiated at the page URL.** Rewriting `….md` and
   `Accept: text/markdown` to the static export means one canonical URL per page
   for people and agents alike, with no extra route and no runtime rendering.

7. **Course values reach the shell through the config only.** The site name,
   wordmark, theme colours, repository and home route come from `course.config.ts`
   ([Configuring a course](../course/config.md)); nothing in the shell names MATH1251.

8. **Feature UI doesn't read the corpus.** Only routes call `getCorpus()`; the
   shell (`components/site`, `components/sidebar`) may use other `lib/site`
   helpers. Pages pass corpus data down as props (the threads page, the dock, the
   MDX options), so feature components don't depend on how the site is composed.

## Performance

- Every notes page, its OG image and the icons are prerendered; kind views and
  their images render once on first request ([Compile](compile.md#prerendering)).
- `generateMetadata` and the page share `resolveDocsPage`, a map lookup in the
  memoised page index.
- The page tree with rendered labels is built once per render (React `cache`)
  and passed to the client layout as props.
- Page sizes, and the share taken by the inlined RSC payload, are in
  [Compile](compile.md#performance).

## Limitations

In [Limitations](../limitations.md#site).

## Changing things

**A new top-level route:** export its path from the owning module's `urls.ts`,
add it to the request map above, and decide whether the service worker should
cache it ([PWA](pwa.md)).

**A new provider:** place it by what must read it: above `VirtualDocsLayout` if
the terminal or anything surviving navigation needs it, inside the page if only
the page does.

**A new page action:** add it to `PageActions` ([Export](export.md)) or next to it in the
docs page; branch on `view` if it shouldn't appear on kind views.

**A new CSS hook:** prefer Tailwind classes; if a rule needs a selector Tailwind
can't express, add it to `global.css` under the owning module's group and
name the hook after that module.

## Invariants

- Only `components/site`, `components/sidebar` and `app/` read `lib/site`.
- The docs page is the only caller of `loadPageContent`.
- Metadata and OG text for a page come from `describeDocsPage`.
- Kind views have a canonical link to their parent and are `noindex`.
- The shell names no course: every course value comes from the config.
- The provider order in the docs layout stays: course routes, relations,
  terminal, layout.
