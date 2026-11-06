import type { Program } from "estree";
import type { Root, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx";
import { mdxToMarkdown } from "mdast-util-mdx";
import { mdxJsxToMarkdown } from "mdast-util-mdx-jsx";
import {
	type Handle,
	type Options as ToMarkdownOptions,
	toMarkdown,
} from "mdast-util-to-markdown";
import type { Node } from "unist";
import { visitParents } from "unist-util-visit-parents";
import type { VFile } from "vfile";
import { TO_MARKDOWN_EXTENSIONS } from "@/lib/markdown/syntaxes";
import { ENGINE_TAGS } from "./component";
import type { ComponentRegistry } from "./kinds";
import {
	type ComponentOccurrence,
	componentPlaceholder,
	type PropValue,
} from "./page-envs";
import { type Constants, expressionValue, literalConstants } from "./props";

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

type Children = Root["children"];

export interface Serializer {
	template: (children: Children) => string;
	text: (children: Children) => string;
}

export interface FoundOccurrence
	extends Omit<ComponentOccurrence, "env" | "segment"> {
	root: number;
}

export interface PageComponents {
	occurrences: FoundOccurrence[];
	serialize: Serializer;
}

const INTRINSIC_TAG = /^[a-z]/;
const BLANK_LINES = /\n{3,}/g;
const ENGINE_TAG_SET = new Set<string>(ENGINE_TAGS);
const JSX_HANDLERS = mdxJsxToMarkdown().handlers ?? {};

export function collectComponents(
	tree: Root,
	file: VFile,
	env: ComponentRegistry
): PageComponents {
	const constants = literalConstants(
		tree.children.flatMap((child) =>
			child.type === "mdxjsEsm" && child.data?.estree
				? [child.data.estree as Program]
				: []
		)
	);
	const byNode = new Map<Node, number>();
	const found: { node: JsxElement; root: number }[] = [];

	visitParents(tree, (visited: Node, ancestors: readonly Node[]) => {
		if (!(isJsxElement(visited) && isDomainComponent(visited, file, env))) {
			return;
		}

		if (ancestors.some((ancestor) => ancestor.type === "tableCell")) {
			file.fail(`<${visited.name}> can't sit inside a table.`, visited);
		}

		const top = (ancestors[1] ?? visited) as RootContent;
		byNode.set(visited, found.length);
		found.push({ node: visited, root: tree.children.indexOf(top) });
	});

	const childrenText = (node: JsxElement): string =>
		serialize.text(
			node.type === "mdxJsxFlowElement"
				? (node.children as Children)
				: [{ children: node.children, type: "paragraph" }]
		);
	const serialize = serializer(byNode, (index) => {
		const item = found[index];
		return item === undefined ? "" : childrenText(item.node);
	});

	return {
		occurrences: found.map(({ node, root }) => ({
			children: childrenText(node),
			props: readProps(node, file, constants),
			root,
			tag: node.name ?? "",
		})),
		serialize,
	};
}

function isJsxElement(node: Node): node is JsxElement {
	return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

function isDomainComponent(
	node: JsxElement,
	file: VFile,
	env: ComponentRegistry
): boolean {
	const { name } = node;
	if (name === null || name === undefined) {
		file.fail("JSX fragments are not supported.", node);
	}

	if (
		INTRINSIC_TAG.test(name) ||
		ENGINE_TAG_SET.has(name) ||
		env.envKindFromTag(name) !== undefined
	) {
		return false;
	}

	if (!env.components.has(name)) {
		file.fail(
			`<${name}> is not a component of any listed domain; add its domain to course.config.ts or remove it.`,
			node
		);
	}

	return true;
}

function readProps(
	node: JsxElement,
	file: VFile,
	constants: Constants
): Record<string, PropValue> {
	const props: Record<string, PropValue> = {};
	for (const item of node.attributes) {
		if (item.type === "mdxJsxExpressionAttribute") {
			file.fail(`<${node.name}> props can't be spread.`, node);
		}

		const { name: prop, value } = item;
		if (value === null || value === undefined) {
			props[prop] = true;
			continue;
		}

		if (typeof value === "string") {
			props[prop] = value;
			continue;
		}

		const parsed = expressionValue(
			value.data?.estree as Program | undefined,
			constants
		);
		if (!parsed.ok) {
			file.fail(
				`<${node.name}> prop "${prop}" ${parsed.error}; props must be literals or name a literal \`export const\` on this page.`,
				node
			);
		}
		props[prop] = parsed.value;
	}

	return props;
}

type PeekableHandle = Handle & { peek?: Handle };

function componentHandlers(
	byNode: ReadonlyMap<Node, number>,
	output: (index: number) => string
): ToMarkdownOptions {
	const wrap = (name: "mdxJsxFlowElement" | "mdxJsxTextElement"): Handle => {
		const fallback = JSX_HANDLERS[name] as PeekableHandle;
		const handle: PeekableHandle = (node, parent, state, info) => {
			const index = byNode.get(node);
			return index === undefined
				? fallback(node, parent, state, info)
				: output(index);
		};
		handle.peek = fallback.peek;
		return handle;
	};

	return {
		handlers: {
			mdxJsxFlowElement: wrap("mdxJsxFlowElement"),
			mdxJsxTextElement: wrap("mdxJsxTextElement"),
		},
	};
}

function serializer(
	byNode: ReadonlyMap<Node, number>,
	textOf: (index: number) => string
): Serializer {
	const template = componentHandlers(byNode, componentPlaceholder);
	const text = componentHandlers(byNode, textOf);

	return {
		template: (children) => serializeMarkdown(children, template),
		text: (children) =>
			serializeMarkdown(children, text).replaceAll(BLANK_LINES, "\n\n"),
	};
}

function serializeMarkdown(
	children: Children,
	components: ToMarkdownOptions
): string {
	return toMarkdown(
		{ children, type: "root" },
		{
			extensions: [
				gfmToMarkdown(),
				...TO_MARKDOWN_EXTENSIONS,
				mdxToMarkdown(),
				components,
			],
		}
	).trim();
}
