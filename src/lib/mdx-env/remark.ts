import type { Heading, Root, RootContent } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { isRecord, type ParseResult } from "@/lib/result";
import type { EngineTag, EnvConfig } from "./component";
import { type ComponentRegistry, ENV, type EnvKind } from "./kinds";
import {
	collectComponents,
	type PageComponents,
	type Serializer,
} from "./occurrences";
import type {
	ComponentOccurrence,
	EnvHeading,
	EnvOccurrence,
	EnvTemplates,
	PageEnvs,
	PageSegment,
	RecallOccurrence,
	ThreadOccurrence,
	ThreadTag,
} from "./page-envs";
import { recallId, threadId } from "./page-envs";
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

export function remarkMdxEnv(options: { env?: ComponentRegistry } = {}) {
	const env = options.env ?? ENV;
	return (tree: Root, file: VFile) => {
		validateRootNesting(tree, file, env);
		const components = collectComponents(tree, file, env);
		file.data.envs = rewriteDocument(tree, file, env, components);
	};
}

function rewriteDocument(
	tree: Root,
	file: VFile,
	env: ComponentRegistry,
	{ occurrences, serialize }: PageComponents
): PageEnvs {
	const placement = new Map<
		number,
		Pick<ComponentOccurrence, "env" | "segment">
	>();
	const entries: EnvOccurrence[] = [];
	const recalls: RecallOccurrence[] = [];
	const segments: PageSegment[] = [];
	const threads: ThreadOccurrence[] = [];
	const children: RootContent[] = [];
	const counts = new Map<EnvKind, number>();
	const recallCounts = new Map<string, number>();
	const slugs = new Set<string>();
	let prose: MdxJsxFlowElement | undefined;

	const place = (root: number, envId?: string) => {
		placement.set(root, {
			segment: segments.length,
			...(envId === undefined ? {} : { env: envId }),
		});
	};

	const pushProse = (node: MdxJsxFlowElement) => {
		const markdown = serialize.template(node.children as Root["children"]);
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

	for (const [root, child] of tree.children.entries()) {
		const kind = envKind(child, env);
		if (kind !== undefined) {
			closeProse();
			const entry = readEnv(child as MdxJsxFlowElement, kind, file, env, {
				counts,
				serialize,
				slugs,
			});
			entries.push(entry);
			place(root, entry.id);
			segments.push({ id: entry.id, type: "env" });
			children.push(
				wrapper("KindFilter", [child as FlowChild], [attribute("kind", kind)])
			);
			continue;
		}

		if (isElement(child, "Thread")) {
			closeProse();
			threads.push(readThread(child, file, slugs, serialize));
			place(root);
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
		place(root);
		prose.children.push(child as FlowChild);
	}

	closeProse();
	tree.children = children;
	return {
		components: occurrences.map(({ root, ...occurrence }) => ({
			...occurrence,
			...(placement.get(root) ?? { segment: -1 }),
		})),
		entries,
		recalls,
		segments,
		threads,
	};
}

function readEnv(
	node: MdxJsxFlowElement,
	kind: EnvKind,
	file: VFile,
	env: ComponentRegistry,
	state: {
		counts: Map<EnvKind, number>;
		serialize: Serializer;
		slugs: Set<string>;
	}
): EnvOccurrence {
	assertStaticMetadata(node, file);

	const index = (state.counts.get(kind) ?? 0) + 1;
	state.counts.set(kind, index);
	const id = `${kind}-${index}`;
	setAttribute(node, "id", id);

	const headings = envHeadings(node, state.serialize);
	const title = headings[0]?.title || undefined;
	const slug = readSlug(node, env.getEnvConfig(kind), file, state.slugs);
	const of = readSlugList(node, "of", file);
	const see = readSlugList(node, "see", file);
	const difficulty = readDifficulty(node, kind, file, env);
	const threads = readThreadTags(node, file);
	const { body, statement } = splitEnvMarkdown(node, state.serialize.text);
	const templates = envTemplates(
		{ body, statement },
		splitEnvMarkdown(node, state.serialize.template)
	);

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
		...(templates ? { templates } : {}),
		...(title ? { title } : {}),
	};
}

function envTemplates(
	text: EnvTemplates,
	template: EnvTemplates
): EnvTemplates | undefined {
	const templates = {
		...(template.body === text.body ? {} : { body: template.body }),
		...(template.statement === text.statement
			? {}
			: { statement: template.statement }),
	};
	return Object.keys(templates).length > 0 ? templates : undefined;
}

function readSlug(
	node: MdxJsxFlowElement,
	{ optionalSlug, tag }: EnvConfig,
	file: VFile,
	seen: Set<string>
): string | undefined {
	const slug = parseAttribute(node, "slug", parseTenetSlug, file);
	if (slug === undefined) {
		return optionalSlug
			? undefined
			: requiredAttribute(node, tag, "slug", file);
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
	env: ComponentRegistry
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

	return parseAttribute(
		node,
		"difficulty",
		(value) => env.parseDifficulty(kind, value),
		file
	);
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
	seen: Set<string>,
	serialize: Serializer
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
		title: serialize.text([{ children: first.children, type: "paragraph" }]),
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

function envHeadings(
	node: MdxJsxFlowElement,
	serialize: Serializer
): EnvHeading[] {
	const headings: EnvHeading[] = [];

	visit(node, "heading", (heading: Heading) => {
		const id = headingId(heading);
		if (id !== undefined) {
			headings.push({
				title: serialize.text([
					{ children: heading.children, type: "paragraph" },
				]),
				url: `#${id}`,
			});
		}
	});

	return headings;
}

function splitEnvMarkdown(
	node: MdxJsxFlowElement,
	serialize: (children: Root["children"]) => string
): {
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
			const markdown = serialize(child.children as Root["children"]);
			if (markdown.length > 0) {
				statement = markdown;
			}
			continue;
		}

		bodyChildren.push(child as Root["children"][number]);
	}

	const body = serialize(bodyChildren);

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

function validateRootNesting(tree: Root, file: VFile, env: ComponentRegistry) {
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

function headingId(heading: Heading): string | undefined {
	const properties = (heading.data as { hProperties?: unknown } | undefined)
		?.hProperties;
	return isRecord(properties) && typeof properties.id === "string"
		? properties.id
		: undefined;
}

function envKind(node: Node, env: ComponentRegistry): EnvKind | undefined {
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
