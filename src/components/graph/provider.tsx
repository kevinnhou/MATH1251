"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useCurrentRoute } from "@/components/course/provider";
import { useResource } from "@/lib/client/resource";
import type { GraphAction } from "@/lib/graph/actions";
import { graphResource } from "@/lib/graph/client";
import type { GraphRuntime } from "@/lib/graph/runtime";
import {
	applyGraphAction,
	createGraphSession,
	type GraphActionResult,
	type GraphSession,
	type GraphTargetResolver,
} from "@/lib/graph/session";

interface StoredSession {
	homeId: string;
	session: GraphSession;
}

const GraphContext = createContext<GraphRuntime | null>(null);

export function useGraph(): GraphRuntime {
	const value = useContext(GraphContext);
	if (!value) {
		throw new Error("useGraph must be used within GraphProvider.");
	}

	return value;
}

export function GraphProvider({ children }: { children: ReactNode }) {
	const current = useCurrentRoute();
	const homeId = current.sourceUrl;
	const canvasAvailable = current.inCatalog && !current.kindView;
	const load = useResource(graphResource);
	const [narrow, setNarrow] = useState(false);
	const [stored, setStored] = useState<StoredSession>(() => ({
		homeId,
		session: createGraphSession(homeId),
	}));
	const pending = useRef<{ base: StoredSession; next: StoredSession } | null>(
		null
	);

	if (stored.homeId !== homeId) {
		setStored({ homeId, session: createGraphSession(homeId) });
	}
	const { session } = stored;

	useEffect(() => {
		const media = window.matchMedia("(max-width: 767px)");
		const update = () => setNarrow(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	const document = load.status === "ready" ? load.value : undefined;
	const dispatch = useCallback(
		(
			action: GraphAction,
			resolveTarget?: GraphTargetResolver
		): GraphActionResult => {
			if (document === undefined) {
				throw new Error("Graph dispatch before the document loaded.");
			}

			const base =
				pending.current?.base === stored ? pending.current.next : stored;
			const result = applyGraphAction(base.session, action, {
				document,
				homeId,
				resolveTarget,
			});
			const next = { homeId, session: result.session };
			pending.current = { base: stored, next };
			setStored(next);
			return result;
		},
		[document, homeId, stored]
	);

	const graph = useMemo((): GraphRuntime => {
		if (!canvasAvailable) {
			return { homeId, status: "unavailable" };
		}

		if (load.status !== "ready") {
			return load.status === "error"
				? { homeId, retry: graphResource.preload, status: "error" }
				: { homeId, status: "loading" };
		}

		return {
			dispatch,
			document: load.value,
			homeId,
			narrow,
			session,
			status: "ready",
		};
	}, [canvasAvailable, dispatch, homeId, load, narrow, session]);

	return (
		<GraphContext.Provider value={graph}>{children}</GraphContext.Provider>
	);
}
