import type { Root } from "hast";
import { classList } from "./hast";

const KATEX_DISPLAY_CLASS = "katex-display";
export const KATEX_DISPLAY_SCROLL_CLASS = "katex-display-scroll";

export function wrapKatexDisplays(tree: Root): void {
	tree.children = wrapChildren(tree.children);
}

export function rehypeKatexDisplayScroll() {
	return (tree: Root) => {
		wrapKatexDisplays(tree);
	};
}

function wrapChildren<T extends Root["children"][number]>(nodes: T[]): T[] {
	let changed = false;
	const next = nodes.map((node) => {
		const wrapped = wrapNode(node);
		changed ||= wrapped !== node;
		return wrapped as T;
	});

	return changed ? next : nodes;
}

function wrapNode(node: Root["children"][number]): Root["children"][number] {
	if (node.type !== "element") {
		return node;
	}

	const classes = classList(node);
	if (classes.includes(KATEX_DISPLAY_SCROLL_CLASS)) {
		return node;
	}

	if (classes.includes(KATEX_DISPLAY_CLASS)) {
		return {
			children: [node],
			properties: { className: [KATEX_DISPLAY_SCROLL_CLASS] },
			tagName: "span",
			type: "element",
		};
	}

	const children = wrapChildren(node.children);
	if (children === node.children) {
		return node;
	}

	return {
		...node,
		children,
	};
}
