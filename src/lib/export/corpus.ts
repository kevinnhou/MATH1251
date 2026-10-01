import "server-only";

import type { KindView } from "@/lib/math-env/kind-view";
import { getCorpus, resolveDocsUrl } from "@/lib/site/corpus";
import {
	envContext,
	envTarget,
	kindViewContext,
	kindViewTarget,
	pageContext,
	pageTarget,
} from "./context";
import {
	envDocument,
	indexDocument,
	kindViewDocument,
	pageDocument,
} from "./documents";
import {
	COURSE,
	type ExportEdge,
	type ExportGraph,
	type ExportNode,
	type PromptContext,
	type PromptTarget,
	RELATION_NAMES,
} from "./model";
import { pagesOf } from "./query";
import {
	type ExportFormat,
	nodeFileSegments,
	nodeMarkdownUrl,
	parseNodeFile,
} from "./urls";

function exportGraph(): ExportGraph {
	return getCorpus().exportGraph;
}

export type ExportTarget = { id: string } & (
	| { node: ExportNode; type: ExportNode["type"] }
	| { type: "kind-view"; view: KindView }
);

export function resolveExportTarget(
	segments: readonly string[],
	format: ExportFormat
): ExportTarget | undefined {
	const id = parseNodeFile(segments, format);
	return id === undefined ? undefined : resolveNode(id);
}

function resolveNode(id: string): ExportTarget | undefined {
	const node = exportGraph().nodes.get(id);
	if (node !== undefined) {
		return { id, node, type: node.type };
	}

	const resolved = resolveDocsUrl(id);
	return resolved?.kind === "kind-view"
		? { id, type: "kind-view", view: resolved.view }
		: undefined;
}

export function renderMarkdown(target: ExportTarget): string {
	const graph = exportGraph();
	switch (target.type) {
		case "env":
			return envDocument(target.node, graph);
		case "page":
			return pageDocument(target.node, graph);
		case "kind-view":
			return kindViewDocument(target.view, graph);
		default:
			return target satisfies never;
	}
}

export function promptTargetFor(id: string): PromptTarget | undefined {
	const target = resolveNode(id);
	const graph = exportGraph();
	switch (target?.type) {
		case undefined:
			return;
		case "env":
			return envTarget(target.node, graph);
		case "page":
			return pageTarget(target.node);
		case "kind-view":
			return kindViewTarget(target.view, graph);
		default:
			return target satisfies never;
	}
}

export function renderPromptContext(target: ExportTarget): PromptContext {
	const graph = exportGraph();
	switch (target.type) {
		case "env":
			return envContext(target.node, graph);
		case "page":
			return pageContext(target.node, graph);
		case "kind-view":
			return kindViewContext(target.view, graph);
		default:
			return target satisfies never;
	}
}

export function exportStaticParams(format: ExportFormat): { slug: string[] }[] {
	const ids = [
		...exportGraph().nodes.keys(),
		...getCorpus().kindViews.map((view) => view.url),
	];
	return ids.map((id) => ({ slug: nodeFileSegments(id, format) }));
}

export function llmsIndexText(): string {
	return indexDocument(exportGraph());
}

export function llmsFullText(): string {
	const graph = exportGraph();
	return pagesOf(graph)
		.map((node) => pageDocument(node, graph))
		.join("\n\n");
}

interface ExportGraphJson {
	course: string;
	edges: readonly ExportEdge[];
	nodes: (Omit<ExportNode, "body" | "statement"> & { markdown: string })[];
	relations: typeof RELATION_NAMES;
}

export function exportGraphJson(): ExportGraphJson {
	const graph = exportGraph();
	return {
		course: COURSE,
		edges: graph.edges,
		nodes: [...graph.nodes.values()].map(
			({ body: _body, statement: _statement, ...node }) => ({
				...node,
				markdown: nodeMarkdownUrl(node.id),
			})
		),
		relations: RELATION_NAMES,
	};
}
