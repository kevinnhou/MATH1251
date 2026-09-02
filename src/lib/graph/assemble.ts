import type { MarkdownFragment } from "@/lib/markdown/types";
import { graphMaterialisation } from "@/lib/math-env/kinds";
import type { RecallOccurrence } from "@/lib/math-env/page-envs";
import {
	getTenetHref,
	type Tenet,
	type TenetIndex,
} from "@/lib/math-env/tenet";
import { collectReferenceEdges, pushEdge } from "./edges";
import type {
	EnvNode,
	GraphDocument,
	GraphEdge,
	GraphModule,
	PageNode,
} from "./types";

export interface GraphPageInput {
	node: PageNode;
	recalls: RecallOccurrence[];
}

export interface KnowledgeGraph {
	edges: GraphEdge[];
	nodes: EnvNode[];
}

export interface GraphDocumentPage {
	envs: { recalls: RecallOccurrence[] };
	module: GraphModule | undefined;
	page: {
		data: {
			description?: MarkdownFragment<"inline">;
			extractedReferences?: ReadonlyArray<{ href: string }>;
			ideas: string[];
			tags: string[];
			title: MarkdownFragment<"inline">;
		};
		path: string;
		url: string;
	};
}

export function assembleGraphDocument(
	pages: readonly GraphDocumentPage[],
	tenets: TenetIndex,
	resolvePageHref: (href: string, dir: string) => string | undefined
): GraphDocument {
	const graphPages: GraphPageInput[] = [];
	const edges: GraphEdge[] = [];
	const seenEdges = new Set<string>();

	for (const { envs, module, page } of pages) {
		if (module === undefined) {
			continue;
		}

		const node: PageNode = {
			description: page.data.description,
			id: page.url,
			ideas: page.data.ideas,
			module,
			tags: page.data.tags,
			title: page.data.title,
			type: "page",
		};

		graphPages.push({
			node,
			recalls: envs.recalls,
		});

		for (const edge of collectReferenceEdges(
			{
				path: page.path,
				references: page.data.extractedReferences ?? [],
				url: page.url,
			},
			resolvePageHref
		)) {
			if (seenEdges.has(edge.id)) {
				continue;
			}

			seenEdges.add(edge.id);
			edges.push(edge);
		}
	}

	const knowledge = assembleKnowledgeGraph(graphPages, tenets);

	return {
		edges: [...edges, ...knowledge.edges],
		nodes: [...graphPages.map((page) => page.node), ...knowledge.nodes],
	};
}

export function assembleKnowledgeGraph(
	pages: readonly GraphPageInput[],
	index: TenetIndex
): KnowledgeGraph {
	const pageByUrl = new Map(pages.map((page) => [page.node.id, page.node]));
	const materialised = materialisedSlugs(index, pageByUrl);
	const nodes = envNodes(index, materialised, pageByUrl);
	const edges: GraphEdge[] = [];
	const seen = new Set<string>();

	for (const tenet of nodes) {
		pushEdge(edges, seen, {
			kind: "contains",
			source: tenet.pageId,
			target: tenet.id,
		});

		const record = index.bySlug.get(tenet.slug);
		if (record === undefined) {
			continue;
		}

		addTenetEdges(edges, seen, materialised, index, record, "of");
		addTenetEdges(edges, seen, materialised, index, record, "see");
	}

	for (const page of pages) {
		for (const recall of page.recalls) {
			if (!materialised.has(recall.of)) {
				continue;
			}

			const tenet = index.bySlug.get(recall.of);
			if (tenet === undefined || tenet.pageUrl === page.node.id) {
				continue;
			}

			pushEdge(edges, seen, {
				kind: "recall",
				source: page.node.id,
				target: getTenetHref(tenet),
			});
		}
	}

	return { edges, nodes };
}

function materialisedSlugs(
	index: TenetIndex,
	pageByUrl: Map<string, PageNode>
): Set<string> {
	const slugs = new Set<string>();

	for (const tenet of index.bySlug.values()) {
		if (!pageByUrl.has(tenet.pageUrl)) {
			continue;
		}

		const graph = graphMaterialisation(tenet.kind);
		if (graph === "never") {
			continue;
		}

		if (graph === "always" || hasPromotingCitation(tenet.slug, index)) {
			slugs.add(tenet.slug);
		}
	}

	return slugs;
}

function envNodes(
	index: TenetIndex,
	materialised: Set<string>,
	pageByUrl: Map<string, PageNode>
): EnvNode[] {
	const nodes: EnvNode[] = [];

	for (const slug of materialised) {
		const tenet = index.bySlug.get(slug);
		if (tenet === undefined) {
			continue;
		}

		const page = pageByUrl.get(tenet.pageUrl);
		if (page === undefined) {
			continue;
		}

		nodes.push(toEnvNode(tenet, page.module));
	}

	return nodes.toSorted((left, right) => left.id.localeCompare(right.id));
}

function toEnvNode(tenet: Tenet, module: GraphModule): EnvNode {
	return {
		id: getTenetHref(tenet),
		kind: tenet.kind,
		module,
		pageId: tenet.pageUrl,
		preview: tenet.statementView?.preview,
		slug: tenet.slug,
		title: tenet.title,
		type: "env",
	};
}

function addTenetEdges(
	edges: GraphEdge[],
	seen: Set<string>,
	materialised: Set<string>,
	index: TenetIndex,
	tenet: Tenet,
	kind: "of" | "see"
) {
	const source = getTenetHref(tenet);
	const targets = kind === "of" ? tenet.of : tenet.see;

	for (const slug of targets) {
		if (!materialised.has(slug) || slug === tenet.slug) {
			continue;
		}

		const target = index.bySlug.get(slug);
		if (target === undefined) {
			continue;
		}

		pushEdge(edges, seen, {
			kind,
			source,
			target: getTenetHref(target),
		});
	}
}

function hasPromotingCitation(slug: string, index: TenetIndex): boolean {
	return (index.citedBy.get(slug) ?? []).some((ref) => ref.kind !== "proof");
}
