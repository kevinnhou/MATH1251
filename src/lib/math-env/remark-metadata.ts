import type { Heading, Root } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { mathToMarkdown } from "mdast-util-math";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { mdxToMarkdown } from "mdast-util-mdx";
import { toMarkdown } from "mdast-util-to-markdown";
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
	type RecallOccurrence,
	recallId,
} from "./page-envs";
import { getAttribute, setAttribute } from "./remark-ast";
import { parseTenetSlug, parseTenetSlugList } from "./slug";

const metadataAttributes = ["difficulty", "of", "see", "slug"] as const;

export function getEnvKind(
	node: MdxJsxFlowElement,
	file: VFile
): MathEnvKind | undefined {
	const kind = mathEnvKindFromTag(node.name ?? "");
	if (kind === undefined) {
		return;
	}

	assertStaticMetadata(node, file);
	return kind;
}

export function readEnvMetadata(
	node: MdxJsxFlowElement,
	kind: MathEnvKind,
	file: VFile,
	slugs: Map<string, MdxJsxFlowElement>
) {
	const slugValue = readStaticString(node, "slug", file);
	let slug: string | undefined;

	if (slugValue === undefined) {
		if (isSlugRequired(kind)) {
			file.fail(
				`${getMathEnvConfig(kind).label} requires a static "slug" attribute.`,
				node
			);
		}
	} else {
		const parsed = parseTenetSlug(slugValue);
		if (!parsed.ok) {
			file.fail(parsed.error, node);
		}

		const existing = slugs.get(parsed.value);
		if (existing) {
			file.fail(
				`Tenet slug "${parsed.value}" is already used on this page.`,
				node
			);
		}

		slugs.set(parsed.value, node);
		slug = parsed.value;
	}

	const of = readSlugList(node, "of", file);
	const see = readSlugList(node, "see", file);

	const difficultyValue = readStaticString(node, "difficulty", file);
	let difficulty: EnvOccurrence["difficulty"];

	if (difficultyValue !== undefined) {
		if (kind !== "example") {
			file.fail('Only Example accepts a "difficulty" attribute.', node);
		}

		const parsed = parseDifficulty(difficultyValue);
		if (!parsed.ok) {
			file.fail(parsed.error, node);
		}

		difficulty = parsed.value;
	}

	const { body, statement } = splitEnvMarkdown(node);

	return { body, difficulty, of, see, slug, statement };
}

export function readRecall(
	node: MdxJsxFlowElement,
	file: VFile,
	recallCounts: Map<string, number>
): RecallOccurrence | undefined {
	assertStaticMetadata(node, file);

	const ofValue = readStaticString(node, "of", file);
	if (ofValue === undefined) {
		file.fail('Recall requires a static "of" attribute.', node);
		return;
	}

	const parsed = parseTenetSlug(ofValue);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
		return;
	}

	const index = (recallCounts.get(parsed.value) ?? 0) + 1;
	recallCounts.set(parsed.value, index);
	const id = recallId(parsed.value, index);
	setAttribute(node, "id", id);

	return { id, index, of: parsed.value };
}

export function getEnvHeadings(node: MdxJsxFlowElement): EnvHeading[] {
	const headings: EnvHeading[] = [];

	visit(node, "heading", (heading: Heading) => {
		const id = getHeadingId(heading);
		if (id === undefined) {
			return;
		}

		headings.push({
			depth: heading.depth,
			title: serializeHeadingTitle(heading),
			url: `#${id}`,
		});
	});

	return headings;
}

function readSlugList(
	node: MdxJsxFlowElement,
	name: "of" | "see",
	file: VFile
): string[] {
	const value = readStaticString(node, name, file);
	if (value === undefined) {
		return [];
	}

	const parsed = parseTenetSlugList(value);
	if (!parsed.ok) {
		file.fail(parsed.error, node);
		return [];
	}

	return parsed.value;
}

function readStaticString(
	node: MdxJsxFlowElement,
	name: string,
	file: VFile
): string | undefined {
	const attribute = getAttribute(node, name);
	if (attribute === undefined) {
		return;
	}

	if (typeof attribute.value !== "string") {
		file.fail(`"${name}" must be a static string.`, node);
		return;
	}

	return attribute.value;
}

function assertStaticMetadata(node: MdxJsxFlowElement, file: VFile) {
	if (
		node.attributes.some(
			(attribute) => attribute.type === "mdxJsxExpressionAttribute"
		)
	) {
		file.fail("Environment metadata must be static strings.", node);
	}

	for (const name of metadataAttributes) {
		const attribute = getAttribute(node, name);
		if (attribute && typeof attribute.value !== "string") {
			file.fail(`"${name}" must be a static string.`, node);
		}
	}
}

export function splitEnvMarkdown(node: MdxJsxFlowElement): {
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

		if (child.type === "mdxJsxFlowElement" && child.name === "Statement") {
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

export function serializeMarkdown(children: Root["children"]): string {
	return toMarkdown(
		{ children, type: "root" },
		{ extensions: [gfmToMarkdown(), mathToMarkdown(), mdxToMarkdown()] }
	).trim();
}

function serializeHeadingTitle(heading: Heading): string {
	return serializeMarkdown([{ children: heading.children, type: "paragraph" }]);
}

function getHeadingId(heading: Heading): string | undefined {
	const data = heading.data as { hProperties?: unknown } | undefined;
	const properties = data?.hProperties;

	if (!isRecord(properties)) {
		return;
	}

	return typeof properties.id === "string" ? properties.id : undefined;
}
