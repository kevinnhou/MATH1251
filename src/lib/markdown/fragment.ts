import { parseMarkdown } from "./parse";
import { markdownToPlain } from "./plain";
import { renderMarkdown, renderMarkdownTree } from "./render";
import { truncateMarkdownTree } from "./truncate";
import type { MarkdownFragment, MarkdownMode, RenderedMarkdown } from "./types";

export type {
	InlineLabel,
	MarkdownFragment,
	MarkdownMode,
	RenderedMarkdown,
} from "./types";
export { literalInlineFragment, plainInlineLabel } from "./types";

export function compileMarkdownFragment<M extends MarkdownMode>(
	source: string,
	mode: M
): MarkdownFragment<M> {
	const value = typeof source === "string" ? source : "";
	return {
		html: renderMarkdown(value, { mode }),
		mode,
		plain: markdownToPlain(value),
		source: value,
	};
}

export function highlightMarkdownFragment<M extends MarkdownMode>(
	fragment: MarkdownFragment<M>,
	query: string
): RenderedMarkdown<M> {
	return {
		html: renderMarkdown(fragment.source, { mode: fragment.mode, query }),
		mode: fragment.mode,
		plain: fragment.plain,
	};
}

export function compileMarkdownPreview(
	source: string,
	maxChars: number
): RenderedMarkdown<"block"> {
	const value = typeof source === "string" ? source : "";
	const plain = markdownToPlain(value);
	if (value.length === 0) {
		return { html: "", mode: "block", plain };
	}

	const { tree } = truncateMarkdownTree(parseMarkdown(value), maxChars);
	return {
		html: renderMarkdownTree(tree, { mode: "block" }),
		mode: "block",
		plain,
	};
}
