import type { Strand } from "@/lib/course/strands";
import {
	type Difficulty,
	type EnvKind,
	getKindLabel,
	isDerivation,
} from "@/lib/mdx-env/kinds";
import type { PromptTarget } from "@/lib/mdx-env/target";

export interface ExportNode {
	body?: string;
	description?: string;
	difficulty?: Difficulty;
	id: string;
	ideas?: string[];
	kind: EnvKind | "page";
	label: string;
	page?: string;
	slug?: string;
	statement?: string;
	strand?: Strand;
	tags?: string[];
	title: string;
	type: "page" | "env";
}

export function envId(pageUrl: string, anchor: string): string {
	return `${pageUrl}#${anchor}`;
}

export function bodyRole(node: ExportNode): string | undefined {
	if (isDerivation(node.kind)) {
		return getKindLabel(node.kind);
	}

	return node.statement === undefined ? undefined : "Notes";
}

export const EXPORT_EDGE_KINDS = [
	"contains",
	"uses",
	"proves",
	"practises",
	"see",
	"references",
	"recalls",
] as const;

export type ExportEdgeKind = (typeof EXPORT_EDGE_KINDS)[number];

export const DEPENDENCY_EDGES = [
	"uses",
	"proves",
	"practises",
] as const satisfies readonly ExportEdgeKind[];

export interface ExportEdge {
	kind: ExportEdgeKind;
	source: string;
	target: string;
}

export const RELATION_NAMES = {
	contains: ["contains", "part_of"],
	practises: ["practises", "practised_by"],
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
	practised_by: "Practised by",
	practises: "Practises",
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
	"practises",
	"recalls",
	"references",
	"see_also",
	"proved_by",
	"used_by",
	"practised_by",
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
	kind: EnvKind;
	label: string;
	parentId: string;
}

export interface ExportThreadMember {
	id: string;
	role?: string;
}

export interface ExportThread {
	id: string;
	label: string;
	members: readonly ExportThreadMember[];
	pageId: string;
	slug: string;
	summary: string;
	title: string;
}

export interface ExportThreadMembership {
	role?: string;
	thread: ExportThread;
}

export interface ExportGraph {
	edges: readonly ExportEdge[];
	incoming: ReadonlyMap<string, readonly ExportEdge[]>;
	kindViews: ReadonlyMap<string, ExportKindView>;
	nodes: ReadonlyMap<string, ExportNode>;
	outgoing: ReadonlyMap<string, readonly ExportEdge[]>;
	position: ReadonlyMap<string, number>;
	segments: ReadonlyMap<string, readonly ExportSegment[]>;
	threads: ReadonlyMap<string, ExportThread>;
	threadsOf: ReadonlyMap<string, readonly ExportThreadMembership[]>;
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

export interface PromptContext extends PromptTarget {
	blocks: ContextBlock[];
}
