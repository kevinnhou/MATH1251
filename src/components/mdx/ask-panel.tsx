"use client";

import { ChevronsUpDown, CornerDownLeft } from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useEffectEvent,
	useRef,
} from "react";
import { LlmLogo } from "@/components/site/llm-logos";
import { cn } from "@/lib/cn";
import type { PromptTarget } from "@/lib/export/model";
import {
	intentPhrase,
	LLM_PROVIDER_LABELS,
	LLM_PROVIDERS,
	subjectPhrase,
} from "@/lib/export/prompt";
import type { CopyStatus, useCopyMarkdown } from "@/lib/export/use-copy";
import type { BlockedPrompt, usePrompt } from "@/lib/export/use-prompt";

export const EXPORT_BUTTON_CLASS =
	"inline-flex h-8 cursor-default items-center gap-2 border bg-fd-card px-2.5 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.08em] outline-none transition-[color,box-shadow,translate] duration-150 hover:-translate-x-px hover:-translate-y-px hover:text-fd-foreground hover:shadow-[3px_3px_0_0_var(--color-fd-border)] focus-visible:outline-1 focus-visible:outline-fd-foreground disabled:pointer-events-none data-popup-open:-translate-x-px data-popup-open:-translate-y-px data-popup-open:text-fd-foreground data-popup-open:shadow-[3px_3px_0_0_var(--color-fd-border)] motion-reduce:transition-none [&_svg]:size-3.5 [&_svg]:shrink-0";

export const ASK_POPUP_CLASS =
	"w-max min-w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] origin-(--transform-origin) border bg-fd-popover text-fd-popover-foreground shadow-[3px_3px_0_0_var(--color-fd-border)] outline-hidden transition-[opacity,scale] duration-100 data-ending-style:scale-[0.98] data-starting-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none";

const BRACKET_CLASS =
	"flex h-4 items-center font-mono text-[10px] text-fd-muted-foreground uppercase leading-none outline-none hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground";

export interface AskLink {
	href: string;
	label: string;
}

export function AskPanel({
	copy,
	links,
	onDone,
	prompt,
	reelRef,
	target,
}: {
	copy?: ReturnType<typeof useCopyMarkdown>;
	links: readonly AskLink[];
	onDone: () => void;
	prompt: ReturnType<typeof usePrompt>;
	reelRef?: RefObject<HTMLSpanElement | null>;
	target: PromptTarget;
}) {
	const { intent, intents, provider } = prompt;

	function ask() {
		prompt.launch();
		onDone();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (
			event.key === "Enter" &&
			event.target instanceof HTMLElement &&
			event.target.getAttribute("role") === "spinbutton"
		) {
			event.preventDefault();
			ask();
		}
	}

	return (
		<div className="flex flex-col" onKeyDown={handleKeyDown}>
			<p className="flex flex-wrap items-center gap-x-1.5 gap-y-7 whitespace-nowrap px-4 py-7 text-[15px] leading-7">
				<Reel
					format={(value) => intentPhrase(value, target)}
					label="Prompt"
					onChange={prompt.setIntent}
					reelRef={reelRef}
					value={intent}
					values={intents}
				/>
				<span className="text-fd-muted-foreground">
					{subjectPhrase(target)} in
				</span>
				<Reel
					format={(value) => LLM_PROVIDER_LABELS[value]}
					icon={(value) => <LlmLogo provider={value} />}
					label="Assistant"
					onChange={prompt.setProvider}
					value={provider}
					values={LLM_PROVIDERS}
				/>
			</p>
			<div className="flex flex-col border-t px-4 py-3">
				<div className="flex items-center gap-3">
					{copy === undefined ? null : (
						<button className={BRACKET_CLASS} onClick={copy.copy} type="button">
							<span className="text-fd-foreground">[</span>
							<span aria-live="polite">{COPY_BRACKETS[copy.status]}</span>
							<span className="text-fd-foreground">]</span>
						</button>
					)}
					{links.map((link) => (
						<a
							className={BRACKET_CLASS}
							href={link.href}
							key={link.href}
							rel="noreferrer noopener"
							target="_blank"
						>
							<span className="text-fd-foreground">[</span>
							{link.label}
							<span className="text-fd-foreground">]</span>
						</a>
					))}
					<button
						className="ms-auto flex h-7 items-center gap-1.5 bg-fd-foreground px-2.5 font-mono text-[11px] text-fd-background uppercase tracking-[0.08em] outline-none transition-[box-shadow,translate] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_var(--color-fd-border)] focus-visible:outline-1 focus-visible:outline-fd-foreground focus-visible:outline-offset-2 motion-reduce:transition-none"
						onClick={ask}
						type="button"
					>
						Ask
						<CornerDownLeft aria-hidden="true" className="size-3" />
					</button>
				</div>
			</div>
		</div>
	);
}

const COPY_BRACKETS: Record<CopyStatus, string> = {
	copied: "COPIED",
	copying: "COPYING…",
	failed: "COPY FAILED",
	idle: "COPY .MD",
};

const ROLL_THRESHOLD = 40;

function Reel<T extends string>({
	format,
	icon,
	label,
	onChange,
	reelRef,
	value,
	values,
}: {
	format: (value: T) => string;
	icon?: (value: T) => ReactNode;
	label: string;
	onChange: (value: T) => void;
	reelRef?: RefObject<HTMLSpanElement | null>;
	value: T;
	values: readonly T[];
}) {
	const wheelRef = useRef<HTMLSpanElement>(null);
	const index = Math.max(0, values.indexOf(value));

	function select(next: number) {
		const clamped = values[Math.min(values.length - 1, Math.max(0, next))];
		if (clamped !== undefined && clamped !== value) {
			onChange(clamped);
		}
	}

	const roll = useEffectEvent((direction: number) => select(index + direction));

	// React's wheel listener is passive, so it can't stop the page scrolling.
	useEffect(() => {
		const element = wheelRef.current;
		if (element === null) {
			return;
		}
		let travel = 0;
		function handleWheel(event: WheelEvent) {
			event.preventDefault();
			travel += event.deltaY;
			if (Math.abs(travel) >= ROLL_THRESHOLD) {
				roll(Math.sign(travel));
				travel = 0;
			}
		}
		element.addEventListener("wheel", handleWheel, { passive: false });
		return () => element.removeEventListener("wheel", handleWheel);
	}, []);

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		const next = {
			ArrowDown: index + 1,
			ArrowUp: index - 1,
			End: values.length - 1,
			Home: 0,
		}[event.key];
		if (next !== undefined) {
			event.preventDefault();
			select(next);
		}
	}

	const render = (option: T) => (
		<span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
			{icon?.(option)}
			{format(option)}
		</span>
	);

	return (
		<span className="group/reel relative inline-flex h-7" ref={wheelRef}>
			<span
				aria-label={label}
				aria-valuemax={values.length - 1}
				aria-valuemin={0}
				aria-valuenow={index}
				aria-valuetext={format(value)}
				className="inline-flex h-7 cursor-pointer select-none items-center gap-1 font-medium outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground focus-visible:outline-offset-2"
				onClick={() => select(index + 1 < values.length ? index + 1 : 0)}
				onKeyDown={handleKeyDown}
				ref={reelRef}
				role="spinbutton"
				tabIndex={0}
			>
				{/* Sizes the slot; the visible text is the reel below. */}
				<span className="invisible">{render(value)}</span>
				<ChevronsUpDown
					aria-hidden="true"
					className="size-3 text-fd-muted-foreground transition-colors group-hover/reel:text-fd-foreground"
				/>
			</span>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-0 left-0 flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
				style={{ transform: `translateY(${-index * 1.75}rem)` }}
			>
				{values.map((option, position) => {
					const distance = Math.abs(position - index);
					return (
						<button
							className={cn(
								"flex h-7 items-center whitespace-nowrap font-medium transition-opacity duration-200 motion-reduce:transition-none",
								distance === 0 &&
									"underline decoration-fd-muted-foreground decoration-dotted underline-offset-[6px]",
								distance === 1 &&
									"pointer-events-auto cursor-pointer text-fd-muted-foreground opacity-30 hover:opacity-100 group-focus-within/reel:opacity-60 group-hover/reel:opacity-60",
								distance > 1 && "opacity-0"
							)}
							key={option}
							onClick={() => select(position)}
							tabIndex={-1}
							type="button"
						>
							{render(option)}
						</button>
					);
				})}
			</span>
		</span>
	);
}

export const COPY_LABELS: Record<CopyStatus, string> = {
	copied: "Copied",
	copying: "Copying…",
	failed: "Couldn't copy. Offline?",
	idle: "Copy Markdown",
};

export function BlockedLink({
	blocked,
	className,
	onDismiss,
}: {
	blocked: BlockedPrompt;
	className?: string;
	onDismiss: () => void;
}) {
	const provider = LLM_PROVIDER_LABELS[blocked.provider];
	return (
		<output
			className={cn(
				"flex h-5 items-center font-mono text-[10px] text-fd-foreground uppercase leading-none",
				className
			)}
		>
			<a
				className="underline underline-offset-2"
				href={blocked.url}
				onClick={onDismiss}
				rel="noreferrer noopener"
				target="_blank"
			>
				[POP-UP BLOCKED · OPEN {provider.toUpperCase()}]
			</a>
		</output>
	);
}
