"use client";

import { type RefCallback, useEffect, useId, useMemo, useRef } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { usePublishDock } from "@/components/relations/provider";
import { focusRouteNav } from "@/components/threads/route-strip";
import { moveKey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import {
	byDirection,
	DIRECTIONS,
	type Direction,
	type PageDock,
} from "@/lib/relations/types";
import { DIRECTION_COLORS, THREAD_COLOR } from "./colors";
import {
	type DockState,
	useActiveAnchor,
	useBoxHeight,
	useCorridor,
	useDockState,
} from "./dock-hooks";
import { type DockSubject, type SubjectStrip, subjectAt } from "./subject";

const WIDTH = "w-[min(19rem,calc(100vw-2.5rem))]";

export function ReadingDock({ dock }: { dock: PageDock }) {
	usePublishDock(dock);
	const rootRef = useRef<HTMLElement>(null);
	const bayId = useId();
	const corridor = useCorridor();
	const { engaged, focusHandlers, state, toggleBay } = useDockState(
		rootRef,
		corridor
	);
	const anchors = useMemo(
		() => [
			...dock.envs.map((entry) => entry.anchor),
			...dock.threads.flatMap((thread) => thread.anchor ?? []),
		],
		[dock.envs, dock.threads]
	);
	const activeAnchor = useActiveAnchor(anchors, engaged, corridor);
	const subject = subjectAt(dock, activeAnchor);
	const [restRef, restHeight] = useBoxHeight();
	const [bayRef, bayHeight] = useBoxHeight();
	const open = state === "bay";
	useActiveMark(activeAnchor, state);

	return (
		<aside
			aria-label="Reading dock"
			className="fixed right-0 bottom-0 z-30 print:hidden"
			data-dock={state}
			data-route-group=""
			ref={rootRef}
			{...focusHandlers}
		>
			<span aria-hidden="true" data-dock-corner="top" />
			<span aria-hidden="true" data-dock-corner="left" />
			<div
				className={cn(
					"flex flex-col items-end justify-end overflow-hidden text-fd-foreground transition-[height] duration-200 ease-out motion-reduce:transition-none",
					WIDTH
				)}
				data-dock-surface=""
				style={{ height: surfaceHeight(open, restHeight, bayHeight) }}
			>
				<div className={cn("relative shrink-0", WIDTH)} ref={restRef}>
					<Bay id={bayId} open={open} ref={bayRef} subject={subject} />
					<RestBar
						bayId={bayId}
						course={dock.course}
						expanded={open}
						onToggle={toggleBay}
						subject={subject}
					/>
				</div>
			</div>
		</aside>
	);
}

function Bay({
	id,
	open,
	ref,
	subject,
}: {
	id: string;
	open: boolean;
	ref: RefCallback<HTMLDivElement>;
	subject: DockSubject;
}) {
	return (
		<div
			className="absolute right-0 bottom-full w-full transition-opacity duration-200 ease-out motion-reduce:transition-none"
			id={id}
			inert={!open}
			ref={ref}
			style={{ opacity: open ? 1 : 0 }}
		>
			<div className="max-h-[min(60vh,32rem)] overflow-y-auto px-4 pt-4 pb-1">
				<div
					className="flex flex-col gap-2.5 text-[12px] text-fd-muted-foreground leading-relaxed"
					data-dock-swap=""
					key={subject.key}
				>
					{subject.bay}
				</div>
			</div>
		</div>
	);
}

function surfaceHeight(
	open: boolean,
	rest: number | undefined,
	bay: number | undefined
): number | undefined {
	if (!open) {
		return rest;
	}

	return rest === undefined || bay === undefined ? undefined : rest + bay;
}

function useActiveMark(anchor: string | null, state: DockState) {
	useEffect(() => {
		const element = anchor === null ? null : document.getElementById(anchor);
		element?.setAttribute("data-dock-active", state);
		return () => element?.removeAttribute("data-dock-active");
	}, [anchor, state]);
}

function RestBar({
	bayId,
	course,
	expanded,
	onToggle,
	subject,
}: {
	bayId: string;
	course: PageDock["course"];
	expanded: boolean;
	onToggle: () => void;
	subject: DockSubject;
}) {
	return (
		<button
			aria-controls={bayId}
			aria-expanded={expanded}
			className="flex w-full flex-col gap-1.5 px-4 pt-2.5 pb-3 text-left outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground focus-visible:-outline-offset-2"
			data-route-nav=""
			onClick={onToggle}
			onKeyDown={(event) => {
				if (moveKey(event.nativeEvent) === "up") {
					event.preventDefault();
					focusRouteNav(event.currentTarget, -1);
				}
			}}
			type="button"
		>
			<span
				className="flex min-w-0 flex-col gap-0.5"
				data-dock-swap=""
				data-relations-label=""
				key={subject.key}
			>
				<span className="truncate text-[12px]">
					<InlineHtml html={subject.title.html} />
					{subject.recalled ? (
						<span className="text-fd-muted-foreground"> / recalled</span>
					) : null}
				</span>
				<span className="truncate text-[11px] text-fd-muted-foreground">
					{subject.summary}
				</span>
			</span>
			{course ? (
				<CourseStrip course={course} strip={subject.strip} />
			) : (
				<span aria-hidden="true" className="block h-2" />
			)}
		</button>
	);
}

function CourseStrip({
	course,
	strip,
}: {
	course: NonNullable<PageDock["course"]>;
	strip: SubjectStrip;
}) {
	const marked = byDirection((direction) => new Set(strip[direction]));
	const threaded = new Set(strip.thread);

	return (
		<svg
			aria-hidden="true"
			className="block h-2 w-full"
			preserveAspectRatio="none"
			viewBox={`0 0 ${course.length} 8`}
		>
			{Array.from({ length: course.length }, (_, position) => {
				const tick = stripTick(position, course.position, marked, threaded);
				return (
					<rect
						className="transform-fill origin-bottom transition-[transform,fill] duration-300 ease-out motion-reduce:transition-none"
						height={8}
						key={position}
						style={{
							fill: tick.color,
							transform: `scaleY(${tick.height / 8})`,
						}}
						width={0.55}
						x={position + 0.225}
						y={0}
					/>
				);
			})}
		</svg>
	);
}

function stripTick(
	position: number,
	home: number,
	marked: Record<Direction, ReadonlySet<number>>,
	threaded: ReadonlySet<number>
): { color: string; height: number } {
	if (position === home) {
		return { color: "var(--color-fd-foreground)", height: 8 };
	}

	if (threaded.has(position)) {
		return { color: THREAD_COLOR, height: 8 };
	}

	const direction = DIRECTIONS.find((key) => marked[key].has(position));
	return direction
		? { color: DIRECTION_COLORS[direction], height: 6 }
		: { color: "var(--color-fd-border)", height: 2 };
}
