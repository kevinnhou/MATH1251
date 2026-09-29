"use client";

import { useEffect, useRef, useState } from "react";
import { SearchList } from "@/components/terminal/output";
import type { SearchResult } from "@/lib/terminal/types";

export function SearchPreview({ results }: { results: SearchResult[] }) {
	const ref = useRef<HTMLDivElement>(null);
	const [url, setUrl] = useState(results[0]?.url);

	useEffect(() => {
		const pane = ref.current?.closest("[data-terminal-pane]");
		if (!pane) {
			return;
		}

		const pick = (event: Event) => {
			const next =
				event.target instanceof Element
					? event.target.closest("[data-hit-url]")?.getAttribute("data-hit-url")
					: null;
			if (next) {
				setUrl(next);
			}
		};

		pane.addEventListener("pointerover", pick);
		pane.addEventListener("focusin", pick);
		return () => {
			pane.removeEventListener("pointerover", pick);
			pane.removeEventListener("focusin", pick);
		};
	}, []);

	const result =
		results.find((candidate) => candidate.url === url) ?? results[0];
	if (!result) {
		return null;
	}

	return (
		<div
			className="max-h-[45%] shrink-0 overflow-auto border-t p-4 font-mono text-[12px] text-fd-foreground"
			ref={ref}
		>
			<SearchList compact hits={result.hits} />
		</div>
	);
}
