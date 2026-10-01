import { GRAPH_MODULES, STRAND_LABELS } from "@/lib/course/strands";
import type { KindView } from "@/lib/math-env/kind-view";
import { getKindLabel, type MathEnvKind } from "@/lib/math-env/kinds";
import {
	catalogRoute,
	docsContextRoute,
	exportGraphRoute,
	graphDataRoute,
	llmsFullRoute,
} from "@/lib/site/config";
import {
	type Frontmatter,
	frontmatter,
	joinBlocks,
	markdownLink,
	nodeLink,
	relationLines,
} from "./format";
import {
	bodyRole,
	COURSE,
	EXPORT_EDGE_KINDS,
	type ExportGraph,
	type ExportNode,
	RELATION_NAMES,
	RELATION_ORDER,
	type Relation,
} from "./model";
import {
	childrenOf,
	envsOfKind,
	type Prerequisite,
	pageOf,
	pagesOf,
	prerequisites,
	proofsOf,
	relationsOf,
	requireNode,
} from "./query";
import { nodeContextUrl, nodeMarkdownUrl } from "./urls";

const PREREQUISITE_LIMIT = 40;
const CARD_RELATION_LIMIT = 8;
const LISTED_RELATIONS = RELATION_ORDER.filter(
	(name) => name !== "contains" && name !== "part_of"
);

export function pageDocument(node: ExportNode, graph: ExportGraph): string {
	const body = (graph.segments.get(node.id) ?? []).map((segment) => {
		switch (segment.type) {
			case "prose":
				return segment.markdown;
			case "env":
				return envCard(requireNode(graph, segment.id), graph, 3);
			case "recall":
				return recallCard(requireNode(graph, segment.id), graph);
			default:
				return segment satisfies never;
		}
	});

	return document(graph, {
		body: [node.description ?? "", ...body],
		fields: {
			ideas: node.ideas,
			strand: node.strand,
			strand_label: node.strand && STRAND_LABELS[node.strand],
			tags: node.tags,
			title: node.title,
			type: "page",
		},
		heading: node.label,
		id: node.id,
		prerequisites: prerequisites(graph, node.id),
		relations: relationsOf(graph, node.id, LISTED_RELATIONS),
	});
}

export function kindViewDocument(view: KindView, graph: ExportGraph): string {
	const page = requireNode(graph, view.parentUrl);
	const kindLabel = getKindLabel(view.kind, true);
	const title = `${kindLabel}: ${page.title}`;

	return document(graph, {
		body: [
			`${kindLabel} from ${nodeLink(page)}, without the surrounding lecture prose.`,
			...envsOfKind(graph, page.id, view.kind).map((env) =>
				envCard(env, graph, 2)
			),
		],
		fields: {
			kind: view.kind,
			page: page.id,
			strand: page.strand,
			title,
			type: "kind-view",
		},
		heading: title,
		id: view.url,
		prerequisites: [],
		relations: [],
	});
}

export function envDocument(node: ExportNode, graph: ExportGraph): string {
	const page = pageOf(graph, node);

	return document(graph, {
		body: [
			page === undefined ? "" : `From ${nodeLink(page)}.`,
			envSections(node, 2),
			...proofsOf(graph, node.id).map((proof) =>
				joinBlocks(["## Proof", proof.body ?? ""])
			),
		],
		fields: {
			difficulty: node.difficulty,
			kind: node.kind,
			page: node.page,
			slug: node.slug,
			strand: node.strand,
			title: node.title,
			type: "env",
		},
		heading: node.label,
		id: node.id,
		prerequisites: prerequisites(graph, node.id),
		relations: relationsOf(graph, node.id, LISTED_RELATIONS),
	});
}

export function indexDocument(graph: ExportGraph): string {
	const pages = pagesOf(graph);
	const sections = [
		...GRAPH_MODULES.map((strand) => ({
			pages: pages.filter((page) => page.strand === strand),
			title: STRAND_LABELS[strand],
		})),
		{
			pages: pages.filter((page) => page.strand === undefined),
			title: "Optional",
		},
	];
	const lines = [
		`# ${COURSE}`,
		"",
		"> Lecture notes as a graph of pages and math environments (definitions, theorems, proofs, examples, …) linked by typed relations.",
		"",
		"## Conventions",
		"",
		"- Node IDs are site paths: a page is `/strand/page`, an environment is `/strand/page#anchor`. Every link in the exports points at a node ID.",
		`- Markdown for any node: \`${nodeMarkdownUrl("/algebra/x")}\` for a page, \`${nodeMarkdownUrl("/algebra/x#thm-y")}\` for one environment.`,
		`- Ranked prompt context (JSON blocks by tier) at the same paths under \`${docsContextRoute}\`, e.g. \`${nodeContextUrl("/algebra/x#thm-y")}\`.`,
		"- Each Markdown export starts with YAML frontmatter (`id`, `type`, `kind`, `strand`, `page`, …), then content, `## Prerequisites` (transitive dependencies from other pages) and `## Relations`.",
		`- Relations: ${EXPORT_EDGE_KINDS.map((kind) => {
			const [out, inverse] = RELATION_NAMES[kind];
			return out === inverse ? `\`${out}\`` : `\`${out}\`/\`${inverse}\``;
		}).join(", ")}.`,
		"",
		"## Data",
		"",
		`- [Knowledge graph](${exportGraphRoute}): every node and typed edge as JSON`,
		`- [Full notes](${llmsFullRoute}): every page document concatenated`,
		`- [Catalog](${catalogRoute}): page and kind-view index used by site search`,
		`- [Site graph](${graphDataRoute}): the rendered graph behind the site's graph view`,
	];

	for (const section of sections) {
		if (section.pages.length > 0) {
			lines.push("", `## ${section.title}`, "");
			lines.push(...section.pages.map((page) => pageIndexLine(page, graph)));
		}
	}

	return `${lines.join("\n")}\n`;
}

function pageIndexLine(page: ExportNode, graph: ExportGraph): string {
	const counts = new Map<MathEnvKind, number>();
	for (const { kind } of childrenOf(graph, page.id)) {
		if (kind !== "page") {
			counts.set(kind, (counts.get(kind) ?? 0) + 1);
		}
	}

	const summary = [
		page.description,
		[...counts]
			.map(
				([kind, count]) =>
					`${count} ${getKindLabel(kind, count !== 1).toLowerCase()}`
			)
			.join(", "),
	]
		.filter(Boolean)
		.join(" — ");
	const link = markdownLink(page.title, nodeMarkdownUrl(page.id));
	return summary === "" ? `- ${link}` : `- ${link}: ${summary}`;
}

function document(
	graph: ExportGraph,
	parts: {
		body: readonly string[];
		fields: Frontmatter;
		heading: string;
		id: string;
		prerequisites: readonly Prerequisite[];
		relations: readonly Relation[];
	}
): string {
	const needs = nearest(parts.prerequisites, PREREQUISITE_LIMIT);
	const needsLines = needs.kept.map(
		(other) => `- ${nodeLink(other)}${pageSuffix(other, graph)}`
	);
	if (needs.omitted > 0) {
		needsLines.push(`- +${needs.omitted} more distant prerequisites`);
	}

	const relations = relationLines(parts.relations);

	return `${joinBlocks([
		frontmatter({
			...parts.fields,
			course: COURSE,
			id: parts.id,
			markdown: nodeMarkdownUrl(parts.id),
		}),
		`# ${parts.heading}`,
		...parts.body,
		needsLines.length === 0
			? ""
			: `## Prerequisites\n\nTransitive \`uses\`/\`proves\` dependencies defined elsewhere, foundations first.\n\n${needsLines.join("\n")}`,
		relations.length === 0 ? "" : `## Relations\n\n${relations.join("\n")}`,
	])}\n`;
}

function nearest(
	items: readonly Prerequisite[],
	limit: number
): { kept: ExportNode[]; omitted: number } {
	const keep = new Set(
		items
			.toSorted((left, right) => left.distance - right.distance)
			.slice(0, limit)
			.map((item) => item.node.id)
	);
	return {
		kept: items.flatMap((item) => (keep.has(item.node.id) ? [item.node] : [])),
		omitted: items.length - keep.size,
	};
}

function envCard(node: ExportNode, graph: ExportGraph, level: 2 | 3): string {
	const meta = [
		`ID: \`${node.id}\``,
		node.difficulty === undefined ? "" : `Difficulty: ${node.difficulty}`,
	].filter(Boolean);
	const relations = relationLines(
		relationsOf(graph, node.id, LISTED_RELATIONS),
		CARD_RELATION_LIMIT
	);

	return joinBlocks([
		`${"#".repeat(level)} ${node.label}`,
		meta.join(" · "),
		envSections(node, level + 1),
		relations.join("\n"),
	]);
}

function envSections(node: ExportNode, level: number): string {
	const hashes = "#".repeat(level);
	const role = bodyRole(node);

	return joinBlocks([
		node.statement === undefined
			? ""
			: `${hashes} Statement\n\n${node.statement}`,
		node.body === undefined
			? ""
			: joinBlocks([role === undefined ? "" : `${hashes} ${role}`, node.body]),
	]);
}

function recallCard(original: ExportNode, graph: ExportGraph): string {
	return joinBlocks([
		`### Recall: ${original.label}`,
		`Recalls ${nodeLink(original)}${pageSuffix(original, graph)}.`,
		original.statement ?? "",
	]);
}

function pageSuffix(node: ExportNode, graph: ExportGraph): string {
	const page = pageOf(graph, node);
	return page === undefined ? "" : ` (in ${nodeLink(page)})`;
}
