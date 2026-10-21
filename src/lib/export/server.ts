import "server-only";

import { course } from "@/lib/course/config";
import type { PromptTarget } from "@/lib/mdx-env/target";
import {
	envContext,
	envTarget,
	kindViewContext,
	kindViewTarget,
	pageContext,
	pageTarget,
	threadContext,
	threadTarget,
} from "./context";
import {
	envDocument,
	indexDocument,
	kindViewDocument,
	pageDocument,
	threadDocument,
} from "./documents";
import {
	type ExportEdge,
	type ExportGraph,
	type ExportKindView,
	type ExportNode,
	type ExportThread,
	type PromptContext,
	RELATION_NAMES,
} from "./model";
import { pagesOf } from "./query";
import {
	type ExportFormat,
	nodeFileSegments,
	nodeMarkdownUrl,
	parseNodeFile,
} from "./urls";

export type ExportTarget = { id: string } & (
	| { node: ExportNode; type: ExportNode["type"] }
	| { type: "kind-view"; view: ExportKindView }
	| { thread: ExportThread; type: "thread" }
);

export function resolveExportTarget(
	graph: ExportGraph,
	segments: readonly string[],
	format: ExportFormat
): ExportTarget | undefined {
	const id = parseNodeFile(segments, format);
	return id === undefined ? undefined : resolveNode(graph, id);
}

function resolveNode(graph: ExportGraph, id: string): ExportTarget | undefined {
	const node = graph.nodes.get(id);
	if (node !== undefined) {
		return { id, node, type: node.type };
	}

	const view = graph.kindViews.get(id);
	if (view !== undefined) {
		return { id, type: "kind-view", view };
	}

	const thread = graph.threads.get(id);
	return thread === undefined ? undefined : { id, thread, type: "thread" };
}

export function renderMarkdown(
	graph: ExportGraph,
	target: ExportTarget
): string {
	switch (target.type) {
		case "env":
			return envDocument(target.node, graph);
		case "page":
			return pageDocument(target.node, graph);
		case "kind-view":
			return kindViewDocument(target.view, graph);
		case "thread":
			return threadDocument(target.thread, graph);
		default:
			return target satisfies never;
	}
}

export function promptTargetFor(
	graph: ExportGraph,
	id: string
): PromptTarget | undefined {
	const target = resolveNode(graph, id);
	switch (target?.type) {
		case undefined:
			return;
		case "env":
			return envTarget(target.node, graph);
		case "page":
			return pageTarget(target.node);
		case "kind-view":
			return kindViewTarget(target.view);
		case "thread":
			return threadTarget(target.thread);
		default:
			return target satisfies never;
	}
}

export function renderPromptContext(
	graph: ExportGraph,
	target: ExportTarget
): PromptContext {
	switch (target.type) {
		case "env":
			return envContext(target.node, graph);
		case "page":
			return pageContext(target.node, graph);
		case "kind-view":
			return kindViewContext(target.view, graph);
		case "thread":
			return threadContext(target.thread, graph);
		default:
			return target satisfies never;
	}
}

export function exportStaticParams(
	graph: ExportGraph,
	format: ExportFormat
): { slug: string[] }[] {
	const ids = [
		...graph.nodes.keys(),
		...graph.kindViews.keys(),
		...graph.threads.keys(),
	];
	return ids.map((id) => ({ slug: nodeFileSegments(id, format) }));
}

export function llmsIndexText(graph: ExportGraph): string {
	return indexDocument(graph);
}

export function llmsFullText(graph: ExportGraph): string {
	return pagesOf(graph)
		.map((node) => pageDocument(node, graph))
		.join("\n\n");
}

interface ExportGraphJson {
	course: string;
	edges: readonly ExportEdge[];
	nodes: (Omit<ExportNode, "body" | "statement"> & { markdown: string })[];
	relations: typeof RELATION_NAMES;
	threads: (ExportThread & { markdown: string })[];
}

export function exportGraphJson(graph: ExportGraph): ExportGraphJson {
	return {
		course: course.title,
		edges: graph.edges,
		nodes: [...graph.nodes.values()].map(
			({ body: _body, statement: _statement, ...node }) => ({
				...node,
				markdown: nodeMarkdownUrl(node.id),
			})
		),
		relations: RELATION_NAMES,
		threads: [...graph.threads.values()].map((thread) => ({
			...thread,
			markdown: nodeMarkdownUrl(thread.id),
		})),
	};
}
