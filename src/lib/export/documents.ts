import { course, homeRoute } from "@/lib/course/config";
import { STRAND_LABELS, STRANDS } from "@/lib/course/strands";
import { catalogRoute } from "@/lib/course/urls";
import { ENV, type EnvKind, getKindLabel } from "@/lib/mdx-env/kinds";
import { exportRenderer, type Renderer } from "./components";
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
	DEPENDENCY_EDGES,
	EXPORT_EDGE_KINDS,
	type ExportGraph,
	type ExportKindView,
	type ExportNode,
	type ExportThread,
	RELATION,
	RELATION_NAMES,
	RELATION_ORDER,
	type Relation,
} from "./model";
import {
	attachedDerivations,
	childrenOf,
	envsOfKind,
	type Prerequisite,
	pageOf,
	pagesOf,
	prerequisites,
	relationsOf,
	requireNode,
	threadsOf,
} from "./query";
import {
	docsContextRoute,
	exportGraphRoute,
	llmsFullRoute,
	nodeContextUrl,
	nodeMarkdownUrl,
} from "./urls";

const PREREQUISITE_LIMIT = 40;
const CARD_RELATION_LIMIT = 8;
const LISTED_RELATIONS = RELATION_ORDER.filter(
	(name) => name !== RELATION.contains && name !== RELATION.part_of
);

export function pageDocument(
	node: ExportNode,
	graph: ExportGraph,
	surface: "llms-full" | "page" = "page"
): string {
	const render = exportRenderer(graph, surface);
	const body = (graph.segments.get(node.id) ?? []).map((segment) => {
		switch (segment.type) {
			case "prose":
				return render.prose(node.id, segment.markdown);
			case "env":
				return envCard(requireNode(graph, segment.id), graph, 3, render);
			case "recall":
				return recallCard(requireNode(graph, segment.id), graph, render);
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

export function kindViewDocument(
	view: ExportKindView,
	graph: ExportGraph
): string {
	const page = requireNode(graph, view.parentId);
	const render = exportRenderer(graph, "kind-view");
	const kindLabel = getKindLabel(view.kind, true);
	const title = `${kindLabel}: ${page.title}`;

	return document(graph, {
		body: [
			`${kindLabel} from ${nodeLink(page)}, without the surrounding lecture prose.`,
			...envsOfKind(graph, page.id, view.kind).map((env) =>
				envCard(env, graph, 2, render)
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
		id: view.id,
		prerequisites: [],
		relations: [],
	});
}

export function envDocument(node: ExportNode, graph: ExportGraph): string {
	const page = pageOf(graph, node);
	const render = exportRenderer(graph, "env");

	return document(graph, {
		body: [
			page === undefined ? "" : `From ${nodeLink(page)}.`,
			envSections(node, 2, render),
			...attachedDerivations(graph, node).map((derivation) =>
				joinBlocks([
					`## ${getKindLabel(derivation.kind)}`,
					render.body(derivation) ?? "",
				])
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
		threads: threadLines(graph, node.id),
	});
}

export function threadDocument(
	thread: ExportThread,
	graph: ExportGraph
): string {
	const page = requireNode(graph, thread.pageId);
	const render = exportRenderer(graph, "thread");
	const places = thread.members.map((member) => {
		const node = requireNode(graph, member.id);
		return joinBlocks([
			`## ${node.label}`,
			[
				member.role === undefined ? "" : `Role: ${member.role}.`,
				`From ${nodeLink(pageOf(graph, node) ?? node)}.`,
			]
				.filter(Boolean)
				.join(" "),
			render.statement(node) ?? "",
		]);
	});

	return document(graph, {
		body: [
			thread.summary,
			`Defined in ${nodeLink(page)}. The same idea in ${thread.members.length} places, in reading order; each \`##\` section is one place, with its role in the thread and its statement.`,
			...places,
		],
		fields: {
			page: page.id,
			slug: thread.slug,
			title: thread.title,
			type: "thread",
		},
		heading: `Thread: ${thread.label}`,
		id: thread.id,
		prerequisites: [],
		relations: [],
	});
}

export function indexDocument(graph: ExportGraph): string {
	const exampleStrand =
		STRANDS.find((strand) => strand !== course.home) ?? course.home;
	const examplePage = `/${exampleStrand}/x`;
	const exampleEnv = `${examplePage}#${exampleAnchor()}`;
	const pages = pagesOf(graph);
	const sections = [
		...STRANDS.map((strand) => ({
			pages: pages.filter((page) => page.strand === strand),
			title: STRAND_LABELS[strand],
		})),
		{
			pages: pages.filter((page) => page.strand === undefined),
			title: "Optional",
		},
	];
	const lines = [
		`# ${course.title}`,
		"",
		`> ${courseSummary()}`,
		"",
		"## Conventions",
		"",
		"- Node IDs are site paths: a page is `/strand/page`, an environment is `/strand/page#anchor`. Every link in the exports points at a node ID.",
		`- Markdown for any node: \`${nodeMarkdownUrl(examplePage)}\` for a page, \`${nodeMarkdownUrl(exampleEnv)}\` for one environment.`,
		`- Ranked prompt context (JSON blocks by tier) at the same paths under \`${docsContextRoute}\`, e.g. \`${nodeContextUrl(exampleEnv)}\`.`,
		`- A thread (\`${homeRoute}#thread-<slug>\`) is one idea that recurs across the course; its Markdown lists every place it appears, with a role and statement for each.`,
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
	];

	if (graph.threads.size > 0) {
		lines.push("", "## Threads", "");
		lines.push(
			...[...graph.threads.values()].map(
				(thread) =>
					`- ${markdownLink(thread.label, nodeMarkdownUrl(thread.id))}: ${thread.summary} (${thread.members.length} places)`
			)
		);
	}

	for (const section of sections) {
		if (section.pages.length > 0) {
			lines.push("", `## ${section.title}`, "");
			lines.push(...section.pages.map((page) => pageIndexLine(page, graph)));
		}
	}

	return `${lines.join("\n")}\n`;
}

const DEPENDENCY_LIST = DEPENDENCY_EDGES.map(
	(kind) => `\`${RELATION_NAMES[kind][0]}\``
).join("/");

function exampleAnchor(): string {
	const env = ENV.envs.find(({ role }) => role === "uses") ?? ENV.envs[0];
	return `${env?.kind ?? "env"}-1`;
}

function courseSummary(): string {
	if (course.summary !== undefined) {
		return course.summary;
	}

	const plurals = ENV.envs.map((env) => env.plural.toLowerCase());
	const sample = plurals.slice(0, 4).join(", ");
	const more = plurals.length > 4 ? ", …" : "";
	return `Notes as a graph of pages and environments (${sample}${more}) linked by typed relations.`;
}

function pageIndexLine(page: ExportNode, graph: ExportGraph): string {
	const counts = new Map<EnvKind, number>();
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
		threads?: readonly string[];
	}
): string {
	const needs = nearest(parts.prerequisites, PREREQUISITE_LIMIT);
	const needsLines = needs.kept.map(
		(other) => `- ${nodeLink(other)}${pageSuffix(other, graph)}`
	);
	if (needs.omitted > 0) {
		needsLines.push(`- +${needs.omitted} more distant prerequisites`);
	}

	const relations = [
		...relationLines(parts.relations),
		...(parts.threads ?? []),
	];

	return `${joinBlocks([
		frontmatter({
			...parts.fields,
			course: course.title,
			id: parts.id,
			markdown: nodeMarkdownUrl(parts.id),
		}),
		`# ${parts.heading}`,
		...parts.body,
		needsLines.length === 0
			? ""
			: `## Prerequisites\n\nTransitive ${DEPENDENCY_LIST} dependencies defined elsewhere, foundations first.\n\n${needsLines.join("\n")}`,
		relations.length === 0 ? "" : `## Relations\n\n${relations.join("\n")}`,
	])}\n`;
}

function threadLines(graph: ExportGraph, id: string): string[] {
	return threadsOf(graph, id).map(({ role, thread }) => {
		const link = markdownLink(thread.label, thread.id);
		return `- Thread: ${link}${role === undefined ? "" : ` (${role})`}`;
	});
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

function envCard(
	node: ExportNode,
	graph: ExportGraph,
	level: 2 | 3,
	render: Renderer
): string {
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
		envSections(node, level + 1, render),
		relations.join("\n"),
	]);
}

function envSections(
	node: ExportNode,
	level: number,
	render: Renderer
): string {
	const hashes = "#".repeat(level);
	const role = bodyRole(node);
	const statement = render.statement(node);
	const body = render.body(node);

	return joinBlocks([
		statement === undefined ? "" : `${hashes} Statement\n\n${statement}`,
		body === undefined
			? ""
			: joinBlocks([role === undefined ? "" : `${hashes} ${role}`, body]),
	]);
}

function recallCard(
	original: ExportNode,
	graph: ExportGraph,
	render: Renderer
): string {
	return joinBlocks([
		`### Recall: ${original.label}`,
		`Recalls ${nodeLink(original)}${pageSuffix(original, graph)}.`,
		render.statement(original) ?? "",
	]);
}

function pageSuffix(node: ExportNode, graph: ExportGraph): string {
	const page = pageOf(graph, node);
	return page === undefined ? "" : ` (in ${nodeLink(page)})`;
}
