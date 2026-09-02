import Link from "next/link";
import type { ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import type { ExampleDifficulty } from "@/lib/math-env/kinds";
import type { ResolvedRef } from "@/lib/math-env/tenet";

const CITED_BY_LIMIT = 4;

interface FootnotesProps {
	citedBy?: ResolvedRef[];
	difficulty?: ExampleDifficulty;
	moreHref?: string;
	see?: ResolvedRef[];
	uses?: ResolvedRef[];
}

export function Footnotes({
	citedBy = [],
	difficulty,
	moreHref,
	see = [],
	uses = [],
}: FootnotesProps) {
	const extra = Math.max(0, citedBy.length - CITED_BY_LIMIT);
	const items = uniqueRefs([
		...uses,
		...see,
		...citedBy.slice(0, CITED_BY_LIMIT),
	]);

	if (difficulty === undefined && items.length === 0) {
		return null;
	}

	return (
		<div className="math-env-footnotes mt-3 text-fd-muted-foreground text-xs">
			{difficulty ? <DifficultyTag difficulty={difficulty} /> : null}
			{items.length > 0 ? (
				<ol
					className={cn(
						"m-0 list-none border-fd-border border-t p-0 pt-2",
						difficulty ? "mt-2" : undefined
					)}
				>
					{items.map((item, index) => (
						<li className="flex items-baseline gap-x-1" key={item.href}>
							<MonoMark suffix={":"}>{index + 1}</MonoMark>
							<FootnoteLink item={item} />
						</li>
					))}
					<CitedByOverflow extra={extra} moreHref={moreHref} />
				</ol>
			) : null}
		</div>
	);
}

function DifficultyTag({ difficulty }: { difficulty: ExampleDifficulty }) {
	return (
		<p className="m-0">
			<MonoMark>
				<span className="pr-1 pl-0.5 uppercase italic">{difficulty}</span>
			</MonoMark>
		</p>
	);
}

function MonoMark({
	children,
	suffix,
}: {
	children: ReactNode;
	suffix?: string;
}) {
	return (
		<span className="font-mono">
			<span className="font-bold">[</span>
			<span>{children}</span>
			<span className="font-bold">]</span>
			{suffix}
		</span>
	);
}

function uniqueRefs(refs: ResolvedRef[]): ResolvedRef[] {
	const seen = new Set<string>();
	const result: ResolvedRef[] = [];

	for (const ref of refs) {
		if (seen.has(ref.href)) {
			continue;
		}

		seen.add(ref.href);
		result.push(ref);
	}

	return result;
}

function CitedByOverflow({
	extra,
	moreHref,
}: {
	extra: number;
	moreHref?: string;
}) {
	if (extra <= 0) {
		return null;
	}

	if (moreHref) {
		return (
			<li>
				<Link
					className="text-fd-foreground no-underline hover:underline"
					href={moreHref}
				>
					{extra} more
				</Link>
			</li>
		);
	}

	return <li>{extra} more</li>;
}

function FootnoteLink({ item }: { item: ResolvedRef }) {
	return (
		<Link
			className="text-fd-foreground no-underline hover:underline"
			href={item.href}
		>
			<InlineHtml html={item.title.html} />
		</Link>
	);
}
