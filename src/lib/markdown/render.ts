import { toHtml } from "hast-util-to-html";
import type { Root as MdastRoot } from "mdast";
import { remember } from "./cache";
import { toHastRoot, toPhrasingRoot } from "./hast";
import { highlightHast } from "./highlight";
import { applyKatex } from "./katex";
import { parseMarkdown } from "./parse";
import { sanitizeHast } from "./sanitize";
import type { MarkdownMode } from "./types";

export { markdownToPlain } from "./plain";

export type MarkdownRenderMode = MarkdownMode;

export interface MarkdownRenderOptions {
	mode?: MarkdownRenderMode;
	query?: string;
}

const htmlCache = new Map<string, string>();

export function renderMarkdown(
	source: string,
	options: MarkdownRenderOptions = {}
): string {
	if (typeof source !== "string" || source.length === 0) {
		return "";
	}

	const mode = options.mode ?? "block";
	const query = options.query ?? "";
	return remember(htmlCache, [mode, query, source], () =>
		renderUncached(source, mode, query)
	);
}

export function renderMarkdownInline(source: string, query?: string): string {
	return renderMarkdown(source, { mode: "inline", query });
}

export function renderMarkdownBlock(source: string, query?: string): string {
	return renderMarkdown(source, { mode: "block", query });
}

export function renderMarkdownTree(
	tree: MdastRoot,
	options: MarkdownRenderOptions = {}
): string {
	const mode = options.mode ?? "block";
	const query = options.query ?? "";
	let hast = toHastRoot(tree);
	if (query.length > 0) {
		hast = highlightHast(hast, query);
	}

	sanitizeHast(hast);
	if (mode === "inline") {
		hast = toPhrasingRoot(hast);
	}

	applyKatex(hast);
	return toHtml(hast, { allowDangerousHtml: false }).trim();
}

function renderUncached(
	source: string,
	mode: MarkdownRenderMode,
	query: string
): string {
	if (source.length === 0) {
		return "";
	}

	try {
		return renderMarkdownTree(parseMarkdown(source), { mode, query });
	} catch (error) {
		throw new Error(
			`Failed to render markdown fragment: ${source.slice(0, 160)}`,
			{
				cause: error,
			}
		);
	}
}
