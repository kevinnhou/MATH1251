import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { mathFromMarkdown } from "mdast-util-math";
import { gfm } from "micromark-extension-gfm";
import { math } from "micromark-extension-math";
import { remember } from "./cache";
import { REMARK_MATH_OPTIONS } from "./math";

const parseCache = new Map<string, Root>();

export function parseMarkdown(source: string): Root {
	const value = typeof source === "string" ? source : "";
	return remember(parseCache, [value], () =>
		fromMarkdown(value, {
			extensions: [gfm(), math(REMARK_MATH_OPTIONS)],
			mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()],
		})
	);
}

export function cloneMarkdownTree(tree: Root): Root {
	return structuredClone(tree);
}
