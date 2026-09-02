"use client";

import { usePathname } from "fumadocs-core/framework";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useGraphDocument } from "@/lib/graph/client";
import {
	type GraphRuntime,
	unavailableGraphRuntime,
} from "@/lib/graph/runtime";
import { createGraphSession } from "@/lib/graph/session";
import { currentPagesFromUrl } from "@/lib/terminal/pages";
import type { PageCatalog } from "@/lib/terminal/types";

const GraphContext = createContext<GraphRuntime | null>(null);

export function useGraph(): GraphRuntime {
	const value = useContext(GraphContext);
	if (!value) {
		throw new Error("useGraph must be used within GraphProvider.");
	}

	return value;
}

export function GraphProvider({
	catalog,
	children,
}: {
	catalog: PageCatalog;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const routeUrl = pathname || "/core";
	const current = useMemo(
		() => currentPagesFromUrl(catalog, routeUrl),
		[catalog, routeUrl]
	);
	const homeId = current.source.url;
	const canvasAvailable = current.inCatalog && !current.route.kindView;
	const load = useGraphDocument();
	const [session, setSession] = useState(() => createGraphSession(homeId));
	const [narrow, setNarrow] = useState(false);

	useEffect(() => {
		setSession(createGraphSession(homeId));
	}, [homeId]);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 767px)");
		const update = () => setNarrow(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	const graph = useMemo((): GraphRuntime => {
		if (!canvasAvailable) {
			return unavailableGraphRuntime(homeId);
		}

		if (load.status === "loading") {
			return { homeId, session, setSession, status: "loading" };
		}

		if (load.status === "error") {
			return {
				homeId,
				retry: load.retry,
				session,
				setSession,
				status: "error",
			};
		}

		return {
			document: load.document,
			homeId,
			narrow,
			session,
			setSession,
			status: "ready",
		};
	}, [canvasAvailable, homeId, load, narrow, session]);

	return (
		<GraphContext.Provider value={graph}>{children}</GraphContext.Provider>
	);
}
