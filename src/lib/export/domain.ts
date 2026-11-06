import type { MarkdownSyntax } from "@/lib/markdown/syntax";
import type { PropValue } from "@/lib/mdx-env/page-envs";
import type {
	ContextBlock,
	ExportNode,
	ExportSegment,
	ExportThreadMembership,
	Relation,
	RelationName,
} from "./model";
import type { Prerequisite } from "./query";

export type ExportSurface =
	| "context"
	| "env"
	| "kind-view"
	| "llms-full"
	| "page"
	| "thread";

export interface GraphReader {
	derivations: (id: string) => readonly ExportNode[];
	node: (id: string) => ExportNode | undefined;
	nodes: () => readonly ExportNode[];
	prerequisites: (id: string) => readonly Prerequisite[];
	relations: (
		id: string,
		names?: readonly RelationName[]
	) => readonly Relation[];
	threads: (id: string) => readonly ExportThreadMembership[];
}

export interface ComponentInput {
	children: string;
	env?: ExportNode;
	graph: GraphReader;
	link: (id: string) => string;
	page: ExportNode;
	props: Readonly<Record<string, PropValue>>;
	resolve: (slug: string) => ExportNode | undefined;
	segment: number;
	segments: readonly ExportSegment[];
	surface: ExportSurface;
	tag: string;
}

export type ContextOutput =
	| string
	| { blocks?: readonly ContextBlock[]; text: string };

export interface ComponentExport {
	context?: (input: ComponentInput) => ContextOutput;
	markdown?: (input: ComponentInput) => string;
}

export interface DomainServer {
	components?: Readonly<Record<string, ComponentExport>>;
	syntax?: MarkdownSyntax;
}
