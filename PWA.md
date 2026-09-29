# PWA

## Layout

```
src/app/sw.ts                      the service worker: caching rules, install, cleanup
src/app/serwist/[path]/route.ts    builds /serwist/sw.js (see COMPILE.md §11)
src/app/manifest.ts                web app manifest
src/app/pwa-icon/                  generated app icons
src/app/(docs)/~offline/page.tsx   offline page
src/app/catalog.json/route.ts      full page catalog
src/app/graph-data.json/route.ts   graph document

src/components/pwa/
  provider.tsx     registers the worker; saves pages on in-app navigation
  network.ts       offline state and saved paths; useUnsaved, reportUnreachable, onReconnect
  offline.tsx      offline page: sidebar section, reconnect, drawer button

src/lib/site/config.ts       routes (shared with the worker)
src/lib/pwa/protocol.ts      cache names, page request marker, network status message (shared with the worker)
src/lib/client/resource.ts   jsonResource and useResource (catalog, graph)
```

The worker is disabled in dev.

## Caches

Rules match in order. Anything unmatched goes straight to the network
(`/api/search`, OG images, `llms*`, `.md`, icons).


| Requests                            | Strategy                   | Cache                | Kept for                            |
| ----------------------------------- | -------------------------- | -------------------- | ----------------------------------- |
| `/_next/static/*`                   | cache first                | `static`             | 30 days since last use, 400 entries |
| RSC requests (`RSC: 1`)             | network only, 5 s timeout  | none                 |                                     |
| navigations and page saves          | network first, 3 s timeout | `pages`              | 30 days since last use, 150 entries |
| `/catalog.json`, `/graph-data.json` | network first, 3 s timeout | `data`               | latest copy                         |
| `/~offline`                         | precache                   | `serwist-precache-*` | replaced each build                 |


Static assets are deliberately not precached. Precache deletes entries missing
from the new manifest on every update, but saved pages from older builds still
reference those hashed files. The runtime `static` cache keeps them until they
go unused for 30 days or newer files push them out.

RSC payloads aren't cached because their keys depend on router state. When an
RSC fetch fails, Next.js falls back to a full navigation, which the `pages`
rule answers from cache.

## Lifecycle

- **Install:** fetches every `/_next/static` file in the build manifest and
both data routes through their runtime rules (~2.2 MB of static files). This
matters because the first visit happens before the worker is in control, so
none of its requests pass through it.
- **Activate:** `skipWaiting` and `clientsClaim` take over at once. Caches not
in `pwaCaches` (and not Serwist's own) are deleted, which also clears caches
from older workers.



## Saving pages

- **Full navigations** are saved by the `pages` rule.
- **In-app navigations** only fetch RSC, so `PageCache` (`provider.tsx`) asks
the worker to fetch the page's HTML (`CACHE_URLS`) on every pathname change.
The request carries `pageRequestHeaders`, which `isPageRequest` (the `pages`
rule's matcher) recognises; both live in `protocol.ts` so they change together.
It skips the first render when the worker already served the page, and
skips when offline.
- Serwist's own `cacheOnNavigation` is off: its requests carry no marker, so
they landed in a cache offline navigations never read.

Each in-app navigation therefore costs one extra full-page fetch (~60 KB
gzipped for a typical page).

## Offline

- **Unsaved page:** the `pages` rule fails and `offlineRedirect` redirects to
`/~offline?from=<path>`, served from precache (which ignores `from`).
Redirecting, rather than serving the fallback at the original URL, keeps
hydration consistent: the HTML was rendered for `/~offline`.
- **Offline page:** lives in the docs layout, so it has the sidebar and
terminal. `OfflineActions` moves the terminal to the root of `from`, shows
"Browse saved pages" in drawer mode, and returns to `from` once
`network.ts` reports the site reachable again.
The tree and the root selector both follow the terminal's current directory
(`directoryNodes` in `tree.tsx`, `SidebarTabs` in `tabs.tsx`), and a route
outside the course never moves it, so neither loses its place or shifts on
the offline page.
- **Connectivity:** `network.ts` treats the site as offline when the
device reports offline or the site is unreachable. The worker's
`trackReachability` plugin (on the RSC, `pages` and `data` rules) records whether
its last network fetch failed and messages open windows when that changes; a
new window asks on startup, and the worker only answers when it has seen a
failure. The offline page reports unreachable on mount. While unreachable, the
client sends a `HEAD` to `reachabilityProbeRoute` every 10 s, on `online`, and
when the tab becomes visible.
- **Greying:** while offline, `network.ts` also holds the paths in the `pages`
cache, and `null` otherwise. `LinkRow` calls `useUnsaved(href)`; an unsaved
internal link is `aria-disabled` and cancels navigation, while folder toggles
still work. An unsaved root in the selector changes directory instead of
navigating, so its saved pages stay browsable.
- **Terminal:** the catalog comes from the `data` cache, so commands work.
Search needs the network and says so.



## Limits

- **Storage:** pages are stored decompressed: ~0.8 MB for a typical page,
up to 4.5 MB for the largest kind views. On a quota error, `purgeOnQuotaError`
clears the whole cache, not just the oldest entries.
- **Safari:** without "Add to Home Screen", Safari deletes site data after 7 days
without a visit.
- **Old builds:** the `static` cache holds a few builds' files. A page saved
many deploys ago can lose its JS offline; its HTML stays readable.
- **Unreliable connections:** a request that only times out (rather than
failing) isn't counted as unreachable, so greying waits for a failure or the
offline page.
- **Open tabs across a deploy:** a tab that lazy-loads a chunk removed from the
server still fails, as it would without a worker.



## Testing

Puppeteer's `setOfflineMode` doesn't cover the worker's own fetches and fires
spurious `online` events. Stop the server instead to go offline, and restart
it to reconnect.

## Changing things

- **New data route:** add its path to `config.ts`, serve it as a static route,
and add it to `DATA_ROUTES` in `sw.ts` so it is warmed and works offline.
- **New cache:** add its name to `pwaCaches` (`protocol.ts`), or activation deletes it.
- **Imports in** `sw.ts`**:** keep them worker-safe (see COMPILE.md,
[What would break the split](COMPILE.md#what-would-break-the-split)).

