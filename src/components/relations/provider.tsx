"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useCurrentRoute } from "@/components/course/provider";
import type { PageDock } from "@/lib/relations/types";

interface RelationsContextValue {
	dock: PageDock | undefined;
	setDock: (dock: PageDock | undefined) => void;
}

const RelationsContext = createContext<RelationsContextValue | null>(null);

function useRelationsContext(): RelationsContextValue {
	const value = useContext(RelationsContext);
	if (!value) {
		throw new Error("Relations hooks must be used within RelationsProvider.");
	}

	return value;
}

export function useCurrentDock(): PageDock | undefined {
	return useRelationsContext().dock;
}

export function usePublishDock(dock: PageDock) {
	const { setDock } = useRelationsContext();
	useEffect(() => {
		setDock(dock);
		return () => setDock(undefined);
	}, [dock, setDock]);
}

export function RelationsProvider({ children }: { children: ReactNode }) {
	const { inCatalog } = useCurrentRoute();
	const [dock, setDock] = useState<PageDock>();

	const value = useMemo(
		(): RelationsContextValue => ({
			dock: inCatalog ? dock : undefined,
			setDock,
		}),
		[dock, inCatalog]
	);

	return (
		<RelationsContext.Provider value={value}>
			{children}
		</RelationsContext.Provider>
	);
}
