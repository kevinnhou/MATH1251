import {
	compileMarkdownFragment,
	compileMarkdownPreview,
} from "@/lib/markdown/fragment";
import type { MarkdownFragment, RenderedMarkdown } from "@/lib/markdown/types";

const STATEMENT_PREVIEW_CHARS = 220;

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
