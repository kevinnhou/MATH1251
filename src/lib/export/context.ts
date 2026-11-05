import { STRAND_LABELS } from "@/lib/course/strands";
import { getKindLabel, isDerivation } from "@/lib/mdx-env/kinds";
import type { PromptTarget } from "@/lib/mdx-env/target";
import { exportRenderer, type Renderer } from "./components";
import {
	bodyRole,
	type ContextBlock,
	type ContextTier,
	type ExportGraph,
	type ExportKindView,
	type ExportNode,
	type ExportThread,
	type PromptContext,
	RELATION,
	type RelationName,
} from "./model";
import {
	attachedDerivations,
	childrenOf,
	envsOfKind,
	pageOf,
	prerequisites,
	relationsOf,
	requireNode,
	threadsOf,
} from "./query";

const OUTGOING: readonly RelationName[] = [
	RELATION.derives,
	RELATION.uses,
	RELATION.practises,
	RELATION.recalls,
	RELATION.references,
	RELATION.see_also,
];
const INCOMING: readonly RelationName[] = [
	RELATION.used_by,
	RELATION.practised_by,
	RELATION.recalled_by,
	RELATION.referenced_by,
];
const PREREQUISITE_STATEMENT_LIMIT = 600;

export function envTarget(node: ExportNode, graph: ExportGraph): PromptTarget {
	const derivation = isDerivation(node.kind)
		? node.kind
		: attachedDerivations(graph, node)[0]?.kind;
	return {
		...(derivation === undefined ? {} : { derivation }),
		id: node.id,
		kind: node.kind,
		label: node.label,
		type: "env",
	};
}

export function pageTarget(node: ExportNode): PromptTarget {
	return {
		id: node.id,
		kind: "page",
		label: node.label,
		type: "page",
	};
}

export function kindViewTarget(view: ExportKindView): PromptTarget {
	return {
		...(isDerivation(view.kind) ? { derivation: view.kind } : {}),
		id: view.id,
		kind: view.kind,
		label: view.label,
		type: "kind-view",
	};
}

export function threadTarget(thread: ExportThread): PromptTarget {
	return {
		id: thread.id,
		kind: "thread",
		label: thread.label,
		type: "thread",
	};
}

export function envContext(
	node: ExportNode,
	graph: ExportGraph
): PromptContext {
	return promptContext(envTarget(node, graph), graph, (render) => {
		const notesLast = bodyRole(node) === "Notes";
		const statement = render.statement(node);
		const core = [
			heading(node, pageOf(graph, node)),
			statement === undefined ? "" : `Statement:\n${statement}`,
			notesLast ? "" : bodyBlock(node, render),
			...attachedDerivations(graph, node).map(
				(derivation) =>
					`${getKindLabel(derivation.kind)}:\n${render.body(derivation) ?? ""}`
			),
			notesLast ? bodyBlock(node, render) : "",
		];

		return [
			...tier("core", core),
			...tier("relations", [
				...relationSummary(graph, node.id, OUTGOING),
				...threadSummary(graph, node.id),
			]),
			...prerequisiteBlocks(graph, node.id, render),
			...tier("backlinks", relationSummary(graph, node.id, INCOMING)),
		];
	});
}

export function pageContext(
	node: ExportNode,
	graph: ExportGraph
): PromptContext {
	const envs = childrenOf(graph, node.id);
	return promptContext(pageTarget(node), graph, (render) => [
		...tier("core", [
			heading(node),
			node.ideas === undefined ? "" : `Key ideas: ${node.ideas.join(", ")}.`,
			outline(envs),
		]),
		...tier("relations", relationSummary(graph, node.id, OUTGOING)),
		...tier(
			"details",
			envs.map((env) => statementBlock(env, render))
		),
		...prerequisiteBlocks(graph, node.id, render),
		...tier("backlinks", relationSummary(graph, node.id, INCOMING)),
	]);
}

export function kindViewContext(
	view: ExportKindView,
	graph: ExportGraph
): PromptContext {
	const envs = envsOfKind(graph, view.parentId, view.kind);
	return promptContext(kindViewTarget(view), graph, (render) => [
		...tier("core", [
			`${view.label} (${view.parentId}), without the surrounding lecture prose.`,
			outline(envs),
		]),
		...tier(
			"details",
			envs.map((env) =>
				[statementBlock(env, render), bodyBlock(env, render)]
					.filter(Boolean)
					.join("\n")
			)
		),
		...prerequisiteBlocks(graph, view.parentId, render),
	]);
}

export function threadContext(
	thread: ExportThread,
	graph: ExportGraph
): PromptContext {
	const members = thread.members.map((member) => ({
		node: requireNode(graph, member.id),
		role: member.role,
	}));
	const places = members.map(({ node, role }, number) => {
		const page = pageOf(graph, node);
		const where = page === undefined ? "" : ` on "${page.label}"`;
		return `${number + 1}. ${node.label}${inParentheses(role)}${where}`;
	});

	return promptContext(threadTarget(thread), graph, (render) => [
		...tier("core", [
			`Thread "${thread.label}" (${thread.id}): one idea that recurs across the course.\nSummary: ${thread.summary}`,
			`Places, in reading order:\n${places.join("\n")}`,
		]),
		...tier(
			"details",
			members.map(({ node, role }) => {
				const statement = render.statement(node);
				return statement === undefined
					? ""
					: `${node.label}${inParentheses(role)}:\n${statement}`;
			})
		),
	]);
}

function promptContext(
	target: PromptTarget,
	graph: ExportGraph,
	build: (render: Renderer) => ContextBlock[]
): PromptContext {
	const render = exportRenderer(graph, "context");
	const blocks = build(render);
	return { blocks: [...blocks, ...render.extraBlocks()], ...target };
}

function heading(node: ExportNode, page?: ExportNode): string {
	const strand =
		node.strand === undefined ? "" : `${STRAND_LABELS[node.strand]} · `;
	const where = page === undefined ? "" : ` on "${page.label}"`;
	const lines = [`${node.label}${where} (${strand}${node.id})`];
	if (node.difficulty !== undefined) {
		lines.push(`Difficulty: ${node.difficulty}.`);
	}
	if (node.description !== undefined) {
		lines.push(node.description);
	}

	return lines.join("\n");
}

function outline(envs: readonly ExportNode[]): string {
	if (envs.length === 0) {
		return "";
	}

	return `Contents:\n${envs.map((env) => `- ${env.label}`).join("\n")}`;
}

function statementBlock(env: ExportNode, render: Renderer): string {
	const statement = render.statement(env);
	return statement === undefined ? "" : `${env.label}:\n${statement}`;
}

function bodyBlock(node: ExportNode, render: Renderer): string {
	const body = render.body(node);
	return body === undefined ? "" : `${bodyRole(node) ?? "Content"}:\n${body}`;
}

function relationSummary(
	graph: ExportGraph,
	id: string,
	names: readonly RelationName[]
): string[] {
	const groups = Map.groupBy(
		relationsOf(graph, id, names),
		(relation) => relation.label
	);

	return [...groups].map(
		([label, items]) =>
			`${label}: ${items.map((item) => item.node.label).join("; ")}.`
	);
}

function threadSummary(graph: ExportGraph, id: string): string[] {
	return threadsOf(graph, id).map(({ role, thread }) => {
		const as = role === undefined ? "" : ` as ${role}`;
		return `In the thread "${thread.label}"${as}: ${thread.summary}`;
	});
}

function inParentheses(role: string | undefined): string {
	return role === undefined ? "" : ` (${role})`;
}

function prerequisiteBlocks(
	graph: ExportGraph,
	id: string,
	render: Renderer
): ContextBlock[] {
	const needs = prerequisites(graph, id).toSorted(
		(left, right) => left.distance - right.distance
	);

	return tier(
		"prerequisites",
		needs.map(({ node }) => {
			const statement = render.statement(node);
			return statement !== undefined &&
				statement.length <= PREREQUISITE_STATEMENT_LIMIT
				? `- ${node.label}: ${statement}`
				: `- ${node.label}`;
		})
	);
}

function tier(name: ContextTier, texts: readonly string[]): ContextBlock[] {
	return texts
		.map((text) => text.trim())
		.filter(Boolean)
		.map((text) => ({ text, tier: name }));
}
