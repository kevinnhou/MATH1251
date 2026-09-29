import { useEffect, useSyncExternalStore } from "react";

export type ResourceState<T> =
	| { status: "loading" }
	| { status: "ready"; value: T }
	| { status: "error" };

export interface JsonResource<T> {
	load: () => Promise<T>;
	preload: () => void;
	snapshot: () => ResourceState<T>;
	subscribe: (listener: () => void) => () => void;
}

const loading = { status: "loading" } as const;

export function jsonResource<T>(url: string): JsonResource<T> {
	let state: ResourceState<T> = loading;
	let pending: Promise<T> | undefined;
	const listeners = new Set<() => void>();

	function publish(next: ResourceState<T>) {
		state = next;
		for (const listener of listeners) {
			listener();
		}
	}

	function load(): Promise<T> {
		if (pending) {
			return pending;
		}

		if (state.status === "error") {
			publish(loading);
		}

		pending = fetch(url)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`${url} failed: ${response.status}`);
				}

				return response.json() as Promise<T>;
			})
			.then(
				(value) => {
					publish({ status: "ready", value });
					return value;
				},
				(error: unknown) => {
					pending = undefined;
					publish({ status: "error" });
					throw error;
				}
			);
		return pending;
	}

	return {
		load,
		preload() {
			load().catch(() => undefined);
		},
		snapshot: () => state,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

export function useResource<T>(resource: JsonResource<T>): ResourceState<T> {
	const state = useSyncExternalStore(
		resource.subscribe,
		resource.snapshot,
		() => loading
	);

	useEffect(() => resource.preload(), [resource]);

	return state;
}
