"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyText, fetchText } from "@/lib/client/actions";
import { cn } from "@/lib/cn";

const cache = new Map<string, string>();

export function LLMCopyButton({ markdownUrl }: { markdownUrl: string }) {
	const [isLoading, setLoading] = useState(false);
	const [checked, onClick] = useCopyButton(async () => {
		const cached = cache.get(markdownUrl);
		if (cached !== undefined) {
			const ok = await copyText(cached);
			if (!ok) {
				throw new Error("Clipboard is unavailable.");
			}
			return;
		}

		setLoading(true);

		try {
			const content = await fetchText(markdownUrl);
			cache.set(markdownUrl, content);
			const ok = await copyText(content);
			if (!ok) {
				throw new Error("Clipboard is unavailable.");
			}
		} finally {
			setLoading(false);
		}
	});

	return (
		<button
			className={cn(
				buttonVariants({
					className: "gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground",
					color: "secondary",
					size: "sm",
				})
			)}
			disabled={isLoading}
			onClick={onClick}
			type="button"
		>
			{checked ? <Check /> : <Copy />}
			Copy Markdown
		</button>
	);
}
