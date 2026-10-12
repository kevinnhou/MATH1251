"use client";

import { Popover } from "@base-ui/react/popover";
import { type MouseEvent, type ReactElement, useRef, useState } from "react";
import { AskPopup, BlockedLink } from "@/components/mdx/ask-panel";
import { cn } from "@/lib/cn";
import type { PromptTarget } from "@/lib/export/model";
import { useCopyMarkdown } from "@/lib/export/use-copy";
import { usePrompt } from "@/lib/export/use-prompt";

type Anchor = HTMLElement | { getBoundingClientRect: () => DOMRect };

const HINT_REVEAL = {
	"math-env":
		"pointer-events-none pointer-coarse:pointer-events-auto opacity-0 pointer-coarse:opacity-40 group-focus-within/math-env:pointer-events-auto group-focus-within/math-env:opacity-100 group-hover/math-env:pointer-events-auto group-hover/math-env:opacity-100",
	thread:
		"pointer-events-none pointer-coarse:pointer-events-auto opacity-0 pointer-coarse:opacity-40 group-focus-within/thread:pointer-events-auto group-focus-within/thread:opacity-100 group-hover/thread:pointer-events-auto group-hover/thread:opacity-100",
} as const;

interface AskShareProps {
	children: (rightClickHint: ReactElement) => ReactElement;
	className?: string;
	group: keyof typeof HINT_REVEAL;
	target: PromptTarget;
}

export function AskShare({
	children,
	className,
	group,
	target,
}: AskShareProps) {
	const [anchor, setAnchor] = useState<{ fromHint: boolean; to: Anchor }>();
	const [open, setOpen] = useState(false);
	const hintRef = useRef<HTMLButtonElement>(null);
	const prompt = usePrompt(target);
	const copy = useCopyMarkdown(target.id);

	function openAt(to: Anchor, fromHint = false) {
		setAnchor({ fromHint, to });
		setOpen(true);
		prompt.prefetch();
		copy.prefetch();
	}

	function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
		const selection = window.getSelection();
		const selecting =
			selection !== null &&
			!selection.isCollapsed &&
			event.currentTarget.contains(selection.anchorNode);
		const inside =
			event.target instanceof Node &&
			event.currentTarget.contains(event.target);
		if (event.defaultPrevented || !inside || event.shiftKey || selecting) {
			return;
		}
		event.preventDefault();
		const { clientX: x, clientY: y } = event;
		openAt({ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) });
	}

	const hint =
		prompt.blocked === undefined ? (
			<button
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label={`Ask AI about ${target.label}`}
				className={cn(
					"flex h-5 items-center px-1 font-mono text-[10px] text-fd-muted-foreground leading-none outline-none transition-opacity duration-150 hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground aria-expanded:pointer-events-auto aria-expanded:text-fd-foreground aria-expanded:opacity-100 motion-reduce:transition-none",
					HINT_REVEAL[group],
					className
				)}
				onClick={(event) => openAt(event.currentTarget, true)}
				onFocus={prompt.prefetch}
				onPointerEnter={prompt.prefetch}
				ref={hintRef}
				type="button"
			>
				<span className="pointer-coarse:hidden">[RIGHT CLICK]</span>
				<span className="pointer-coarse:inline hidden">[ASK AI]</span>
			</button>
		) : (
			<BlockedLink className={cn("px-1", className)} prompt={prompt} />
		);

	return (
		<div className="contents" onContextMenu={handleContextMenu}>
			{children(hint)}
			{anchor === undefined ? null : (
				<Popover.Root onOpenChange={setOpen} open={open}>
					<AskPopup
						copy={copy}
						finalFocus={anchor.fromHint ? hintRef : false}
						onDone={() => setOpen(false)}
						positioner={{
							align: anchor.fromHint ? "end" : "start",
							anchor: anchor.to,
							side: anchor.fromHint ? "top" : "bottom",
							sideOffset: 4,
						}}
						prompt={prompt}
					/>
				</Popover.Root>
			)}
		</div>
	);
}
