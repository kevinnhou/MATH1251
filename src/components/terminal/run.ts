import type { RefObject } from "react";
import { fetchText, openExternal } from "@/lib/client/actions";
import { currentPagesFromUrl, type PageCatalog } from "@/lib/course/catalog";
import { catalogResource } from "@/lib/course/client";
import { isSafeExternalUrl } from "@/lib/site/url";
import { lookupCommand } from "@/lib/terminal/commands";
import { pushHistory, saveHistory } from "@/lib/terminal/history";
import {
	announce,
	errorOutput,
	loadingOutput,
	usageOutput,
} from "@/lib/terminal/output";
import { fetchNotesSearch } from "@/lib/terminal/search";
import type { TerminalAction } from "@/lib/terminal/state";
import type {
	CommandResult,
	CommandRuntime,
	CompleteContext,
	TerminalOutput,
} from "@/lib/terminal/types";

export interface RunContext
	extends Omit<CompleteContext, "catalog" | "current" | "parsed"> {
	abortRef: RefObject<AbortController | null>;
	announce: (message: string) => void;
	closeDrawer: () => void;
	dispatch: (action: TerminalAction) => void;
	historyEntries: string[];
	navigate: (url: string) => void;
	publishOutput: (output: TerminalOutput, echo?: string) => void;
	route: string;
}

const browserRuntime: CommandRuntime = {
	fetchMarkdown: fetchText,
	openExternal: (url) => isSafeExternalUrl(url) && openExternal(url),
	get origin() {
		return window.location.origin;
	},
	searchNotes: (query, signal) =>
		fetchNotesSearch(query, window.location.origin, signal),
};

export async function runTerminalLine(
	raw: string,
	ctx: RunContext
): Promise<void> {
	const trimmed = raw.trim();
	const echo = `~ ${trimmed}`;
	if (trimmed === "") {
		ctx.publishOutput(usageOutput("Type a command or a search."), echo);
		return;
	}

	const entries = pushHistory(ctx.historyEntries, trimmed);
	ctx.dispatch({ entries, type: "ran" });
	saveHistory(entries);
	ctx.abortRef.current?.abort();
	const controller = new AbortController();
	ctx.abortRef.current = controller;

	let catalog: PageCatalog;
	try {
		catalog = await catalogResource.load();
	} catch {
		ctx.publishOutput(
			errorOutput(
				"Course catalog unavailable. Check your connection and try again."
			),
			echo
		);
		return;
	}

	if (controller.signal.aborted) {
		return;
	}

	const { descriptor, parsed } = lookupCommand(raw);
	let result = descriptor.execute({
		catalog,
		current: currentPagesFromUrl(catalog, ctx.route),
		cwd: ctx.cwd,
		graph: ctx.graph,
		parsed,
		runtime: browserRuntime,
		signal: controller.signal,
	});

	if (result instanceof Promise) {
		ctx.publishOutput(loadingOutput(descriptor.loading ?? "Working…"), echo);
		result = await result;
		if (controller.signal.aborted) {
			return;
		}
	}

	applyResult(result, echo, ctx);
}

function applyResult(result: CommandResult, echo: string, ctx: RunContext) {
	ctx.dispatch({ echo, result, type: "result" });
	if (result.navigate) {
		ctx.navigate(result.navigate);
	}

	if (result.closeDrawer) {
		ctx.closeDrawer();
	}

	ctx.announce(
		result.output === null
			? (result.announce ?? "Cleared.")
			: announce(result.output)
	);
}
