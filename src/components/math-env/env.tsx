"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
	type ExampleDifficulty,
	getMathEnvConfig,
	type MathEnvKind,
} from "@/lib/math-env/kinds";
import type { ResolvedRef } from "@/lib/math-env/tenet";
import { Footnotes } from "./footnotes";
import { EnvMark } from "./mark";
import { EnvShare } from "./share";

type EnvSectionProps = ComponentPropsWithoutRef<"section">;

export type EnvProps = Omit<EnvSectionProps, "children"> & {
	body?: string;
	citedBy?: ResolvedRef[];
	difficulty?: ExampleDifficulty;
	exportTitle?: string;
	isRecall?: boolean;
	kind: MathEnvKind;
	markHref?: string;
	markLinkLabel?: string;
	moreHref?: string;
	originalHref?: string;
	pageTitle?: string;
	relatedSee?: ResolvedRef[];
	relatedUses?: ResolvedRef[];
	statementMarkdown?: string;
	children?: ReactNode;
};

export function Env({
	body,
	citedBy,
	className,
	children,
	difficulty,
	exportTitle,
	id,
	isRecall,
	kind,
	markHref,
	markLinkLabel,
	moreHref,
	originalHref,
	pageTitle,
	relatedSee,
	relatedUses,
	statementMarkdown,
	...props
}: EnvProps) {
	const config = getMathEnvConfig(kind);
	const Tag = config.untitled ? "div" : "section";

	function renderEnv(rightClickHint?: ReactNode) {
		return (
			<Tag
				{...props}
				aria-label={config.untitled ? config.label : undefined}
				className={cn(
					"math-env group/math-env relative my-8 grid grid-cols-[1.15rem_minmax(0,1fr)] items-stretch gap-x-3",
					"[&_.math-env]:my-4",
					config.style === "proof" && "my-5",
					className
				)}
				data-math-env={kind}
				data-math-style={config.style}
				id={id}
			>
				<span className="relative flex self-stretch">
					<span className="flex min-h-0 min-w-0 flex-1 overflow-hidden text-primary/20">
						<EnvMark
							code={config.code}
							href={markHref}
							kind={kind}
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
						citedBy={citedBy}
						difficulty={difficulty}
						moreHref={moreHref}
						see={relatedSee}
						uses={relatedUses}
					/>
				</div>
				{rightClickHint}
			</Tag>
		);
	}

	if (id === undefined) {
		return renderEnv();
	}

	return (
		<EnvShare
			body={body}
			citedBy={citedBy}
			difficulty={difficulty}
			id={id}
			isRecall={isRecall}
			kind={kind}
			originalHref={originalHref}
			pageTitle={pageTitle ?? ""}
			pageUrl={moreHref ?? ""}
			relatedSee={relatedSee}
			relatedUses={relatedUses}
			statement={statementMarkdown}
			title={exportTitle}
		>
			{(rightClickHint) => renderEnv(rightClickHint)}
		</EnvShare>
	);
}
