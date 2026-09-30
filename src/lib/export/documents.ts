import { GRAPH_MODULES, STRAND_LABELS } from "@/lib/course/strands";
import type { KindView } from "@/lib/math-env/kind-view";
import { getKindLabel, type MathEnvKind } from "@/lib/math-env/kinds";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import { getTenetHref } from "@/lib/math-env/tenet";
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
	type ExportCorpus,
	type ExportGraph,
	type ExportNode,
	envId,
	RELATION_NAMES,
	type Relation,
} from "./model";
import {
	childrenOf,
	envsOfKind,
	type Prerequisite,
	pageOf,
	prerequisites,
	proofsOf,
	relationsOf,
	requireNode,
} from "./query";
import { nodeContextUrl, nodeMarkdownUrl } from "./urls";

interface PageSource {
	envs: PageEnvs;
	page: { url: string };
}

const PREREQUISITE_LIMIT = 40;
const CARD_RELATION_LIMIT = 8;

export function pageDocument(
	{ envs, page }: PageSource,
	corpus: ExportCorpus
): string {
	const { graph } = corpus;
	const node = requireNode(graph, page.url);
	const body = envs.segments.map((segment) => {
		if (segment.type === "prose") {
			return segment.markdown;
		}

		if (segment.type === "recall") {
			return recallCard(segment.id, envs, corpus);
		}

		const env = graph.nodes.get(envId(page.url, segment.id));
		return env === undefined ? "" : envCard(env, graph, 3);
	});

	return document(node, graph, {
		body: joinBlocks(body),
		fields: {
			ideas: node.ideas,
			strand: node.strand,
			strand_label: node.strand && STRAND_LABELS[node.strand],
			tags: node.tags,
			title: node.title,
			type: "page",
		},
		relations: relationsOf(graph, node.id, { exclude: ["contains"] }),
	});
}

export function kindViewDocument(view: KindView, graph: ExportGraph): string {
	const page = requireNode(graph, view.parentUrl);
	const kindLabel = getKindLabel(view.kind, true);
	const title = `${kindLabel}: ${page.title}`;

	return joinBlocks([
		frontmatter({
			course: COURSE,
			id: view.url,
			kind: view.kind,
			markdown: nodeMarkdownUrl(view.url),
			page: page.id,
			strand: page.strand,
			title,
			type: "kind-view",
		}),
		`# ${title}`,
		`${kindLabel} from ${nodeLink(page)}, without the surrounding lecture prose.`,
		...envsOfKind(graph, page.id, view.kind).map((env) =>
			envCard(env, graph, 2)
		),
	]);
}

export function envDocument(node: ExportNode, graph: ExportGraph): string {
	const page = pageOf(graph, node);

	return document(node, graph, {
		body: joinBlocks([
			page === undefined ? "" : `From ${nodeLink(page)}.`,
			envSections(node, 2),
			...proofsOf(graph, node.id).map((proof) =>
				joinBlocks(["## Proof", proof.body ?? ""])
			),
		]),
		fields: {
			difficulty: node.difficulty,
			kind: node.kind,
			page: node.page,
			slug: node.slug,
			strand: node.strand,
			title: node.title,
			type: "env",
		},
		relations: relationsOf(graph, node.id, { exclude: ["part_of"] }),
	});
}

export function indexDocument(graph: ExportGraph): string {
	const pages = [...graph.nodes.values()]
		.filter((node) => node.type === "page")
		.toSorted((left, right) => left.id.localeCompare(right.id));
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
	node: ExportNode,
	graph: ExportGraph,
	options: { body: string; fields: Frontmatter; relations: Relation[] }
): string {
	const needs = nearest(prerequisites(graph, node.id), PREREQUISITE_LIMIT);
	const needsLines = needs.kept.map(
		(other) => `- ${nodeLink(other)}${pageSuffix(other, graph)}`
	);
	if (needs.omitted > 0) {
		needsLines.push(`- +${needs.omitted} more distant prerequisites`);
	}

	const relations = relationLines(options.relations);

	return `${joinBlocks([
		frontmatter({
			...options.fields,
			course: COURSE,
			id: node.id,
			markdown: nodeMarkdownUrl(node.id),
		}),
		`# ${node.label}`,
		node.description ?? "",
		options.body,
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
		relationsOf(graph, node.id, { exclude: ["part_of"] }),
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

function recallCard(
	id: string,
	envs: PageEnvs,
	{ graph, tenets }: ExportCorpus
): string {
	const recall = envs.recalls.find((item) => item.id === id);
	const tenet = recall && tenets.bySlug.get(recall.of);
	const original = tenet && graph.nodes.get(getTenetHref(tenet));
	if (original === undefined) {
		return "";
	}

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
