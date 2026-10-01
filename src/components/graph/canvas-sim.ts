import { forceCollide, forceLink, forceManyBody, forceRadial } from "d3-force";
import type { ForceGraphMethods } from "react-force-graph-2d";
import {
	GRAPH_HOP_MAX,
	type GraphEdgeKind,
	type GraphNode,
	type GraphProjection,
	type GraphReach,
	isPageNode,
} from "@/lib/graph/types";

const NODE_RADIUS_PAGE = 7;
const NODE_RADIUS_ENV = 4;
const NODE_COLLIDE_GAP = 12;
const PAGE_TITLE_COLLIDE = 72;
const MIN_RING_GAP = 96;
const RING_NODE_GAP = 16;
const SEED_OFFSET = 20;
const BASE_LINK_DISTANCE = 140;
const CONTAINS_LINK_DISTANCE = 70;
const CHARGE_STRENGTH = -90;
const RADIAL_CHARGE_STRENGTH = -42;
const RADIAL_STRENGTH = 0.55;

export const FIT_PADDING = 28;

export type SimNode = GraphNode & {
	collideRadius: number;
	fx?: number;
	fy?: number;
	vx?: number;
	vy?: number;
	x?: number;
	y?: number;
};

export interface SimLink {
	kind: GraphEdgeKind;
	source: number | SimNode | string;
	target: number | SimNode | string;
}

export type ForceGraph = ForceGraphMethods<SimNode, SimLink>;

export interface GraphLayout {
	hopOne: boolean;
	mode: GraphProjection["layout"];
	radii: number[];
	scale: number;
}

export function nodeRadius(node: GraphNode): number {
	return isPageNode(node) ? NODE_RADIUS_PAGE : NODE_RADIUS_ENV;
}

export function buildGraphLayout(
	projection: GraphProjection,
	reach: GraphReach
): GraphLayout {
	const hopOne = reach === 1;
	const rings: number[][] = Array.from({ length: GRAPH_HOP_MAX + 1 }, () => []);

	if (projection.layout === "radial") {
		for (const node of projection.nodes) {
			const distance = Math.min(
				GRAPH_HOP_MAX,
				projection.distances.get(node.id) ?? 0
			);
			rings[distance]?.push(collideRadius(node, hopOne));
		}
	}

	return {
		hopOne,
		mode: projection.layout,
		radii: projection.layout === "radial" ? ringRadii(rings) : [0],
		scale: Math.min(1.65, Math.max(1, Math.sqrt(projection.nodes.length / 36))),
	};
}

export function applyForces(
	graph: ForceGraph,
	layout: GraphLayout,
	projection: GraphProjection
) {
	const scale = layout.mode === "free" ? layout.scale : 1;
	graph.d3Force(
		"link",
		forceLink<SimNode, SimLink>().distance(
			(link) =>
				(link.kind === "contains"
					? CONTAINS_LINK_DISTANCE
					: BASE_LINK_DISTANCE) * scale
		)
	);
	graph.d3Force(
		"charge",
		forceManyBody().strength(
			(layout.mode === "radial" ? RADIAL_CHARGE_STRENGTH : CHARGE_STRENGTH) *
				scale
		)
	);
	graph.d3Force(
		"collision",
		forceCollide<SimNode>().radius((node) => node.collideRadius)
	);

	if (layout.mode === "radial") {
		graph.d3Force(
			"radial",
			forceRadial<SimNode>((node) =>
				ringRadius(layout, projection, node.id)
			).strength(RADIAL_STRENGTH)
		);
		return;
	}

	graph.d3Force("radial", null);
}

export function syncGraphData(
	projection: GraphProjection,
	cache: Map<string, SimNode>,
	layout: GraphLayout
): { links: SimLink[]; nodes: SimNode[] } {
	const nextCache = new Map<string, SimNode>();
	const nodes: SimNode[] = [];

	for (const node of projection.nodes) {
		const radius = collideRadius(node, layout.hopOne);
		const previous = cache.get(node.id);
		const merged = previous
			? Object.assign(previous, node, { collideRadius: radius })
			: { ...node, collideRadius: radius };
		nextCache.set(node.id, merged);
		nodes.push(merged);
	}

	if (layout.mode === "radial") {
		seedRadialNodes(nodes, projection, layout, nextCache);
	}

	cache.clear();
	for (const [id, node] of nextCache) {
		cache.set(id, node);
	}

	const links = projection.edges.map((edge) => ({
		kind: edge.kind,
		source: edge.source,
		target: edge.target,
	}));

	return { links, nodes };
}

export function endId(end: SimLink["source"]): string | undefined {
	if (end === undefined || end === null) {
		return;
	}

	if (typeof end === "object") {
		return end.id;
	}

	return String(end);
}

function collideRadius(node: GraphNode, hopOne: boolean): number {
	const titled = hopOne || isPageNode(node);
	return (
		nodeRadius(node) + (titled ? PAGE_TITLE_COLLIDE : 0) + NODE_COLLIDE_GAP
	);
}

function ringRadius(
	layout: GraphLayout,
	projection: GraphProjection,
	id: string
): number {
	const distance = projection.distances.get(id) ?? 0;
	return layout.radii[Math.min(distance, GRAPH_HOP_MAX)] ?? 0;
}

function ringRadii(rings: number[][]): number[] {
	const radii = [0];

	for (let hop = 1; hop < rings.length; hop += 1) {
		const members = rings[hop] ?? [];
		const fromPrevious = (radii[hop - 1] ?? 0) + MIN_RING_GAP;
		if (members.length === 0) {
			radii[hop] = fromPrevious;
			continue;
		}

		const circumference = members.reduce(
			(sum, radius) => sum + 2 * radius + RING_NODE_GAP,
			0
		);
		radii[hop] = Math.max(fromPrevious, circumference / (2 * Math.PI));
	}

	return radii;
}

function seedRadialNodes(
	nodes: SimNode[],
	projection: GraphProjection,
	layout: GraphLayout,
	placed: Map<string, SimNode>
) {
	const ordered = nodes.toSorted(
		(left, right) =>
			(projection.distances.get(left.id) ?? 0) -
			(projection.distances.get(right.id) ?? 0)
	);

	for (const node of ordered) {
		if (node.x !== undefined && node.y !== undefined) {
			continue;
		}

		const centers: Array<{ x: number; y: number }> = [];
		for (const neighborId of projection.neighbors.get(node.id) ?? []) {
			const neighbor = placed.get(neighborId);
			if (neighbor?.x !== undefined && neighbor.y !== undefined) {
				centers.push({ x: neighbor.x, y: neighbor.y });
			}
		}

		const position = seedPosition(
			node.id,
			centers,
			ringRadius(layout, projection, node.id)
		);
		node.x = position.x;
		node.y = position.y;
	}
}

function seedPosition(
	id: string,
	neighborCenters: ReadonlyArray<{ x: number; y: number }>,
	radius: number
): { x: number; y: number } {
	const angle = hashAngle(id);
	if (neighborCenters.length === 0) {
		return {
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
		};
	}

	const cx =
		neighborCenters.reduce((sum, node) => sum + node.x, 0) /
		neighborCenters.length;
	const cy =
		neighborCenters.reduce((sum, node) => sum + node.y, 0) /
		neighborCenters.length;

	return {
		x: cx + Math.cos(angle) * SEED_OFFSET,
		y: cy + Math.sin(angle) * SEED_OFFSET,
	};
}

function hashAngle(id: string): number {
	let hash = 0;
	for (let index = 0; index < id.length; index += 1) {
		hash = (hash * 31 + id.charCodeAt(index)) % 4_294_967_296;
		if (hash < 0) {
			hash += 4_294_967_296;
		}
	}

	return (hash / 4_294_967_296) * 2 * Math.PI;
}
