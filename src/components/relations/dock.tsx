"use client";

import Link from "next/link";
import {
	Fragment,
	type ReactNode,
	type RefCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
} from "react";
import { InlineHtml } from "@/components/markdown/html";
import { usePublishDock } from "@/components/relations/provider";
import { focusRouteNav, RouteStrip } from "@/components/threads/route-strip";
import { moveKey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import type { RenderedMarkdown } from "@/lib/markdown/types";
import {
	byDirection,
	DIRECTIONS,
	type Direction,
	type DockEnv,
	type DockList,
	type DockRef,
	type DockStrip,
	type DockThread,
	type PageDock,
} from "@/lib/relations/types";
import { DIRECTION_COLORS, MUTED_COLOR, THREAD_COLOR } from "./colors";
import {
	type DockState,
	useActiveAnchor,
	useBoxHeight,
	useCorridor,
	useDockState,
} from "./dock-hooks";

const WIDTH = "w-[min(19rem,calc(100vw-2.5rem))]";

interface DockSubject {
	bay: ReactNode;
	key: string;
	recalled?: boolean;
	strip: SubjectStrip;
	summary: ReactNode;
	title: RenderedMarkdown<"inline">;
}

interface SubjectStrip extends DockStrip {
	thread: number[];
}

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

function subjectAt(dock: PageDock, anchor: string | null): DockSubject {
	const env = dock.envs.find((entry) => entry.anchor === anchor);
	if (env) {
		return envSubject(env);
	}

	const thread = dock.threads.find((entry) => entry.anchor === anchor);
	return thread ? threadSubject(thread) : pageSubject(dock);
}

function withThreads(
	strip: DockStrip,
	threads: readonly DockThread[]
): SubjectStrip {
	return {
		...strip,
		thread: [...new Set(threads.flatMap((thread) => thread.positions))],
	};
}

const UNLINKED = "Not linked to the rest of the course yet.";

function threadSubject(thread: DockThread): DockSubject {
	const count = thread.route.stops.length;
	return {
		bay: <ThreadBlock thread={thread} />,
		key: thread.slug,
		strip: withThreads(
			byDirection(() => []),
			[thread]
		),
		summary: `Appears in ${count} ${count === 1 ? "place" : "places"}.`,
		title: thread.title,
	};
}

function envSubject(env: DockEnv): DockSubject {
	const [thread] = env.threads;
	return {
		bay: <EnvBay env={env} />,
		key: env.anchor,
		recalled: env.recalled,
		strip: withThreads(env.strip, env.threads),
		summary:
			firstClause(
				["Builds on", env.needs],
				["Leads to", env.leadsTo],
				["Practised in", env.practisedIn]
			) ??
			(thread ? (
				<>
					Part of the thread <InlineHtml html={thread.title.html} />.
				</>
			) : (
				UNLINKED
			)),
		title: env.title,
	};
}

function pageSubject({ page, threads }: PageDock): DockSubject {
	return {
		bay: <PageBay links={page.links} threads={threads} />,
		key: "page",
		strip: withThreads(page.strip, threads),
		summary:
			firstClause(
				["Builds on", page.links["builds-on"]],
				["Leads to", page.links["leads-to"]]
			) ?? UNLINKED,
		title: page.title,
	};
}

function firstClause(
	...clauses: [lead: string, list: DockList][]
): ReactNode | undefined {
	const found = clauses.find(([, list]) => list.items.length > 0);
	if (!found) {
		return;
	}

	const [lead, { count, items }] = found;
	const [first] = items;
	return (
		<>
			{lead} <InlineHtml html={first.title.html} />
			{count > 1 ? ` and ${count - 1} more` : ""}.
		</>
	);
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

function isLinked(
	lists: readonly DockList[],
	threads: readonly DockThread[]
): boolean {
	return threads.length > 0 || lists.some((list) => list.count > 0);
}

function EnvBay({ env }: { env: DockEnv }) {
	const linked = isLinked(
		[env.needs, env.practisedIn, env.leadsTo],
		env.threads
	);

	return (
		<>
			<Clause
				color={DIRECTION_COLORS["builds-on"]}
				lead="Builds on"
				list={env.needs}
			/>
			<Clause color={MUTED_COLOR} lead="Practised in" list={env.practisedIn} />
			<Clause
				color={DIRECTION_COLORS["leads-to"]}
				lead="Leads to"
				list={env.leadsTo}
			/>
			{env.threads.map((thread) => (
				<ThreadBlock key={thread.slug} thread={thread} />
			))}
			{linked ? null : <p className="m-0">{UNLINKED}</p>}
		</>
	);
}

function PageBay({
	links,
	threads,
}: {
	links: PageDock["page"]["links"];
	threads: readonly DockThread[];
}) {
	const linked = isLinked(
		DIRECTIONS.map((direction) => links[direction]),
		threads
	);

	return (
		<>
			<Clause
				color={DIRECTION_COLORS["builds-on"]}
				lead="This page builds on"
				list={links["builds-on"]}
			/>
			<Clause
				color={DIRECTION_COLORS["leads-to"]}
				lead="It leads to"
				list={links["leads-to"]}
			/>
			{threads.map((thread) => (
				<ThreadBlock key={thread.slug} thread={thread} />
			))}
			{linked ? null : <p className="m-0">{UNLINKED}</p>}
		</>
	);
}

function ThreadBlock({ thread }: { thread: DockThread }) {
	return (
		<section className="mt-1 flex flex-col gap-2.5" data-relations-label="">
			<p className="m-0">
				Part of the thread{" "}
				<RefLink color={THREAD_COLOR} href={thread.href}>
					<InlineHtml html={thread.title.html} />
				</RefLink>
				, in {thread.route.stops.length} places.
			</p>
			<p className="m-0 border-fd-border border-l pl-2.5">
				<InlineHtml html={thread.summary.html} />
			</p>
			<RouteStrip
				here={thread.here}
				mapHref={thread.mapHref}
				route={thread.route}
				title={thread.title}
			/>
		</section>
	);
}

function Clause({
	color,
	lead,
	list,
}: {
	color: string;
	lead: string;
	list: DockList;
}) {
	return list.count === 0 ? null : (
		<p className="m-0" data-relations-label="">
			{lead} <Refs color={color} list={list} />.
		</p>
	);
}

function Refs({ color, list }: { color: string; list: DockList }) {
	const hidden = list.count - list.items.length;
	return joinWords([
		...list.items.map((item) => (
			<Ref color={color} item={item} key={item.id} />
		)),
		...(hidden > 0 ? [`${hidden} more`] : []),
	]);
}

function joinWords(parts: readonly ReactNode[]): ReactNode {
	return parts.map((part, index) => (
		<Fragment key={index}>
			{separator(index, parts.length)}
			{part}
		</Fragment>
	));
}

function separator(index: number, length: number): string {
	if (index === 0) {
		return "";
	}
	return index === length - 1 ? " and " : ", ";
}

function Ref({ color, item }: { color: string; item: DockRef }) {
	const aside = item.role ? (
		<InlineHtml html={item.role.html} />
	) : (
		[item.place, item.difficulty].filter(Boolean).join(", ")
	);

	return (
		<>
			<RefLink color={color} href={item.id}>
				<InlineHtml html={item.title.html} />
			</RefLink>
			{aside ? <> ({aside})</> : null}
		</>
	);
}

function RefLink({
	children,
	color,
	href,
}: {
	children: ReactNode;
	color: string;
	href: string;
}) {
	return (
		<Link
			className="text-fd-foreground underline decoration-1 underline-offset-[3px] outline-none hover:decoration-2 focus-visible:outline-1 focus-visible:outline-fd-foreground"
			href={href}
			style={{ textDecorationColor: color }}
		>
			{children}
		</Link>
	);
}
