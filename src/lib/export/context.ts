import { STRAND_LABELS } from "@/lib/course/strands";
import { getKindLabel, isDerivation } from "@/lib/mdx-env/kinds";
import type { PromptTarget } from "@/lib/mdx-env/target";
import {
	bodyRole,
	type ContextBlock,
	type ContextTier,
	type ExportGraph,
	type ExportKindView,
	type ExportNode,
	type ExportThread,
	type PromptContext,
	RELATION_LABELS,
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
	"proves",
	"uses",
	"practises",
	"recalls",
	"references",
	"see_also",
];
const INCOMING: readonly RelationName[] = [
	"used_by",
	"practised_by",
	"recalled_by",
	"referenced_by",
];
const PREREQUISITE_STATEMENT_LIMIT = 600;

export function envTarget(node: ExportNode, graph: ExportGraph): PromptTarget {
	return {
		hasDerivation:
			isDerivation(node.kind) || attachedDerivations(graph, node).length > 0,
		id: node.id,
		kind: node.kind,
		label: node.label,
		type: "env",
	};
}

export function pageTarget(node: ExportNode): PromptTarget {
	return {
		hasDerivation: false,
		id: node.id,
		kind: "page",
		label: node.label,
		type: "page",
	};
}

export function kindViewTarget(view: ExportKindView): PromptTarget {
	return {
		hasDerivation: isDerivation(view.kind),
		id: view.id,
		kind: view.kind,
		label: view.label,
		type: "kind-view",
	};
}

export function threadTarget(thread: ExportThread): PromptTarget {
	return {
		hasDerivation: false,
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
	const derivations = attachedDerivations(graph, node);
	const notesLast = bodyRole(node) === "Notes";
	const core = [
		heading(node, pageOf(graph, node)),
		node.statement === undefined ? "" : `Statement:\n${node.statement}`,
		notesLast ? "" : bodyBlock(node),
		...derivations.map(
			(derivation) =>
				`${getKindLabel(derivation.kind)}:\n${derivation.body ?? ""}`
		),
		notesLast ? bodyBlock(node) : "",
	];

	return promptContext(envTarget(node, graph), [
		...tier("core", core),
		...tier("relations", [
			...relationSummary(graph, node.id, OUTGOING),
			...threadSummary(graph, node.id),
		]),
		...prerequisiteBlocks(graph, node.id),
		...tier("backlinks", relationSummary(graph, node.id, INCOMING)),
	]);
}

export function pageContext(
	node: ExportNode,
	graph: ExportGraph
): PromptContext {
	const envs = childrenOf(graph, node.id);
	return promptContext(pageTarget(node), [
		...tier("core", [
			heading(node),
			node.ideas === undefined ? "" : `Key ideas: ${node.ideas.join(", ")}.`,
			outline(envs),
		]),
		...tier("relations", relationSummary(graph, node.id, OUTGOING)),
		...tier("details", envs.map(statementBlock)),
		...prerequisiteBlocks(graph, node.id),
		...tier("backlinks", relationSummary(graph, node.id, INCOMING)),
	]);
}

export function kindViewContext(
	view: ExportKindView,
	graph: ExportGraph
): PromptContext {
	const envs = envsOfKind(graph, view.parentId, view.kind);

	return promptContext(kindViewTarget(view), [
		...tier("core", [
			`${view.label} (${view.parentId}), without the surrounding lecture prose.`,
			outline(envs),
		]),
		...tier(
			"details",
			envs.map((env) =>
				[statementBlock(env), bodyBlock(env)].filter(Boolean).join("\n")
			)
		),
		...prerequisiteBlocks(graph, view.parentId),
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

	return promptContext(threadTarget(thread), [
		...tier("core", [
			`Thread "${thread.label}" (${thread.id}): one idea that recurs across the course.\nSummary: ${thread.summary}`,
			`Places, in reading order:\n${places.join("\n")}`,
		]),
		...tier(
			"details",
			members.map(({ node, role }) =>
				node.statement === undefined
					? ""
					: `${node.label}${inParentheses(role)}:\n${node.statement}`
			)
		),
	]);
}

function promptContext(
	target: PromptTarget,
	blocks: ContextBlock[]
): PromptContext {
	return { blocks, ...target };
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

function statementBlock(env: ExportNode): string {
	return env.statement === undefined ? "" : `${env.label}:\n${env.statement}`;
}

function bodyBlock(node: ExportNode): string {
	return node.body === undefined
		? ""
		: `${bodyRole(node) ?? "Content"}:\n${node.body}`;
}

function relationSummary(
	graph: ExportGraph,
	id: string,
	names: readonly RelationName[]
): string[] {
	const groups = Map.groupBy(
		relationsOf(graph, id, names),
		(relation) => relation.name
	);

	return [...groups].map(
		([name, items]) =>
			`${RELATION_LABELS[name]}: ${items.map((item) => item.node.label).join("; ")}.`
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

function prerequisiteBlocks(graph: ExportGraph, id: string): ContextBlock[] {
	const needs = prerequisites(graph, id).toSorted(
		(left, right) => left.distance - right.distance
	);

	return tier(
		"prerequisites",
		needs.map(({ node }) =>
			node.statement !== undefined &&
			node.statement.length <= PREREQUISITE_STATEMENT_LIMIT
				? `- ${node.label}: ${node.statement}`
				: `- ${node.label}`
		)
	);
}

function tier(name: ContextTier, texts: readonly string[]): ContextBlock[] {
	return texts
		.map((text) => text.trim())
		.filter(Boolean)
		.map((text) => ({ text, tier: name }));
}
