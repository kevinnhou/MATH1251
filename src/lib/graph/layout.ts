import {
	GRAPH_HOP_MAX,
	type GraphNode,
	type GraphProjection,
	type GraphReach,
	isPageNode,
} from "./types";

export const LAYOUT_NODE_RADIUS_PAGE = 7;
export const LAYOUT_NODE_RADIUS_ENV = 4;
export const LAYOUT_NODE_COLLIDE_GAP = 12;
export const LAYOUT_PAGE_TITLE_COLLIDE = 72;
export const LAYOUT_MIN_RING_GAP = 96;
export const LAYOUT_RING_NODE_GAP = 16;
export const LAYOUT_SEED_OFFSET = 20;
export const LAYOUT_BASE_LINK_DISTANCE = 140;
export const LAYOUT_CONTAINS_LINK_DISTANCE = 70;
export const LAYOUT_CHARGE_STRENGTH = -90;
export const LAYOUT_RADIAL_CHARGE_STRENGTH = -42;
export const LAYOUT_RADIAL_STRENGTH = 0.55;
export const LAYOUT_FIT_PADDING = 28;

export interface GraphLayout {
	collideById: Map<string, number>;
	hopOne: boolean;
	mode: GraphProjection["layout"];
	nodeCount: number;
	radii: number[];
	scale: number;
}

export function estimateCollideRadius(
	node: GraphNode,
	titled = isPageNode(node)
): number {
	const radius = isPageNode(node)
		? LAYOUT_NODE_RADIUS_PAGE
		: LAYOUT_NODE_RADIUS_ENV;
	return (
		radius + (titled ? LAYOUT_PAGE_TITLE_COLLIDE : 0) + LAYOUT_NODE_COLLIDE_GAP
	);
}

export function layoutScale(nodeCount: number): number {
	return Math.min(1.65, Math.max(1, Math.sqrt(nodeCount / 36)));
}

export function ringRadii(
	rings: ReadonlyArray<ReadonlyArray<{ collideRadius: number }>>
): number[] {
	const radii = [0];

	for (let hop = 1; hop < rings.length; hop += 1) {
		const members = rings[hop] ?? [];
		const previous = radii[hop - 1] ?? 0;
		const fromPrevious = previous + LAYOUT_MIN_RING_GAP;
		if (members.length === 0) {
			radii[hop] = fromPrevious;
			continue;
		}

		const circumference = members.reduce(
			(sum, node) => sum + 2 * node.collideRadius + LAYOUT_RING_NODE_GAP,
			0
		);
		radii[hop] = Math.max(fromPrevious, circumference / (2 * Math.PI));
	}

	return radii;
}

export function hashAngle(id: string): number {
	let hash = 0;
	for (let index = 0; index < id.length; index += 1) {
		hash = (hash * 31 + id.charCodeAt(index)) % 4_294_967_296;
		if (hash < 0) {
			hash += 4_294_967_296;
		}
	}

	return (hash / 4_294_967_296) * 2 * Math.PI;
}

export function seedPosition(
	id: string,
	neighborCenters: ReadonlyArray<{ x: number; y: number }>,
	ringRadius: number
): { x: number; y: number } {
	const angle = hashAngle(id);
	if (neighborCenters.length === 0) {
		return {
			x: Math.cos(angle) * ringRadius,
			y: Math.sin(angle) * ringRadius,
		};
	}

	const cx =
		neighborCenters.reduce((sum, node) => sum + node.x, 0) /
		neighborCenters.length;
	const cy =
		neighborCenters.reduce((sum, node) => sum + node.y, 0) /
		neighborCenters.length;

	return {
		x: cx + Math.cos(angle) * LAYOUT_SEED_OFFSET,
		y: cy + Math.sin(angle) * LAYOUT_SEED_OFFSET,
	};
}

export function buildGraphLayout(
	projection: GraphProjection,
	reach: GraphReach
): GraphLayout {
	const nodeCount = projection.nodes.length;
	const collideById = new Map<string, number>();
	const hopNodes: Array<Array<{ collideRadius: number }>> = Array.from(
		{ length: GRAPH_HOP_MAX + 1 },
		() => []
	);

	const hopOne = reach === 1;

	for (const node of projection.nodes) {
		const radius = estimateCollideRadius(node, hopOne || isPageNode(node));
		collideById.set(node.id, radius);
		if (projection.layout === "radial") {
			const distance = Math.min(
				GRAPH_HOP_MAX,
				projection.distances.get(node.id) ?? 0
			);
			hopNodes[distance]?.push({ collideRadius: radius });
		}
	}

	return {
		collideById,
		hopOne,
		mode: projection.layout,
		nodeCount,
		radii: projection.layout === "radial" ? ringRadii(hopNodes) : [0],
		scale: layoutScale(nodeCount),
	};
}
