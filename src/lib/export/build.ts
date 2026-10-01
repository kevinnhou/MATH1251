import type { GraphModule } from "@/lib/course/strands";
import type { GraphDocument } from "@/lib/graph/types";
import type { KindViewRef } from "@/lib/math-env/kind-view";
import { getKindLabel } from "@/lib/math-env/kinds";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import { getTenetHref, type TenetIndex } from "@/lib/math-env/tenet";
import {
	type ExportEdge,
	type ExportGraph,
	type ExportKindView,
	type ExportNode,
	type ExportSegment,
	envId,
} from "./model";

export interface ExportPageInput {
	envs: PageEnvs;
	module: GraphModule | undefined;
	page: {
		data: {
			description?: string;
			ideas: string[];
			tags: string[];
			title: string;
		};
		url: string;
	};
}

export function buildExportGraph(
	pages: readonly ExportPageInput[],
	tenets: TenetIndex,
	graph: Pick<GraphDocument, "edges">,
	kindViews: readonly KindViewRef[]
): ExportGraph {
	const nodes = new Map(
		pages.flatMap(pageNodes).map((node) => [node.id, node])
	);
	const edges = uniqueEdges([
		...pages.flatMap((page) => pageEdges(page, tenets)),
		...graph.edges.flatMap((edge): ExportEdge[] =>
			edge.kind === "reference"
				? [{ kind: "references", source: edge.source, target: edge.target }]
				: []
		),
	]).filter((edge) => nodes.has(edge.source) && nodes.has(edge.target));
	labelProofs(nodes, edges);

	return {
		edges,
		incoming: Map.groupBy(edges, (edge) => edge.target),
		kindViews: new Map(
			exportKindViews(kindViews, nodes).map((view) => [view.id, view])
		),
		nodes,
		outgoing: Map.groupBy(edges, (edge) => edge.source),
		position: new Map([...nodes.keys()].map((id, index) => [id, index])),
		segments: new Map(
			pages.map((page) => [
				page.page.url,
				pageSegments(page, tenets).filter(
					(segment) => segment.type === "prose" || nodes.has(segment.id)
				),
			])
		),
	};
}

function pageNodes({ envs, module, page }: ExportPageInput): ExportNode[] {
	const { description, ideas, tags, title } = page.data;
	const strand = module === undefined ? {} : { strand: module };
	const pageNode: ExportNode = {
		id: page.url,
		kind: "page",
		label: title,
		title,
		type: "page",
		...strand,
		...(description ? { description } : {}),
		...(ideas.length > 0 ? { ideas } : {}),
		...(tags.length > 0 ? { tags } : {}),
	};

	return [
		pageNode,
		...envs.entries.map(
			(entry): ExportNode => ({
				id: envId(page.url, entry.id),
				kind: entry.kind,
				label: envLabel(getKindLabel(entry.kind), entry.title),
				page: page.url,
				title: entry.title ?? "",
				type: "env",
				...strand,
				...(entry.slug ? { slug: entry.slug } : {}),
				...(entry.difficulty ? { difficulty: entry.difficulty } : {}),
				...(entry.statement ? { statement: entry.statement } : {}),
				...(entry.body ? { body: entry.body } : {}),
			})
		),
	];
}

function exportKindViews(
	views: readonly KindViewRef[],
	nodes: ReadonlyMap<string, ExportNode>
): ExportKindView[] {
	return views.flatMap((view) => {
		const parent = nodes.get(view.parentUrl);
		return parent?.type === "page"
			? [
					{
						id: view.url,
						kind: view.kind,
						label: `${getKindLabel(view.kind, true)} from ${parent.label}`,
						parentId: parent.id,
					},
				]
			: [];
	});
}

function pageEdges(
	{ envs, page }: ExportPageInput,
	tenets: TenetIndex
): ExportEdge[] {
	const edges: ExportEdge[] = [];

	for (const entry of envs.entries) {
		const id = envId(page.url, entry.id);
		const uses = entry.kind === "proof" ? "proves" : "uses";
		edges.push(
			{ kind: "contains", source: page.url, target: id },
			...tenetHrefs(entry.of, tenets).map(
				(target): ExportEdge => ({ kind: uses, source: id, target })
			),
			...tenetHrefs(entry.see, tenets).map(
				(target): ExportEdge => ({ kind: "see", source: id, target })
			)
		);
	}

	const recalled = tenetHrefs(
		envs.recalls.map((recall) => recall.of),
		tenets
	);
	for (const target of recalled) {
		if (!target.startsWith(`${page.url}#`)) {
			edges.push({ kind: "recalls", source: page.url, target });
		}
	}

	return edges;
}

function pageSegments(
	{ envs, page }: ExportPageInput,
	tenets: TenetIndex
): ExportSegment[] {
	return envs.segments.flatMap((segment): ExportSegment[] => {
		switch (segment.type) {
			case "prose":
				return [segment];
			case "env":
				return [{ id: envId(page.url, segment.id), type: "env" }];
			case "recall": {
				const recall = envs.recalls.find((item) => item.id === segment.id);
				const id = recall && tenetHref(recall.of, tenets);
				return id === undefined ? [] : [{ id, type: "recall" }];
			}
			default:
				return segment satisfies never;
		}
	});
}

function envLabel(kind: string, title: string | undefined): string {
	return title ? `${kind}. ${title}` : kind;
}

const LABEL_LIST = new Intl.ListFormat("en", { type: "conjunction" });

function labelProofs(nodes: Map<string, ExportNode>, edges: ExportEdge[]) {
	const proves = Map.groupBy(
		edges.filter((edge) => edge.kind === "proves"),
		(edge) => edge.source
	);
	for (const [id, proved] of proves) {
		const proof = nodes.get(id);
		const labels = proved.flatMap(
			(edge) => nodes.get(edge.target)?.label ?? []
		);
		if (proof?.title === "" && labels.length > 0) {
			nodes.set(id, {
				...proof,
				label: `Proof of ${LABEL_LIST.format(labels)}`,
			});
		}
	}
}

function uniqueEdges(edges: readonly ExportEdge[]): ExportEdge[] {
	const seen = new Set<string>();
	return edges.filter((edge) => {
		const key = `${edge.kind}\0${edge.source}\0${edge.target}`;
		if (edge.source === edge.target || seen.has(key)) {
			return false;
		}

		seen.add(key);
		return true;
	});
}

function tenetHrefs(slugs: readonly string[], tenets: TenetIndex): string[] {
	return slugs.flatMap((slug) => tenetHref(slug, tenets) ?? []);
}

function tenetHref(slug: string, tenets: TenetIndex): string | undefined {
	const tenet = tenets.bySlug.get(slug);
	return tenet && getTenetHref(tenet);
}
