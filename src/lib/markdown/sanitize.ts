import type { ElementContent, Properties, Root, RootContent } from "hast";
import { elementChildren } from "./hast";

const UNSAFE_PROTOCOL = /^(javascript|data|vbscript):/i;
const UNSAFE_TAGS = new Set(["script", "iframe", "object", "embed", "link"]);

export function sanitizeHast(tree: Root) {
	tree.children = tree.children.flatMap((node) => sanitizeContent(node));
}

function sanitizeContent(node: RootContent): RootContent[] {
	if (node.type !== "element") {
		return [node];
	}

	if (UNSAFE_TAGS.has(node.tagName)) {
		return [];
	}

	return [
		{
			...node,
			children: elementChildren(node).flatMap((child) =>
				sanitizeContent(child)
			) as ElementContent[],
			properties: sanitizeProperties(node.tagName, node.properties ?? {}),
		},
	];
}

function sanitizeProperties(
	tagName: string,
	properties: Properties
): Properties {
	const next: Properties = {};
	for (const [key, value] of Object.entries(properties ?? {})) {
		if (key.startsWith("on") || key === "srcDoc" || key === "srcSet") {
			continue;
		}

		if (tagName === "a" && key === "href" && !isSafePropertyHref(value)) {
			continue;
		}

		if (tagName === "img" && key === "src" && !isSafePropertyHref(value)) {
			continue;
		}

		next[key] = value;
	}

	return next;
}

function isSafePropertyHref(value: unknown): boolean {
	if (
		typeof value !== "string" &&
		typeof value !== "number" &&
		typeof value !== "boolean"
	) {
		return false;
	}

	return isSafeHref(String(value));
}

function isSafeHref(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.startsWith("//")) {
		return false;
	}

	return !UNSAFE_PROTOCOL.test(trimmed);
}
