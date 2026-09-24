import { valueToEstree } from "estree-util-value-to-estree";
import type { Element, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import type { MdxJsxTextElementHast } from "mdast-util-mdx-jsx";
import { SKIP, visit } from "unist-util-visit";
import { classList } from "./hast";

const KATEX_CLASS = "katex";

export function rehypeKatexHtml() {
	return (tree: Root) => {
		visit(tree, "element", (node, index, parent) => {
			if (
				parent === undefined ||
				index === undefined ||
				!classList(node).includes(KATEX_CLASS)
			) {
				return;
			}

			parent.children[index] = toInnerHtmlElement(node);
			return SKIP;
		});
	};
}

function toInnerHtmlElement(node: Element): MdxJsxTextElementHast {
	return {
		attributes: [
			{
				name: "className",
				type: "mdxJsxAttribute",
				value: classList(node).join(" "),
			},
			{
				name: "dangerouslySetInnerHTML",
				type: "mdxJsxAttribute",
				value: {
					data: {
						estree: {
							body: [
								{
									expression: valueToEstree({ __html: toHtml(node.children) }),
									type: "ExpressionStatement",
								},
							],
							sourceType: "module",
							type: "Program",
						},
					},
					type: "mdxJsxAttributeValueExpression",
					value: "",
				},
			},
		],
		children: [],
		name: node.tagName,
		type: "mdxJsxTextElement",
	};
}
