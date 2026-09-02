import { getKindLabel } from "@/lib/math-env/kinds";
import { matchesQueryModules } from "./query";
import {
	GRAPH_HOP_MAX,
	type GraphDocument,
	type GraphNode,
	type GraphProjection,
	type GraphQuery,
	isAllReach,
	isEnvNode,
	isPageNode,
} from "./types";

export function projectGraph(
	document: GraphDocument,
	query: GraphQuery
): GraphProjection {
	const moduleNodes = document.nodes.filter((node) =>
		matchesQueryModules(node, query.module)
	);
	const visible = new Set(moduleNodes.map((node) => node.id));
	const moduleEdges = document.edges.filter(
		(edge) => visible.has(edge.source) && visible.has(edge.target)
	);

	if (!visible.has(query.focus.id)) {
		return {
			distances: new Map(),
			edges: [],
			layout: "free",
			neighbors: new Map(),
			nodes: [],
		};
	}

	const neighbors = adjacency(moduleEdges);
	const distances = shortestPaths(neighbors, query.focus.id);

	if (isAllReach(query.focus.reach)) {
		return {
			distances,
			edges: moduleEdges,
			layout: "free",
			neighbors,
			nodes: moduleNodes,
		};
	}

	const { reach } = query.focus;
	const nodes = moduleNodes.filter((node) => {
		const distance = distances.get(node.id);
		return distance !== undefined && distance <= reach;
	});
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges = moduleEdges.filter(
		(edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
	);

	return {
		distances,
		edges,
		layout: "radial",
		neighbors: restrictAdjacency(neighbors, nodeIds),
		nodes,
	};
}

export function graphSearchIndex(
	nodes: readonly GraphNode[]
): Map<string, string> {
	const index = new Map<string, string>();
	for (const node of nodes) {
		index.set(node.id, nodeHaystack(node));
	}

	return index;
}

export function locateNodes(
	nodes: GraphNode[],
	text: string,
	haystacks?: Map<string, string>
): GraphNode[] {
	const needle = text.trim().toLowerCase();
	if (needle === "") {
		return [];
	}

	return nodes.filter((node) => {
		const haystack = haystacks?.get(node.id) ?? nodeHaystack(node);
		return haystack.includes(needle);
	});
}

export function isIsolatedFocus(projection: GraphProjection): boolean {
	return projection.nodes.length === 1 && projection.edges.length === 0;
}

function nodeHaystack(node: GraphNode): string {
	const parts = [node.title.source, node.title.plain, node.id];

	if (isPageNode(node)) {
		if (node.description) {
			parts.push(node.description.source, node.description.plain);
		}

		parts.push(...node.tags, ...node.ideas);
	}

	if (isEnvNode(node)) {
		parts.push(node.slug, node.kind, getKindLabel(node.kind));
		if (node.preview) {
			parts.push(node.preview.plain);
		}
	}

	return parts.join(" ").toLowerCase();
}

function shortestPaths(
	neighbors: Map<string, string[]>,
	origin: string,
	maxHop = GRAPH_HOP_MAX
): Map<string, number> {
	const distances = new Map<string, number>([[origin, 0]]);
	const queue = [origin];

	for (const id of queue) {
		const distance = distances.get(id) ?? 0;
		if (distance >= maxHop) {
			continue;
		}

		for (const neighbor of neighbors.get(id) ?? []) {
			if (distances.has(neighbor)) {
				continue;
			}

			distances.set(neighbor, distance + 1);
			queue.push(neighbor);
		}
	}

	return distances;
}

function adjacency(edges: GraphDocument["edges"]): Map<string, string[]> {
	const neighborSets = new Map<string, Set<string>>();

	const add = (from: string, to: string) => {
		const set = neighborSets.get(from);
		if (set) {
			set.add(to);
			return;
		}

		neighborSets.set(from, new Set([to]));
	};

	for (const edge of edges) {
		add(edge.source, edge.target);
		add(edge.target, edge.source);
	}

	const neighbors = new Map<string, string[]>();
	for (const [id, set] of neighborSets) {
		neighbors.set(id, [...set]);
	}

	return neighbors;
}

function restrictAdjacency(
	neighbors: Map<string, string[]>,
	nodeIds: Set<string>
): Map<string, string[]> {
	const next = new Map<string, string[]>();

	for (const id of nodeIds) {
		const list = neighbors.get(id);
		if (!list) {
			continue;
		}

		next.set(
			id,
			list.filter((neighbor) => nodeIds.has(neighbor))
		);
	}

	return next;
}
