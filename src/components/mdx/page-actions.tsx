"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import { ChevronDown, ExternalLinkIcon, TextIcon } from "lucide-react";
import { useMemo } from "react";
import { GitHubLogo, LlmLogo } from "@/components/site/llm-logos";
import { cn } from "@/lib/cn";
import {
	formatRefLink,
	type RelatedLink,
} from "@/lib/math-env/export-markdown";
import {
	formatAskPrompt,
	LLM_PROVIDER_LABELS,
	LLM_PROVIDERS,
	llmUrls,
} from "@/lib/site/llm-ask";
import { toAbsoluteUrl } from "@/lib/site/url";

export function PageActions({
	githubUrl,
	markdownUrl,
	related = [],
	task,
}: {
	githubUrl?: string;
	markdownUrl: string;
	related?: RelatedLink[];
	task: "page" | "kind-view";
}) {
	const origin = typeof window === "undefined" ? "" : window.location.origin;
	const fullMarkdownUrl =
		origin === "" ? markdownUrl : toAbsoluteUrl(markdownUrl, origin);

	const items = useMemo(() => {
		const relatedLines = related.map((item) =>
			formatRefLink(origin === "" ? item : { ...item, origin })
		);
		const urls = llmUrls(
			formatAskPrompt({
				related: relatedLines,
				source: { type: task, url: fullMarkdownUrl },
				task,
			})
		);
		const links = [
			...(githubUrl === undefined
				? []
				: [
						{
							href: githubUrl,
							icon: <GitHubLogo />,
							title: "Open in GitHub",
						},
					]),
			{
				href: fullMarkdownUrl,
				icon: <TextIcon />,
				title: "View as Markdown",
			},
			...LLM_PROVIDERS.map((provider) => ({
				href: urls[provider],
				icon: <LlmLogo provider={provider} />,
				title: `Open in ${LLM_PROVIDER_LABELS[provider]}`,
			})),
		];

		return links;
	}, [fullMarkdownUrl, githubUrl, origin, related, task]);

	return (
		<Popover>
			<PopoverTrigger
				className={cn(
					buttonVariants({
						className: "gap-2",
						color: "secondary",
						size: "sm",
					})
				)}
				type="button"
			>
				Open
				<ChevronDown className="size-3.5 text-fd-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent className="flex flex-col overflow-auto">
				{items.map((item) => (
					<a
						className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-4"
						href={item.href}
						key={item.href}
						rel="noreferrer noopener"
						target="_blank"
					>
						{item.icon}
						{item.title}
						<ExternalLinkIcon className="ms-auto size-3.5 text-fd-muted-foreground" />
					</a>
				))}
			</PopoverContent>
		</Popover>
	);
}
