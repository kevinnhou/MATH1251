"use client";

import type { ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { foregroundAt, THREAD_COLOR } from "@/components/relations/colors";
import { cn } from "@/lib/cn";
import type { ThreadMapThread } from "@/lib/relations/thread-map";
import { ACTION, Bracket } from "./bracket";
import { MONO, placeLabel } from "./format";
import type { DiagramStation } from "./layout";

export type ThreadLookup = ReadonlyMap<string, ThreadMapThread>;

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
		<article
			className="flex max-w-2xl flex-col gap-2.5"
			data-relations-label=""
		>
			<a
				className="font-semibold text-[17px] text-fd-foreground leading-snug underline-offset-4 outline-none hover:underline focus-visible:underline"
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
				<span>{placeLabel(entry.strand.title, entry.number)}</span>
				{entry.chapter ? (
					<span className="truncate font-sans text-[12px] normal-case italic tracking-normal">
						{entry.chapter.title}
					</span>
				) : null}
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
				{pinned ? (
					<>
						<button
							aria-label="Previous stop"
							className={ACTION}
							onClick={() => onStep(-1)}
							type="button"
						>
							<Bracket>←</Bracket>
						</button>
						<button
							aria-label="Next stop"
							className={ACTION}
							onClick={() => onStep(1)}
							type="button"
						>
							<Bracket>→</Bracket>
						</button>
					</>
				) : null}
				<a className={ACTION} href={entry.station.href}>
					<Bracket>Open ↗</Bracket>
				</a>
			</div>
		</article>
	);
}

export function ThreadCard({ thread }: { thread: ThreadMapThread }) {
	const stops = thread.route.stops.length;
	return (
		<article
			className="flex max-w-2xl flex-col gap-2.5"
			data-relations-label=""
		>
			<span className="font-semibold text-[17px] text-fd-foreground leading-snug">
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
		</article>
	);
}

const LINE = foregroundAt(55);

export function Marks() {
	return (
		<ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[11px] text-fd-muted-foreground">
			{KEY.map(([glyph, text]) => (
				<li className="flex items-center gap-2" key={text}>
					<svg aria-hidden="true" className="block" height={16} width={24}>
						{glyph}
					</svg>
					{text}
				</li>
			))}
		</ul>
	);
}

function square(y: number, filled = false): ReactNode {
	return (
		<rect
			fill={
				filled ? "var(--color-fd-foreground)" : "var(--color-fd-background)"
			}
			height={7}
			stroke={filled ? "var(--color-fd-foreground)" : LINE}
			strokeWidth={1.5}
			width={7}
			x={8.5}
			y={y}
		/>
	);
}

const KEY: readonly [glyph: ReactNode, text: string][] = [
	[
		<line
			key="solid"
			stroke={LINE}
			strokeWidth={1.5}
			x1={1}
			x2={23}
			y1={8}
			y2={8}
		/>,
		"Within a chapter",
	],
	[
		<line
			key="transit"
			stroke={LINE}
			strokeDasharray="1 4"
			strokeLinecap="round"
			strokeWidth={1.25}
			x1={1}
			x2={23}
			y1={8}
			y2={8}
		/>,
		"Waiting between chapters",
	],
	[square(4.5), "A stop"],
	[
		<g key="interchange">
			<line
				stroke="var(--color-fd-foreground)"
				strokeWidth={2}
				x1={12}
				x2={12}
				y1={4}
				y2={12}
			/>
			{square(0.5)}
			{square(8.5)}
		</g>,
		"One stop on two threads",
	],
	[square(4.5, true), "Pinned"],
	[
		<line
			key="marked"
			stroke={THREAD_COLOR}
			strokeWidth={2.5}
			x1={1}
			x2={23}
			y1={8}
			y2={8}
		/>,
		"The thread in question",
	],
];
