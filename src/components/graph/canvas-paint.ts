import { GRAPH_MODULES, type GraphModule } from "@/lib/course/strands";
import { type GraphEdgeKind, isPageNode } from "@/lib/graph/types";
import { endId, nodeRadius, type SimLink, type SimNode } from "./canvas-sim";

const NODE_POINTER_RADIUS = 10;
const MODULE_FALLBACK = "#74828a";

export interface GraphTheme {
	card: string;
	foreground: string;
	modules: Record<GraphModule, string>;
}

export interface PaintState {
	focusedId: string | null;
	hover: SimNode | null;
	locateIds: Set<string> | null;
	selectedId: string | null;
	theme: GraphTheme | null;
}

export function moduleColorVar(module: GraphModule): string {
	return `--graph-module-${module}`;
}

export function readGraphTheme(container: HTMLElement): GraphTheme {
	const style = getComputedStyle(container);
	const read = (name: string, fallback: string) =>
		style.getPropertyValue(name).trim() || fallback;
	const modules = {} as Record<GraphModule, string>;
	for (const module of GRAPH_MODULES) {
		modules[module] = read(moduleColorVar(module), MODULE_FALLBACK);
	}

	return {
		card: read("--color-fd-card", "#f1f1f1"),
		foreground: read("--color-fd-foreground", "#111827"),
		modules,
	};
}

export function isDimmed(locateIds: Set<string> | null, id: string): boolean {
	return locateIds !== null && locateIds.size > 0 && !locateIds.has(id);
}

export function paintNode(
	node: SimNode,
	ctx: CanvasRenderingContext2D,
	globalScale: number,
	state: PaintState & { theme: GraphTheme }
) {
	const selected = state.selectedId === node.id;
	const hovered = state.hover?.id === node.id;
	const radius = nodeRadius(node);

	ctx.save();
	ctx.globalAlpha = isDimmed(state.locateIds, node.id) ? 0.35 : 1;

	traceNodeGlyph(node, ctx, radius);
	ctx.fillStyle = state.theme.modules[node.module];
	ctx.fill();

	if (isPageNode(node)) {
		traceNodeGlyph(node, ctx, radius * 0.38);
		ctx.fillStyle = state.theme.card;
		ctx.fill();
	}

	if (selected || hovered) {
		traceNodeGlyph(node, ctx, radius + 3 / globalScale);
		ctx.strokeStyle = state.theme.foreground;
		ctx.lineWidth = selected ? 2 / globalScale : 1 / globalScale;
		ctx.stroke();
	}

	ctx.restore();
}

export function paintPointerArea(
	node: SimNode,
	color: string,
	ctx: CanvasRenderingContext2D,
	globalScale: number
) {
	if (node.x === undefined || node.y === undefined) {
		return;
	}

	const radius = Math.max(
		nodeRadius(node) + 4 / globalScale,
		NODE_POINTER_RADIUS / globalScale
	);
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
	ctx.fill();
}

export function linkColor(link: SimLink, state: PaintState): string {
	if (!state.theme) {
		return "#999";
	}

	const sourceId = endId(link.source);
	const targetId = endId(link.target);
	const locating = state.locateIds !== null && state.locateIds.size > 0;
	const dimmed =
		locating &&
		!(
			(sourceId && state.locateIds?.has(sourceId)) ||
			(targetId && state.locateIds?.has(targetId))
		);
	const ink = state.theme.foreground;

	if (isEmphasisedLink(link, state) && !dimmed) {
		return ink;
	}

	return mixInk(ink, dimmed ? 10 : 18);
}

export function linkWidth(link: SimLink, state: PaintState): number {
	let base = 1;
	if (link.kind === "contains") {
		base = 0.6;
	} else if (link.kind === "of" || link.kind === "reference") {
		base = 1.4;
	}

	return isEmphasisedLink(link, state) ? Math.max(base, 2) : base;
}

export function linkDash(link: { kind: GraphEdgeKind }): number[] | null {
	if (link.kind === "see") {
		return [6, 4];
	}

	if (link.kind === "recall") {
		return [1.5, 2];
	}

	return null;
}

function isEmphasisedLink(link: SimLink, state: PaintState): boolean {
	const ends = [endId(link.source), endId(link.target)];
	return [state.hover?.id, state.selectedId, state.focusedId].some(
		(id) => typeof id === "string" && id !== "" && ends.includes(id)
	);
}

function traceNodeGlyph(
	node: SimNode,
	ctx: CanvasRenderingContext2D,
	radius: number
) {
	const x = node.x ?? 0;
	const y = node.y ?? 0;

	ctx.beginPath();
	if (isPageNode(node)) {
		ctx.moveTo(x, y - radius);
		ctx.lineTo(x + radius, y);
		ctx.lineTo(x, y + radius);
		ctx.lineTo(x - radius, y);
		ctx.closePath();
		return;
	}

	ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
}

function mixInk(ink: string, percent: number): string {
	return `color-mix(in oklab, ${ink} ${percent}%, transparent)`;
}
