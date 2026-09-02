export type MarkdownMode = "inline" | "block";

export interface RenderedMarkdown<M extends MarkdownMode> {
	readonly html: string;
	readonly mode: M;
	readonly plain: string;
}

export interface MarkdownFragment<M extends MarkdownMode>
	extends RenderedMarkdown<M> {
	readonly source: string;
}

export type InlineLabel = string | RenderedMarkdown<"inline">;

const HTML_ESCAPE = /[&<>"']/g;
const HTML_ESCAPES: Record<string, string> = {
	"'": "&#39;",
	'"': "&quot;",
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
};

export function plainInlineLabel(label: InlineLabel): string {
	return typeof label === "string" ? label : label.plain;
}

export function literalInlineFragment(
	value: string
): MarkdownFragment<"inline"> {
	return {
		html: escapeHtml(value),
		mode: "inline",
		plain: value,
		source: value,
	};
}

export function escapeHtml(value: string): string {
	return value.replace(HTML_ESCAPE, (char) => HTML_ESCAPES[char] ?? char);
}
