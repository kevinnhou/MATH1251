"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { EnvView } from "@/lib/math-env/env-meta";
import { getMathEnvConfig } from "@/lib/math-env/kinds";
import { Footnotes } from "./footnotes";
import { EnvMark } from "./mark";
import { EnvShare } from "./share";

interface EnvProps {
	children?: ReactNode;
	env: EnvView;
	markHref?: string;
	markLinkLabel?: string;
}

export function Env({ children, env, markHref, markLinkLabel }: EnvProps) {
	const config = getMathEnvConfig(env.kind);
	const Tag = config.untitled ? "div" : "section";

	function renderEnv(rightClickHint?: ReactNode) {
		return (
			<Tag
				aria-label={config.untitled ? config.label : undefined}
				className={cn(
					"math-env group/math-env relative my-8 grid grid-cols-[1.15rem_minmax(0,1fr)] items-stretch gap-x-3",
					"[&_.math-env]:my-4",
					config.style === "proof" && "my-5"
				)}
				data-math-env={env.kind}
				data-math-style={config.style}
				id={env.id}
			>
				<span className="relative flex self-stretch">
					<span className="flex min-h-0 min-w-0 flex-1 overflow-hidden text-primary/20">
						<EnvMark
							code={config.code}
							href={markHref}
							kind={env.kind}
							linkLabel={markLinkLabel}
							qed={config.qed}
							style={config.style}
							word={config.word}
						/>
					</span>
				</span>
				<div className="min-w-0">
					<div className="math-env-body *:first:mt-0 *:last:mb-0">
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
		<EnvShare target={env.prompt}>
			{(rightClickHint) => renderEnv(rightClickHint)}
		</EnvShare>
	);
}
