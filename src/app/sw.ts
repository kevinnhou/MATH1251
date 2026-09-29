/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache, PAGES_CACHE_NAME } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
	CacheFirst,
	ExpirationPlugin,
	NetworkFirst,
	NetworkOnly,
	Serwist,
} from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
	clientsClaim: true,
	fallbacks: {
		entries: [
			{
				matcher: ({ request }) => request.destination === "document",
				url: "/~offline",
			},
		],
	},
	navigationPreload: true,
	precacheEntries: self.__SW_MANIFEST,
	runtimeCaching: [
		{
			handler: new NetworkOnly(),
			matcher: ({ sameOrigin, url: { pathname } }) =>
				sameOrigin &&
				(pathname.endsWith(".md") ||
					pathname.startsWith("/og/") ||
					pathname.startsWith("/llms")),
		},
		{
			handler: new CacheFirst({
				cacheName: "next-static-media",
				plugins: [
					new ExpirationPlugin({
						maxAgeFrom: "last-used",
						maxAgeSeconds: 30 * 24 * 60 * 60,
						maxEntries: 64,
					}),
				],
			}),
			matcher: ({ sameOrigin, url: { pathname } }) =>
				sameOrigin && pathname.startsWith("/_next/static/media/"),
		},
		{
			handler: new NetworkFirst({
				cacheName: PAGES_CACHE_NAME.html,
				plugins: [
					new ExpirationPlugin({
						maxAgeSeconds: 24 * 60 * 60,
						maxEntries: 32,
					}),
				],
			}),
			matcher: ({ request, sameOrigin }) =>
				sameOrigin && request.mode === "navigate",
		},
		...defaultCache,
	],
	skipWaiting: true,
});

serwist.addEventListeners();
