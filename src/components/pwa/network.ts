"use client";

import { useSyncExternalStore } from "react";
import { withoutHash } from "@/lib/course/catalog";
import {
	type NetworkStatus,
	networkStatusMessage,
	pwaCaches,
	reachabilityProbeRoute,
} from "@/lib/pwa/protocol";

const PROBE_INTERVAL_MS = 10_000;

interface Offline {
	saved: ReadonlySet<string> | null;
}

let started = false;
let reachable = true;
let offline: Offline | null = null;
let probeTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(next: Offline | null) {
	offline = next;
	for (const listener of listeners) {
		listener();
	}
}

function update() {
	scheduleProbe(navigator.onLine && !reachable);
	const down = !(navigator.onLine && reachable);
	if (down === (offline !== null)) {
		return;
	}

	if (!down) {
		publish(null);
		return;
	}

	const state: Offline = { saved: null };
	publish(state);
	readSavedPaths().then((saved) => {
		if (saved && offline === state) {
			publish({ saved });
		}
	});
}

function scheduleProbe(needed: boolean) {
	if (!needed) {
		clearTimeout(probeTimer);
		probeTimer = undefined;
		return;
	}

	probeTimer ??= setTimeout(() => {
		probeTimer = undefined;
		probe();
	}, PROBE_INTERVAL_MS);
}

async function readSavedPaths(): Promise<ReadonlySet<string> | null> {
	if (!("caches" in window)) {
		return null;
	}

	try {
		const requests = await (await caches.open(pwaCaches.pages)).keys();
		return new Set(requests.map((request) => new URL(request.url).pathname));
	} catch {
		return new Set();
	}
}

function setReachable(value: boolean) {
	reachable = value;
	update();
}

async function probe() {
	try {
		await fetch(reachabilityProbeRoute, { cache: "no-store", method: "HEAD" });
		setReachable(true);
	} catch {
		setReachable(false);
	}
}

function start() {
	started = true;
	window.addEventListener("offline", update);
	window.addEventListener("online", probe);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible" && !reachable) {
			probe();
		}
	});

	const worker = navigator.serviceWorker;
	if (worker) {
		worker.addEventListener("message", (event: MessageEvent) => {
			const status: Partial<NetworkStatus> | undefined = event.data;
			if (status?.type === networkStatusMessage) {
				setReachable(status.reachable === true);
			}
		});
		worker.controller?.postMessage({ type: networkStatusMessage });
	}

	update();
}

function subscribe(listener: () => void): () => void {
	if (!started) {
		start();
	}

	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function isOffline(): boolean {
	return offline !== null;
}

export function onReconnect(callback: () => void): () => void {
	return subscribe(() => {
		if (offline === null) {
			callback();
		}
	});
}

export function reportUnreachable() {
	setReachable(false);
}

export function useUnsaved(href: string | undefined): boolean {
	const saved = useSyncExternalStore(
		subscribe,
		() => offline?.saved,
		() => null
	);
	return Boolean(
		saved && href?.startsWith("/") && !saved.has(withoutHash(href))
	);
}
