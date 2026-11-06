import type { Element, ElementContent, Root } from "hast";

export function classList(node: Element): string[] {
	const value = node.properties?.className;
	return Array.isArray(value) ? value.map(String) : [];
}

export function elementChildren(node: Element): ElementContent[] {
	return node.children ?? [];
}

export function elementText(node: Element): string {
	return elementChildren(node)
		.map((child) => {
			if (child.type === "text") {
				return child.value;
			}

			return child.type === "element" ? elementText(child) : "";
		})
		.join("");
}

const HIDDEN_TEXT_CLASS = "katex-mathml";

export function markHiddenText<
	T extends ElementContent | Root["children"][number],
>(nodes: T[]): T[] {
	for (const node of nodes) {
		if (node.type !== "element") {
			continue;
		}

		if (classList(node).includes(HIDDEN_TEXT_CLASS)) {
			node.properties = { ...node.properties, dataSearchSkip: "" };
		} else {
			markHiddenText(node.children);
		}
	}

	return nodes;
}
