"use client";

import { useEffect } from "react";

const HIGHLIGHT = "terminal-search";
const MAX_RANGES = 300;
const HIGHLIGHT_STYLE = `::highlight(${HIGHLIGHT}) { background-color: color-mix(in oklab, var(--color-fd-primary) 25%, transparent); color: inherit; }`;
const TERM = /[\p{L}\p{N}]{2,}/gu;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const SKIP = ".katex-mathml, script, style";

export function SearchHighlight({
	query,
	route,
}: {
	query: string | null;
	route: string;
}) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-highlight when the route changes
	useEffect(() => {
		if (!(query && "highlights" in CSS)) {
			return;
		}

		const pattern = termPattern(query);
		if (!pattern) {
			return;
		}

		const frame = requestAnimationFrame(() => {
			const body = document.querySelector("[data-graph-prose]");
			if (body) {
				CSS.highlights.set(
					HIGHLIGHT,
					new Highlight(...matchRanges(body, pattern))
				);
			}
		});
		return () => {
			cancelAnimationFrame(frame);
			CSS.highlights.delete(HIGHLIGHT);
		};
	}, [query, route]);

	return <style>{HIGHLIGHT_STYLE}</style>;
}

function termPattern(query: string): RegExp | null {
	const terms = [...new Set(query.toLowerCase().match(TERM) ?? [])];
	if (terms.length === 0) {
		return null;
	}

	return new RegExp(
		terms.map((term) => term.replace(REGEX_SPECIAL, "\\$&")).join("|"),
		"giu"
	);
}

function matchRanges(root: Element, pattern: RegExp): Range[] {
	const ranges: Range[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) =>
			node.parentElement?.closest(SKIP)
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT,
	});

	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		for (const match of node.textContent?.matchAll(pattern) ?? []) {
			const range = new Range();
			range.setStart(node, match.index);
			range.setEnd(node, match.index + match[0].length);
			ranges.push(range);
			if (ranges.length >= MAX_RANGES) {
				return ranges;
			}
		}
	}

	return ranges;
}
