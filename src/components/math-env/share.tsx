"use client";

import { Popover } from "@base-ui/react/popover";
import { type MouseEvent, type ReactElement, useRef, useState } from "react";
import {
	ASK_POPUP_CLASS,
	AskPanel,
	BlockedLink,
} from "@/components/mdx/ask-panel";
import type { PromptTarget } from "@/lib/export/model";
import { nodeMarkdownUrl } from "@/lib/export/urls";
import { useCopyMarkdown } from "@/lib/export/use-copy";
import { usePrompt } from "@/lib/export/use-prompt";

type Anchor = HTMLElement | { getBoundingClientRect: () => DOMRect };

interface EnvShareProps {
	children: (rightClickHint: ReactElement) => ReactElement;
	target: PromptTarget;
}

export function EnvShare({ children, target }: EnvShareProps) {
	const [anchor, setAnchor] = useState<{ fromHint: boolean; to: Anchor }>();
	const [open, setOpen] = useState(false);
	const hintRef = useRef<HTMLButtonElement>(null);
	const reelRef = useRef<HTMLSpanElement>(null);
	const prompt = usePrompt(target);
	const copy = useCopyMarkdown(target.id);
	const { label } = target;

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
		if (!inside || event.shiftKey || selecting) {
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
				aria-label={`Ask AI about ${label}`}
				className="pointer-events-none pointer-coarse:pointer-events-auto absolute right-0 bottom-0 flex h-5 items-center px-1 font-mono text-[10px] text-fd-muted-foreground leading-none opacity-0 pointer-coarse:opacity-40 outline-none transition-opacity duration-150 hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground group-focus-within/math-env:pointer-events-auto group-focus-within/math-env:opacity-100 group-hover/math-env:pointer-events-auto group-hover/math-env:opacity-100 aria-expanded:pointer-events-auto aria-expanded:text-fd-foreground aria-expanded:opacity-100 motion-reduce:transition-none"
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
			<BlockedLink
				blocked={prompt.blocked}
				className="absolute right-0 bottom-0 px-1"
				onDismiss={prompt.dismissBlocked}
			/>
		);

	return (
		<div className="contents" onContextMenu={handleContextMenu}>
			{children(hint)}
			{anchor === undefined ? null : (
				<Popover.Root onOpenChange={setOpen} open={open}>
					<Popover.Portal>
						<Popover.Positioner
							align={anchor.fromHint ? "end" : "start"}
							anchor={anchor.to}
							className="z-30 outline-hidden"
							side={anchor.fromHint ? "top" : "bottom"}
							sideOffset={4}
						>
							<Popover.Popup
								aria-label={`Ask AI about ${label}`}
								className={ASK_POPUP_CLASS}
								finalFocus={anchor.fromHint ? hintRef : false}
								initialFocus={reelRef}
							>
								<AskPanel
									copy={copy}
									links={[
										{ href: nodeMarkdownUrl(target.id), label: "VIEW .MD" },
									]}
									onDone={() => setOpen(false)}
									prompt={prompt}
									reelRef={reelRef}
									target={target}
								/>
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			)}
		</div>
	);
}
