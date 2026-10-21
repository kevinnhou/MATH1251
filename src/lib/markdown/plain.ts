import type { RootContent } from "mdast";
import { remember } from "./cache";
import { parseMarkdown } from "./parse";
import { literalPlain } from "./syntaxes";

const PHRASING_PARENTS = new Set([
	"delete",
	"emphasis",
	"heading",
	"link",
	"paragraph",
	"strong",
	"tableCell",
]);
const WHITESPACE_GLOBAL = /\s+/g;
const plainCache = new Map<string, string>();

export function markdownToPlain(source: string): string {
	if (typeof source !== "string" || source.length === 0) {
		return "";
	}

	return remember(plainCache, [source], () =>
		plainFromNodes(parseMarkdown(source).children)
			.replace(WHITESPACE_GLOBAL, " ")
			.trim()
	);
}

function plainFromNodes(nodes: RootContent[]): string {
	return nodes.map(plainFromNode).filter(Boolean).join(" ");
}

function plainFromNode(node: RootContent): string {
	switch (node.type) {
		case "text":
			return node.value;
		case "break":
			return " ";
		case "inlineCode":
		case "code":
			return node.value;
		case "html":
			return "";
		default:
			if ("value" in node) {
				return literalPlain(node) ?? "";
			}

			if ("children" in node) {
				const joined = node.children
					.map((child) => plainFromNode(child as RootContent))
					.filter(Boolean);
				return joined.join(PHRASING_PARENTS.has(node.type) ? "" : " ");
			}

			return "";
	}
}
