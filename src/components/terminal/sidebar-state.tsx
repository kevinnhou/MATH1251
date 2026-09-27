"use client";

import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

interface SidebarTreeStateValue {
	folderOpen: (id: string) => boolean | undefined;
	scrollTopRef: RefObject<number>;
	setFolderOpen: (id: string, open: boolean) => void;
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
	const scrollTopRef = useRef(0);

	const folderOpen = useCallback(
		(id: string): boolean | undefined => folders[id],
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
			scrollTopRef,
			setFolderOpen,
		}),
		[folderOpen, setFolderOpen]
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
