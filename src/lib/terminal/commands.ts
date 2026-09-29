import { formatPageRelated, selectPageRelated } from "@/lib/graph/related";
import { formatRefLink } from "@/lib/math-env/export-markdown";
import {
	formatAskPrompt,
	LLM_PROVIDER_LABELS,
	llmUrls,
} from "@/lib/site/llm-ask";
import { isSafeExternalUrl, toAbsoluteUrl } from "@/lib/site/url";
import {
	childDirectories,
	type DirectoryOutcome,
	displayPath,
	resolveDirectory,
	resolveRoot,
	rootOf,
	roots,
} from "./dirs";
import { graphCommand } from "./graph-command";
import {
	ambiguousOutput,
	errorOutput,
	markdownOutput,
	messageOutput,
	searchHitsOutput,
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

export function coreDescriptors(): CommandDescriptor[] {
	return [
		command("cd", ["cd"], executeCd, completeDirectoryArgument, "cd [dir|..]"),
		command("ls", ["ls"], executeLs, completeDirectoryArgument, "ls [dir]"),
		command(
			"open",
			["open"],
			executeOpen,
			completePageArgument,
			"open <page|dir>"
		),
		command(
			"switch",
			["switch", "checkout"],
			executeSwitch,
			completeRootArgument,
			"switch <root>"
		),
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
			execute: (ctx) => done(messageOutput(displayPath(ctx.cwd))),
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
	cwd: string,
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
			cwd,
			graph,
			parsed,
		}) ?? []
	);
}

function executeCd(ctx: ExecuteContext): CommandResult {
	const query = argumentText(ctx.parsed);
	const resolved = resolveDirectory(ctx.catalog, ctx.cwd, query);
	if (resolved.kind !== "dir") {
		return done(directoryError("cd", query, resolved, ctx.cwd));
	}

	return done(null, {
		announce: `In ${displayPath(resolved.dir.url)}.`,
		cwd: resolved.dir.url,
	});
}

function executeLs(ctx: ExecuteContext): CommandResult {
	const query = argumentText(ctx.parsed);
	const resolved = resolveDirectory(ctx.catalog, ctx.cwd, query || ".");
	if (resolved.kind !== "dir") {
		return done(directoryError("ls", query, resolved, ctx.cwd));
	}

	return done(null, {
		announce: `Listing ${displayPath(resolved.dir.url)}.`,
		listing: resolved.dir.url,
	});
}

function directoryError(
	name: string,
	query: string,
	outcome: Exclude<DirectoryOutcome, { kind: "dir" }>,
	cwd: string
): TerminalOutput {
	switch (outcome.kind) {
		case "page":
			return errorOutput(`${name}: not a directory: ${query} (try open)`);
		case "above-root":
			return errorOutput(
				`${name}: already at the top of ${displayPath(rootOf(cwd))} (try switch)`
			);
		case "other-root":
			return errorOutput(
				`${name}: ${query} is in ${outcome.root.name} (try switch ${outcome.root.name})`
			);
		default:
			return errorOutput(`${name}: no such directory: ${query}`);
	}
}

function executeOpen(ctx: ExecuteContext): CommandResult {
	const query = argumentText(ctx.parsed);
	if (query === "") {
		return done(usageOutput("open <page|dir>"));
	}

	const page = pageInCwd(ctx, query);
	const resolved: ResolveOutcome = page
		? { kind: "match", page }
		: resolvePage(ctx.catalog, query, ctx.current.route);
	if (resolved.kind === "empty") {
		return done(usageOutput("open <page|dir>"));
	}

	if (resolved.kind === "none") {
		return done(errorOutput(`open: no such page: ${query}`));
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

function pageInCwd(
	ctx: ExecuteContext,
	query: string
): CatalogPage | undefined {
	const outcome = resolveDirectory(ctx.catalog, ctx.cwd, query);
	if (outcome.kind === "dir") {
		return outcome.dir.page;
	}

	return outcome.kind === "page" ? outcome.page : undefined;
}

function executeSwitch(ctx: ExecuteContext): CommandResult {
	const query = argumentText(ctx.parsed);
	const names = roots(ctx.catalog).map((dir) => dir.name);
	if (query === "") {
		return done(usageOutput(`switch <${names.join("|")}>`));
	}

	const root = resolveRoot(ctx.catalog, query);
	if (!root?.page) {
		return done(
			errorOutput(`switch: no such root: ${query} (${names.join(", ")})`)
		);
	}

	if (rootOf(ctx.current.route.url) === root.url) {
		return done(null, { announce: `On ${root.name}.`, cwd: root.url });
	}

	return done(null, {
		announce: `Switched to ${root.name}.`,
		cwd: root.url,
		navigate: root.page.url,
	});
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

function completeDirectoryArgument(ctx: CompleteContext): Completion[] {
	const partial = argumentPartial(ctx.parsed);
	const head = partial.slice(0, partial.lastIndexOf("/") + 1);
	const tail = partial.slice(head.length).toLowerCase();
	const base = resolveDirectory(ctx.catalog, ctx.cwd, head || ".");
	if (base.kind !== "dir") {
		return [];
	}

	const up: Completion[] =
		base.dir.parent && "..".startsWith(tail)
			? [{ detail: "up", label: "..", replace: `${head}..` }]
			: [];
	const children = childDirectories(ctx.catalog, base.dir.url)
		.filter(
			(dir) =>
				dir.name.startsWith(tail) ||
				dir.page?.title.plain.toLowerCase().startsWith(tail)
		)
		.map((dir) => ({
			detail: dir.page?.title ?? dir.name,
			label: `${dir.name}/`,
			replace: quoteIfNeeded(`${head}${dir.name}`),
		}));
	return [...children, ...up].slice(0, TERMINAL_COMPLETION_LIMIT);
}

function completeRootArgument(ctx: CompleteContext): Completion[] {
	const partial = argumentPartial(ctx.parsed).toLowerCase();
	return roots(ctx.catalog)
		.filter((dir) => dir.name.startsWith(partial))
		.map((dir) => ({
			detail: dir.page?.title ?? dir.name,
			label: dir.name,
			replace: dir.name,
		}));
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
