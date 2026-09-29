"use client";

import {
	lazy,
	type MutableRefObject,
	memo,
	type ReactNode,
	type RefObject,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/cn";
import {
	type GraphNode,
	type GraphProjection,
	type GraphReach,
	isPageNode,
} from "@/lib/graph/types";
import { useAutoFit, useCanvasSize, useGraphTheme } from "./canvas-hooks";
import {
	type LabelSizes,
	measureLabels,
	NodeTitleChip,
	placeLabels,
} from "./canvas-labels";
import {
	isDimmed,
	linkColor,
	linkDash,
	linkWidth,
	type PaintState,
	paintNode,
	paintPointerArea,
} from "./canvas-paint";
import {
	applyForces,
	buildGraphLayout,
	type ForceGraph,
	type SimLink,
	type SimNode,
	syncGraphData,
} from "./canvas-sim";

const ForceGraph2D = lazy(
	() => import("react-force-graph-2d")
) as typeof import("react-force-graph-2d").default;

const GRAPH_D3_ALPHA_MIN = 0.05;
const GRAPH_COOLDOWN_TICKS = 90;
const GRAPH_COOLDOWN_TIME = 1200;
const replaceMode = () => "replace" as const;
const noNodeLabel = () => "";

interface GraphCanvasProps {
	fitKey: string;
	focusedId: string;
	locateIds: Set<string> | null;
	onOpen: (url: string) => void;
	onSelect: (id: string | null) => void;
	projection: GraphProjection;
	reach: GraphReach;
	selectedId: string | null;
}

export function GraphCanvas({
	children,
	className,
	immersed,
	...graph
}: GraphCanvasProps & {
	children?: ReactNode;
	className?: string;
	immersed: boolean;
}) {
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
					<ClientGraph containerRef={containerRef} {...graph} />
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
}: GraphCanvasProps & { containerRef: RefObject<HTMLDivElement | null> }) {
	const fgRef = useRef<ForceGraph | undefined>(undefined);
	const labelsRef = useRef<HTMLDivElement>(null);
	const nodeCache = useRef(new Map<string, SimNode>());
	const labelSizesRef = useRef<LabelSizes>(new WeakMap());
	const size = useCanvasSize(containerRef);
	const theme = useGraphTheme(containerRef);
	const { onNodeDragEnd, onZoom, onZoomEnd, tryFit } = useAutoFit(
		fgRef,
		containerRef,
		fitKey,
		size
	);
	const layout = useMemo(
		() => buildGraphLayout(projection, reach),
		[projection, reach]
	);

	// The force graph is memoised with stable callbacks, which read the
	// latest props from here.
	const live = useRef({ layout, onOpen, onSelect, projection });
	live.current = { layout, onOpen, onSelect, projection };
	const paintRef = useRef<PaintState>({
		focusedId,
		hover: null,
		locateIds,
		selectedId,
		theme,
	});
	paintRef.current = {
		...paintRef.current,
		focusedId,
		locateIds,
		selectedId,
		theme,
	};

	const bindGraph = useMemo(
		(): MutableRefObject<ForceGraph | undefined> => ({
			get current() {
				return fgRef.current;
			},
			set current(graph) {
				fgRef.current = graph;
				if (graph) {
					applyForces(graph, live.current.layout, live.current.projection);
				}
			},
		}),
		[]
	);

	const moveLabels = useCallback(() => {
		const root = labelsRef.current;
		const graph = fgRef.current;
		const container = containerRef.current;
		if (root && graph && container) {
			placeLabels(
				root,
				graph,
				nodeCache.current,
				{ height: container.clientHeight, width: container.clientWidth },
				labelSizesRef.current
			);
		}
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
		if (graph) {
			applyForces(graph, layout, projection);
		}
	}, [layout, projection]);

	useEffect(() => {
		const { hover } = paintRef.current;
		if (hover && !projection.nodes.some((node) => node.id === hover.id)) {
			paintRef.current.hover = null;
			fgRef.current?.resumeAnimation();
		}
	}, [projection]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: focus, locate and theme only repaint.
	useLayoutEffect(() => {
		labelSizesRef.current = labelsRef.current
			? measureLabels(labelsRef.current)
			: new WeakMap();
		if (size.width === 0 || size.height === 0) {
			return;
		}

		if (labelledNodes.length > 0) {
			moveLabels();
		}
		fgRef.current?.resumeAnimation();
	}, [focusedId, locateIds, labelledNodes, moveLabels, size, theme]);

	const nodeCanvasObject = useCallback(
		(node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
			const state = paintRef.current;
			if (node.x !== undefined && node.y !== undefined && state.theme) {
				paintNode(node, ctx, globalScale, { ...state, theme: state.theme });
			}
		},
		[]
	);

	const getLinkColor = useCallback(
		(link: SimLink) => linkColor(link, paintRef.current),
		[]
	);

	const getLinkWidth = useCallback(
		(link: SimLink) => linkWidth(link, paintRef.current),
		[]
	);

	const handleEngineStop = useCallback(() => {
		tryFit();
		moveLabels();
	}, [moveLabels, tryFit]);

	const handleBackgroundClick = useCallback(() => {
		live.current.onSelect(null);
		paintRef.current.hover = null;
		fgRef.current?.resumeAnimation();
	}, []);

	const activateNode = useCallback((node: GraphNode, clicks = 1) => {
		if (clicks >= 2) {
			live.current.onOpen(node.id);
		} else {
			live.current.onSelect(node.id);
		}
	}, []);
	const handleNodeClick = useCallback(
		(node: SimNode, event: MouseEvent) => activateNode(node, event.detail),
		[activateNode]
	);

	const hoverNode = useCallback((node: SimNode | null) => {
		paintRef.current.hover = node;
		fgRef.current?.resumeAnimation();
	}, []);

	const handleTitleHover = useCallback(
		(node: GraphNode | null) => {
			hoverNode(node ? (nodeCache.current.get(node.id) ?? null) : null);
		},
		[hoverNode]
	);

	const handleNodeDragEnd = useCallback(() => {
		moveLabels();
		onNodeDragEnd();
	}, [moveLabels, onNodeDragEnd]);

	const handleZoom = useCallback(
		(transform: { k: number; x: number; y: number }) => {
			moveLabels();
			onZoom(transform);
		},
		[moveLabels, onZoom]
	);

	const handleZoomEnd = useCallback(
		(transform: { k: number; x: number; y: number }) => {
			moveLabels();
			onZoomEnd(transform);
		},
		[moveLabels, onZoomEnd]
	);

	if (size.width === 0 || size.height === 0 || theme === null) {
		return null;
	}

	const labelled = new Set(labelledNodes.map((node) => node.id));

	return (
		<>
			<GraphForceCanvas
				bindGraph={bindGraph}
				getLinkColor={getLinkColor}
				getLinkWidth={getLinkWidth}
				graphData={graphData}
				height={size.height}
				nodeCanvasObject={nodeCanvasObject}
				onBackgroundClick={handleBackgroundClick}
				onEngineStop={handleEngineStop}
				onEngineTick={moveLabels}
				onNodeClick={handleNodeClick}
				onNodeDrag={moveLabels}
				onNodeDragEnd={handleNodeDragEnd}
				onNodeHover={hoverNode}
				onZoom={handleZoom}
				onZoomEnd={handleZoomEnd}
				width={size.width}
			/>
			<div className="pointer-events-none absolute inset-0 z-9" ref={labelsRef}>
				{labelledNodes.map((node) => (
					<NodeTitleChip
						active={selectedId === node.id}
						dimmed={isDimmed(locateIds, node.id)}
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
						.filter((node) => !labelled.has(node.id))
						.map((node) => (
							<li key={node.id}>
								<a href={node.id}>{node.title.plain}</a>
							</li>
						))}
				</ul>
			</nav>
		</>
	);
}

const GraphForceCanvas = memo(function ForceCanvas({
	bindGraph,
	getLinkColor,
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
	bindGraph: MutableRefObject<ForceGraph | undefined>;
	getLinkColor: (link: SimLink) => string;
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
			linkLineDash={linkDash}
			linkWidth={getLinkWidth}
			nodeCanvasObject={nodeCanvasObject}
			nodeCanvasObjectMode={replaceMode}
			nodeLabel={noNodeLabel}
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
});
