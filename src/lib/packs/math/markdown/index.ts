import { mathFromMarkdown, mathToMarkdown } from "mdast-util-math";
import { math } from "micromark-extension-math";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import type { MarkdownSyntax } from "@/lib/markdown/syntax";
import { applyKatex } from "./katex";
import { rehypeKatexDisplayScroll } from "./katex-display";
import { rehypeKatexHtml } from "./katex-html";
import { KATEX_OPTIONS, REMARK_MATH_OPTIONS } from "./options";
import { isMathElement, mathMatchesQuery, simplifyTex } from "./tex";

export const mathMarkdown: MarkdownSyntax = {
	atom: { is: isMathElement, matches: mathMatchesQuery },
	fromMarkdown: {
		mdast: [mathFromMarkdown()],
		micromark: [math(REMARK_MATH_OPTIONS)],
	},
	literals: {
		inlineMath: { length: (tex) => tex.length + 2, plain: simplifyTex },
		math: { length: (tex) => tex.length + 4, plain: simplifyTex },
	},
	rehypePlugins: [
		[rehypeKatex, KATEX_OPTIONS],
		rehypeKatexDisplayScroll,
		rehypeKatexHtml,
	],
	remarkPlugins: [[remarkMath, REMARK_MATH_OPTIONS]],
	render: applyKatex,
	toMarkdown: [mathToMarkdown()],
};
