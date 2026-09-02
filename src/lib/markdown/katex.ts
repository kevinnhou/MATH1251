import type { Element, ElementContent, Root, RootContent } from "hast";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import katex from "katex";
import { classList, elementChildren, elementText, isMathElement } from "./hast";
import { KATEX_OPTIONS } from "./math";

export function applyKatex(tree: Root) {
	tree.children = replaceMathNodes(tree.children);
}

function replaceMathNodes(nodes: RootContent[] | undefined): RootContent[] {
	return (nodes ?? []).flatMap(replaceMathNode);
}

function replaceMathNode(node: RootContent): RootContent[] {
	if (node.type !== "element") {
		return [node];
	}

	const children = elementChildren(node);
	if (node.tagName === "pre") {
		const code = children.find(
			(child): child is Element =>
				child.type === "element" && child.tagName === "code"
		);
		if (code && isMathElement(code)) {
			return katexNodes(elementText(code), true);
		}
	}

	if (isMathElement(node)) {
		return katexNodes(
			elementText(node),
			classList(node).includes("math-display")
		);
	}

	return [
		{
			...node,
			children: replaceMathNodes(children) as ElementContent[],
		},
	];
}

function katexNodes(tex: string, displayMode: boolean): RootContent[] {
	try {
		const html = renderTex(tex, displayMode);
		if (html.length > 0) {
			const fragment = fromHtmlIsomorphic(html, { fragment: true });
			return fragment.children as RootContent[];
		}
	} catch {
		// Keep the TeX as text when KaTeX cannot produce markup.
	}

	return [
		{
			children: [{ type: "text", value: tex }],
			properties: { className: ["katex-error"] },
			tagName: displayMode ? "div" : "span",
			type: "element",
		},
	];
}

function renderTex(tex: string, displayMode: boolean): string {
	const renderToString = resolveKatexRender();
	return renderToString(tex, {
		...KATEX_OPTIONS,
		displayMode,
		throwOnError: false,
	});
}

function resolveKatexRender(): typeof katex.renderToString {
	if (typeof katex.renderToString === "function") {
		return katex.renderToString.bind(katex);
	}

	const fallback = (katex as { default?: typeof katex }).default;
	if (fallback && typeof fallback.renderToString === "function") {
		return fallback.renderToString.bind(fallback);
	}

	throw new Error("KaTeX renderToString is unavailable");
}
