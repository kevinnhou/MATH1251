import type { CatalogPage } from "@/lib/course/catalog";
import { findPageByUrl } from "@/lib/course/catalog";
import {
	DEFAULT_INTENT,
	intentsFor,
	LLM_PROVIDER_LABELS,
	LLM_PROVIDERS,
	type LlmProvider,
	PROMPT_INTENT_LABELS,
	PROMPT_INTENTS,
	type PromptIntent,
} from "@/lib/export/prompt";
import {
	childDirectories,
	type Directory,
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
	plural,
	searchHitsOutput,
	usageOutput,
} from "./output";
import {
	argumentText,
	commandToken,
	parseLine,
	quoteIfNeeded,
	tokenValues,
} from "./parse";
import { rankPages, resolvePage } from "./resolve";
import { searchResults } from "./search";
import type {
	CommandDescriptor,
	CommandResult,
	CompleteContext,
	Completion,
	ExecuteContext,
	ParsedLine,
	ResolveOutcome,
	TerminalOutput,
} from "./types";
import { TERMINAL_COMPLETION_LIMIT } from "./types";

const ASK_USAGE = `[${PROMPT_INTENTS.join("|")}] <page|.>`;

// Terminal names for each provider; the first is the one `help` shows.
const ASK_COMMANDS: Record<LlmProvider, readonly [string, ...string[]]> = {
	chatgpt: ["gpt", "chatgpt"],
	claude: ["claude"],
	cursor: ["cursor"],
};

function coreDescriptors(): CommandDescriptor[] {
	return [
		command(["cd"], executeCd, completeDirectoryArgument, "cd [dir|..]"),
		command(["ls"], executeLs, completeDirectoryArgument, "ls [dir]"),
		command(["open"], executeOpen, completePageArgument, "open <page|dir>"),
		command(
			["switch", "checkout"],
			executeSwitch,
			completeRootArgument,
			"switch <root>"
		),
		command(["md"], executeMarkdown, completePageArgument, "md <page|.>"),
		...LLM_PROVIDERS.map((provider) =>
			command(
				ASK_COMMANDS[provider],
				(ctx) => executeAsk(ctx, provider),
				completeAskArgument,
				`${ASK_COMMANDS[provider][0]} ${ASK_USAGE}`
			)
		),
		graphCommand(),
		command(["help"], () => done(helpOutput()), undefined, "help"),
		command(
			["pwd"],
			(ctx) => done(messageOutput(displayPath(ctx.cwd))),
			undefined,
			"pwd"
		),
		command(["clear"], () => done(null, { view: null }), undefined, "clear"),
		{
			advertised: false,
			execute: executeNotesSearch,
			loading: "Searching…",
			names: [],
			usage: "",
		},
	];
}

interface CommandRegistry {
	byName: Map<string, CommandDescriptor>;
	commands: readonly CommandDescriptor[];
	fallback: CommandDescriptor;
}

const registry = createRegistry(coreDescriptors());

function createRegistry(
	commands: readonly CommandDescriptor[]
): CommandRegistry {
	const byName = new Map<string, CommandDescriptor>();
	let fallback: CommandDescriptor | undefined;
	for (const descriptor of commands) {
		if (descriptor.names.length === 0) {
			fallback = descriptor;
		}

		for (const name of descriptor.names) {
			const key = name.toLowerCase();
			if (byName.has(key)) {
				throw new Error(`Command name already registered: ${name}`);
			}

			byName.set(key, descriptor);
		}
	}

	if (fallback === undefined) {
		throw new Error("Command registry is missing a search fallback.");
	}

	return { byName, commands, fallback };
}

function command(
	names: readonly string[],
	execute: CommandDescriptor["execute"],
	complete: CommandDescriptor["complete"],
	usage: string
): CommandDescriptor {
	return { advertised: true, complete, execute, names, usage };
}

function done(
	output: TerminalOutput | null,
	extra?: Omit<CommandResult, "output">
): CommandResult {
	return { output, ...extra };
}

export function lookupCommand(input: string): {
	descriptor: CommandDescriptor;
	parsed: ParsedLine;
} {
	const parsed = parseLine(input);
	return { descriptor: descriptorFor(parsed), parsed };
}

function descriptorFor(parsed: ParsedLine): CommandDescriptor {
	const name = commandToken(parsed)?.toLowerCase() ?? "";
	return registry.byName.get(name) ?? registry.fallback;
}

function commandUsage(parsed: ParsedLine): TerminalOutput {
	return usageOutput(descriptorFor(parsed).usage);
}

export function completeLine(ctx: CompleteContext): Completion[] {
	const { parsed } = ctx;
	if (parsed.tokens.length === 0) {
		return commandCompletions("");
	}

	if (parsed.tokens.length === 1 && !parsed.trailingSpace) {
		return commandCompletions(parsed.partial);
	}

	return descriptorFor(parsed).complete?.(ctx) ?? [];
}

function executeCd(ctx: ExecuteContext): CommandResult {
	return inDirectory(ctx, "cd", argumentText(ctx.parsed), (dir) =>
		done(null, {
			announce: `In ${displayPath(dir.url)}.`,
			cwd: dir.url,
			view: null,
		})
	);
}

function executeLs(ctx: ExecuteContext): CommandResult {
	return inDirectory(ctx, "ls", argumentText(ctx.parsed) || ".", (dir) =>
		done(null, {
			announce: `Listing ${displayPath(dir.url)}.`,
			view: { dir: dir.url, kind: "list" },
		})
	);
}

function inDirectory(
	ctx: ExecuteContext,
	name: string,
	query: string,
	run: (dir: Directory) => CommandResult
): CommandResult {
	const resolved = resolveDirectory(ctx.catalog, ctx.cwd, query);
	if (resolved.kind === "dir") {
		return run(resolved.dir);
	}

	return done(directoryError(name, query, resolved, ctx.cwd));
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
		return done(commandUsage(ctx.parsed));
	}

	const page = pageInCwd(ctx, query);
	const resolved: ResolveOutcome = page
		? { kind: "match", page }
		: resolvePage(ctx.catalog, query, ctx.current.route);
	if (resolved.kind === "none" || resolved.kind === "empty") {
		return done(errorOutput(`open: no such page: ${query}`));
	}

	if (resolved.kind === "ambiguous") {
		return done(ambiguousOutput(query, resolved.pages));
	}

	const { url } = resolved.page;
	return done(messageOutput(url), {
		closeDrawer: true,
		navigate: url === ctx.current.route.url ? undefined : url,
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
		const hits = await ctx.runtime.searchNotes(query, ctx.signal);
		const results = searchResults(ctx.catalog, hits);
		if (results.length === 0) {
			return done(searchHitsOutput(query, hits));
		}

		return done(null, {
			announce: `${plural(results.length, "page")} match “${query}”.`,
			view: { kind: "search", query, results },
		});
	} catch {
		return done(
			errorOutput("Search failed. Check your connection and try again.")
		);
	}
}

async function executeMarkdown(ctx: ExecuteContext): Promise<CommandResult> {
	const query = argumentText(ctx.parsed);
	const resolved = notesPage(ctx, query);
	if (resolved.kind !== "match") {
		return done(resolveToOutput(ctx, resolved, query));
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
	} catch {
		return done(errorOutput(`md: unable to fetch Markdown for ${page.url}.`));
	}
}

async function executeAsk(
	ctx: ExecuteContext,
	provider: LlmProvider
): Promise<CommandResult> {
	const [name] = ASK_COMMANDS[provider];
	const { intent = DEFAULT_INTENT, query } = askArguments(ctx.parsed);
	const resolved = notesPage(ctx, query);
	if (resolved.kind !== "match") {
		return done(resolveToOutput(ctx, resolved, query));
	}

	const { page } = resolved;
	if (page.prompt === null) {
		return done(errorOutput(`${name}: not a notes page.`));
	}

	const allowed = intentsFor(page.prompt);
	if (!allowed.includes(intent)) {
		return done(
			errorOutput(
				`${name}: "${intent}" is not available here; try ${allowed.join(", ")}.`
			)
		);
	}

	const label = LLM_PROVIDER_LABELS[provider];
	const result = await ctx.runtime.openPrompt({
		intent,
		provider,
		target: page.prompt,
	});
	if (result.status === "opened") {
		return done(
			messageOutput(
				`Opened ${page.title.plain} in ${label} (${PROMPT_INTENT_LABELS[intent]}).`
			),
			{ closeDrawer: true }
		);
	}

	return done(
		messageOutput(`Pop-up blocked. Open ${label} from the link below.`, {
			label: `Open ${label}`,
			url: result.url,
		})
	);
}

function askArguments(parsed: ParsedLine): {
	intent?: PromptIntent;
	query: string;
} {
	const [first = "", ...rest] = tokenValues(parsed).slice(1);
	const intent = parseIntent(first);
	return intent === undefined
		? { query: argumentText(parsed) }
		: { intent, query: rest.join(" ").trim() };
}

function parseIntent(value: string): PromptIntent | undefined {
	return PROMPT_INTENTS.find((intent) => intent === value.toLowerCase());
}

function notesPage(ctx: ExecuteContext, query: string): ResolveOutcome {
	if (!ctx.current.inCatalog && (query === "" || query === ".")) {
		return { kind: "none", query: query === "" ? "." : query };
	}

	return resolvePage(
		ctx.catalog,
		query === "" ? "." : query,
		ctx.current.route
	);
}

function resolveToOutput(
	ctx: ExecuteContext,
	resolved: Exclude<ResolveOutcome, { kind: "match" }>,
	query: string
): TerminalOutput {
	if (resolved.kind === "empty") {
		return commandUsage(ctx.parsed);
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
	const base = resolveDirectory(
		ctx.catalog,
		ctx.cwd,
		head === "/" ? "~" : head || "."
	);
	if (base.kind !== "dir") {
		return [];
	}

	const up: Completion[] =
		base.dir.parent && "..".startsWith(tail)
			? [{ detail: "up", label: "..", replace: `${head}..` }]
			: [];
	const children = (
		head === "/" ? [base.dir] : childDirectories(ctx.catalog, base.dir.url)
	)
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
	return pageCompletions(ctx, argumentPartial(ctx.parsed));
}

function completeAskArgument(ctx: CompleteContext): Completion[] {
	const { parsed } = ctx;
	const args = tokenValues(parsed).slice(1);
	if (args.length === 0 || (args.length === 1 && !parsed.trailingSpace)) {
		const partial = args[0] ?? "";
		return [
			...intentCompletions(partial),
			...pageCompletions(ctx, partial),
		].slice(0, TERMINAL_COMPLETION_LIMIT);
	}

	const { query } = askArguments(parsed);
	return pageCompletions(ctx, parsed.trailingSpace ? "" : query);
}

function intentCompletions(partial: string): Completion[] {
	const needle = partial.toLowerCase();
	return PROMPT_INTENTS.filter((intent) => intent.startsWith(needle)).map(
		(intent) => ({
			detail: PROMPT_INTENT_LABELS[intent],
			label: intent,
			replace: intent,
		})
	);
}

function pageCompletions(ctx: CompleteContext, partial: string): Completion[] {
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

function commandCompletions(partial: string): Completion[] {
	const needle = partial.toLowerCase();
	return registry.commands
		.flatMap((descriptor) =>
			descriptor.advertised ? descriptor.names.slice(0, 1) : []
		)
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
	const lines = registry.commands
		.filter((descriptor) => descriptor.advertised)
		.map((descriptor) => `  ${descriptor.usage}`);
	return usageOutput(
		["Try:", ...lines, "  anything else searches the notes"].join("\n")
	);
}
