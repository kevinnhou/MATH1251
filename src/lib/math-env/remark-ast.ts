import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx";
import type { Node } from "unist";
import { mathEnvKindFromTag } from "./kinds";

export function isMathEnv(node: Node): node is MdxJsxFlowElement {
	if (node.type !== "mdxJsxFlowElement") {
		return false;
	}

	const element = node as MdxJsxFlowElement;
	return (
		element.name !== null && mathEnvKindFromTag(element.name) !== undefined
	);
}

export function isRecall(node: Node): node is MdxJsxFlowElement {
	if (node.type !== "mdxJsxFlowElement") {
		return false;
	}

	return (node as MdxJsxFlowElement).name === "Recall";
}

export function isProseWrapper(node: Node): node is MdxJsxFlowElement {
	if (node.type !== "mdxJsxFlowElement") {
		return false;
	}

	return (node as MdxJsxFlowElement).name === "Prose";
}

export function readStringAttribute(
	node: MdxJsxFlowElement,
	name: string
): string | undefined {
	const value = getAttribute(node, name)?.value;
	return typeof value === "string" ? value : undefined;
}

export function getAttribute(
	node: MdxJsxFlowElement,
	name: string
): MdxJsxAttribute | undefined {
	return node.attributes.find(
		(attribute): attribute is MdxJsxAttribute =>
			attribute.type === "mdxJsxAttribute" && attribute.name === name
	);
}

export function setAttribute(
	node: MdxJsxFlowElement,
	name: string,
	value: string
) {
	const existing = getAttribute(node, name);
	if (existing) {
		existing.value = value;
		return;
	}

	node.attributes.push(createAttribute(name, value));
}

export function createAttribute(name: string, value: string): MdxJsxAttribute {
	return {
		name,
		type: "mdxJsxAttribute",
		value,
	};
}

export function createWrapper(
	name: string,
	children: MdxJsxFlowElement["children"],
	attributes: MdxJsxAttribute[] = []
): MdxJsxFlowElement {
	return {
		attributes,
		children,
		data: { _stringify: "children-only" } as MdxJsxFlowElement["data"],
		name,
		type: "mdxJsxFlowElement",
	};
}
