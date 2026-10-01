import { STRAND_LABELS } from "@/lib/course/strands";
import type { KindView } from "@/lib/math-env/kind-view";
import { type ExampleDifficulty, getKindLabel } from "@/lib/math-env/kinds";
import {
	bodyRole,
	type ContextBlock,
	type ContextTier,
	type ExportGraph,
	type ExportNode,
	type PromptContext,
	type PromptTarget,
	RELATION_LABELS,
	type RelationName,
} from "./model";
import {
	childrenOf,
	envsOfKind,
	pageOf,
	prerequisites,
	proofsOf,
	relationsOf,
	requireNode,
} from "./query";

const OUTGOING: readonly RelationName[] = [
	"proves",
	"uses",
	"recalls",
	"references",
	"see_also",
];
const INCOMING: readonly RelationName[] = [
	"used_by",
	"recalled_by",
	"referenced_by",
];
const PREREQUISITE_STATEMENT_LIMIT = 600;

export function envTarget(node: ExportNode, graph: ExportGraph): PromptTarget {
	return {
		hasProof: node.kind === "proof" || envProofs(node, graph).length > 0,
		id: node.id,
		kind: node.kind,
		label: node.label,
		type: "env",
	};
}

export function pageTarget(node: ExportNode): PromptTarget {
	return {
		hasProof: false,
		id: node.id,
		kind: "page",
		label: node.label,
		type: "page",
	};
}

export function kindViewTarget(
	view: KindView,
	graph: ExportGraph
): PromptTarget {
	const page = requireNode(graph, view.parentUrl);
	return {
		hasProof: view.kind === "proof",
		id: view.url,
		kind: view.kind,
		label: `${getKindLabel(view.kind, true)} from ${page.label}`,
		type: "kind-view",
	};
}

export function envContext(
	node: ExportNode,
	graph: ExportGraph
): PromptContext {
	const proofs = envProofs(node, graph);
	const notesLast = bodyRole(node) === "Notes";
	const core = [
		heading(node, pageOf(graph, node)),
		node.statement === undefined ? "" : `Statement:\n${node.statement}`,
		notesLast ? "" : bodyBlock(node),
		...proofs.map((proof) => `Proof:\n${proof.body ?? ""}`),
		notesLast ? bodyBlock(node) : "",
	];

	return promptContext(
		envTarget(node, graph),
		[
			...tier("core", core),
			...tier("relations", relationSummary(graph, node.id, OUTGOING)),
			...prerequisiteBlocks(graph, node.id),
			...tier("backlinks", relationSummary(graph, node.id, INCOMING)),
		],
		node.difficulty
	);
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
	view: KindView,
	graph: ExportGraph
): PromptContext {
	const target = kindViewTarget(view, graph);
	const envs = envsOfKind(graph, view.parentUrl, view.kind);

	return promptContext(target, [
		...tier("core", [
			`${target.label} (${view.parentUrl}), without the surrounding lecture prose.`,
			outline(envs),
		]),
		...tier(
			"details",
			envs.map((env) =>
				[statementBlock(env), bodyBlock(env)].filter(Boolean).join("\n")
			)
		),
		...prerequisiteBlocks(graph, view.parentUrl),
	]);
}

function promptContext(
	target: PromptTarget,
	blocks: ContextBlock[],
	difficulty?: ExampleDifficulty
): PromptContext {
	return {
		blocks,
		...target,
		...(difficulty === undefined ? {} : { difficulty }),
	};
}

function envProofs(node: ExportNode, graph: ExportGraph): ExportNode[] {
	return node.kind === "proof" ? [] : proofsOf(graph, node.id);
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
