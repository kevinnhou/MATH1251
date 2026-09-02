"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraphDocument } from "./types";

export const GRAPH_DATA_URL = "/graph-data.json";

export type GraphLoadState =
	| { status: "loading" }
	| { document: GraphDocument; status: "ready" }
	| { message: string; status: "error" };

let cached: GraphDocument | undefined;
let pending: Promise<GraphDocument> | undefined;

export function loadGraphDocument(): Promise<GraphDocument> {
	if (cached) {
		return Promise.resolve(cached);
	}

	pending ??= fetch(GRAPH_DATA_URL)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Graph data failed: ${response.status}`);
			}

			return response.json() as Promise<GraphDocument>;
		})
		.then((document) => {
			cached = document;
			return document;
		})
		.catch((error: unknown) => {
			pending = undefined;
			throw error;
		});

	return pending;
}

export function useGraphDocument(): GraphLoadState & { retry: () => void } {
	const [state, setState] = useState<GraphLoadState>(() =>
		cached ? { document: cached, status: "ready" } : { status: "loading" }
	);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (attempt < 0) {
			return;
		}

		if (cached) {
			setState({ document: cached, status: "ready" });
			return;
		}

		let cancelled = false;
		setState({ status: "loading" });
		loadGraphDocument()
			.then((document) => {
				if (!cancelled) {
					setState({ document, status: "ready" });
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setState({
						message:
							error instanceof Error ? error.message : "Graph failed to load.",
						status: "error",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [attempt]);

	const retry = useCallback(() => {
		cached = undefined;
		pending = undefined;
		setAttempt((current) => current + 1);
	}, []);

	return { ...state, retry };
}
