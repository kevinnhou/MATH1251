"use client";

import { useLayoutEffect } from "react";
import { InlineLabelView } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import { plainInlineLabel } from "@/lib/markdown/types";
import { applyCompletion, parseLine } from "@/lib/terminal/parse";
import type { Completion, ParsedLine } from "@/lib/terminal/types";
import { useTerminal } from "./provider";

export function TerminalPrompt({
	className,
	compact = false,
}: {
	className?: string;
	compact?: boolean;
}) {
	const {
		completionListId,
		completions,
		focusEpoch,
		focusedEpochRef,
		focusPrompt,
		hintId,
		inputRef,
		onPromptKeyDown,
		selectedCompletion,
		setInput,
		surface,
	} = useTerminal();
	const parsed = parseLine(surface.input);
	const selected = completions[selectedCompletion];
	const ghost = ghostSuffix(parsed.partial, selected?.replace);
	const listOpen = surface.completionsOpen && completions.length > 0;
	const activeOptionId = listOpen
		? `${completionListId}-${selectedCompletion}`
		: undefined;

	useLayoutEffect(() => {
		if (compact) {
			return;
		}

		if (focusEpoch === 0 || focusedEpochRef.current === focusEpoch) {
			return;
		}

		focusedEpochRef.current = focusEpoch;
		inputRef.current?.focus();
	}, [compact, focusEpoch, focusedEpochRef, inputRef]);

	useLayoutEffect(() => {
		if (compact || !activeOptionId) {
			return;
		}

		document
			.getElementById(activeOptionId)
			?.scrollIntoView({ block: "nearest" });
	}, [activeOptionId, compact]);

	if (compact) {
		return (
			<button
				aria-label="Open terminal"
				className={cn(
					"flex h-8 items-center font-mono text-[11px] text-fd-muted-foreground outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground",
					className
				)}
				onClick={() => focusPrompt({ expand: true })}
				type="button"
			>
				<span className="text-fd-foreground">[</span>
				{" / "}
				<span className="text-fd-foreground">]</span>
			</button>
		);
	}

	return (
		<div
			className={cn(
				"border bg-fd-secondary/50 font-mono text-[12px] text-fd-foreground",
				listOpen ? "rounded-none" : "rounded-lg",
				className
			)}
		>
			<div className="flex h-8 items-center gap-1 overflow-hidden px-2 leading-none focus-within:outline-1 focus-within:outline-fd-foreground">
				<span aria-hidden="true" className="text-fd-foreground">
					[
				</span>
				<span aria-hidden="true" className="text-fd-muted-foreground">
					/
				</span>
				<div className="relative min-w-0 flex-1">
					<input
						aria-activedescendant={activeOptionId}
						aria-autocomplete="list"
						aria-controls={listOpen ? completionListId : undefined}
						aria-describedby={hintId}
						aria-expanded={listOpen}
						aria-label="Site terminal"
						autoCapitalize="off"
						autoComplete="off"
						autoCorrect="off"
						className="relative z-10 h-8 w-full min-w-0 border-0 bg-transparent p-0 text-[12px] text-fd-foreground outline-none"
						onChange={(event) => setInput(event.target.value)}
						onFocus={() => {
							if (surface.mode === "output") {
								focusPrompt({ expand: false });
							}
						}}
						onKeyDown={onPromptKeyDown}
						ref={inputRef}
						role="combobox"
						spellCheck={false}
						value={surface.input}
					/>
					{ghost ? (
						<span
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 flex items-center text-fd-muted-foreground/60"
						>
							<span className="invisible">{surface.input}</span>
							{ghost}
						</span>
					) : null}
				</div>
				<span aria-hidden="true" className="text-fd-foreground">
					]
				</span>
			</div>
			{listOpen ? (
				<CompletionList
					completions={completions}
					id={completionListId}
					input={surface.input}
					inputRef={inputRef}
					parsed={parsed}
					selectedCompletion={selectedCompletion}
					setInput={setInput}
				/>
			) : null}
		</div>
	);
}

function CompletionList({
	completions,
	id,
	input,
	inputRef,
	parsed,
	selectedCompletion,
	setInput,
}: {
	completions: Completion[];
	id: string;
	input: string;
	inputRef: { current: HTMLInputElement | null };
	parsed: ParsedLine;
	selectedCompletion: number;
	setInput: (next: string) => void;
}) {
	return (
		<div
			className="max-h-[min(16rem,40dvh)] overflow-auto border-fd-foreground/20 border-t"
			id={id}
			role="listbox"
		>
			{completions.map((completion, index) => {
				const active = index === selectedCompletion;
				return (
					<button
						aria-label={plainInlineLabel(completion.label)}
						aria-selected={active}
						className={cn(
							"flex w-full items-baseline gap-2 px-2 py-1 text-left text-[11px] leading-none outline-none",
							active
								? "text-fd-foreground"
								: "text-fd-muted-foreground hover:text-fd-foreground"
						)}
						id={`${id}-${index}`}
						key={`${completion.replace}-${plainInlineLabel(completion.label)}`}
						onMouseDown={(event) => {
							event.preventDefault();
							setInput(applyCompletion(input, parsed, completion.replace));
							inputRef.current?.focus();
						}}
						role="option"
						type="button"
					>
						<span
							aria-hidden="true"
							className="w-[2ch] shrink-0 whitespace-pre text-fd-muted-foreground"
						>
							{active ? "> " : "|  "}
						</span>
						<span
							aria-hidden="true"
							className={cn(
								"md-fragment-chip min-w-0 flex-1 truncate",
								active ? "text-fd-foreground" : undefined
							)}
						>
							<InlineLabelView label={completion.label} />
						</span>
						{completion.detail ? (
							<span
								aria-hidden="true"
								className="md-fragment-chip ml-auto min-w-0 max-w-[45%] truncate text-right text-[10px] text-fd-muted-foreground"
							>
								<InlineLabelView label={completion.detail} />
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

function ghostSuffix(partial: string, replace: string | undefined): string {
	if (!replace) {
		return "";
	}

	const lower = replace.toLowerCase();
	const needle = partial.toLowerCase();
	if (needle !== "" && lower.startsWith(needle)) {
		return replace.slice(partial.length);
	}

	return "";
}
