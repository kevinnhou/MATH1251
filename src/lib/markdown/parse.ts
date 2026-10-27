import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { remember } from "./cache";
import { MDAST_EXTENSIONS, MICROMARK_EXTENSIONS } from "./syntaxes";

const parseCache = new Map<string, Root>();

export function parseMarkdown(source: string): Root {
	const value = typeof source === "string" ? source : "";
	return remember(parseCache, [value], () =>
		fromMarkdown(value, {
			extensions: [gfm(), ...MICROMARK_EXTENSIONS],
			mdastExtensions: [gfmFromMarkdown(), ...MDAST_EXTENSIONS],
		})
	);
}

export function cloneMarkdownTree(tree: Root): Root {
	return structuredClone(tree);
}
