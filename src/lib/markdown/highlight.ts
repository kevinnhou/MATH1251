import type { ElementContent, Root, RootContent } from "hast";
import { elementChildren, elementText, isMathElement, wrapMark } from "./hast";
import { simplifyTex } from "./plain";

const WHITESPACE = /\s+/;

export function highlightHast(tree: Root, query: string): Root {
	const terms = queryTerms(query);
	if (terms.length === 0) {
		return tree;
	}

	return {
		children: tree.children.flatMap((node) => highlightContent(node, terms)),
		type: "root",
	};
}

function highlightContent(node: RootContent, terms: string[]): RootContent[] {
	if (node.type === "text") {
		return highlightText(node.value, terms);
	}

	if (node.type !== "element") {
		return [node];
	}

	if (isMathElement(node)) {
		return mathMatchesQuery(elementText(node), terms)
			? [wrapMark(node)]
			: [node];
	}

	if (node.tagName === "code") {
		return [node];
	}

	return [
		{
			...node,
			children: elementChildren(node).flatMap((child) =>
				highlightContent(child, terms)
			) as ElementContent[],
		},
	];
}

function highlightText(value: string, terms: string[]): ElementContent[] {
	const pattern = termPattern(terms);
	if (!pattern) {
		return [{ type: "text", value }];
	}

	const parts: ElementContent[] = [];
	let last = 0;
	pattern.lastIndex = 0;
	for (const match of value.matchAll(pattern)) {
		const [matched = ""] = match;
		const start = match.index;
		if (matched.length === 0) {
			break;
		}

		if (start > last) {
			parts.push({ type: "text", value: value.slice(last, start) });
		}

		parts.push(wrapMark({ type: "text", value: matched }));
		last = start + matched.length;
	}

	if (last < value.length) {
		parts.push({ type: "text", value: value.slice(last) });
	}

	return parts.length === 0 ? [{ type: "text", value }] : parts;
}

function queryTerms(query: string): string[] {
	return [...new Set(query.trim().split(WHITESPACE).filter(Boolean))];
}

function termPattern(terms: string[]): RegExp | undefined {
	if (terms.length === 0) {
		return;
	}

	return new RegExp(`\\b(${terms.map(escapeRegExp).join("|")})\\b`, "gi");
}

function mathMatchesQuery(tex: string, terms: string[]): boolean {
	const tokens = new Set(
		simplifyTex(tex).toLowerCase().split(WHITESPACE).filter(Boolean)
	);

	return terms.some((term) => {
		const lower = term.toLowerCase();
		if (tokens.has(lower)) {
			return true;
		}

		return new RegExp(`\\\\${escapeRegExp(lower)}(?![a-zA-Z])`, "i").test(tex);
	});
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
