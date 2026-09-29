import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { isEditableTarget, isPrintableKey } from "@/lib/client/actions";
import {
	isSearchHotkey,
	isSlashHotkey,
	sectionHotkey,
} from "@/lib/client/keybinds";
import { dismissLayer } from "@/lib/terminal/mode";
import { applyCompletion } from "@/lib/terminal/parse";
import {
	selectedCompletion,
	type TerminalAction,
	type TerminalState,
} from "@/lib/terminal/state";
import type { Completion, ParsedLine } from "@/lib/terminal/types";

type Dispatch = (action: TerminalAction) => void;

interface KeyContext {
	dispatch: Dispatch;
	inputRef: RefObject<HTMLInputElement | null>;
	state: TerminalState;
}

interface PromptKeyContext extends KeyContext {
	completions: Completion[];
	parsed: ParsedLine;
	runLine: (raw?: string) => Promise<void>;
}

interface WindowContext extends KeyContext {
	focusPrompt: (options?: { expand?: boolean }) => void;
	outputRoot: HTMLElement | null;
}

export function handlePromptKey(
	event: ReactKeyboardEvent<HTMLInputElement>,
	ctx: PromptKeyContext
): void {
	if (event.nativeEvent.isComposing || event.key === "Process") {
		return;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		const { blur } = dismissLayer(ctx.state.surface);
		ctx.dispatch({ type: "dismiss" });
		if (blur) {
			ctx.inputRef.current?.blur();
		}
		return;
	}

	if (event.key === "Tab") {
		cycle(event, ctx, event.shiftKey ? -1 : 1);
		return;
	}

	if (event.key === "ArrowUp" || event.key === "ArrowDown") {
		handleArrowKey(event, ctx);
		return;
	}

	if (event.key === "Enter") {
		event.preventDefault();
		const selected = ctx.completions[selectedCompletion(ctx.state)];
		const accepted =
			ctx.parsed.partial !== "" && selected
				? applyCompletion(ctx.state.surface.input, ctx.parsed, selected.replace)
				: undefined;
		ctx.runLine(accepted).catch(() => undefined);
	}
}

function handleArrowKey(
	event: ReactKeyboardEvent<HTMLInputElement>,
	ctx: PromptKeyContext
): void {
	if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
		return;
	}

	const { history, surface } = ctx.state;
	if (history.cursor === null && surface.input.trim() !== "") {
		cycle(event, ctx, event.key === "ArrowUp" ? -1 : 1);
		return;
	}

	event.preventDefault();
	ctx.dispatch({
		direction: event.key === "ArrowUp" ? "up" : "down",
		type: "history",
	});
}

function cycle(
	event: ReactKeyboardEvent,
	ctx: PromptKeyContext,
	direction: -1 | 1
): void {
	if (ctx.completions.length === 0) {
		return;
	}

	event.preventDefault();
	ctx.dispatch({ completions: ctx.completions, direction, type: "cycle" });
}

export function handleWindowKey(
	event: KeyboardEvent,
	ctx: WindowContext
): void {
	if (event.defaultPrevented || event.isComposing) {
		return;
	}

	if (isSearchHotkey(event)) {
		if (isOtherField(event.target, ctx)) {
			return;
		}

		event.preventDefault();
		ctx.focusPrompt({ expand: true });
		return;
	}

	if (isSlashHotkey(event)) {
		event.preventDefault();
		ctx.focusPrompt({ expand: true });
		return;
	}

	if (
		event.key === "Escape" &&
		document.activeElement !== ctx.inputRef.current
	) {
		if (dismissLayer(ctx.state.surface).consumed || ctx.state.location.view) {
			event.preventDefault();
			ctx.dispatch({ type: "dismiss-window" });
		}
		return;
	}

	handleOutputKey(event, ctx);
}

export function handleWindowPaste(
	event: ClipboardEvent,
	ctx: WindowContext
): void {
	if (!continuesFromOutput(event, ctx)) {
		return;
	}

	const text = event.clipboardData?.getData("text/plain") ?? "";
	if (text === "") {
		return;
	}

	event.preventDefault();
	ctx.focusPrompt({ expand: true });
	ctx.dispatch({ text, type: "input" });
}

function handleOutputKey(event: KeyboardEvent, ctx: WindowContext): void {
	if (
		event.metaKey ||
		event.ctrlKey ||
		event.altKey ||
		!continuesFromOutput(event, ctx)
	) {
		return;
	}

	if (event.key === "ArrowUp" || event.key === "ArrowDown") {
		if (event.shiftKey) {
			return;
		}

		event.preventDefault();
		ctx.focusPrompt({ expand: true });
		ctx.dispatch({
			direction: event.key === "ArrowUp" ? "up" : "down",
			type: "history",
		});
		return;
	}

	if (
		isPrintableKey(event) &&
		event.target !== ctx.inputRef.current &&
		sectionHotkey(event) === null
	) {
		event.preventDefault();
		ctx.focusPrompt({ expand: true });
		ctx.dispatch({ text: event.key, type: "input" });
	}
}

function continuesFromOutput(event: Event, ctx: WindowContext): boolean {
	return (
		ctx.state.surface.mode === "output" &&
		!isOtherField(event.target, ctx) &&
		!hasOutputSelection(ctx.outputRoot)
	);
}

function isOtherField(
	target: EventTarget | null,
	{ inputRef }: Pick<KeyContext, "inputRef">
): boolean {
	return isEditableTarget(target) && target !== inputRef.current;
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
