import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import type { GraphNode } from "@/lib/graph/types";
import { type ForceGraph, nodeRadius, type SimNode } from "./canvas-sim";

const PAGE_LABEL_GAP = 8;

interface LabelSize {
	height: number;
	width: number;
}

export type LabelSizes = WeakMap<HTMLElement, LabelSize>;

export function measureLabels(root: HTMLElement): LabelSizes {
	const sizes: LabelSizes = new WeakMap();
	for (const child of root.children) {
		if (child instanceof HTMLElement) {
			sizes.set(child, sizeOf(child));
		}
	}
	return sizes;
}

export function placeLabels(
	root: HTMLElement,
	graph: ForceGraph,
	nodes: Map<string, SimNode>,
	canvas: { height: number; width: number },
	sizes: LabelSizes
) {
	const scale = graph.zoom();
	for (const el of root.children) {
		if (el instanceof HTMLElement) {
			placeLabel(el, graph, nodes, canvas, scale, sizes);
		}
	}
}

export function NodeTitleChip({
	active,
	dimmed,
	node,
	onActivate,
	onHover,
}: {
	active: boolean;
	dimmed: boolean;
	node: GraphNode;
	onActivate: (node: GraphNode, clicks?: number) => void;
	onHover: (node: GraphNode | null) => void;
}) {
	return (
		<button
			aria-label={node.title.plain}
			className={cn(
				"pointer-events-auto absolute top-0 left-0 max-w-36 cursor-pointer appearance-none border-0 bg-transparent px-1.5 py-0.5 text-center text-[11px] text-fd-foreground leading-snug will-change-transform [text-shadow:0_0_8px_var(--color-fd-card),0_0_14px_var(--color-fd-background)] hover:bg-fd-card focus-visible:bg-fd-card focus-visible:outline-1 focus-visible:outline-fd-foreground data-[active=true]:bg-fd-card",
				dimmed && "opacity-35"
			)}
			data-active={active || undefined}
			data-graph-label=""
			data-id={node.id}
			onClick={(event) => {
				event.stopPropagation();
				onActivate(node, event.detail);
			}}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
			onPointerEnter={() => {
				onHover(node);
			}}
			onPointerLeave={() => {
				onHover(null);
			}}
			type="button"
		>
			<span className="wrap-break-word">
				<InlineHtml html={node.title.html} />
			</span>
		</button>
	);
}

function placeLabel(
	el: HTMLElement,
	graph: ForceGraph,
	nodes: Map<string, SimNode>,
	canvas: { height: number; width: number },
	scale: number,
	sizes: LabelSizes
) {
	const { id } = el.dataset;
	if (!id) {
		return;
	}

	const node = nodes.get(id);
	if (!node || node.x === undefined || node.y === undefined) {
		el.style.visibility = "hidden";
		return;
	}

	const { x, y } = graph.graph2ScreenCoords(node.x, node.y);
	const { height, width } = cachedSize(el, sizes);
	const left = x - width / 2;
	const top = y + nodeRadius(node) * scale + PAGE_LABEL_GAP;
	const outside =
		left + width < 0 ||
		top + height < 0 ||
		left > canvas.width ||
		top > canvas.height;

	el.style.visibility = outside ? "hidden" : "visible";
	if (!outside) {
		el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
	}
}

function cachedSize(element: HTMLElement, sizes: LabelSizes): LabelSize {
	const cached = sizes.get(element);
	if (cached) {
		return cached;
	}

	const next = sizeOf(element);
	sizes.set(element, next);
	return next;
}

function sizeOf(element: HTMLElement): LabelSize {
	return { height: element.offsetHeight, width: element.offsetWidth };
}
