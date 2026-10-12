import type { Strand } from "@/lib/course/strands";
import type { KindViewRef } from "@/lib/math-env/kind-view";
import { envRelation, getKindLabel } from "@/lib/math-env/kinds";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import { getTenetHref, type TenetIndex } from "@/lib/math-env/tenet";
import type { ThreadIndex } from "@/lib/math-env/thread";
import {
	type ExportEdge,
	type ExportGraph,
	type ExportKindView,
	type ExportNode,
	type ExportSegment,
	type ExportThread,
	type ExportThreadMembership,
	envId,
} from "./model";

export interface ExportPageInput {
	envs: PageEnvs;
	module: Strand | undefined;
	page: {
		data: {
			description?: string;
			extractedReferences?: ReadonlyArray<{ href: string }>;
			ideas: string[];
			tags: string[];
			title: string;
		};
		path: string;
		url: string;
	};
}

export type PageHrefResolver = (
	href: string,
	fromPath: string
) => string | undefined;

export function buildExportGraph(
	pages: readonly ExportPageInput[],
	tenets: TenetIndex,
	resolvePageHref: PageHrefResolver,
	kindViews: readonly KindViewRef[],
	threadIndex: ThreadIndex
): ExportGraph {
	const nodes = new Map(
		pages.flatMap(pageNodes).map((node) => [node.id, node])
	);
	const edges = uniqueEdges([
		...pages.flatMap((page) => pageEdges(page, tenets)),
		...pages.flatMap((page) => referenceEdges(page, resolvePageHref)),
	]).filter((edge) => nodes.has(edge.source) && nodes.has(edge.target));
	labelProofs(nodes, edges);
	const threads = exportThreads(threadIndex, nodes);

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
		threads: new Map(threads.map((thread) => [thread.id, thread])),
		threadsOf: threadsByMember(threads),
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

function exportThreads(
	index: ThreadIndex,
	nodes: ReadonlyMap<string, ExportNode>
): ExportThread[] {
	return [...index.bySlug.values()]
		.filter((thread) => nodes.has(thread.pageUrl))
		.map((thread) => ({
			id: thread.href,
			label: thread.title.plain,
			members: thread.members
				.filter((member) => nodes.has(member.href))
				.map((member) => ({
					id: member.href,
					...(member.role ? { role: member.role.source } : {}),
				})),
			pageId: thread.pageUrl,
			slug: thread.slug,
			summary: thread.summary.source,
			title: thread.title.source,
		}));
}

function threadsByMember(
	threads: readonly ExportThread[]
): Map<string, ExportThreadMembership[]> {
	const byMember = new Map<string, ExportThreadMembership[]>();
	for (const thread of threads) {
		for (const { id, role } of thread.members) {
			byMember.set(id, [...(byMember.get(id) ?? []), { role, thread }]);
		}
	}

	return byMember;
}

function pageEdges(
	{ envs, page }: ExportPageInput,
	tenets: TenetIndex
): ExportEdge[] {
	const edges: ExportEdge[] = [];

	for (const entry of envs.entries) {
		const id = envId(page.url, entry.id);
		const relation = envRelation(entry.kind);
		edges.push(
			{ kind: "contains", source: page.url, target: id },
			...tenetHrefs(entry.of, tenets).map(
				(target): ExportEdge => ({ kind: relation, source: id, target })
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

function referenceEdges(
	{ module, page }: ExportPageInput,
	resolvePageHref: PageHrefResolver
): ExportEdge[] {
	if (module === undefined) {
		return [];
	}

	return (page.data.extractedReferences ?? []).flatMap(
		({ href }): ExportEdge[] => {
			if (href === "" || href.startsWith("#")) {
				return [];
			}

			const target = resolvePageHref(href, page.path);
			return target === undefined
				? []
				: [{ kind: "references", source: page.url, target }];
		}
	);
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
