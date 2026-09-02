import type { MarkdownFragment, RenderedMarkdown } from "@/lib/markdown/types";
import type { MathEnvKind } from "@/lib/math-env/kinds";
import type { GraphModule } from "@/lib/site/strands";

export {
	GRAPH_MODULES,
	type GraphModule,
	isGraphModule,
	STRAND_LABELS as GRAPH_MODULE_LABELS,
} from "@/lib/site/strands";

export const GRAPH_STRAND_ARGS = [
	"all",
	"core",
	"algebra",
	"calculus",
] as const;

export type GraphStrandArg = (typeof GRAPH_STRAND_ARGS)[number];

export const GRAPH_DEPTH_ARGS = ["1", "2", "3", "all"] as const;

export const GRAPH_HOP_MAX = 3;

export const GRAPH_REACH_HOPS = [1, 2, 3] as const;

export const GRAPH_REACH_ALL = "all" as const;

export const GRAPH_EDGE_KINDS = [
	"reference",
	"contains",
	"of",
	"see",
	"recall",
] as const;

export type GraphEdgeKind = (typeof GRAPH_EDGE_KINDS)[number];

export type GraphHopReach = (typeof GRAPH_REACH_HOPS)[number];

export type GraphReach = GraphHopReach | typeof GRAPH_REACH_ALL;

export type GraphLayoutMode = "free" | "radial";

export interface PageNode {
	description?: MarkdownFragment<"inline">;
	id: string;
	ideas: string[];
	module: GraphModule;
	tags: string[];
	title: MarkdownFragment<"inline">;
	type: "page";
}

export interface EnvNode {
	id: string;
	kind: MathEnvKind;
	module: GraphModule;
	pageId: string;
	preview?: RenderedMarkdown<"block">;
	slug: string;
	title: MarkdownFragment<"inline">;
	type: "env";
}

export type GraphNode = EnvNode | PageNode;

export interface GraphEdge {
	id: string;
	kind: GraphEdgeKind;
	source: string;
	target: string;
}

export interface GraphDocument {
	edges: GraphEdge[];
	nodes: GraphNode[];
}

export interface GraphQuery {
	focus: { id: string; reach: GraphReach };
	module: GraphModule | null;
}

export interface GraphProjection {
	distances: Map<string, number>;
	edges: GraphEdge[];
	layout: GraphLayoutMode;
	neighbors: Map<string, string[]>;
	nodes: GraphNode[];
}

export function isGraphHopReach(value: number): value is GraphHopReach {
	return GRAPH_REACH_HOPS.some((hop) => hop === value);
}

export function isGraphReach(value: unknown): value is GraphReach {
	return (
		value === GRAPH_REACH_ALL ||
		(typeof value === "number" && isGraphHopReach(value))
	);
}

export function isPageNode(node: GraphNode): node is PageNode {
	return node.type === "page";
}

export function isEnvNode(node: GraphNode): node is EnvNode {
	return node.type === "env";
}

export function isAllReach(reach: GraphReach): reach is typeof GRAPH_REACH_ALL {
	return reach === GRAPH_REACH_ALL;
}

export function graphEdgeId(
	kind: GraphEdgeKind,
	source: string,
	target: string
): string {
	return `${kind}\0${source}\0${target}`;
}
