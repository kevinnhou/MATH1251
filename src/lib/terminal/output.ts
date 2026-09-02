import type { InlineLabel, RenderedMarkdown } from "@/lib/markdown/types";
import { plainInlineLabel } from "@/lib/markdown/types";
import { type GraphModule, STRAND_LABELS } from "@/lib/site/strands";
import { isSafeInternalUrl } from "@/lib/site/url";
import type {
	CatalogPage,
	LinkGroup,
	OutputLink,
	SearchHit,
	TerminalOutput,
} from "./types";

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

export function pageLinkGroup(
	heading: string,
	pages: CatalogPage[]
): LinkGroup {
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

export function strandGroups(pages: CatalogPage[]): LinkGroup[] {
	const order: GraphModule[] = ["core", "algebra", "calculus"];
	const groups: LinkGroup[] = [];
	for (const strand of order) {
		const items = pages.filter((page) => page.strand === strand);
		if (items.length > 0) {
			groups.push(pageLinkGroup(STRAND_LABELS[strand], items));
		}
	}

	const unstranded = pages.filter((page) => page.strand === undefined);
	if (unstranded.length > 0) {
		groups.push(pageLinkGroup("other", unstranded));
	}

	return groups;
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
				: `${safe.length} result${safe.length === 1 ? "" : "s"}.`,
		query,
	};
}

export function announce(output: TerminalOutput, echo?: string): string {
	if (
		output.kind === "error" ||
		output.kind === "usage" ||
		output.kind === "message"
	) {
		return output.message;
	}

	if (output.kind === "search-results") {
		return output.message;
	}

	if (output.kind === "link-list") {
		const count = output.groups.reduce(
			(sum, group) => sum + group.items.length,
			0
		);
		return output.message ?? `${count} pages`;
	}

	if (output.kind === "markdown") {
		return `Markdown for ${output.title}`;
	}

	if (output.kind === "inspect") {
		return plainInlineLabel(output.title);
	}

	if (output.kind === "loading") {
		return output.message;
	}

	return echo ?? "Command finished.";
}
