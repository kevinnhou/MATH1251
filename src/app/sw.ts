/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type {
	PrecacheEntry,
	SerwistGlobalConfig,
	SerwistPlugin,
} from "serwist";
import {
	CacheFirst,
	cacheNames,
	ExpirationPlugin,
	NetworkFirst,
	NetworkOnly,
	Serwist,
} from "serwist";
import {
	isPageRequest,
	type NetworkStatus,
	networkStatusMessage,
	pwaCaches,
} from "../lib/pwa/protocol";
import { catalogRoute, graphDataRoute, offlineRoute } from "../lib/site/config";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const STATIC_PREFIX = "/_next/static/";
const DATA_ROUTES = new Set([catalogRoute, graphDataRoute]);
const OWNED_CACHES = new Set<string>(Object.values(pwaCaches));

const isStatic = (url: string) => url.startsWith(STATIC_PREFIX);
const urlOf = (entry: PrecacheEntry | string) =>
	typeof entry === "string" ? entry : entry.url;
const manifest = self.__SW_MANIFEST ?? [];
const warmUrls = [...manifest.map(urlOf).filter(isStatic), ...DATA_ROUTES];

const expireUnused = (maxEntries: number) =>
	new ExpirationPlugin({
		maxAgeFrom: "last-used",
		maxAgeSeconds: 30 * 24 * 60 * 60,
		maxEntries,
		purgeOnQuotaError: true,
	});

let reachable = true;

const networkStatus = (): NetworkStatus => ({
	reachable,
	type: networkStatusMessage,
});

async function reportReachable(value: boolean) {
	if (reachable === value) {
		return;
	}

	reachable = value;
	const clients = await self.clients.matchAll({ type: "window" });
	for (const client of clients) {
		client.postMessage(networkStatus());
	}
}

const trackReachability: SerwistPlugin = {
	async cacheDidUpdate() {
		await reportReachable(true);
	},
	async fetchDidFail() {
		await reportReachable(false);
	},
	async fetchDidSucceed({ response }) {
		await reportReachable(true);
		return response;
	},
};

const offlineRedirect: SerwistPlugin = {
	handlerDidError({ request }) {
		if (request.mode !== "navigate") {
			return Promise.resolve(undefined);
		}

		const { pathname, search } = new URL(request.url);
		const from = encodeURIComponent(pathname + search);
		return Promise.resolve(
			Response.redirect(`${offlineRoute}?from=${from}`, 302)
		);
	},
};

const serwist = new Serwist({
	clientsClaim: true,
	navigationPreload: true,
	precacheEntries: manifest.filter((entry) => !isStatic(urlOf(entry))),
	precacheOptions: { ignoreURLParametersMatching: [/^from$/] },
	runtimeCaching: [
		{
			handler: new CacheFirst({
				cacheName: pwaCaches.static,
				plugins: [expireUnused(400)],
			}),
			matcher: ({ sameOrigin, url }) => sameOrigin && isStatic(url.pathname),
		},
		{
			handler: new NetworkOnly({
				networkTimeoutSeconds: 5,
				plugins: [trackReachability],
			}),
			matcher: ({ request, sameOrigin }) =>
				sameOrigin && request.headers.get("RSC") === "1",
		},
		{
			handler: new NetworkFirst({
				cacheName: pwaCaches.pages,
				networkTimeoutSeconds: 3,
				plugins: [expireUnused(150), trackReachability, offlineRedirect],
			}),
			matcher: ({ request, sameOrigin }) =>
				sameOrigin && isPageRequest(request),
		},
		{
			handler: new NetworkFirst({
				cacheName: pwaCaches.data,
				networkTimeoutSeconds: 3,
				plugins: [trackReachability],
			}),
			matcher: ({ sameOrigin, url }) =>
				sameOrigin && DATA_ROUTES.has(url.pathname),
		},
	],
	skipWaiting: true,
});

self.addEventListener("install", (event) => {
	event.waitUntil(
		Promise.all(
			warmUrls.map((url) =>
				serwist.handleRequest({ event, request: new Request(url) })
			)
		)
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((names) =>
				Promise.all(
					names
						.filter(
							(name) =>
								!(OWNED_CACHES.has(name) || name.startsWith(cacheNames.prefix))
						)
						.map((name) => caches.delete(name))
				)
			)
	);
});

self.addEventListener("message", (event) => {
	if (event.data?.type === networkStatusMessage && !reachable) {
		event.source?.postMessage(networkStatus());
	}
});

serwist.addEventListeners();
