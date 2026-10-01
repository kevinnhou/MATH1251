"use client";

import { Popover } from "@base-ui/react/popover";
import { Sparkle } from "lucide-react";
import { useState } from "react";
import type { PromptTarget } from "@/lib/export/model";
import { usePrompt } from "@/lib/export/use-prompt";
import { AskPopup, BlockedLink, EXPORT_BUTTON_CLASS } from "./ask-panel";

export function PageActions({
	githubUrl,
	target,
}: {
	githubUrl?: string;
	target: PromptTarget;
}) {
	const [open, setOpen] = useState(false);
	const prompt = usePrompt(target);

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
				<AskPopup
					onDone={() => setOpen(false)}
					positioner={{ align: "start", sideOffset: 6 }}
					prompt={prompt}
					sourceUrl={githubUrl}
				/>
			</Popover.Root>
			<BlockedLink prompt={prompt} />
		</>
	);
}
