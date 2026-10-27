# PWA

The site installs as an app and keeps working offline. A Serwist service worker
caches every page the reader opens, the static assets those pages need and the
course catalog, so a page read once can be read again without a connection,
and the sidebar and terminal keep working on saved pages. Pages that were never
opened redirect to an offline page that lives inside the normal docs layout.

The module is small: a protocol file shared by the worker and the window
(`lib/pwa`), the worker itself (`app/sw.ts`), the route that builds it, and the
client side that registers it, saves pages on in-app navigation and tracks
connectivity (`components/pwa`). It is a foundation module: `lib/pwa` imports
nothing, and the worker imports only `lib/pwa/protocol.ts` and
`lib/course/urls.ts`.

## Layout

```
src/lib/pwa/protocol.ts            shared with the worker: offlineRoute, cache names, page-request marker,
                                   network status message, reachability probe route
src/app/sw.ts                      the worker: runtime caching rules, install warm-up, cleanup, messages
src/app/serwist/[path]/route.ts    builds /serwist/sw.js during static generation
src/components/pwa/
  provider.tsx                     PwaProvider: registers the worker; PageCache saves in-app navigations
  network.ts                       connectivity and saved paths: isOffline, useUnsaved, onReconnect, reportUnreachable
  offline.tsx                      OfflineActions: offline page behaviour
src/app/(docs)/~offline/page.tsx   the offline page
src/app/manifest.ts                web app manifest
src/app/pwa-icon/                  192, 512 and maskable icons (variants.ts, [variant]/route.tsx)
src/app/icon.tsx, apple-icon.tsx   favicon and Apple touch icon
tsconfig.sw.json                   compiles sw.ts on its own (WebWorker lib)
```

The worker is disabled in development (`PwaProvider` passes
`disable={process.env.NODE_ENV === "development"}`).

## The worker

### Building it

`app/serwist/[path]/route.ts` (`createSerwistRoute`) is a static route. During
static generation it globs `.next/static/**/*.{js,css,woff2}`, injects that list
into `sw.ts` as `self.__SW_MANIFEST`, bundles the worker with esbuild and
serves it as `/serwist/sw.js`. The offline page is added to the manifest with
`BUILD_REVISION` as its revision: a UUID that `next.config.ts` generates once
per build and inlines through `env`.

`tsconfig.json` excludes `sw.ts`; `tsconfig.sw.json` type-checks it with the
WebWorker library (`bun run types:check` runs both).

### Caching rules

Rules match in order; anything unmatched goes straight to the network
(`/api/search`, OG images, `llms*`, Markdown and context exports, icons, the
manifest). Opening one of these as a page is a navigation, so the `pages` rule
handles it like any other page.

| Requests | Strategy | Cache | Kept for |
|---|---|---|---|
| `/_next/static/*` | cache first | `static` | 30 days since last use, 400 entries |
| RSC requests (`RSC: 1`) | network only, 5 s timeout | none | |
| navigations and page saves (`isPageRequest`) | network first, 3 s timeout | `pages` | 30 days since last use, 150 entries |
| `/catalog.json` (`DATA_ROUTES`) | network first, 3 s timeout | `data` | latest copy |
| `/~offline` | precache | `serwist-precache-*` | replaced each build |

`isPageRequest` matches real navigations and requests carrying
`pageRequestHeaders` (`Accept: text/html`), which is how page saves are
recognised (below). The expiration plugin purges a cache on a quota error.

### Lifecycle

- **Install:** the worker fetches every `/_next/static` file in the build
  manifest and every data route through its runtime rule, so they land in the
  `static` and `data` caches (64 files, about 2.1 MB on the last build, plus
  the catalog). The first visit happens before the worker controls the page,
  so none of its own requests pass through it; warming is what makes that
  first page's assets available offline, and `PageCache` saves its HTML
  (below).
- **Activate:** `skipWaiting` and `clientsClaim` take over immediately. Caches
  that are neither in `pwaCaches` nor Serwist's own are deleted, which also
  clears caches left by older workers.
- **Navigation preload** is on, so network-first navigations don't wait for the
  worker to boot.

## Saving pages

- **Full navigations** are saved by the `pages` rule.
- **In-app navigations** fetch only RSC, which isn't cached. So `PageCache`
  (`provider.tsx`) asks the worker to fetch the page's HTML on every pathname
  change (`CACHE_URLS` with `pageRequestHeaders`), which the `pages` rule then
  stores. It skips the first render when the worker already served that page,
  and skips while offline.

Each in-app navigation therefore costs one extra full-page fetch.

## Offline

**An unsaved page.** The `pages` rule fails, and `offlineRedirect` answers a
navigation with a redirect to `/~offline?from=<path>`, served from the
precache (which ignores `from`).

**The offline page.** It lives in the docs layout, so the sidebar and terminal
are there. `OfflineActions`:

- moves the terminal to the root of `from`, if `from` is a course page, so the
  sidebar shows that strand's saved pages;
- reports the site unreachable on mount, and replaces the location with `from`
  once `network.ts` reports it reachable again;
- in drawer mode (mobile), shows "Browse saved pages", which opens the sidebar
  on the tree.

**Connectivity** (`network.ts`). The site counts as offline when the device
reports offline or the site is unreachable. Reachability comes from three
sources:

- the worker's `trackReachability` plugin (on the RSC, `pages` and `data`
  rules) records whether its last network fetch failed and messages every
  window when that changes; a new window asks on start-up, and the worker
  answers only while it considers the site unreachable;
- the offline page reports unreachable on mount;
- while unreachable, the window sends a `HEAD` to `/manifest.webmanifest`
  every 10 s, on the `online` event, and when the tab becomes visible.

**Greying.** While offline, `network.ts` also reads the paths in the `pages`
cache. `useUnsaved(href)` is true for an internal link whose path isn't saved;
the sidebar marks such rows `aria-disabled` and cancels navigation, while
folder toggles keep working, and an unsaved strand root in the tabs changes
directory instead of navigating (TERMINAL.md). Online, nothing is greyed.

**What works offline:**

| Feature | Offline |
|---|---|
| saved pages, their kind views if visited | yes |
| sidebar and terminal navigation | yes: the catalog comes from the `data` cache |
| reading dock, threads on saved pages | yes (part of the page) |
| `/threads` | only if visited |
| search | no; the terminal says it needs the network |
| Copy Markdown, LLM prompts | no: exports are network only; prompts fall back to a links-only context (EXPORT.md) |
| OG images, icons not yet loaded | no |

## Design decisions

**1. Static assets are runtime-cached, not precached.** Precache deletes entries
missing from the new manifest on every update, but saved pages from older
builds still reference those hashed files. The `static` cache keeps them until
they go unused for 30 days or newer files push them out. Install still warms
them, so the effect on first-visit offline support is the same.

**2. RSC payloads are never cached.** Their cache keys depend on router state,
so a cached payload could be served for the wrong tree. When an RSC fetch fails,
Next falls back to a full navigation, which the `pages` rule answers from
cache.

**3. Pages are saved by marker, not by Serwist's `cacheOnNavigation`.**
Serwist's own option fetches pages without a marker, so the `pages` rule
doesn't recognise them and they are never saved where offline navigations
look. `PageCache` sends `pageRequestHeaders`,
which `isPageRequest` recognises; both live in `protocol.ts` so they change
together.

**4. Unsaved pages redirect instead of serving a fallback in place.** The
offline HTML was rendered for `/~offline`; serving it at the original URL would
hydrate against the wrong route. A redirect keeps hydration consistent and
carries the origin in `from`.

**5. The offline page is a docs page.** Putting it in the docs layout keeps the
sidebar, the terminal and the saved pages one click away, instead of a dead end.

**6. The build revision is a UUID per build.** The offline page's precache
revision can't be the commit SHA (a build with uncommitted changes would keep
serving the old offline page) and can't come from `.next/BUILD_ID` (route
modules are first evaluated while collecting page data, before that file is
written).

**7. The worker is built by a route handler.** The worker ships with this
build's exact list of hashed assets and is rebuilt on every build without a
separate step.

**8. The worker imports almost nothing.** esbuild bundles whatever `sw.ts`
imports, so it imports only `lib/pwa/protocol.ts` and `lib/course/urls.ts`, by
relative path (`tsconfig.sw.json` has no aliases). Both stay free of React, DOM
and server code.

**9. Reachability is tracked, not just `navigator.onLine`.** A device can be
online while the site is down or a captive portal intercepts requests.
Combining the worker's fetch results with probes catches both; the probe
targets the manifest, a small static file that no worker rule intercepts, so it
really reaches the network.

**10. Every owned cache is listed.** Activation deletes any cache not in
`pwaCaches` or Serwist's namespace, which is what cleans up after renamed or
removed caches.

## Performance

- Install downloads about 2.1 MB of static files plus the catalog, once per
  worker version.
- Each in-app navigation costs one extra full-page HTML fetch to save it.
- Pages are stored decompressed: a typical page is under 1 MB, formula-heavy
  pages a few MB (the largest is 4.7 MB; COMPILE.md).
- Network-first rules give up after 3 s (pages, data) or 5 s (RSC), so a slow
  connection falls back to the cache instead of hanging.

## Limitations

- **Storage:** on a quota error, `purgeOnQuotaError` clears the whole cache, not
  just the oldest entries.
- **Safari:** without "Add to Home Screen", Safari deletes site data after 7 days
  without a visit.
- **Old builds:** the `static` cache holds a few builds' files; a page saved many
  deploys ago can lose its JavaScript offline, though its HTML stays readable.
- **Slow connections:** a request that only times out (rather than failing)
  isn't counted as unreachable, so greying waits for a real failure or the
  offline page.
- **Open tabs across a deploy:** a tab that lazy-loads a chunk removed from the
  server still fails, as it would without a worker.
- **Icons are per site, not per course:** the app icons draw the global
  logomark; only their background comes from the course's `theme` (README.md).

## Verifying

To check offline behaviour by hand, run a production build (`bun run build`,
`bun start`); the worker is off in development.

1. Open a page, then navigate to two or three more in the app.
2. Stop the server (this takes the site offline more faithfully than the
   browser's offline toggle, which doesn't cover the worker's own fetches and
   fires spurious `online` events).
3. Reload a visited page: it should load from the `pages` cache.
4. Open the sidebar: unsaved pages are greyed, saved ones navigate.
5. Navigate to an unvisited page: it should redirect to `/~offline?from=…`.
6. Restart the server: within about 10 seconds the offline page returns to
   `from`.

DevTools → Application → Cache Storage shows the `static`, `pages` and `data`
caches and the precache.

## Changing things

**A new data route:** export its route constant from the owning module's
`urls.ts`, serve it as a static route, and add it to `DATA_ROUTES` in `sw.ts`
(by relative import) so it is warmed at install and works offline.

**A new cache:** add its name to `pwaCaches` (`protocol.ts`), or activation
deletes it.

**A new rule:** add it to `runtimeCaching` in the right position (first match
wins), with `trackReachability` if its failures should count as unreachable.

## Invariants

- `sw.ts` imports only worker-safe modules, by relative path.
- `pageRequestHeaders` and `isPageRequest` stay in step (both in `protocol.ts`).
- Every cache the worker writes is named in `pwaCaches`.
- RSC requests are never cached.
- Static assets are never precached.
- The offline page stays inside the docs layout and `force-static`.
