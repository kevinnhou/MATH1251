"use client";

import { Popover } from "@base-ui/react/popover";
import { Sparkle } from "lucide-react";
import { useRef, useState } from "react";
import type { PromptTarget } from "@/lib/export/model";
import { nodeMarkdownUrl } from "@/lib/export/urls";
import { usePrompt } from "@/lib/export/use-prompt";
import {
	ASK_POPUP_CLASS,
	type AskLink,
	AskPanel,
	BlockedLink,
	EXPORT_BUTTON_CLASS,
} from "./ask-panel";

export function PageActions({
	githubUrl,
	target,
}: {
	githubUrl?: string;
	target: PromptTarget;
}) {
	const [open, setOpen] = useState(false);
	const reelRef = useRef<HTMLSpanElement>(null);
	const prompt = usePrompt(target);
	const links: AskLink[] = [
		{ href: nodeMarkdownUrl(target.id), label: "VIEW .MD" },
	];
	if (githubUrl !== undefined) {
		links.push({ href: githubUrl, label: "SOURCE" });
	}

	return (
		<>
			<Popover.Root
				onOpenChange={(next) => {
					setOpen(next);
					if (next) {
						prompt.prefetch();
					}
				}}
				open={open}
			>
				<Popover.Trigger
					className={EXPORT_BUTTON_CLASS}
					onFocus={prompt.prefetch}
					onPointerEnter={prompt.prefetch}
				>
					<Sparkle />
					Ask AI
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner
						align="start"
						className="z-30 outline-hidden"
						sideOffset={6}
					>
						<Popover.Popup
							aria-label={`Ask AI about ${target.label}`}
							className={ASK_POPUP_CLASS}
							initialFocus={reelRef}
						>
							<AskPanel
								links={links}
								onDone={() => setOpen(false)}
								prompt={prompt}
								reelRef={reelRef}
								target={target}
							/>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
			{prompt.blocked === undefined ? null : (
				<BlockedLink
					blocked={prompt.blocked}
					onDismiss={prompt.dismissBlocked}
				/>
			)}
		</>
	);
}
