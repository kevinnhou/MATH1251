import { useEffect, useRef, useState } from "react";
import { copyPendingText } from "@/lib/client/actions";
import { loadMarkdown, prefetchMarkdown } from "./client";

export type CopyStatus = "idle" | "copying" | "copied" | "failed";

const RESET_MS: Record<CopyStatus, number> = {
	copied: 1500,
	copying: 0,
	failed: 2500,
	idle: 0,
};

export function useCopyMarkdown(id: string) {
	const [status, setStatus] = useState<CopyStatus>("idle");
	const timer = useRef<number>(undefined);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	function settle(next: CopyStatus) {
		setStatus(next);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setStatus("idle"), RESET_MS[next]);
	}

	function copy() {
		if (status === "copying") {
			return;
		}
		window.clearTimeout(timer.current);
		setStatus("copying");
		copyPendingText(loadMarkdown(id)).then((ok) =>
			settle(ok ? "copied" : "failed")
		);
	}

	return { copy, prefetch: () => prefetchMarkdown(id), status };
}
