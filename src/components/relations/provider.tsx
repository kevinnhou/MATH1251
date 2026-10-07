"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { useCurrentRoute } from "@/components/course/provider";
import { jsonResource, useResource } from "@/lib/client/resource";
import { indexCourseMap } from "@/lib/relations/query";
import type {
	CourseMap,
	MapView,
	RelationsRuntime,
} from "@/lib/relations/types";
import { courseMapRoute } from "@/lib/site/config";

const courseMapResource = jsonResource<CourseMap>(courseMapRoute);

const RelationsContext = createContext<RelationsRuntime | null>(null);

interface MapState {
	focusId: string;
	homeId: string;
	open: boolean;
	view: MapView;
}

export function useRelations(): RelationsRuntime {
	const value = useContext(RelationsContext);
	if (!value) {
		throw new Error("useRelations must be used within RelationsProvider.");
	}

	return value;
}

export function RelationsProvider({ children }: { children: ReactNode }) {
	const current = useCurrentRoute();
	const homeId = current.sourceUrl;
	const available = current.inCatalog && !current.kindView;
	const load = useResource(courseMapResource);
	const [state, setState] = useState<MapState>({
		focusId: homeId,
		homeId,
		open: false,
		view: "arcs",
	});

	if (state.homeId !== homeId) {
		setState({ ...state, focusId: homeId, homeId, open: false });
	}

	const index = useMemo(
		() => (load.status === "ready" ? indexCourseMap(load.value) : undefined),
		[load]
	);

	const relations = useMemo((): RelationsRuntime => {
		if (!available) {
			return { status: "unavailable" };
		}

		if (index === undefined) {
			return { status: load.status === "error" ? "error" : "loading" };
		}

		return {
			focusId: index.pageById.has(state.focusId) ? state.focusId : homeId,
			homeId,
			index,
			mapOpen: state.open,
			reset: () =>
				setState({ focusId: homeId, homeId, open: false, view: "arcs" }),
			setFocus: (id) =>
				setState((previous) => ({ ...previous, focusId: id, open: true })),
			setMapOpen: (open) => setState((previous) => ({ ...previous, open })),
			setView: (view) =>
				setState((previous) => ({ ...previous, open: true, view })),
			status: "ready",
			view: state.view,
		};
	}, [available, homeId, index, load.status, state]);

	return (
		<RelationsContext.Provider value={relations}>
			{children}
		</RelationsContext.Provider>
	);
}
