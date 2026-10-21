"use client";

import type { ReactNode } from "react";
import { AskShare } from "@/components/export/share";
import { cn } from "@/lib/cn";
import type { EnvView } from "@/lib/mdx-env/env-meta";
import { getEnvConfig } from "@/lib/mdx-env/kinds";
import { Footnotes } from "./footnotes";
import { EnvMark } from "./mark";

interface EnvProps {
	children?: ReactNode;
	env: EnvView;
	markHref?: string;
	markLinkLabel?: string;
}

export function Env({ children, env, markHref, markLinkLabel }: EnvProps) {
	const config = getEnvConfig(env.kind);
	const Tag = config.untitled ? "div" : "section";

	function renderEnv(rightClickHint?: ReactNode) {
		return (
			<Tag
				aria-label={config.untitled ? config.label : undefined}
				className={cn(
					"mdx-env group/mdx-env relative my-8 grid grid-cols-[1.15rem_minmax(0,1fr)] items-stretch gap-x-3",
					"[&_.mdx-env]:my-4",
					config.style === "subdued" && "my-5"
				)}
				data-env-kind={env.kind}
				data-env-style={config.style}
				id={env.id}
			>
				<span className="relative flex self-stretch">
					<span className="flex min-h-0 min-w-0 flex-1 overflow-hidden text-primary/20">
						<EnvMark
							config={config}
							href={markHref}
							linkLabel={markLinkLabel}
						/>
					</span>
				</span>
				<div className="min-w-0">
					<div className="mdx-env-body *:first:mt-0 *:last:mb-0">
						{children}
					</div>
					<Footnotes
						citedBy={env.citedBy}
						difficulty={env.difficulty}
						moreHref={env.pageUrl}
						see={env.relatedSee}
						uses={env.relatedUses}
					/>
				</div>
				{rightClickHint}
			</Tag>
		);
	}

	if (env.prompt === undefined) {
		return renderEnv();
	}

	return (
		<AskShare
			className="absolute right-0 bottom-0"
			group="mdx-env"
			target={env.prompt}
		>
			{(rightClickHint) => renderEnv(rightClickHint)}
		</AskShare>
	);
}
