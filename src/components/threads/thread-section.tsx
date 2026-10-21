import type { CSSProperties, ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { StatementHtml } from "@/components/mdx-env/statement";
import { cn } from "@/lib/cn";
import { getEnvConfig } from "@/lib/mdx-env/kinds";
import type { StatementView } from "@/lib/mdx-env/statement-html";
import type { PromptTarget } from "@/lib/mdx-env/target";
import type { TenetIndex } from "@/lib/mdx-env/tenet";
import {
	memberStatement,
	type Thread,
	type ThreadMember,
} from "@/lib/mdx-env/thread";
import { chapterOfId } from "@/lib/relations/query";
import type { CourseChapter, CourseIndex } from "@/lib/relations/types";
import { ThreadFrame } from "./thread-compare";

interface Station {
	chapter?: CourseChapter;
	member: ThreadMember;
	statement?: StatementView;
}

export function ThreadSection({
	children,
	courseIndex,
	id,
	target,
	tenets,
	thread,
}: {
	children?: ReactNode;
	courseIndex?: CourseIndex;
	id?: string;
	target?: PromptTarget;
	tenets?: TenetIndex;
	thread?: Thread;
}) {
	const stations = thread ? threadStations(thread, courseIndex, tenets) : [];

	return (
		<ThreadFrame
			count={stations.length}
			id={id}
			spine={<ThreadSpine stations={stations} />}
			target={target}
		>
			{children}
		</ThreadFrame>
	);
}

function threadStations(
	thread: Thread,
	courseIndex?: CourseIndex,
	tenets?: TenetIndex
): Station[] {
	return thread.members.map((member) => ({
		chapter: courseIndex && chapterOfId(courseIndex, member.pageUrl),
		member,
		statement: tenets && memberStatement(member, tenets),
	}));
}

function ThreadSpine({ stations }: { stations: readonly Station[] }) {
	return (
		<ol className="m-0 list-none px-0 pt-4 pb-0">
			{stations.map((station, number) => (
				<ThreadStation
					key={station.member.href}
					newChapter={stations[number - 1]?.chapter?.id !== station.chapter?.id}
					number={number}
					segment={segmentTo(station, stations[number + 1])}
					station={station}
				/>
			))}
		</ol>
	);
}

function segmentTo(
	station: Station,
	next: Station | undefined
): "dashed" | "solid" | undefined {
	if (next === undefined) {
		return;
	}
	return next.chapter?.strand === station.chapter?.strand ? "solid" : "dashed";
}

const REVEAL =
	"transition-[opacity,translate,scale] duration-150 ease-in motion-reduce:transition-none group-data-open/spine:delay-[calc(40ms_+_min(var(--station),_6)_*_30ms)] group-data-open/spine:duration-300 group-data-open/spine:ease-[cubic-bezier(0.2,0,0,1)]";

function ThreadStation({
	newChapter,
	number,
	segment,
	station: { chapter, member, statement },
}: {
	newChapter: boolean;
	number: number;
	segment?: "dashed" | "solid";
	station: Station;
}) {
	return (
		<li
			className="group/station grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3"
			data-href={member.href}
			data-station=""
			style={{ "--station": number } as CSSProperties}
		>
			<span aria-hidden="true" className="relative">
				<span
					className={cn(
						"absolute top-[-2.5px] left-1/2 size-1.5 -translate-x-1/2 scale-0 bg-fd-border group-data-open/spine:scale-100 group-data-[state=current]/station:bg-fd-foreground group-data-[state=passed]/station:bg-fd-muted-foreground",
						REVEAL
					)}
				/>
				{segment ? (
					<span
						className={cn(
							"absolute top-0.75 bottom-0.75 left-1/2 origin-top -translate-x-1/2 scale-y-0 border-fd-border border-l group-data-open/spine:scale-y-100",
							segment === "dashed" && "border-dashed",
							REVEAL
						)}
					/>
				) : null}
			</span>
			<div
				className={cn(
					"-ml-3.75 flex min-w-0 -translate-y-1.5 flex-col gap-1 border-fd-border border-t pt-3 pb-8 pl-3.75 opacity-0 group-last/station:pb-1 group-data-open/spine:translate-y-0 group-data-[state=current]/station:border-fd-foreground/40 group-data-open/spine:opacity-100",
					REVEAL
				)}
			>
				<span className="flex items-baseline justify-between gap-3 font-mono text-[10px] text-fd-muted-foreground leading-5">
					<span>
						{getEnvConfig(member.kind).code}
						{member.role ? (
							<>
								{" / "}
								<InlineHtml html={member.role.html} />
							</>
						) : null}
					</span>
					{newChapter && chapter ? (
						<span className="shrink-0 font-sans text-[11px] italic">
							{chapter.title}
						</span>
					) : null}
				</span>
				<a
					className="font-medium text-fd-foreground text-sm underline-offset-4 hover:underline"
					href={member.href}
				>
					<InlineHtml html={member.title.html} />
				</a>
				{statement ? (
					<StatementHtml
						className="mb-0 text-fd-muted-foreground transition-colors duration-300 group-hover/station:text-fd-foreground group-data-[state=current]/station:text-fd-foreground"
						html={statement.html}
					/>
				) : null}
			</div>
		</li>
	);
}
