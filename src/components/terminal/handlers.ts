import type {
	Dispatch,
	KeyboardEvent as ReactKeyboardEvent,
	SetStateAction,
} from "react";
import {
	fetchText,
	isEditableTarget,
	isPrintableKey,
	openExternal,
} from "@/lib/client/actions";
import type { GraphRuntime } from "@/lib/graph/runtime";
import { isSafeExternalUrl } from "@/lib/site/url";
import { lookupCommand } from "@/lib/terminal/commands";
import {
	type HistoryState,
	historyDown,
	historyUp,
	historyValue,
	pushHistory,
	saveHistory,
} from "@/lib/terminal/history";
import {
	dismissLayer,
	emptySurface,
	setDraft,
	type TerminalSurface,
} from "@/lib/terminal/mode";
import { loadingOutput } from "@/lib/terminal/output";
import { applyCompletion } from "@/lib/terminal/parse";
import type { CommandRegistry } from "@/lib/terminal/registry";
import { fetchNotesSearch } from "@/lib/terminal/search";
import type {
	CommandDescriptor,
	CommandResult,
	Completion,
	CurrentPages,
	PageCatalog,
	ParsedLine,
	TerminalOutput,
} from "@/lib/terminal/types";

export interface TerminalRunDeps {
	abortRef: { current: AbortController | null };
	catalog: PageCatalog;
	current: CurrentPages;
	generationRef: { current: number };
	graph: GraphRuntime;
	historyEntries: string[];
	publishOutput: (output: TerminalOutput, echo?: string) => void;
	registry: CommandRegistry;
	retainUrlRef: { current: string | null };
	routerPush: (url: string) => void;
	setCloseDrawerAfter: Dispatch<SetStateAction<number>>;
	setHistory: Dispatch<SetStateAction<HistoryState>>;
	setLiveMessage: (message: string) => void;
	setSurface: Dispatch<SetStateAction<TerminalSurface>>;
}

export async function executeTerminalLine(
	raw: string,
	deps: TerminalRunDeps
): Promise<void> {
	const trimmed = raw.trim();
	const echo = `~ ${trimmed}`;
	if (trimmed === "") {
		deps.publishOutput(
			{ kind: "usage", message: "Type a command or a search." },
			echo
		);
		return;
	}

	const nextEntries = pushHistory(deps.historyEntries, trimmed);
	deps.setHistory({ cursor: null, draft: "", entries: nextEntries });
	saveHistory(nextEntries);
	deps.abortRef.current?.abort();
	const controller = new AbortController();
	deps.abortRef.current = controller;
	const generation = deps.generationRef.current + 1;
	deps.generationRef.current = generation;
	const { descriptor, parsed } = lookupCommand(raw, deps.registry);
	if (!descriptor) {
		throw new Error("Command registry is missing a search fallback.");
	}

	await runDescriptor(
		descriptor,
		parsed,
		echo,
		generation,
		controller.signal,
		deps
	);
}

async function runDescriptor(
	descriptor: CommandDescriptor,
	parsed: ParsedLine,
	echo: string,
	generation: number,
	signal: AbortSignal,
	deps: TerminalRunDeps
) {
	const executed = descriptor.execute({
		catalog: deps.catalog,
		current: deps.current,
		graph: deps.graph,
		parsed,
		runtime: {
			fetchMarkdown: fetchText,
			openExternal: (url) => isSafeExternalUrl(url) && openExternal(url),
			origin: window.location.origin,
			searchNotes: (query, searchSignal) =>
				fetchNotesSearch(query, window.location.origin, searchSignal),
		},
		signal,
	});

	if (isPromise(executed)) {
		deps.publishOutput(loadingOutput(descriptor.loading ?? "Working…"), echo);
		const result = await executed;
		if (generation !== deps.generationRef.current || signal.aborted) {
			return;
		}

		publishCommandResult(result, echo, deps);
		return;
	}

	if (generation !== deps.generationRef.current) {
		return;
	}

	publishCommandResult(executed, echo, deps);
}

function publishCommandResult(
	result: CommandResult,
	echo: string,
	deps: TerminalRunDeps
) {
	if (result.navigate) {
		deps.retainUrlRef.current = result.navigate;
		deps.routerPush(result.navigate);
	}

	if (result.closeDrawer) {
		deps.setCloseDrawerAfter((epoch) => epoch + 1);
	}

	if (result.output === null) {
		deps.setSurface(emptySurface());
		deps.setLiveMessage("Cleared.");
		return;
	}

	deps.publishOutput(result.output, echo);
}

export function handlePromptKey(options: {
	completions: Completion[];
	event: ReactKeyboardEvent<HTMLInputElement>;
	frozenCompletions: { current: Completion[] | null };
	history: HistoryState;
	inputRef: { current: HTMLInputElement | null };
	parsed: ParsedLine;
	runLine: (raw?: string) => Promise<void>;
	selectedCompletion: number;
	setHistory: Dispatch<SetStateAction<HistoryState>>;
	setSelectedCompletion: (index: number) => void;
	setSurface: Dispatch<SetStateAction<TerminalSurface>>;
	surface: TerminalSurface;
}): boolean {
	const { event } = options;
	if (event.nativeEvent.isComposing || event.key === "Process") {
		return false;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		const dismissed = dismissLayer(options.surface);
		options.setSurface(dismissed.surface);
		options.frozenCompletions.current = null;
		if (dismissed.blur) {
			options.inputRef.current?.blur();
		}
		return true;
	}

	if (event.key === "Tab") {
		return cycleCompletion(options, event.shiftKey ? -1 : 1);
	}

	if (event.key === "ArrowUp" || event.key === "ArrowDown") {
		return handleArrowKey(options);
	}

	if (event.key === "Enter") {
		event.preventDefault();
		const selected = options.completions[options.selectedCompletion];
		const accepted =
			options.parsed.partial !== "" && selected
				? applyCompletion(
						options.surface.input,
						options.parsed,
						selected.replace
					)
				: undefined;
		options.runLine(accepted).catch(() => undefined);
		return true;
	}

	return false;
}

function handleArrowKey(options: {
	completions: Completion[];
	event: ReactKeyboardEvent<HTMLInputElement>;
	frozenCompletions: { current: Completion[] | null };
	history: HistoryState;
	parsed: ParsedLine;
	selectedCompletion: number;
	setHistory: Dispatch<SetStateAction<HistoryState>>;
	setSelectedCompletion: (index: number) => void;
	setSurface: Dispatch<SetStateAction<TerminalSurface>>;
	surface: TerminalSurface;
}): boolean {
	const { event } = options;
	if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
		return false;
	}

	const useHistory =
		options.history.cursor !== null || options.surface.input.trim() === "";
	if (!useHistory) {
		return cycleCompletion(options, event.key === "ArrowUp" ? -1 : 1);
	}

	event.preventDefault();
	options.setSelectedCompletion(0);
	options.frozenCompletions.current = null;
	const next =
		event.key === "ArrowUp"
			? historyUp(options.history, options.surface.input)
			: historyDown(options.history);
	options.setHistory(next);
	options.setSurface((currentSurface) =>
		setDraft(currentSurface, historyValue(next))
	);
	return true;
}

function cycleCompletion(
	options: {
		completions: Completion[];
		event: ReactKeyboardEvent<HTMLInputElement>;
		frozenCompletions: { current: Completion[] | null };
		parsed: ParsedLine;
		selectedCompletion: number;
		setSelectedCompletion: (index: number) => void;
		setSurface: Dispatch<SetStateAction<TerminalSurface>>;
		surface: TerminalSurface;
	},
	direction: -1 | 1
): boolean {
	if (options.completions.length === 0) {
		return false;
	}

	options.event.preventDefault();
	options.frozenCompletions.current ??= options.completions;
	const list = options.frozenCompletions.current;
	const nextIndex =
		(options.selectedCompletion + direction + list.length) % list.length;
	const selected = list[nextIndex];
	if (!selected) {
		return true;
	}

	options.setSelectedCompletion(nextIndex);
	const nextValue = applyCompletion(
		options.surface.input,
		options.parsed,
		selected.replace
	);
	options.setSurface((currentSurface) => ({
		...setDraft(currentSurface, nextValue),
		completionsOpen: true,
	}));
	return true;
}

export function handleWindowKey(options: {
	event: KeyboardEvent;
	focusPrompt: (opts?: { expand?: boolean }) => void;
	inputRef: { current: HTMLInputElement | null };
	outputRoot: HTMLElement | null;
	setHistory: Dispatch<SetStateAction<HistoryState>>;
	setInput: (next: string) => void;
	setSelectedCompletion: (index: number) => void;
	setSurface: Dispatch<SetStateAction<TerminalSurface>>;
	surface: TerminalSurface;
}): boolean {
	const { event } = options;
	if (event.defaultPrevented || event.isComposing) {
		return false;
	}

	if (isSearchHotkey(event)) {
		if (
			isEditableTarget(event.target) &&
			event.target !== options.inputRef.current
		) {
			return false;
		}

		event.preventDefault();
		options.focusPrompt({ expand: true });
		return true;
	}

	if (isSlashHotkey(event)) {
		event.preventDefault();
		options.focusPrompt({ expand: true });
		return true;
	}

	if (
		event.key === "Escape" &&
		document.activeElement !== options.inputRef.current
	) {
		const dismissed = dismissLayer(options.surface);
		if (dismissed.consumed) {
			event.preventDefault();
			options.setSurface(dismissed.surface);
			return true;
		}

		return false;
	}

	return handleOutputKey(options);
}

export function handleWindowPaste(options: {
	event: ClipboardEvent;
	focusPrompt: (opts?: { expand?: boolean }) => void;
	inputRef: { current: HTMLInputElement | null };
	outputRoot: HTMLElement | null;
	setInput: (next: string) => void;
	surface: TerminalSurface;
}): boolean {
	const { event } = options;
	if (options.surface.mode !== "output") {
		return false;
	}

	if (
		isEditableTarget(event.target) &&
		event.target !== options.inputRef.current
	) {
		return false;
	}

	if (hasOutputSelection(options.outputRoot)) {
		return false;
	}

	const text = event.clipboardData?.getData("text/plain") ?? "";
	if (text === "") {
		return false;
	}

	event.preventDefault();
	options.focusPrompt({ expand: true });
	options.setInput(text);
	return true;
}

function isSearchHotkey(event: KeyboardEvent): boolean {
	const meta = event.metaKey || event.ctrlKey;
	return (event.key === "k" || event.key === "K") && meta && !event.altKey;
}

function isSlashHotkey(event: KeyboardEvent): boolean {
	const meta = event.metaKey || event.ctrlKey;
	return (
		event.key === "/" &&
		!meta &&
		!event.altKey &&
		!isEditableTarget(event.target)
	);
}

function handleOutputKey(options: {
	event: KeyboardEvent;
	focusPrompt: (opts?: { expand?: boolean }) => void;
	inputRef: { current: HTMLInputElement | null };
	outputRoot: HTMLElement | null;
	setHistory: Dispatch<SetStateAction<HistoryState>>;
	setInput: (next: string) => void;
	setSelectedCompletion: (index: number) => void;
	setSurface: Dispatch<SetStateAction<TerminalSurface>>;
	surface: TerminalSurface;
}): boolean {
	const { event } = options;
	if (options.surface.mode !== "output") {
		return false;
	}

	if (
		isEditableTarget(event.target) &&
		event.target !== options.inputRef.current
	) {
		return false;
	}

	if (event.metaKey || event.ctrlKey || event.altKey) {
		return false;
	}

	if (hasOutputSelection(options.outputRoot)) {
		return false;
	}

	if (event.key === "ArrowUp" || event.key === "ArrowDown") {
		if (event.shiftKey) {
			return false;
		}

		event.preventDefault();
		options.focusPrompt({ expand: true });
		options.setSelectedCompletion(0);
		options.setHistory((currentHistory) => {
			const next =
				event.key === "ArrowUp"
					? historyUp(currentHistory, "")
					: historyDown(currentHistory);
			options.setSurface(setDraft(emptySurface(), historyValue(next)));
			return next;
		});
		return true;
	}

	if (isPrintableKey(event) && event.target !== options.inputRef.current) {
		event.preventDefault();
		options.focusPrompt({ expand: true });
		options.setInput(event.key);
		return true;
	}

	return false;
}

function hasOutputSelection(outputRoot: HTMLElement | null): boolean {
	if (!outputRoot) {
		return false;
	}

	const selection = window.getSelection();
	if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
		return false;
	}

	const anchor = selection.anchorNode;
	return Boolean(anchor && outputRoot.contains(anchor));
}

function isPromise(
	value: CommandResult | Promise<CommandResult>
): value is Promise<CommandResult> {
	return typeof value === "object" && value !== null && "then" in value;
}
