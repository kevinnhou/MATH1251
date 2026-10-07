"use client";

import { useState } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import { getMathEnvConfig } from "@/lib/math-env/kinds";
import { chapterOfId, hasMemberOn, type MapIndex } from "@/lib/relations/query";
import type { MapThread } from "@/lib/relations/types";
import {
	BracketButton,
	LinkRow,
	RoleLabel,
	SectionHeading,
	THREAD_COLOR,
	type ViewProps,
} from "./parts";

const DOT_BASE = 6;
const DOT_STEP = 2;
const DOT_MAX = 12;

export function ThreadGrid({ focusId, index }: ViewProps) {
	const { chapters, threads } = index;
	const [selected, setSelected] = useState(
		() =>
			(threads.find((thread) => hasMemberOn(thread, focusId)) ?? threads[0])
				?.slug
	);
	const [preview, setPreview] = useState<string | null>(null);
	const focusChapter = index.pageById.get(focusId)?.chapter;
	const shown = threads.find((thread) => thread.slug === (preview ?? selected));

	if (threads.length === 0) {
		return (
			<p className="m-0 font-mono text-[10px] text-fd-muted-foreground">
				NO THREADS YET
			</p>
		);
	}

	const columns = `minmax(9rem, 14rem) repeat(${chapters.length}, minmax(1.25rem, 1fr))`;

	return (
		<div className="flex flex-col gap-4">
			<div className="overflow-x-auto">
				<div className="flex min-w-xl flex-col">
					<div
						aria-hidden="true"
						className="grid font-mono text-[9px]"
						style={{ gridTemplateColumns: columns }}
					>
						<span />
						{chapters.map((chapter, number) => (
							<span
								className={cn(
									"py-1 text-center",
									number === focusChapter
										? "text-fd-foreground"
										: "text-fd-muted-foreground"
								)}
								key={chapter.id}
								title={chapter.title}
							>
								{chapter.short}
							</span>
						))}
					</div>
					{threads.map((thread) => {
						const counts = chapterCounts(index, thread);
						const onFocus = hasMemberOn(thread, focusId);
						return (
							<button
								aria-label={`${thread.title.plain}, ${thread.members.length} places`}
								aria-pressed={thread.slug === selected}
								className={cn(
									"grid items-center py-1 text-left outline-none hover:bg-fd-accent focus-visible:outline-1 focus-visible:outline-fd-foreground",
									thread.slug === selected && "bg-fd-accent"
								)}
								key={thread.slug}
								onBlur={() => setPreview(null)}
								onClick={() => setSelected(thread.slug)}
								onFocus={() => setPreview(thread.slug)}
								onMouseEnter={() => setPreview(thread.slug)}
								onMouseLeave={() => setPreview(null)}
								style={{ gridTemplateColumns: columns }}
								type="button"
							>
								<span
									className="truncate pr-3 pl-1 text-[12px] text-fd-foreground"
									data-relations-label=""
								>
									<InlineHtml html={thread.title.html} />
								</span>
								{chapters.map((chapter, number) => (
									<ThreadCell
										count={counts.get(number) ?? 0}
										focused={number === focusChapter}
										key={chapter.id}
										ringed={onFocus && number === focusChapter}
									/>
								))}
							</button>
						);
					})}
				</div>
			</div>
			{shown ? <ThreadDetail index={index} thread={shown} /> : null}
		</div>
	);
}

function ThreadCell({
	count,
	focused,
	ringed,
}: {
	count: number;
	focused: boolean;
	ringed: boolean;
}) {
	const size = Math.min(DOT_BASE + DOT_STEP * (count - 1), DOT_MAX);
	return (
		<span
			aria-hidden="true"
			className={cn(
				"flex h-5 items-center justify-center",
				focused && "bg-fd-foreground/5"
			)}
		>
			{count > 0 ? (
				<span
					className={cn(
						"block rounded-full",
						ringed && "outline-1 outline-fd-foreground outline-offset-1"
					)}
					style={{ background: THREAD_COLOR, height: size, width: size }}
				/>
			) : null}
		</span>
	);
}

function ThreadDetail({
	index,
	thread,
}: {
	index: MapIndex;
	thread: MapThread;
}) {
	return (
		<section
			className="flex flex-col gap-1.5"
			data-dock-swap=""
			key={thread.slug}
		>
			<div className="flex items-baseline justify-between gap-3">
				<SectionHeading
					color={THREAD_COLOR}
					count={thread.members.length}
					label="THREAD"
				/>
				<BracketButton
					ariaLabel="Read this thread and compare its statements"
					href={thread.href}
					label="COMPARE"
				/>
			</div>
			<p className="m-0 text-[13px] text-fd-foreground" data-relations-label="">
				<InlineHtml html={thread.title.html} />
			</p>
			<p
				className="m-0 text-[12px] text-fd-muted-foreground leading-snug"
				data-relations-label=""
			>
				<InlineHtml html={thread.summary.html} />
			</p>
			<ol className="m-0 flex list-none flex-col gap-0.5 p-0">
				{thread.members.map((member) => (
					<LinkRow
						chapter={chapterOfId(index, member.page)}
						className="text-[12px]"
						code={getMathEnvConfig(member.kind).code}
						href={member.href}
						key={member.href}
						label={member.title}
					>
						{member.role ? <RoleLabel role={member.role} /> : null}
					</LinkRow>
				))}
			</ol>
		</section>
	);
}

function chapterCounts(
	index: MapIndex,
	thread: MapThread
): Map<number, number> {
	const counts = new Map<number, number>();
	for (const member of thread.members) {
		const chapter = index.pageById.get(member.page)?.chapter;
		if (chapter !== undefined) {
			counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
		}
	}
	return counts;
}
