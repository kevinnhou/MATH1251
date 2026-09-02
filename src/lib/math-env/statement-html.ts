import {
	compileMarkdownFragment,
	compileMarkdownPreview,
	type MarkdownFragment,
	type RenderedMarkdown,
} from "@/lib/markdown/fragment";

export const STATEMENT_PREVIEW_CHARS = 220;

export type StatementView = MarkdownFragment<"block"> & {
	preview: RenderedMarkdown<"block">;
};

export function compileStatement(markdown: string): StatementView {
	const fragment = compileMarkdownFragment(markdown, "block");
	return {
		...fragment,
		preview: compileMarkdownPreview(markdown, STATEMENT_PREVIEW_CHARS),
	};
}

export function previewStatementHtml(
	markdown: string | undefined,
	maxChars = STATEMENT_PREVIEW_CHARS
): string | undefined {
	if (!markdown) {
		return;
	}

	const preview = compileMarkdownPreview(markdown, maxChars);
	if (preview.html.length === 0) {
		return;
	}

	return preview.html;
}
