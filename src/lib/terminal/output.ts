import type { CatalogPage } from "@/lib/course/catalog";
import type { InlineLabel, RenderedMarkdown } from "@/lib/markdown/types";
import { plainInlineLabel } from "@/lib/markdown/types";
import { isSafeInternalUrl } from "@/lib/site/url";
import type { LinkGroup, OutputLink, SearchHit, TerminalOutput } from "./types";

export function errorOutput(message: string): TerminalOutput {
	return { kind: "error", message };
}

export function usageOutput(message: string): TerminalOutput {
	return { kind: "usage", message };
}

export function messageOutput(
	message: string,
	action?: { label: string; url: string }
): TerminalOutput {
	return action
		? { action, kind: "message", message }
		: { kind: "message", message };
}

export function mutedMessage(message: string): TerminalOutput {
	return { kind: "message", message, tone: "muted" };
}

export function loadingOutput(message: string): TerminalOutput {
	return { kind: "loading", message };
}

export function markdownOutput(options: {
	markdown: string;
	markdownUrl: string;
	title: string;
}): TerminalOutput {
	return { kind: "markdown", ...options };
}

export function inspectOutput(options: {
	actionUrl?: string;
	message?: string;
	nodeId: string;
	preview?: RenderedMarkdown<"block" | "inline">;
	title: InlineLabel;
	type?: string;
}): TerminalOutput {
	return { kind: "inspect", ...options };
}

export function groupedLinks(
	groups: LinkGroup[],
	options: { message?: string; title?: string } = {}
): TerminalOutput {
	return {
		groups: groups.map((group) => ({
			heading: group.heading,
			items: group.items.filter((item) => isSafeInternalUrl(item.url)),
		})),
		kind: "link-list",
		message: options.message,
		title: options.title,
	};
}

function pageLinkGroup(heading: string, pages: CatalogPage[]): LinkGroup {
	return {
		heading,
		items: pages.map(
			(page): OutputLink => ({
				hint: page.strand,
				label: page.title,
				url: page.url,
			})
		),
	};
}

export function ambiguousOutput(
	query: string,
	pages: CatalogPage[]
): TerminalOutput {
	return groupedLinks([pageLinkGroup("matches", pages)], {
		message: `Ambiguous: ${query}`,
		title: "matches",
	});
}

export function searchHitsOutput(
	query: string,
	hits: SearchHit[]
): TerminalOutput {
	const safe = hits.filter((hit) => isSafeInternalUrl(hit.url));
	return {
		hits: safe,
		kind: "search-results",
		message:
			safe.length === 0
				? `No search results for “${query}”.`
				: `${plural(safe.length, "result")}.`,
		query,
	};
}

export function plural(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function announce(output: TerminalOutput): string {
	switch (output.kind) {
		case "error":
		case "loading":
		case "message":
		case "search-results":
		case "usage":
			return output.message;
		case "link-list": {
			const count = output.groups.reduce(
				(sum, group) => sum + group.items.length,
				0
			);
			return output.message ?? `${count} pages`;
		}
		case "markdown":
			return `Markdown for ${output.title}`;
		case "inspect":
			return plainInlineLabel(output.title);
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
}
