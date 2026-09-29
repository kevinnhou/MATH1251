"use client";

import { useSidebar } from "fumadocs-ui/layouts/docs/slots/sidebar";
import { useEffect } from "react";
import { useCourseRoutes } from "@/components/course/provider";
import { useTerminalApi } from "@/components/terminal/provider";
import { rootOf } from "@/lib/terminal/dirs";
import { onReconnect, reportUnreachable } from "./network";

function offlineOrigin(): string | null {
	const from = new URLSearchParams(window.location.search).get("from");
	return from?.startsWith("/") && !from.startsWith("//") ? from : null;
}

export function OfflineActions() {
	const routes = useCourseRoutes();
	const { mode, setOpen } = useSidebar();
	const { changeDirectory, showTree } = useTerminalApi();

	useEffect(() => {
		const from = offlineOrigin();
		if (from && routes.match(from).inCatalog) {
			changeDirectory(rootOf(from));
		}
	}, [changeDirectory, routes]);

	useEffect(() => {
		const unsubscribe = onReconnect(() =>
			window.location.replace(offlineOrigin() ?? window.location.href)
		);
		reportUnreachable();
		return unsubscribe;
	}, []);

	if (mode !== "drawer") {
		return null;
	}

	return (
		<button
			className="rounded-md border border-fd-border px-3 py-1.5 text-fd-foreground text-sm transition-colors hover:bg-fd-accent"
			onClick={() => {
				showTree();
				setOpen(true);
			}}
			type="button"
		>
			Browse saved pages
		</button>
	);
}
