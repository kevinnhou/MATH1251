import type { Root, RootContent } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import type { MathEnvKind } from "./kinds";
import type {
	EnvOccurrence,
	PageEnvs,
	PageSegment,
	RecallOccurrence,
} from "./page-envs";
import {
	createAttribute,
	createWrapper,
	isMathEnv,
	isProseWrapper,
	isRecall,
	readStringAttribute,
	setAttribute,
} from "./remark-ast";
import {
	getEnvHeadings,
	getEnvKind,
	readEnvMetadata,
	readRecall,
	serializeMarkdown,
} from "./remark-metadata";

export function remarkMathEnv() {
	return (tree: Root, file: VFile) => {
		validateRootNesting(tree, file);
		file.data.envs = rewriteDocument(tree, file);
	};
}

function rewriteDocument(tree: Root, file: VFile): PageEnvs {
	const entries: EnvOccurrence[] = [];
	const recalls: RecallOccurrence[] = [];
	const counts = new Map<MathEnvKind, number>();
	const recallCounts = new Map<string, number>();
	const slugs = new Map<string, MdxJsxFlowElement>();
	const children: RootContent[] = [];

	for (const child of tree.children) {
		children.push(
			rewriteRootChild(child, file, {
				counts,
				entries,
				recallCounts,
				recalls,
				slugs,
			})
		);
	}

	tree.children = coalesceProse(children);

	return { entries, recalls, segments: collectSegments(tree) };
}

function rewriteRootChild(
	child: RootContent,
	file: VFile,
	state: {
		counts: Map<MathEnvKind, number>;
		entries: EnvOccurrence[];
		recallCounts: Map<string, number>;
		recalls: RecallOccurrence[];
		slugs: Map<string, MdxJsxFlowElement>;
	}
): RootContent {
	if (child.type === "mdxjsEsm") {
		return child;
	}

	if (isRecall(child)) {
		const recall = readRecall(child, file, state.recallCounts);
		if (recall !== undefined) {
			state.recalls.push(recall);
		}

		return child;
	}

	if (!isMathEnv(child)) {
		return wrapProse(child);
	}

	const kind = getEnvKind(child, file);
	if (kind === undefined) {
		return wrapProse(child);
	}

	const index = (state.counts.get(kind) ?? 0) + 1;
	const id = `${kind}-${index}`;
	const headings = getEnvHeadings(child);
	const title = headings[0]?.title || undefined;
	const metadata = readEnvMetadata(child, kind, file, state.slugs);

	setAttribute(child, "id", id);

	state.entries.push({
		headings,
		id,
		index,
		kind,
		of: metadata.of,
		see: metadata.see,
		...(metadata.body ? { body: metadata.body } : {}),
		...(metadata.difficulty ? { difficulty: metadata.difficulty } : {}),
		...(metadata.slug ? { slug: metadata.slug } : {}),
		...(metadata.statement ? { statement: metadata.statement } : {}),
		...(title ? { title } : {}),
	});
	state.counts.set(kind, index);

	return createWrapper(
		"KindFilter",
		[child as MdxJsxFlowElement["children"][number]],
		[createAttribute("kind", kind)]
	);
}

function collectSegments(tree: Root): PageSegment[] {
	const segments: PageSegment[] = [];

	for (const child of tree.children) {
		if (child.type !== "mdxJsxFlowElement") {
			continue;
		}

		if (child.name === "Recall") {
			const id = readStringAttribute(child, "id");
			if (id !== undefined) {
				segments.push({ id, type: "recall" });
			}
			continue;
		}

		if (child.name === "KindFilter") {
			const env = child.children.find((node) => isMathEnv(node));
			const id = env === undefined ? undefined : readStringAttribute(env, "id");
			if (id !== undefined) {
				segments.push({ id, type: "env" });
			}
			continue;
		}

		if (child.name !== "Prose") {
			continue;
		}

		const markdown = serializeMarkdown(
			child.children as Root["children"]
		).trim();
		if (markdown.length > 0) {
			segments.push({ markdown, type: "prose" });
		}
	}

	return segments;
}

function wrapProse(child: RootContent): MdxJsxFlowElement {
	return createWrapper("Prose", [
		child as MdxJsxFlowElement["children"][number],
	]);
}

function coalesceProse(nodes: RootContent[]): RootContent[] {
	const coalesced: RootContent[] = [];

	for (const node of nodes) {
		const previous = coalesced.at(-1);
		if (previous && isProseWrapper(previous) && isProseWrapper(node)) {
			previous.children.push(...node.children);
			continue;
		}

		coalesced.push(node);
	}

	return coalesced;
}

function validateRootNesting(tree: Root, file: VFile) {
	visit(tree, "mdxJsxFlowElement", (node, _index, parent) => {
		if (parent?.type === "root") {
			return;
		}

		if (isMathEnv(node)) {
			file.fail(
				"Math environments must be direct children of the document.",
				node
			);
		}

		if (isRecall(node)) {
			file.fail("Recall must be a direct child of the document.", node);
		}
	});
}

declare module "vfile" {
	interface DataMap {
		envs?: PageEnvs;
	}
}
