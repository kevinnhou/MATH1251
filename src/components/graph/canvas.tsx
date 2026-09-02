"use client";

import { forceCollide, forceLink, forceManyBody, forceRadial } from "d3-force";
import {
	lazy,
	type MutableRefObject,
	memo,
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import {
	buildGraphLayout,
	type GraphLayout,
	LAYOUT_BASE_LINK_DISTANCE,
	LAYOUT_CHARGE_STRENGTH,
	LAYOUT_CONTAINS_LINK_DISTANCE,
	LAYOUT_FIT_PADDING,
	LAYOUT_NODE_RADIUS_ENV,
	LAYOUT_NODE_RADIUS_PAGE,
	LAYOUT_RADIAL_CHARGE_STRENGTH,
	LAYOUT_RADIAL_STRENGTH,
	seedPosition,
} from "@/lib/graph/layout";
import { nodePlainTitle } from "@/lib/graph/node-summary";
import { graphEdgeDash, graphEdgeInk, graphEdgeWidth } from "@/lib/graph/style";
import { type GraphTheme, readGraphTheme } from "@/lib/graph/theme";
import {
	GRAPH_HOP_MAX,
	type GraphEdgeKind,
	type GraphNode,
	type GraphProjection,
	type GraphReach,
	isPageNode,
} from "@/lib/graph/types";

const ForceGraph2D = lazy(
	() => import("react-force-graph-2d")
) as typeof import("react-force-graph-2d").default;

const NODE_POINTER_RADIUS = 10;
const PAGE_LABEL_GAP = 8;
const GRAPH_D3_ALPHA_MIN = 0.05;
const GRAPH_COOLDOWN_TICKS = 90;
const GRAPH_COOLDOWN_TIME = 1200;

type SimNode = GraphNode & {
	collideRadius?: number;
	fx?: number;
	fy?: number;
	id?: number | string;
	vx?: number;
	vy?: number;
	x?: number;
	y?: number;
};

interface SimLink {
	kind: GraphEdgeKind;
	source: number | SimNode | string;
	target: number | SimNode | string;
}

interface OverlaySize {
	height: number;
	width: number;
}

interface GraphCanvasProps {
	children?: ReactNode;
	className?: string;
	fitKey?: string | null;
	focusedId?: string | null;
	immersed?: boolean;
	locateIds?: Set<string> | null;
	onOpen?: (url: string) => void;
	onSelect?: (id: string | null) => void;
	projection: GraphProjection;
	reach: GraphReach;
	selectedId?: string | null;
}

type ClientGraphProps = Omit<GraphCanvasProps, "children" | "className"> & {
	containerRef: MutableRefObject<HTMLDivElement | null>;
	fitKey: string | null;
	focusedId: string | null;
	locateIds: Set<string> | null;
};

export function GraphCanvas({
	children,
	className,
	fitKey,
	focusedId,
	immersed = false,
	locateIds,
	onOpen,
	onSelect,
	projection,
	reach,
	selectedId,
}: GraphCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [mount, setMount] = useState(false);

	useEffect(() => {
		setMount(true);
	}, []);

	return (
		<div
			className={cn(
				"relative select-none overflow-hidden rounded-xl border bg-fd-card motion-safe:transition-[height] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] [&_canvas]:size-full",
				className
			)}
			data-graph-immersed={immersed || undefined}
			onScroll={(event) => {
				event.currentTarget.scrollTop = 0;
				event.currentTarget.scrollLeft = 0;
			}}
			ref={containerRef}
		>
			{mount ? (
				<Suspense fallback={null}>
					<ClientGraph
						containerRef={containerRef}
						fitKey={fitKey ?? null}
						focusedId={focusedId ?? null}
						locateIds={locateIds ?? null}
						onOpen={onOpen}
						onSelect={onSelect}
						projection={projection}
						reach={reach}
						selectedId={selectedId ?? null}
					/>
				</Suspense>
			) : null}
			{children}
		</div>
	);
}

function ClientGraph({
	containerRef,
	fitKey,
	focusedId,
	locateIds,
	onOpen,
	onSelect,
	projection,
	reach,
	selectedId,
}: ClientGraphProps) {
	const fgRef = useRef<ForceGraphMethods<SimNode, SimLink> | undefined>(
		undefined
	);
	const pageLabelsRef = useRef<HTMLDivElement>(null);
	const nodeCache = useRef(new Map<string, SimNode>());
	const hoveredRef = useRef<SimNode | null>(null);
	const themeRef = useRef<GraphTheme | null>(null);
	const focusedIdRef = useRef(focusedId);
	const locateIdsRef = useRef(locateIds);
	const projectionRef = useRef(projection);
	const layoutRef = useRef<GraphLayout | null>(null);
	const pendingFitRef = useRef(fitKey !== null);
	const selectedIdRef = useRef(selectedId);
	const onSelectRef = useRef(onSelect);
	const onOpenRef = useRef(onOpen);
	const programmaticCameraRef = useRef(false);
	const skipFitRef = useRef(false);
	const graphPointerDownRef = useRef(false);
	const lastCameraRef = useRef<{ k: number; x: number; y: number } | null>(
		null
	);
	const labelSizeCacheRef = useRef(new WeakMap<HTMLElement, OverlaySize>());
	const [size, setSize] = useState({ height: 0, width: 0 });
	const [themeEpoch, setThemeEpoch] = useState(0);

	const layout = useMemo(
		() => buildGraphLayout(projection, reach),
		[projection, reach]
	);

	focusedIdRef.current = focusedId;
	selectedIdRef.current = selectedId;
	locateIdsRef.current = locateIds;
	projectionRef.current = projection;
	layoutRef.current = layout;
	onSelectRef.current = onSelect;
	onOpenRef.current = onOpen;

	const bindGraph = useMemo(
		(): MutableRefObject<ForceGraphMethods<SimNode, SimLink> | undefined> => ({
			get current() {
				return fgRef.current;
			},
			set current(graph) {
				fgRef.current = graph;
				if (!graph) {
					return;
				}

				applyForces(graph, layoutRef.current, projectionRef.current);
			},
		}),
		[]
	);

	const movePageLabels = useCallback(() => {
		const root = pageLabelsRef.current;
		const graph = fgRef.current;
		const container = containerRef.current;
		if (!(root && graph && container)) {
			return;
		}

		const canvas = {
			height: container.clientHeight,
			width: container.clientWidth,
		};
		const scale = graph.zoom();
		const cache = labelSizeCacheRef.current;

		for (const child of root.children) {
			if (!(child instanceof HTMLElement)) {
				continue;
			}

			placePageLabel(child, graph, nodeCache.current, canvas, scale, cache);
		}
	}, [containerRef]);

	const measurePageLabels = useCallback(() => {
		labelSizeCacheRef.current = new WeakMap();
		const root = pageLabelsRef.current;
		if (!root) {
			return;
		}

		for (const child of root.children) {
			if (!(child instanceof HTMLElement)) {
				continue;
			}

			labelSizeCacheRef.current.set(child, sizeOf(child));
		}
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const commitSize = () => {
			const height = container.clientHeight;
			const width = container.clientWidth;
			setSize((current) => {
				if (current.height === height && current.width === width) {
					return current;
				}

				return { height, width };
			});
		};

		const onResize = () => {
			const width = container.clientWidth;
			if (isSizeAnimating(container)) {
				setSize((current) => {
					if (current.width === width) {
						return current;
					}

					return { height: current.height, width };
				});
				return;
			}

			commitSize();
		};

		const onTransitionEnd = (event: TransitionEvent) => {
			if (event.target !== container) {
				return;
			}
			if (event.propertyName !== "height" && event.propertyName !== "width") {
				return;
			}

			commitSize();
		};

		commitSize();
		const observer = new ResizeObserver(onResize);
		observer.observe(container);
		container.addEventListener("transitionend", onTransitionEnd);
		return () => {
			observer.disconnect();
			container.removeEventListener("transitionend", onTransitionEnd);
		};
	}, [containerRef]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const updateTheme = () => {
			themeRef.current = readGraphTheme(container);
			setThemeEpoch((epoch) => epoch + 1);
		};

		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, {
			attributeFilter: ["class"],
			attributes: true,
		});
		return () => observer.disconnect();
	}, [containerRef]);

	const graphData = useMemo(
		() => syncGraphData(projection, nodeCache.current, layout),
		[layout, projection]
	);

	const labelledNodes = useMemo(
		() =>
			layout.hopOne ? graphData.nodes : graphData.nodes.filter(isPageNode),
		[graphData, layout]
	);

	useEffect(() => {
		const graph = fgRef.current;
		if (!graph) {
			return;
		}

		applyForces(graph, layout, projection);
	}, [layout, projection]);

	useEffect(() => {
		const hovered = hoveredRef.current;
		if (hovered && !projection.nodes.some((node) => node.id === hovered.id)) {
			hoveredRef.current = null;
			fgRef.current?.resumeAnimation();
		}
	}, [projection]);

	const tryFit = useCallback(() => {
		const graph = fgRef.current;
		const container = containerRef.current;
		if (!(graph && pendingFitRef.current)) {
			return;
		}
		if (container && isSizeAnimating(container)) {
			return;
		}
		if (skipFitRef.current) {
			skipFitRef.current = false;
			pendingFitRef.current = false;
			return;
		}

		programmaticCameraRef.current = true;
		graph.zoomToFit(400, LAYOUT_FIT_PADDING);
		pendingFitRef.current = false;
	}, [containerRef]);

	useEffect(() => {
		pendingFitRef.current = fitKey !== null;
	}, [fitKey]);

	useEffect(() => {
		if (size.width === 0 || size.height === 0) {
			return;
		}

		tryFit();
	}, [size, tryFit]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const onPointerDown = (event: PointerEvent) => {
			const { target } = event;
			graphPointerDownRef.current =
				target instanceof HTMLCanvasElement ||
				(target instanceof HTMLElement &&
					target.closest("[data-graph-label]") !== null);
		};

		container.addEventListener("pointerdown", onPointerDown);
		return () => {
			container.removeEventListener("pointerdown", onPointerDown);
		};
	}, [containerRef]);

	useLayoutEffect(() => {
		focusedIdRef.current = focusedId;
		locateIdsRef.current = locateIds;
		measurePageLabels();
		if (size.width === 0 || size.height === 0) {
			return;
		}

		if (labelledNodes.length > 0) {
			movePageLabels();
		}
		if (themeEpoch >= 0) {
			fgRef.current?.resumeAnimation();
		}
	}, [
		focusedId,
		locateIds,
		measurePageLabels,
		movePageLabels,
		labelledNodes,
		size,
		themeEpoch,
	]);

	const nodeCanvasObject = useCallback(
		(node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
			if (node.x === undefined || node.y === undefined) {
				return;
			}

			const theme = themeRef.current;
			if (!theme) {
				return;
			}

			paintNode(node, ctx, globalScale, {
				focusedId: focusedIdRef.current,
				hover: hoveredRef.current,
				locateIds: locateIdsRef.current,
				selectedId: selectedIdRef.current ?? null,
				theme,
			});
		},
		[]
	);

	const paintLinkColor = useCallback(
		(link: SimLink) =>
			linkColor({
				focusedId: focusedIdRef.current,
				hover: hoveredRef.current,
				link,
				locateIds: locateIdsRef.current,
				selectedId: selectedIdRef.current ?? null,
				theme: themeRef.current,
			}),
		[]
	);

	const paintLinkWidth = useCallback(
		(link: SimLink) =>
			linkWidth(
				link.kind,
				isEmphasisedLink({
					focusedId: focusedIdRef.current,
					hover: hoveredRef.current,
					link,
					selectedId: selectedIdRef.current ?? null,
				})
			),
		[]
	);

	const paintLinkDash = useCallback((link: SimLink) => linkDash(link.kind), []);

	const handleEngineTick = useCallback(() => {
		movePageLabels();
	}, [movePageLabels]);

	const handleEngineStop = useCallback(() => {
		tryFit();
		movePageLabels();
	}, [movePageLabels, tryFit]);

	const handleBackgroundClick = useCallback(() => {
		onSelectRef.current?.(null);
		hoveredRef.current = null;
		fgRef.current?.resumeAnimation();
	}, []);

	const activateNode = useCallback((node: GraphNode, clicks = 1) => {
		if (clicks >= 2) {
			onOpenRef.current?.(node.id);
			return;
		}

		onSelectRef.current?.(node.id);
	}, []);

	const hoverNode = useCallback((node: SimNode | null) => {
		hoveredRef.current = node;
		fgRef.current?.resumeAnimation();
	}, []);

	const handleTitleHover = useCallback(
		(node: GraphNode | null) => {
			hoverNode(node ? (nodeCache.current.get(node.id) ?? null) : null);
		},
		[hoverNode]
	);

	const handleNodeDrag = useCallback(() => {
		movePageLabels();
	}, [movePageLabels]);

	const handleNodeDragEnd = useCallback(() => {
		movePageLabels();
		skipFitRef.current = true;
	}, [movePageLabels]);

	const handleZoom = useCallback(
		(transform: { k: number; x: number; y: number }) => {
			movePageLabels();
			if (programmaticCameraRef.current) {
				lastCameraRef.current = transform;
			}
		},
		[movePageLabels]
	);

	const handleZoomEnd = useCallback(
		(transform: { k: number; x: number; y: number }) => {
			movePageLabels();
			if (programmaticCameraRef.current) {
				programmaticCameraRef.current = false;
				lastCameraRef.current = transform;
				return;
			}

			const previous = lastCameraRef.current;
			lastCameraRef.current = transform;
			if (previous === null) {
				return;
			}

			const moved =
				Math.abs(previous.k - transform.k) > 0.001 ||
				Math.abs(previous.x - transform.x) > 1 ||
				Math.abs(previous.y - transform.y) > 1;
			if (!(moved && graphPointerDownRef.current)) {
				return;
			}

			graphPointerDownRef.current = false;
			skipFitRef.current = true;
		},
		[movePageLabels]
	);

	if (size.width === 0 || size.height === 0 || themeRef.current === null) {
		return null;
	}

	return (
		<>
			<GraphForceCanvas
				bindGraph={bindGraph}
				getLinkColor={paintLinkColor}
				getLinkDash={paintLinkDash}
				getLinkWidth={paintLinkWidth}
				graphData={graphData}
				height={size.height}
				nodeCanvasObject={nodeCanvasObject}
				onBackgroundClick={handleBackgroundClick}
				onEngineStop={handleEngineStop}
				onEngineTick={handleEngineTick}
				onNodeClick={(node, event) => activateNode(node, event.detail)}
				onNodeDrag={handleNodeDrag}
				onNodeDragEnd={handleNodeDragEnd}
				onNodeHover={hoverNode}
				onZoom={handleZoom}
				onZoomEnd={handleZoomEnd}
				width={size.width}
			/>
			<div
				className="pointer-events-none absolute inset-0 z-9"
				ref={pageLabelsRef}
			>
				{labelledNodes.map((node) => (
					<NodeTitleChip
						active={selectedId === node.id}
						dimmed={
							locateIds !== null &&
							locateIds.size > 0 &&
							!locateIds.has(node.id)
						}
						key={node.id}
						node={node}
						onActivate={activateNode}
						onHover={handleTitleHover}
					/>
				))}
			</div>
			<nav aria-label="Unlabelled nodes in graph" className="sr-only">
				<ul>
					{graphData.nodes
						.filter(
							(node) =>
								!labelledNodes.some((labelled) => labelled.id === node.id)
						)
						.flatMap((node) => {
							if (!node.id) {
								return [];
							}

							return [
								<li key={node.id}>
									<a href={node.id}>{nodePlainTitle(node)}</a>
								</li>,
							];
						})}
				</ul>
			</nav>
		</>
	);
}

function ForceCanvas({
	bindGraph,
	getLinkColor,
	getLinkDash,
	getLinkWidth,
	graphData,
	height,
	nodeCanvasObject,
	onBackgroundClick,
	onEngineStop,
	onEngineTick,
	onNodeClick,
	onNodeDrag,
	onNodeDragEnd,
	onNodeHover,
	onZoom,
	onZoomEnd,
	width,
}: {
	bindGraph: MutableRefObject<ForceGraphMethods<SimNode, SimLink> | undefined>;
	getLinkColor: (link: SimLink) => string;
	getLinkDash: (link: SimLink) => number[] | null;
	getLinkWidth: (link: SimLink) => number;
	graphData: { links: SimLink[]; nodes: SimNode[] };
	height: number;
	nodeCanvasObject: (
		node: SimNode,
		ctx: CanvasRenderingContext2D,
		globalScale: number
	) => void;
	onBackgroundClick: () => void;
	onEngineStop: () => void;
	onEngineTick: () => void;
	onNodeClick: (node: SimNode, event: MouseEvent) => void;
	onNodeDrag: () => void;
	onNodeDragEnd: () => void;
	onNodeHover: (node: SimNode | null) => void;
	onZoom: (transform: { k: number; x: number; y: number }) => void;
	onZoomEnd: (transform: { k: number; x: number; y: number }) => void;
	width: number;
}) {
	return (
		<ForceGraph2D<SimNode, SimLink>
			cooldownTicks={GRAPH_COOLDOWN_TICKS}
			cooldownTime={GRAPH_COOLDOWN_TIME}
			d3AlphaMin={GRAPH_D3_ALPHA_MIN}
			enableNodeDrag
			enableZoomInteraction
			graphData={graphData}
			height={height}
			linkColor={getLinkColor}
			linkLineDash={getLinkDash}
			linkWidth={getLinkWidth}
			nodeCanvasObject={nodeCanvasObject}
			nodeCanvasObjectMode={nodeCanvasReplaceMode}
			nodeLabel={emptyNodeLabel}
			nodePointerAreaPaint={paintPointerArea}
			onBackgroundClick={onBackgroundClick}
			onEngineStop={onEngineStop}
			onEngineTick={onEngineTick}
			onNodeClick={onNodeClick}
			onNodeDrag={onNodeDrag}
			onNodeDragEnd={onNodeDragEnd}
			onNodeHover={onNodeHover}
			onZoom={onZoom}
			onZoomEnd={onZoomEnd}
			ref={bindGraph}
			showPointerCursor
			width={width}
		/>
	);
}

const GraphForceCanvas = memo(ForceCanvas);

function nodeCanvasReplaceMode() {
	return "replace" as const;
}

function emptyNodeLabel() {
	return "";
}

function NodeTitleChip({
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
			aria-label={nodePlainTitle(node)}
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

function paintNode(
	node: SimNode,
	ctx: CanvasRenderingContext2D,
	globalScale: number,
	state: {
		focusedId: string | null;
		hover: SimNode | null;
		locateIds: Set<string> | null;
		selectedId: string | null;
		theme: GraphTheme;
	}
) {
	if (node.x === undefined || node.y === undefined) {
		return;
	}

	const nodeId = String(node.id);
	const selected = state.selectedId === nodeId;
	const hovered = state.hover !== null && String(state.hover.id) === nodeId;
	const located =
		state.locateIds !== null &&
		state.locateIds.size > 0 &&
		state.locateIds.has(nodeId);
	const dimmed =
		state.locateIds !== null && state.locateIds.size > 0 && !located;
	const radius = nodeRadius(node);
	const fill = nodeFill(node, state.theme);

	ctx.save();
	ctx.globalAlpha = dimmed ? 0.35 : 1;

	traceNodeGlyph(node, ctx, radius);
	ctx.fillStyle = fill;
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

function paintPointerArea(
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

function nodeFill(node: GraphNode, theme: GraphTheme): string {
	const { module } = node;
	if (module) {
		return theme.modules[module];
	}

	return theme.fallback;
}

function isEmphasisedLink({
	focusedId,
	hover,
	link,
	selectedId,
}: {
	focusedId: string | null;
	hover: SimNode | null;
	link: SimLink;
	selectedId: string | null;
}): boolean {
	const sourceId = endId(link.source);
	const targetId = endId(link.target);

	if (
		hover &&
		(String(hover.id) === sourceId || String(hover.id) === targetId)
	) {
		return true;
	}

	if (selectedId && (selectedId === sourceId || selectedId === targetId)) {
		return true;
	}

	return Boolean(
		focusedId && (focusedId === sourceId || focusedId === targetId)
	);
}

function linkColor({
	focusedId,
	hover,
	link,
	locateIds,
	selectedId,
	theme,
}: {
	focusedId: string | null;
	hover: SimNode | null;
	link: SimLink;
	locateIds: Set<string> | null;
	selectedId: string | null;
	theme: GraphTheme | null;
}): string {
	if (!theme) {
		return "#999";
	}

	const sourceId = endId(link.source);
	const targetId = endId(link.target);
	const locating = locateIds !== null && locateIds.size > 0;
	const dimmed =
		locating &&
		!(
			(sourceId && locateIds.has(sourceId)) ||
			(targetId && locateIds.has(targetId))
		);

	return graphEdgeInk(theme.foreground, {
		dimmed,
		emphasised: isEmphasisedLink({ focusedId, hover, link, selectedId }),
	});
}

function linkWidth(kind: SimLink["kind"], emphasised: boolean): number {
	return graphEdgeWidth(kind, emphasised);
}

function linkDash(kind: SimLink["kind"]): number[] | null {
	return graphEdgeDash(kind);
}

function nodeRadius(node: GraphNode): number {
	return isPageNode(node) ? LAYOUT_NODE_RADIUS_PAGE : LAYOUT_NODE_RADIUS_ENV;
}

function isSizeAnimating(element: HTMLElement): boolean {
	return element
		.getAnimations()
		.some((animation) => animation.playState === "running");
}

function sizeOf(element: HTMLElement): OverlaySize {
	return {
		height: element.offsetHeight,
		width: element.offsetWidth,
	};
}

function cachedSize(
	element: HTMLElement,
	cache: WeakMap<HTMLElement, OverlaySize>
): OverlaySize {
	const cached = cache.get(element);
	if (cached) {
		return cached;
	}

	const next = sizeOf(element);
	cache.set(element, next);
	return next;
}

function placePageLabel(
	el: HTMLElement,
	graph: ForceGraphMethods<SimNode, SimLink>,
	cache: Map<string, SimNode>,
	canvas: { height: number; width: number },
	scale: number,
	sizeCache: WeakMap<HTMLElement, OverlaySize>
) {
	const { id } = el.dataset;
	if (!id) {
		return;
	}

	const node = cache.get(id);
	if (!node || node.x === undefined || node.y === undefined) {
		el.style.visibility = "hidden";
		return;
	}

	const { x, y } = graph.graph2ScreenCoords(node.x, node.y);
	const { height, width } = cachedSize(el, sizeCache);
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

function applyForces(
	graph: ForceGraphMethods<SimNode, SimLink>,
	layout: GraphLayout | null,
	projection: GraphProjection
) {
	const scale = layout?.mode === "free" ? (layout.scale ?? 1) : 1;
	graph.d3Force(
		"link",
		forceLink<SimNode, SimLink>().distance(
			(link) =>
				(link.kind === "contains"
					? LAYOUT_CONTAINS_LINK_DISTANCE
					: LAYOUT_BASE_LINK_DISTANCE) * scale
		)
	);
	graph.d3Force(
		"charge",
		forceManyBody().strength(
			(layout?.mode === "radial"
				? LAYOUT_RADIAL_CHARGE_STRENGTH
				: LAYOUT_CHARGE_STRENGTH) * scale
		)
	);
	graph.d3Force(
		"collision",
		forceCollide<SimNode>().radius((node) => node.collideRadius ?? 36)
	);

	if (layout?.mode === "radial") {
		graph.d3Force(
			"radial",
			forceRadial<SimNode>((node) => {
				const distance = projection.distances.get(String(node.id)) ?? 0;
				return layout.radii[Math.min(distance, GRAPH_HOP_MAX)] ?? 0;
			}).strength(LAYOUT_RADIAL_STRENGTH)
		);
		return;
	}

	graph.d3Force("radial", null);
}

function syncGraphData(
	projection: GraphProjection,
	cache: Map<string, SimNode>,
	layout: GraphLayout
): { links: SimLink[]; nodes: SimNode[] } {
	const nextCache = new Map<string, SimNode>();
	const nodes: SimNode[] = [];

	for (const node of projection.nodes) {
		const previous = cache.get(node.id);
		const collisionRadius = layout.collideById.get(node.id);
		if (collisionRadius === undefined) {
			throw new Error(
				`Graph layout is missing a collision radius for "${node.id}".`
			);
		}
		const merged = previous
			? Object.assign(previous, node, { collideRadius: collisionRadius })
			: { ...node, collideRadius: collisionRadius };
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

function seedRadialNodes(
	nodes: SimNode[],
	projection: GraphProjection,
	layout: GraphLayout,
	placed: Map<string, SimNode>
) {
	const ordered = nodes.toSorted((left, right) => {
		const leftDistance = projection.distances.get(left.id) ?? 0;
		const rightDistance = projection.distances.get(right.id) ?? 0;
		return leftDistance - rightDistance;
	});

	for (const node of ordered) {
		if (node.x !== undefined && node.y !== undefined) {
			continue;
		}

		const neighborIds = projection.neighbors.get(node.id) ?? [];
		const centers: Array<{ x: number; y: number }> = [];
		for (const neighborId of neighborIds) {
			const neighbor = placed.get(neighborId);
			if (neighbor?.x === undefined || neighbor.y === undefined) {
				continue;
			}

			centers.push({ x: neighbor.x, y: neighbor.y });
		}

		const distance = projection.distances.get(node.id) ?? 0;
		const ring =
			layout.radii[Math.min(distance, GRAPH_HOP_MAX)] ?? layout.radii[1] ?? 0;
		const position = seedPosition(node.id, centers, ring);
		node.x = position.x;
		node.y = position.y;
	}
}

function endId(end: SimLink["source"]): string | undefined {
	if (end === undefined || end === null) {
		return;
	}

	if (typeof end === "object") {
		return end.id === undefined ? undefined : String(end.id);
	}

	return String(end);
}
