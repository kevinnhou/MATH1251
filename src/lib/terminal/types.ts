import type { GraphRuntime } from "@/lib/graph/runtime";
import type {
	InlineLabel,
	MarkdownFragment,
	RenderedMarkdown,
} from "@/lib/markdown/types";
import type { GraphModule } from "@/lib/site/strands";

export const TERMINAL_HISTORY_LIMIT = 50;
export const TERMINAL_HISTORY_KEY = "math1251-terminal-history";
export const TERMINAL_COMPLETION_LIMIT = 8;

export type TerminalMode = "browse" | "edit" | "output";

export type TerminalPane = "tree" | "output";

export interface CatalogPage {
	aliases: string[];
	breadcrumbs: string[];
	description?: MarkdownFragment<"inline">;
	kindView: boolean;
	markdownUrl: string;
	parentUrl: string | null;
	strand?: GraphModule;
	title: MarkdownFragment<"inline">;
	url: string;
}

export interface PageCatalog {
	pages: CatalogPage[];
}

export interface CurrentPages {
	inCatalog: boolean;
	route: CatalogPage;
	source: CatalogPage;
}

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

export interface TerminalRecord {
	echo: string;
	output: TerminalOutput;
}

export interface CommandRuntime {
	fetchMarkdown: (url: string, signal: AbortSignal) => Promise<string>;
	openExternal: (url: string) => boolean;
	origin: string;
	searchNotes: (query: string, signal: AbortSignal) => Promise<SearchHit[]>;
}

export interface CompleteContext {
	catalog: PageCatalog;
	current: CurrentPages;
	graph: GraphRuntime;
	parsed: ParsedLine;
}

export interface ExecuteContext {
	catalog: PageCatalog;
	current: CurrentPages;
	graph: GraphRuntime;
	parsed: ParsedLine;
	runtime: CommandRuntime;
	signal: AbortSignal;
}

export interface CommandResult {
	closeDrawer?: boolean;
	navigate?: string;
	output: TerminalOutput | null;
}

export interface CommandDescriptor {
	advertised: boolean;
	complete?: (ctx: CompleteContext) => Completion[];
	execute: (ctx: ExecuteContext) => Promise<CommandResult> | CommandResult;
	id: string;
	loading?: string;
	names: readonly string[];
	usage: string;
}
