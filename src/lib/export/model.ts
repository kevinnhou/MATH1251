import type { GraphModule } from "@/lib/course/strands";
import type { ExampleDifficulty, MathEnvKind } from "@/lib/math-env/kinds";

export const COURSE = "MATH1251 Mathematics 1B (UNSW Sydney)";

export interface ExportNode {
	body?: string;
	description?: string;
	difficulty?: ExampleDifficulty;
	id: string;
	ideas?: string[];
	kind: MathEnvKind | "page";
	label: string;
	page?: string;
	slug?: string;
	statement?: string;
	strand?: GraphModule;
	tags?: string[];
	title: string;
	type: "page" | "env";
}

export function envId(pageUrl: string, anchor: string): string {
	return `${pageUrl}#${anchor}`;
}

export function bodyRole(node: ExportNode): "Proof" | "Notes" | undefined {
	if (node.kind === "proof") {
		return "Proof";
	}

	return node.statement === undefined ? undefined : "Notes";
}

export const EXPORT_EDGE_KINDS = [
	"contains",
	"uses",
	"proves",
	"see",
	"references",
	"recalls",
] as const;

export type ExportEdgeKind = (typeof EXPORT_EDGE_KINDS)[number];

export interface ExportEdge {
	kind: ExportEdgeKind;
	source: string;
	target: string;
}

export const RELATION_NAMES = {
	contains: ["contains", "part_of"],
	proves: ["proves", "proved_by"],
	recalls: ["recalls", "recalled_by"],
	references: ["references", "referenced_by"],
	see: ["see_also", "see_also"],
	uses: ["uses", "used_by"],
} as const satisfies Record<ExportEdgeKind, readonly [string, string]>;

export type RelationName = (typeof RELATION_NAMES)[ExportEdgeKind][number];

export const RELATION_LABELS: Record<RelationName, string> = {
	contains: "Contains",
	part_of: "Part of",
	proved_by: "Proved by",
	proves: "Proves",
	recalled_by: "Recalled by",
	recalls: "Recalls",
	referenced_by: "Referenced by",
	references: "References",
	see_also: "See also",
	used_by: "Used by",
	uses: "Uses",
};

function everyOf<T extends string>() {
	return <const L extends readonly T[]>(
		list: L & ([Exclude<T, L[number]>] extends [never] ? unknown : never)
	): L => list;
}

export const RELATION_ORDER = everyOf<RelationName>()([
	"part_of",
	"contains",
	"proves",
	"uses",
	"recalls",
	"references",
	"see_also",
	"proved_by",
	"used_by",
	"recalled_by",
	"referenced_by",
]);

export interface Relation {
	name: RelationName;
	node: ExportNode;
}

export type ExportSegment =
	| { markdown: string; type: "prose" }
	| { id: string; type: "env" | "recall" };

export interface ExportKindView {
	id: string;
	kind: MathEnvKind;
	label: string;
	parentId: string;
}

export interface ExportGraph {
	edges: readonly ExportEdge[];
	incoming: ReadonlyMap<string, readonly ExportEdge[]>;
	kindViews: ReadonlyMap<string, ExportKindView>;
	nodes: ReadonlyMap<string, ExportNode>;
	outgoing: ReadonlyMap<string, readonly ExportEdge[]>;
	position: ReadonlyMap<string, number>;
	segments: ReadonlyMap<string, readonly ExportSegment[]>;
}

export const CONTEXT_TIERS = [
	"core",
	"relations",
	"details",
	"prerequisites",
	"backlinks",
] as const;

export type ContextTier = (typeof CONTEXT_TIERS)[number];

export interface ContextBlock {
	text: string;
	tier: ContextTier;
}

export interface PromptTarget {
	hasProof: boolean;
	id: string;
	kind: MathEnvKind | "page";
	label: string;
	type: "page" | "env" | "kind-view";
}

export interface PromptContext extends PromptTarget {
	blocks: ContextBlock[];
}
