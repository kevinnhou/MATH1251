import { formatPageRelated, selectPageRelated } from "@/lib/graph/related";
import { formatRefLink } from "@/lib/math-env/export-markdown";
import {
	formatAskPrompt,
	LLM_PROVIDER_LABELS,
	llmUrls,
} from "@/lib/site/llm-ask";
import { isGraphModule } from "@/lib/site/strands";
import { isSafeExternalUrl, toAbsoluteUrl } from "@/lib/site/url";
import { graphCommand } from "./graph-command";
import {
	ambiguousOutput,
	errorOutput,
	groupedLinks,
	markdownOutput,
	messageOutput,
	searchHitsOutput,
	strandGroups,
	usageOutput,
} from "./output";
import { findPageByUrl } from "./pages";
import { argumentText, commandToken, parseLine, quoteIfNeeded } from "./parse";
import {
	advertisedNames,
	type CommandRegistry,
	findRegistered,
} from "./registry";
import { rankPages, resolvePage } from "./resolve";
import type {
	CatalogPage,
	CommandDescriptor,
	CommandResult,
	CompleteContext,
	Completion,
	CurrentPages,
	ExecuteContext,
	PageCatalog,
	ParsedLine,
	ResolveOutcome,
	TerminalOutput,
} from "./types";
import { TERMINAL_COMPLETION_LIMIT } from "./types";

const LEADING_SLASH = /^\//;

export function coreDescriptors(): CommandDescriptor[] {
	return [
		command("cd", ["cd"], executeCd, completePageArgument, "cd <page>"),
		command("ls", ["ls"], executeLs, completePageArgument, "ls [strand|path]"),
		command("md", ["md"], executeMarkdown, completePageArgument, "md <page|.>"),
		command(
			"gpt",
			["gpt", "chatgpt"],
			(ctx) => executeAsk(ctx, "gpt"),
			completePageArgument,
			"gpt <page|.>"
		),
		command(
			"claude",
			["claude"],
			(ctx) => executeAsk(ctx, "claude"),
			completePageArgument,
			"claude <page|.>"
		),
		command(
			"cursor",
			["cursor"],
			(ctx) => executeAsk(ctx, "cursor"),
			completePageArgument,
			"cursor <page|.>"
		),
		graphCommand(),
		{
			advertised: true,
			execute: () => done(helpOutput()),
			id: "help",
			names: ["help"],
			usage: "help",
		},
		{
			advertised: true,
			execute: (ctx) => done(messageOutput(ctx.current.route.url)),
			id: "pwd",
			names: ["pwd"],
			usage: "pwd",
		},
		{
			advertised: true,
			execute: () => done(null),
			id: "clear",
			names: ["clear"],
			usage: "clear",
		},
		{
			advertised: false,
			execute: executeNotesSearch,
			id: "search",
			loading: "Searching…",
			names: [],
			usage: "",
		},
	];
}

function command(
	id: string,
	names: readonly string[],
	execute: CommandDescriptor["execute"],
	complete: CommandDescriptor["complete"],
	usage: string
): CommandDescriptor {
	return {
		advertised: true,
		complete,
		execute,
		id,
		names,
		usage,
	};
}

function done(
	output: TerminalOutput | null,
	extra?: Omit<CommandResult, "output">
): CommandResult {
	return extra ? { output, ...extra } : { output };
}

export function lookupCommand(
	input: string,
	registry: CommandRegistry
): { descriptor?: CommandDescriptor; parsed: ParsedLine } {
	const parsed = parseLine(input);
	return { descriptor: descriptorFor(parsed, registry), parsed };
}

function descriptorFor(
	parsed: ParsedLine,
	registry: CommandRegistry
): CommandDescriptor | undefined {
	const name = commandToken(parsed)?.toLowerCase();
	if (name === undefined || name === "") {
		return;
	}

	return findRegistered(registry, name) ?? registry.fallback;
}

export function completeLine(
	parsed: ParsedLine,
	catalog: PageCatalog,
	current: CurrentPages,
	registry: CommandRegistry,
	graph: CompleteContext["graph"]
): Completion[] {
	if (parsed.tokens.length === 0) {
		return commandCompletions("", registry);
	}

	if (parsed.tokens.length === 1 && !parsed.trailingSpace) {
		return commandCompletions(parsed.partial, registry);
	}

	return (
		descriptorFor(parsed, registry)?.complete?.({
			catalog,
			current,
			graph,
			parsed,
		}) ?? []
	);
}

function executeCd(ctx: ExecuteContext): CommandResult {
	const query = argumentText(ctx.parsed);
	const resolved = resolvePage(ctx.catalog, query, ctx.current.route);
	if (resolved.kind === "empty") {
		return done(usageOutput("cd <page>"));
	}

	if (resolved.kind === "none") {
		return done(errorOutput(`cd: no such page: ${query}`));
	}

	if (resolved.kind === "ambiguous") {
		return done(ambiguousOutput(query, resolved.pages));
	}

	if (resolved.page.url === ctx.current.route.url) {
		return done(messageOutput(`${resolved.page.url}`), { closeDrawer: true });
	}

	return done(messageOutput(`${resolved.page.url}`), {
		closeDrawer: true,
		navigate: resolved.page.url,
	});
}

function executeLs(ctx: ExecuteContext): CommandResult {
	const filter = argumentText(ctx.parsed).toLowerCase();
	const pages = ctx.catalog.pages.filter((page) =>
		matchesLsFilter(page, filter)
	);
	if (pages.length === 0) {
		return done(
			errorOutput(
				filter === ""
					? "ls: nothing to list."
					: `ls: no pages match "${filter}".`
			)
		);
	}

	return done(
		groupedLinks(strandGroups(pages), {
			title: filter === "" ? "pages" : `pages matching ${filter}`,
		})
	);
}

function matchesLsFilter(page: CatalogPage, filter: string): boolean {
	if (page.kindView) {
		return false;
	}

	if (filter === "") {
		return true;
	}

	if (isGraphModule(filter)) {
		return page.strand === filter;
	}

	const path = page.url.replace(LEADING_SLASH, "").toLowerCase();
	return (
		path.startsWith(filter) ||
		page.title.source.toLowerCase().startsWith(filter) ||
		page.title.plain.toLowerCase().startsWith(filter) ||
		page.url.toLowerCase().startsWith(`/${filter}`)
	);
}

async function executeNotesSearch(ctx: ExecuteContext): Promise<CommandResult> {
	const query = ctx.parsed.raw.trim();
	try {
		const results = await ctx.runtime.searchNotes(query, ctx.signal);
		return done(searchHitsOutput(query, results));
	} catch (error) {
		if (ctx.signal.aborted || isAbortError(error)) {
			return done(null);
		}

		return done(
			errorOutput("Search failed. Check your connection and try again.")
		);
	}
}

async function executeMarkdown(ctx: ExecuteContext): Promise<CommandResult> {
	const resolved = notesPage(ctx);
	if (resolved.kind !== "match") {
		return done(resolveToOutput(ctx, resolved));
	}

	const { page } = resolved;
	if (page.markdownUrl === "") {
		return done(errorOutput("md: not a notes page."));
	}

	try {
		const markdown = await ctx.runtime.fetchMarkdown(
			page.markdownUrl,
			ctx.signal
		);
		return done(
			markdownOutput({
				markdown,
				markdownUrl: page.markdownUrl,
				title: page.title.plain,
			})
		);
	} catch (error) {
		if (ctx.signal.aborted || isAbortError(error)) {
			return done(null);
		}

		return done(errorOutput(`md: unable to fetch Markdown for ${page.url}.`));
	}
}

function executeAsk(
	ctx: ExecuteContext,
	provider: "gpt" | "claude" | "cursor"
): CommandResult {
	const resolved = notesPage(ctx);
	if (resolved.kind !== "match") {
		return done(resolveToOutput(ctx, resolved));
	}

	const { page } = resolved;
	if (page.markdownUrl === "") {
		return done(errorOutput(`${provider}: not a notes page.`));
	}

	const markdownUrl = toAbsoluteUrl(page.markdownUrl, ctx.runtime.origin);
	const prompt = formatAskPrompt({
		related: askRelatedLines(ctx, page),
		source: {
			type: page.kindView ? "kind-view" : "page",
			url: markdownUrl,
		},
		task: page.kindView ? "kind-view" : "page",
	});
	const urls = llmUrls(prompt);
	const href = provider === "gpt" ? urls.chatgpt : urls[provider];
	if (!isSafeExternalUrl(href)) {
		return done(errorOutput(`${provider}: blocked an unsupported URL.`));
	}

	const opened = ctx.runtime.openExternal(href);
	const label =
		provider === "gpt"
			? LLM_PROVIDER_LABELS.chatgpt
			: LLM_PROVIDER_LABELS[provider];
	if (opened) {
		return done(messageOutput(`Opened ${page.title.plain} in ${label}.`), {
			closeDrawer: true,
		});
	}

	return done(
		messageOutput(`Pop-up blocked. Open ${label} from the link below.`, {
			label: `Open ${label}`,
			url: href,
		})
	);
}

function notesPage(ctx: ExecuteContext): ResolveOutcome {
	const query = argumentText(ctx.parsed);
	if (!ctx.current.inCatalog && (query === "" || query === ".")) {
		return { kind: "none", query: query === "" ? "." : query };
	}

	return resolvePage(
		ctx.catalog,
		query === "" ? "." : query,
		ctx.current.route
	);
}

function askRelatedLines(ctx: ExecuteContext, page: CatalogPage): string[] {
	const { origin } = ctx.runtime;
	if (page.kindView) {
		if (page.parentUrl === null) {
			return [];
		}

		const parent = findPageByUrl(ctx.catalog, page.parentUrl);
		return [
			formatRefLink({
				href: page.parentUrl,
				label: "Notes",
				origin,
				title: parent?.title.source ?? page.parentUrl,
			}),
		];
	}

	if (ctx.graph.status !== "ready") {
		return [];
	}

	return formatPageRelated(selectPageRelated(ctx.graph.document, page.url), {
		origin,
	});
}

function resolveToOutput(
	ctx: ExecuteContext,
	resolved: Exclude<ResolveOutcome, { kind: "match" }>
): TerminalOutput {
	const query = argumentText(ctx.parsed);
	if (resolved.kind === "empty") {
		return usageOutput(`${commandToken(ctx.parsed)} <page|.>`);
	}

	if (resolved.kind === "ambiguous") {
		return ambiguousOutput(query, resolved.pages);
	}

	if (!ctx.current.inCatalog && (query === "" || query === ".")) {
		return errorOutput("not a notes page.");
	}

	return errorOutput(`no such page: ${query === "" ? "." : query}`);
}

function completePageArgument(ctx: CompleteContext): Completion[] {
	const partial = argumentPartial(ctx.parsed);
	const current = ctx.current.route;
	if (partial === "." || partial.startsWith(".")) {
		const parent = current.parentUrl
			? findPageByUrl(ctx.catalog, current.parentUrl)
			: undefined;
		return [
			{
				detail: current.title,
				label: ".",
				replace: quoteIfNeeded("."),
			},
			...(current.parentUrl
				? [
						{
							detail: parent?.title ?? "parent",
							label: "..",
							replace: quoteIfNeeded(".."),
						},
					]
				: []),
		];
	}

	const pages =
		partial === ""
			? ctx.catalog.pages.filter((page) => !page.kindView)
			: rankPages(ctx.catalog, partial, current).map(({ page }) => page);

	return pages.slice(0, TERMINAL_COMPLETION_LIMIT).map((page) => ({
		detail: page.url,
		label: page.title,
		replace: quoteIfNeeded(page.url),
	}));
}

function commandCompletions(
	partial: string,
	registry: CommandRegistry
): Completion[] {
	const needle = partial.toLowerCase();
	return advertisedNames(registry)
		.filter((name) => needle === "" || name.startsWith(needle))
		.slice(0, TERMINAL_COMPLETION_LIMIT)
		.map((name) => ({
			label: name,
			replace: name,
		}));
}

function argumentPartial(parsed: ParsedLine): string {
	if (parsed.trailingSpace) {
		return "";
	}

	return argumentText(parsed);
}

function helpOutput(): TerminalOutput {
	const lines = coreDescriptors()
		.filter((descriptor) => descriptor.advertised)
		.map((descriptor) => `  ${descriptor.usage}`);
	return usageOutput(
		["Try:", ...lines, "  anything else searches the notes"].join("\n")
	);
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
