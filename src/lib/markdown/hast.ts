import type {
	Element,
	ElementContent,
	Nodes as HastNodes,
	Root as HastRoot,
	RootContent as HastRootContent,
	Text,
} from "hast";
import type { Root as MdastRoot } from "mdast";
import { toHast } from "mdast-util-to-hast";

const WHITESPACE = /\s+/;
const PHRASING_TAGS = new Set([
	"a",
	"abbr",
	"b",
	"br",
	"code",
	"del",
	"em",
	"i",
	"img",
	"kbd",
	"mark",
	"s",
	"span",
	"strong",
	"sub",
	"sup",
	"u",
	"wbr",
]);

export function toHastRoot(tree: MdastRoot): HastRoot {
	return asHastRoot(toHast(tree, { allowDangerousHtml: false }));
}

export function toPhrasingRoot(tree: HastRoot): HastRoot {
	return {
		children: flattenPhrasing(tree.children),
		type: "root",
	};
}

export function wrapMark(node: Element | Text): Element {
	return {
		children: [node],
		properties: {},
		tagName: "mark",
		type: "element",
	};
}

export function elementChildren(node: Element): ElementContent[] {
	return node.children ?? [];
}

export function isMathElement(node: Element): boolean {
	const classes = classList(node);
	return (
		classes.includes("language-math") ||
		classes.includes("math-inline") ||
		classes.includes("math-display")
	);
}

export function classList(node: Element): string[] {
	const value = node.properties?.className;
	if (Array.isArray(value)) {
		return value.map(String);
	}

	return [];
}

export function elementText(node: Element): string {
	return elementChildren(node)
		.map((child) => {
			if (child.type === "text") {
				return child.value;
			}

			if (child.type === "element") {
				return elementText(child);
			}

			return "";
		})
		.join("");
}

function asHastRoot(hast: HastNodes): HastRoot {
	if (hast.type === "root") {
		return hast;
	}

	if (
		hast.type === "element" ||
		hast.type === "text" ||
		hast.type === "comment"
	) {
		return { children: [hast], type: "root" };
	}

	return { children: [], type: "root" };
}

function flattenPhrasing(
	nodes: HastRootContent[] | undefined
): ElementContent[] {
	const result: ElementContent[] = [];
	for (const node of nodes ?? []) {
		if (node.type === "text") {
			pushPhrasing(result, node);
			continue;
		}

		if (node.type !== "element") {
			continue;
		}

		if (isMathElement(node) || PHRASING_TAGS.has(node.tagName)) {
			pushPhrasing(result, node);
			continue;
		}

		const nested = flattenPhrasing(elementChildren(node));
		if (nested.length === 0) {
			continue;
		}

		if (result.length > 0 && !endsWithWhitespace(result)) {
			result.push({ type: "text", value: " " });
		}

		result.push(...nested);
	}

	return result;
}

function pushPhrasing(result: ElementContent[], node: ElementContent) {
	if (node.type === "text" && node.value.length === 0) {
		return;
	}

	result.push(node);
}

function endsWithWhitespace(nodes: ElementContent[]): boolean {
	const last = nodes.at(-1);
	return last?.type === "text" && WHITESPACE.test(last.value.slice(-1));
}
