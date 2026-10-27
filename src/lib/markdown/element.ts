import type { Element, ElementContent } from "hast";

export function elementChildren(node: Element): ElementContent[] {
	return node.children ?? [];
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
