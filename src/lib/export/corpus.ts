import "server-only";

import type { KindView } from "@/lib/math-env/kind-view";
import { getCorpus, resolveDocsUrl } from "@/lib/site/corpus";
import type { SourcePage } from "@/lib/site/source";
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
	type ExportCorpus,
	type ExportEdge,
	type ExportNode,
	type PromptContext,
	type PromptTarget,
	RELATION_NAMES,
} from "./model";
import { requireNode } from "./query";
import {
	type ExportFormat,
	nodeFileSegments,
	nodeMarkdownUrl,
	parseNodeFile,
} from "./urls";

function getExportCorpus(): ExportCorpus {
	const { exportGraph, tenets } = getCorpus();
	return { graph: exportGraph, tenets };
}

export type ExportTarget = { id: string } & (
	| { source: SourcePage; type: "page" }
	| { type: "kind-view"; view: KindView }
	| { node: ExportNode; type: "env" }
);

export function resolveExportTarget(
	segments: readonly string[],
	format: ExportFormat
): ExportTarget | undefined {
	const id = parseNodeFile(segments, format);
	return id === undefined ? undefined : resolveNode(id);
}

function resolveNode(id: string): ExportTarget | undefined {
	const node = getExportCorpus().graph.nodes.get(id);
	if (node?.type === "env") {
		return { id, node, type: "env" };
	}

	const resolved = resolveDocsUrl(id);
	if (resolved === undefined) {
		return;
	}

	return resolved.kind === "kind-view"
		? { id, type: "kind-view", view: resolved.view }
		: { id, source: resolved.source, type: "page" };
}

export function renderMarkdown(target: ExportTarget): string {
	const corpus = getExportCorpus();
	switch (target.type) {
		case "env":
			return envDocument(target.node, corpus.graph);
		case "kind-view":
			return kindViewDocument(target.view, corpus.graph);
		default:
			return pageDocument(target.source, corpus);
	}
}

export function promptTargetFor(id: string): PromptTarget | undefined {
	const target = resolveNode(id);
	if (target === undefined) {
		return;
	}

	const { graph } = getExportCorpus();
	switch (target.type) {
		case "env":
			return envTarget(target.node, graph);
		case "kind-view":
			return kindViewTarget(target.view, graph);
		default:
			return pageTarget(requireNode(graph, target.id));
	}
}

export function renderPromptContext(target: ExportTarget): PromptContext {
	const { graph } = getExportCorpus();
	switch (target.type) {
		case "env":
			return envContext(target.node, graph);
		case "kind-view":
			return kindViewContext(target.view, graph);
		default:
			return pageContext(requireNode(graph, target.id), graph);
	}
}

export function exportStaticParams(format: ExportFormat): { slug: string[] }[] {
	const ids = [
		...getExportCorpus().graph.nodes.keys(),
		...getCorpus().kindViews.map((view) => view.url),
	];
	return ids.map((id) => ({ slug: nodeFileSegments(id, format) }));
}

export function llmsIndexText(): string {
	return indexDocument(getExportCorpus().graph);
}

export function llmsFullText(): string {
	const corpus = getExportCorpus();
	return getCorpus()
		.pages.toSorted((left, right) =>
			left.page.url.localeCompare(right.page.url)
		)
		.map((source) => pageDocument(source, corpus))
		.join("\n\n");
}

interface ExportGraphJson {
	course: string;
	edges: readonly ExportEdge[];
	nodes: (Omit<ExportNode, "body" | "statement"> & { markdown: string })[];
	relations: typeof RELATION_NAMES;
}

export function exportGraphJson(): ExportGraphJson {
	const { graph } = getExportCorpus();
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
