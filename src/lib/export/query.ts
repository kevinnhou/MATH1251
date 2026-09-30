import type { MathEnvKind } from "@/lib/math-env/kinds";
import {
	type ExportEdgeKind,
	type ExportGraph,
	type ExportNode,
	RELATION_NAMES,
	RELATION_ORDER,
	type Relation,
	type RelationName,
} from "./model";

const DEPENDENCY_EDGES: readonly ExportEdgeKind[] = ["uses", "proves"];

export function requireNode(graph: ExportGraph, id: string): ExportNode {
	const node = graph.nodes.get(id);
	if (node === undefined) {
		throw new Error(`Unknown export node "${id}".`);
	}

	return node;
}

export function pageOf(
	graph: ExportGraph,
	node: ExportNode
): ExportNode | undefined {
	return node.page === undefined ? undefined : graph.nodes.get(node.page);
}

export function childrenOf(graph: ExportGraph, id: string): ExportNode[] {
	return (graph.outgoing.get(id) ?? []).flatMap((edge) =>
		edge.kind === "contains" ? nodeList(graph, edge.target) : []
	);
}

export function envsOfKind(
	graph: ExportGraph,
	pageId: string,
	kind: MathEnvKind
): ExportNode[] {
	return childrenOf(graph, pageId).filter((env) => env.kind === kind);
}

export function proofsOf(graph: ExportGraph, id: string): ExportNode[] {
	return (graph.incoming.get(id) ?? []).flatMap((edge) =>
		edge.kind === "proves" ? nodeList(graph, edge.source) : []
	);
}

export function relationsOf(
	graph: ExportGraph,
	id: string,
	options: { exclude?: readonly RelationName[] } = {}
): Relation[] {
	const exclude = new Set(options.exclude);
	const relations: Relation[] = [];
	const seen = new Set<string>();

	function push(name: RelationName, other: string) {
		const node = graph.nodes.get(other);
		const key = `${name}\0${other}`;
		if (node === undefined || exclude.has(name) || seen.has(key)) {
			return;
		}

		seen.add(key);
		relations.push({ name, node });
	}

	for (const edge of graph.outgoing.get(id) ?? []) {
		push(RELATION_NAMES[edge.kind][0], edge.target);
	}

	for (const edge of graph.incoming.get(id) ?? []) {
		push(RELATION_NAMES[edge.kind][1], edge.source);
	}

	return relations.toSorted(
		(left, right) =>
			RELATION_ORDER.indexOf(left.name) - RELATION_ORDER.indexOf(right.name) ||
			(graph.position.get(left.node.id) ?? 0) -
				(graph.position.get(right.node.id) ?? 0)
	);
}

export interface Prerequisite {
	distance: number;
	node: ExportNode;
}

export function prerequisites(graph: ExportGraph, id: string): Prerequisite[] {
	const root = graph.nodes.get(id);
	if (root === undefined) {
		return [];
	}

	const roots =
		root.type === "page"
			? childrenOf(graph, id).map((node) => node.id)
			: [id, ...proofsOf(graph, id).map((proof) => proof.id)];
	const distances = dependencyDistances(graph, roots);
	const sorted: string[] = [];
	const visited = new Set<string>();

	function visit(current: string) {
		visited.add(current);
		for (const next of dependencies(graph, current)) {
			if (distances.has(next) && !visited.has(next)) {
				visit(next);
			}
		}
		sorted.push(current);
	}

	for (const start of distances.keys()) {
		if (!visited.has(start)) {
			visit(start);
		}
	}

	return sorted.flatMap((other) => {
		const node = graph.nodes.get(other);
		const distance = distances.get(other) ?? 0;
		const local = root.type === "page" && node?.page === id;
		return node === undefined || distance === 0 || local
			? []
			: [{ distance, node }];
	});
}

function dependencyDistances(
	graph: ExportGraph,
	roots: readonly string[]
): Map<string, number> {
	const distances = new Map(roots.map((id) => [id, 0]));
	let frontier = [...roots];

	for (let distance = 1; frontier.length > 0; distance += 1) {
		const next: string[] = [];
		for (const current of frontier) {
			for (const target of dependencies(graph, current)) {
				if (!distances.has(target)) {
					distances.set(target, distance);
					next.push(target);
				}
			}
		}
		frontier = next;
	}

	return distances;
}

function dependencies(graph: ExportGraph, id: string): string[] {
	return (graph.outgoing.get(id) ?? []).flatMap((edge) =>
		DEPENDENCY_EDGES.includes(edge.kind) ? [edge.target] : []
	);
}

function nodeList(graph: ExportGraph, id: string): ExportNode[] {
	const node = graph.nodes.get(id);
	return node === undefined ? [] : [node];
}
