"use client";

import type { ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import type { ThreadMapThread } from "@/lib/relations/types";
import { ACTION, Bracket } from "./bracket";
import { MONO, placeLabel } from "./format";
import type { DiagramStation } from "./layout";

export type ThreadLookup = ReadonlyMap<string, ThreadMapThread>;

const TITLE = "font-semibold text-[17px] text-fd-foreground leading-snug";

const STEPS = [
	{ by: -1, glyph: "←", label: "Previous stop" },
	{ by: 1, glyph: "→", label: "Next stop" },
] as const;

function Card({ children }: { children: ReactNode }) {
	return (
		<article
			className="flex max-w-2xl flex-col gap-2.5"
			data-relations-label=""
		>
			{children}
		</article>
	);
}

export function StopCard({
	entry,
	onStep,
	pinned,
	statement,
	threads,
}: {
	entry: DiagramStation;
	onStep: (by: -1 | 1) => void;
	pinned: boolean;
	statement: ReactNode;
	threads: ThreadLookup;
}) {
	return (
		<Card>
			<a
				className={cn(
					TITLE,
					"underline-offset-4 outline-none hover:underline focus-visible:underline"
				)}
				href={entry.station.href}
			>
				<InlineHtml html={entry.station.title.html} />
			</a>
			<p
				className={cn(
					MONO,
					"m-0 flex items-baseline gap-2 text-fd-muted-foreground"
				)}
			>
				<span className="text-fd-foreground">{entry.station.code}</span>
				<span>{placeLabel(entry.strand.title, entry.chapter.number)}</span>
				<span className="truncate font-sans text-[12px] normal-case italic tracking-normal">
					{entry.chapter.title}
				</span>
			</p>
			{statement ? (
				<div className="text-fd-foreground/90 [&_.math-env-statement]:mb-0">
					{statement}
				</div>
			) : null}
			<ul className="m-0 flex list-none flex-col gap-1.5 p-0 pt-1">
				{entry.station.stops.map((stop) => {
					const thread = threads.get(stop.thread);
					return thread ? (
						<li
							className="grid grid-cols-[1rem_minmax(0,1fr)] items-baseline gap-x-2 text-[12px] leading-snug"
							key={stop.thread}
						>
							<span className="font-mono text-(--relations-thread) text-[10px]">
								{thread.number}
							</span>
							<span>
								<span className="text-fd-foreground">
									<InlineHtml html={thread.title.html} />
								</span>
								{stop.role ? (
									<span className="text-fd-muted-foreground italic">
										{" / "}
										<InlineHtml html={stop.role.html} />
									</span>
								) : null}
							</span>
						</li>
					) : null;
				})}
			</ul>
			<div className="flex items-center gap-4 pt-1 text-fd-muted-foreground">
				{pinned
					? STEPS.map(({ by, glyph, label }) => (
							<button
								aria-label={label}
								className={ACTION}
								key={by}
								onClick={() => onStep(by)}
								type="button"
							>
								<Bracket>{glyph}</Bracket>
							</button>
						))
					: null}
				<a className={ACTION} href={entry.station.href}>
					<Bracket>Open ↗</Bracket>
				</a>
			</div>
		</Card>
	);
}

export function ThreadCard({ thread }: { thread: ThreadMapThread }) {
	const stops = thread.route.stops.length;
	return (
		<Card>
			<span className={TITLE}>
				<InlineHtml html={thread.title.html} />
			</span>
			<p className={cn(MONO, "m-0 text-fd-muted-foreground")}>
				<span className="text-(--relations-thread)">{thread.number}</span>
				{" / "}
				{thread.route.lanes.join(" / ")}
				{" / "}
				{stops} {stops === 1 ? "stop" : "stops"}
			</p>
			<p className="m-0 text-[14px] text-fd-foreground/90 leading-relaxed">
				<InlineHtml html={thread.summary.html} />
			</p>
		</Card>
	);
}
