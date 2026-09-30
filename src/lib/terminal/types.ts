import type {
	CatalogPage,
	CurrentPages,
	PageCatalog,
} from "@/lib/course/catalog";
import type { OpenPromptRequest, OpenPromptResult } from "@/lib/export/client";
import type { GraphRuntime } from "@/lib/graph/runtime";
import type { InlineLabel, RenderedMarkdown } from "@/lib/markdown/types";

export const TERMINAL_HISTORY_LIMIT = 50;
export const TERMINAL_HISTORY_KEY = "math1251-terminal-history";
export const TERMINAL_COMPLETION_LIMIT = 8;

export type TerminalMode = "browse" | "edit" | "output";

export type TerminalPane = "tree" | "output";

export interface Token {
	end: number;
	start: number;
	value: string;
}

export interface ParsedLine {
	partial: string;
	raw: string;
	tokens: Token[];
	trailingSpace: boolean;
}

export interface Completion {
	detail?: InlineLabel;
	label: InlineLabel;
	replace: string;
}

export type ResolveOutcome =
	| { kind: "empty" }
	| { kind: "none"; query: string }
	| { kind: "ambiguous"; query: string; pages: CatalogPage[] }
	| { kind: "match"; page: CatalogPage };

export interface OutputLink {
	hint?: string;
	label: InlineLabel;
	url: string;
}

export interface LinkGroup {
	heading: string;
	items: OutputLink[];
}

export interface SearchDocument {
	content: string;
	type: string;
	url: string;
}

export interface SearchHit {
	path: string;
	snippet?: RenderedMarkdown<"block">;
	title: RenderedMarkdown<"inline">;
	url: string;
}

export interface OutputAction {
	label: string;
	url: string;
}

export type TerminalOutput =
	| { kind: "loading"; message: string }
	| { kind: "error"; message: string }
	| { kind: "usage"; message: string }
	| {
			action?: OutputAction;
			kind: "message";
			message: string;
			tone?: "muted";
	  }
	| { kind: "link-list"; groups: LinkGroup[]; message?: string; title?: string }
	| {
			kind: "search-results";
			hits: SearchHit[];
			message: string;
			query: string;
	  }
	| {
			kind: "markdown";
			markdown: string;
			markdownUrl: string;
			title: string;
	  }
	| {
			actionUrl?: string;
			kind: "inspect";
			message?: string;
			nodeId: string;
			preview?: RenderedMarkdown<"block" | "inline">;
			title: InlineLabel;
			type?: string;
	  };

export interface CommandRuntime {
	fetchMarkdown: (url: string, signal: AbortSignal) => Promise<string>;
	openPrompt: (request: OpenPromptRequest) => Promise<OpenPromptResult>;
	origin: string;
	searchNotes: (query: string, signal: AbortSignal) => Promise<SearchHit[]>;
}

export interface CompleteContext {
	catalog: PageCatalog;
	current: CurrentPages;
	cwd: string;
	graph: GraphRuntime;
	parsed: ParsedLine;
}

export interface ExecuteContext extends CompleteContext {
	runtime: CommandRuntime;
	signal: AbortSignal;
}

export interface CommandResult {
	announce?: string;
	closeDrawer?: boolean;
	cwd?: string;
	navigate?: string;
	output: TerminalOutput | null;
	view?: TreeView | null;
}

export interface SearchResult {
	hits: SearchHit[];
	url: string;
}

export type TreeView =
	| { dir: string; kind: "list" }
	| { kind: "search"; query: string; results: SearchResult[] };

export interface TerminalLocation {
	cwd: string;
	view: TreeView | null;
}

export interface CommandDescriptor {
	advertised: boolean;
	complete?: (ctx: CompleteContext) => Completion[];
	execute: (ctx: ExecuteContext) => Promise<CommandResult> | CommandResult;
	loading?: string;
	names: readonly string[];
	usage: string;
}
