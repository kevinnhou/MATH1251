import type { Heading, Root, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { mathToMarkdown } from "mdast-util-math";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx";
import { mdxToMarkdown } from "mdast-util-mdx";
import { toMarkdown } from "mdast-util-to-markdown";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { isRecord } from "@/lib/result";
import {
	getMathEnvConfig,
	isSlugRequired,
	type MathEnvKind,
	mathEnvKindFromTag,
	parseDifficulty,
} from "./kinds";
import {
	type EnvHeading,
	type EnvOccurrence,
	type PageEnvs,
	type PageSegment,
	type RecallOccurrence,
	recallId,
} from "./page-envs";
import { parseTenetSlug, parseTenetSlugList } from "./slug";

const METADATA_ATTRIBUTES = ["difficulty", "of", "see", "slug"] as const;

type FlowChild = MdxJsxFlowElement["children"][number];

export function remarkMathEnv() {
	return (tree: Root, file: VFile) => {
		validateRootNesting(tree, file);
		file.data.envs = rewriteDocument(tree, file);
	};
}

function rewriteDocument(tree: Root, file: VFile): PageEnvs {
	const entries: EnvOccurrence[] = [];
	const recalls: RecallOccurrence[] = [];
	const segments: PageSegment[] = [];
	const children: RootContent[] = [];
	const counts = new Map<MathEnvKind, number>();
	const recallCounts = new Map<string, number>();
	const slugs = new Set<string>();
	let prose: MdxJsxFlowElement | undefined;

	const closeProse = () => {
		if (prose === undefined) {
			return;
		}

		const markdown = serializeMarkdown(prose.children as Root["children"]);
		if (markdown.length > 0) {
			segments.push({ markdown, type: "prose" });
		}
		prose = undefined;
	};

	for (const child of tree.children) {
		const kind = envKind(child);
		if (kind !== undefined) {
			closeProse();
			const entry = readEnv(child as MdxJsxFlowElement, kind, file, {
				counts,
				slugs,
			});
			entries.push(entry);
			segments.push({ id: entry.id, type: "env" });
			children.push(
				wrapper("KindFilter", [child as FlowChild], [attribute("kind", kind)])
			);
			continue;
		}

		if (isElement(child, "Recall")) {
			closeProse();
			const recall = readRecall(child, file, recallCounts);
			recalls.push(recall);
			segments.push({ id: recall.id, type: "recall" });
			children.push(child);
			continue;
		}

		if (child.type === "mdxjsEsm") {
			closeProse();
			children.push(child);
			continue;
		}

		if (prose === undefined) {
			prose = wrapper("Prose", []);
			children.push(prose);
		}
		prose.children.push(child as FlowChild);
	}

	closeProse();
	tree.children = children;
	return { entries, recalls, segments };
}

function readEnv(
	node: MdxJsxFlowElement,
	kind: MathEnvKind,
	file: VFile,
	state: { counts: Map<MathEnvKind, number>; slugs: Set<string> }
): EnvOccurrence {
	assertStaticMetadata(node, file);

	const index = (state.counts.get(kind) ?? 0) + 1;
	state.counts.set(kind, index);
	const id = `${kind}-${index}`;
	setAttribute(node, "id", id);

	const headings = envHeadings(node);
	const title = headings[0]?.title || undefined;
	const slug = readSlug(node, kind, file, state.slugs);
	const of = readSlugList(node, "of", file);
	const see = readSlugList(node, "see", file);
	const difficulty = readDifficulty(node, kind, file);
	const { body, statement } = splitEnvMarkdown(node);

	return {
		headings,
		id,
		kind,
		of,
		see,
		...(body ? { body } : {}),
		...(difficulty ? { difficulty } : {}),
		...(slug ? { slug } : {}),
		...(statement ? { statement } : {}),
		...(title ? { title } : {}),
	};
}

function readSlug(
	node: MdxJsxFlowElement,
	kind: MathEnvKind,
	file: VFile,
	seen: Set<string>
): string | undefined {
	const value = stringAttribute(node, "slug");
	if (value === undefined) {
		if (isSlugRequired(kind)) {
			file.fail(
				`${getMathEnvConfig(kind).label} requires a static "slug" attribute.`,
				node
			);
		}
		return;
	}

	const parsed = parseTenetSlug(value);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
	}

	if (seen.has(parsed.value)) {
		file.fail(
			`Tenet slug "${parsed.value}" is already used on this page.`,
			node
		);
	}

	seen.add(parsed.value);
	return parsed.value;
}

function readDifficulty(
	node: MdxJsxFlowElement,
	kind: MathEnvKind,
	file: VFile
): EnvOccurrence["difficulty"] {
	const value = stringAttribute(node, "difficulty");
	if (value === undefined) {
		return;
	}

	if (kind !== "example") {
		file.fail('Only Example accepts a "difficulty" attribute.', node);
	}

	const parsed = parseDifficulty(value);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
	}

	return parsed.value;
}

function readSlugList(
	node: MdxJsxFlowElement,
	name: "of" | "see",
	file: VFile
): string[] {
	const value = stringAttribute(node, name);
	if (value === undefined) {
		return [];
	}

	const parsed = parseTenetSlugList(value);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
	}

	return parsed.value;
}

function readRecall(
	node: MdxJsxFlowElement,
	file: VFile,
	recallCounts: Map<string, number>
): RecallOccurrence {
	assertStaticMetadata(node, file);

	const value = stringAttribute(node, "of");
	if (value === undefined) {
		file.fail('Recall requires a static "of" attribute.', node);
	}

	const parsed = parseTenetSlug(value);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
	}

	const index = (recallCounts.get(parsed.value) ?? 0) + 1;
	recallCounts.set(parsed.value, index);
	const id = recallId(parsed.value, index);
	setAttribute(node, "id", id);

	return { id, of: parsed.value };
}

function envHeadings(node: MdxJsxFlowElement): EnvHeading[] {
	const headings: EnvHeading[] = [];

	visit(node, "heading", (heading: Heading) => {
		const id = headingId(heading);
		if (id !== undefined) {
			headings.push({
				title: serializeMarkdown([
					{ children: heading.children, type: "paragraph" },
				]),
				url: `#${id}`,
			});
		}
	});

	return headings;
}

function splitEnvMarkdown(node: MdxJsxFlowElement): {
	body?: string;
	statement?: string;
} {
	let skippedTitle = false;
	const bodyChildren: Root["children"] = [];
	let statement: string | undefined;

	for (const child of node.children) {
		if (!skippedTitle && child.type === "heading") {
			skippedTitle = true;
			continue;
		}

		if (isElement(child, "Statement")) {
			const markdown = serializeMarkdown(child.children as Root["children"]);
			if (markdown.length > 0) {
				statement = markdown;
			}
			continue;
		}

		bodyChildren.push(child as Root["children"][number]);
	}

	const body = serializeMarkdown(bodyChildren);

	return {
		...(body.length > 0 ? { body } : {}),
		...(statement === undefined ? {} : { statement }),
	};
}

function validateRootNesting(tree: Root, file: VFile) {
	visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
		if (parent?.type === "root") {
			return;
		}

		if (envKind(node) !== undefined) {
			file.fail(
				"Math environments must be direct children of the document.",
				node
			);
		}

		if (isElement(node, "Recall")) {
			file.fail("Recall must be a direct child of the document.", node);
		}
	});
}

function assertStaticMetadata(node: MdxJsxFlowElement, file: VFile) {
	if (
		node.attributes.some((item) => item.type === "mdxJsxExpressionAttribute")
	) {
		file.fail("Environment metadata must be static strings.", node);
	}

	for (const name of METADATA_ATTRIBUTES) {
		const value = findAttribute(node, name)?.value;
		if (value !== undefined && typeof value !== "string") {
			file.fail(`"${name}" must be a static string.`, node);
		}
	}
}

function serializeMarkdown(children: Root["children"]): string {
	return toMarkdown(
		{ children, type: "root" },
		{ extensions: [gfmToMarkdown(), mathToMarkdown(), mdxToMarkdown()] }
	).trim();
}

function headingId(heading: Heading): string | undefined {
	const properties = (heading.data as { hProperties?: unknown } | undefined)
		?.hProperties;
	return isRecord(properties) && typeof properties.id === "string"
		? properties.id
		: undefined;
}

function envKind(node: Node): MathEnvKind | undefined {
	return node.type === "mdxJsxFlowElement"
		? mathEnvKindFromTag((node as MdxJsxFlowElement).name ?? "")
		: undefined;
}

function isElement(node: Node, name: string): node is MdxJsxFlowElement {
	return (
		node.type === "mdxJsxFlowElement" &&
		(node as MdxJsxFlowElement).name === name
	);
}

function findAttribute(
	node: MdxJsxFlowElement,
	name: string
): MdxJsxAttribute | undefined {
	return node.attributes.find(
		(item): item is MdxJsxAttribute =>
			item.type === "mdxJsxAttribute" && item.name === name
	);
}

function stringAttribute(
	node: MdxJsxFlowElement,
	name: string
): string | undefined {
	const value = findAttribute(node, name)?.value;
	return typeof value === "string" ? value : undefined;
}

function setAttribute(node: MdxJsxFlowElement, name: string, value: string) {
	const existing = findAttribute(node, name);
	if (existing) {
		existing.value = value;
	} else {
		node.attributes.push(attribute(name, value));
	}
}

function attribute(name: string, value: string): MdxJsxAttribute {
	return { name, type: "mdxJsxAttribute", value };
}

function wrapper(
	name: string,
	children: FlowChild[],
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

declare module "vfile" {
	interface DataMap {
		envs?: PageEnvs;
	}
}
