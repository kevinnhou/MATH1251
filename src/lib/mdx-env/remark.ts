import type { Heading, Root, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx";
import { mdxToMarkdown } from "mdast-util-mdx";
import { toMarkdown } from "mdast-util-to-markdown";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { TO_MARKDOWN_EXTENSIONS } from "@/lib/markdown/syntaxes";
import { isRecord, type ParseResult } from "@/lib/result";
import { ENV, type EnvKind, type EnvRegistry } from "./kinds";
import type { EngineTag, EnvKindConfig } from "./pack";
import {
	type EnvHeading,
	type EnvOccurrence,
	type PageEnvs,
	type PageSegment,
	type RecallOccurrence,
	recallId,
	type ThreadOccurrence,
	type ThreadTag,
	threadId,
} from "./page-envs";
import { parseTenetSlug, parseTenetSlugList, parseThreadTags } from "./slug";

const AND_LIST = new Intl.ListFormat("en", { type: "conjunction" });

const METADATA_ATTRIBUTES = [
	"difficulty",
	"of",
	"see",
	"slug",
	"summary",
	"thread",
] as const;

type FlowChild = MdxJsxFlowElement["children"][number];

const CHILDREN_ONLY = { _stringify: "children-only" };

export function remarkMdxEnv(options: { env?: EnvRegistry } = {}) {
	const env = options.env ?? ENV;
	return (tree: Root, file: VFile) => {
		validateRootNesting(tree, file, env);
		file.data.envs = rewriteDocument(tree, file, env);
	};
}

function rewriteDocument(tree: Root, file: VFile, env: EnvRegistry): PageEnvs {
	const entries: EnvOccurrence[] = [];
	const recalls: RecallOccurrence[] = [];
	const segments: PageSegment[] = [];
	const threads: ThreadOccurrence[] = [];
	const children: RootContent[] = [];
	const counts = new Map<EnvKind, number>();
	const recallCounts = new Map<string, number>();
	const slugs = new Set<string>();
	let prose: MdxJsxFlowElement | undefined;

	const pushProse = (node: MdxJsxFlowElement) => {
		const markdown = serializeMarkdown(node.children as Root["children"]);
		if (markdown.length > 0) {
			segments.push({ markdown, type: "prose" });
		}
	};

	const closeProse = () => {
		if (prose !== undefined) {
			pushProse(prose);
			prose = undefined;
		}
	};

	for (const child of tree.children) {
		const kind = envKind(child, env);
		if (kind !== undefined) {
			closeProse();
			const entry = readEnv(child as MdxJsxFlowElement, kind, file, env, {
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

		if (isElement(child, "Thread")) {
			closeProse();
			threads.push(readThread(child, file, slugs));
			pushProse(child);
			child.data = {
				...child.data,
				...CHILDREN_ONLY,
			} as MdxJsxFlowElement["data"];
			children.push(wrapper("Prose", [child]));
			continue;
		}

		if (isElement(child, "ThreadMap")) {
			closeProse();
			children.push(wrapper("Prose", [child]));
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
	return { entries, recalls, segments, threads };
}

function readEnv(
	node: MdxJsxFlowElement,
	kind: EnvKind,
	file: VFile,
	env: EnvRegistry,
	state: { counts: Map<EnvKind, number>; slugs: Set<string> }
): EnvOccurrence {
	assertStaticMetadata(node, file);

	const index = (state.counts.get(kind) ?? 0) + 1;
	state.counts.set(kind, index);
	const id = `${kind}-${index}`;
	setAttribute(node, "id", id);

	const headings = envHeadings(node);
	const title = headings[0]?.title || undefined;
	const slug = readSlug(node, env.getEnvConfig(kind), file, state.slugs);
	const of = readSlugList(node, "of", file);
	const see = readSlugList(node, "see", file);
	const difficulty = readDifficulty(node, kind, file, env);
	const threads = readThreadTags(node, file);
	const { body, statement } = splitEnvMarkdown(node);

	return {
		headings,
		id,
		kind,
		of,
		see,
		threads,
		...(body ? { body } : {}),
		...(difficulty ? { difficulty } : {}),
		...(slug ? { slug } : {}),
		...(statement ? { statement } : {}),
		...(title ? { title } : {}),
	};
}

function readSlug(
	node: MdxJsxFlowElement,
	{ label, optionalSlug }: EnvKindConfig,
	file: VFile,
	seen: Set<string>
): string | undefined {
	const slug = parseAttribute(node, "slug", parseTenetSlug, file);
	if (slug === undefined) {
		return optionalSlug
			? undefined
			: requiredAttribute(node, label, "slug", file);
	}

	if (seen.has(slug)) {
		file.fail(`Tenet slug "${slug}" is already used on this page.`, node);
	}

	seen.add(slug);
	return slug;
}

function readDifficulty(
	node: MdxJsxFlowElement,
	kind: EnvKind,
	file: VFile,
	env: EnvRegistry
): EnvOccurrence["difficulty"] {
	if (
		!env.isPractice(kind) &&
		stringAttribute(node, "difficulty") !== undefined
	) {
		file.fail(
			`Only ${AND_LIST.format(env.practiceLabels)} accept a "difficulty" attribute.`,
			node
		);
	}

	return parseAttribute(node, "difficulty", env.parseDifficulty, file);
}

function readSlugList(
	node: MdxJsxFlowElement,
	name: "of" | "see",
	file: VFile
): string[] {
	return parseAttribute(node, name, parseTenetSlugList, file) ?? [];
}

function readThreadTags(node: MdxJsxFlowElement, file: VFile): ThreadTag[] {
	return parseAttribute(node, "thread", parseThreadTags, file) ?? [];
}

function readThread(
	node: MdxJsxFlowElement,
	file: VFile,
	seen: Set<string>
): ThreadOccurrence {
	assertStaticMetadata(node, file);

	const slug =
		parseAttribute(node, "slug", parseTenetSlug, file) ??
		requiredAttribute(node, "Thread", "slug", file);
	if (seen.has(slug)) {
		file.fail(`Slug "${slug}" is already used on this page.`, node);
	}
	seen.add(slug);

	const summary =
		stringAttribute(node, "summary")?.trim() ||
		requiredAttribute(node, "Thread", "summary", file);

	const [first] = node.children;
	if (first?.type !== "heading") {
		file.fail("Thread must start with a heading, which is its title.", node);
	}

	const id = threadId(slug);
	setAttribute(node, "id", id);

	return {
		id,
		slug,
		summary,
		title: serializeMarkdown([{ children: first.children, type: "paragraph" }]),
	};
}

function readRecall(
	node: MdxJsxFlowElement,
	file: VFile,
	recallCounts: Map<string, number>
): RecallOccurrence {
	assertStaticMetadata(node, file);

	const of =
		parseAttribute(node, "of", parseTenetSlug, file) ??
		requiredAttribute(node, "Recall", "of", file);

	const index = (recallCounts.get(of) ?? 0) + 1;
	recallCounts.set(of, index);
	const id = recallId(of, index);
	setAttribute(node, "id", id);

	return { id, of };
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

const ROOT_ELEMENTS = [
	"Recall",
	"Thread",
	"ThreadMap",
] as const satisfies readonly EngineTag[];

function validateRootNesting(tree: Root, file: VFile, env: EnvRegistry) {
	visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
		if (parent?.type === "root") {
			return;
		}

		if (envKind(node, env) !== undefined) {
			file.fail("Environments must be direct children of the document.", node);
		}

		for (const name of ROOT_ELEMENTS) {
			if (isElement(node, name)) {
				file.fail(`${name} must be a direct child of the document.`, node);
			}
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
		{
			extensions: [gfmToMarkdown(), ...TO_MARKDOWN_EXTENSIONS, mdxToMarkdown()],
		}
	).trim();
}

function headingId(heading: Heading): string | undefined {
	const properties = (heading.data as { hProperties?: unknown } | undefined)
		?.hProperties;
	return isRecord(properties) && typeof properties.id === "string"
		? properties.id
		: undefined;
}

function envKind(node: Node, env: EnvRegistry): EnvKind | undefined {
	return node.type === "mdxJsxFlowElement"
		? env.envKindFromTag((node as MdxJsxFlowElement).name ?? "")
		: undefined;
}

function isElement(node: Node, name: EngineTag): node is MdxJsxFlowElement {
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

function parseAttribute<T>(
	node: MdxJsxFlowElement,
	name: string,
	parse: (value: string) => ParseResult<T>,
	file: VFile
): T | undefined {
	const value = stringAttribute(node, name);
	if (value === undefined) {
		return;
	}

	const parsed = parse(value);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
	}

	return parsed.value;
}

function requiredAttribute(
	node: MdxJsxFlowElement,
	element: string,
	name: string,
	file: VFile
): never {
	file.fail(`${element} requires a static "${name}" attribute.`, node);
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
	name: EngineTag,
	children: FlowChild[],
	attributes: MdxJsxAttribute[] = []
): MdxJsxFlowElement {
	return {
		attributes,
		children,
		data: { ...CHILDREN_ONLY } as MdxJsxFlowElement["data"],
		name,
		type: "mdxJsxFlowElement",
	};
}

declare module "vfile" {
	interface DataMap {
		envs?: PageEnvs;
	}
}
