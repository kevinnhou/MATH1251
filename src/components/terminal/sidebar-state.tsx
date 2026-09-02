"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

interface SidebarTreeStateValue {
	folderOpen: (id: string, fallback?: boolean) => boolean;
	scrollTop: number;
	setFolderOpen: (id: string, open: boolean) => void;
	setScrollTop: (value: number) => void;
}

const SidebarTreeStateContext = createContext<SidebarTreeStateValue | null>(
	null
);

export function SidebarTreeStateProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [folders, setFolders] = useState<Record<string, boolean>>({});
	const [scrollTop, setScrollTop] = useState(0);

	const folderOpen = useCallback(
		(id: string, fallback = false) => folders[id] ?? fallback,
		[folders]
	);

	const setFolderOpen = useCallback((id: string, open: boolean) => {
		setFolders((current) => {
			if (current[id] === open) {
				return current;
			}

			return { ...current, [id]: open };
		});
	}, []);

	const value = useMemo(
		(): SidebarTreeStateValue => ({
			folderOpen,
			scrollTop,
			setFolderOpen,
			setScrollTop,
		}),
		[folderOpen, scrollTop, setFolderOpen]
	);

	return (
		<SidebarTreeStateContext.Provider value={value}>
			{children}
		</SidebarTreeStateContext.Provider>
	);
}

export function useSidebarTreeState(): SidebarTreeStateValue {
	const value = useContext(SidebarTreeStateContext);
	if (!value) {
		throw new Error(
			"useSidebarTreeState must be used within SidebarTreeStateProvider."
		);
	}

	return value;
}
