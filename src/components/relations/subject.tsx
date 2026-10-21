import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { THREAD_COLOR } from "@/components/threads/colors";
import { RouteStrip } from "@/components/threads/route-strip";
import type { RenderedMarkdown } from "@/lib/markdown/types";
import {
	byDirection,
	type Direction,
	type DockEnv,
	type DockList,
	type DockRef,
	type DockStrip,
	type DockThread,
	type PageDock,
} from "@/lib/relations/types";
import { DIRECTION_COLORS, MUTED_COLOR } from "./colors";

export interface DockSubject {
	bay: ReactNode;
	key: string;
	recalled?: boolean;
	strip: SubjectStrip;
	summary: ReactNode;
	title: RenderedMarkdown<"inline">;
}

export interface SubjectStrip extends DockStrip {
	thread: number[];
}

interface Clause {
	color: string;
	lead: string;
	list: DockList;
}

const UNLINKED = "Not linked to the rest of the course yet.";
const BUILDS_ON = DIRECTION_COLORS["builds-on"];
const LEADS_TO = DIRECTION_COLORS["leads-to"];

export function subjectAt(dock: PageDock, anchor: string | null): DockSubject {
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
	const needs = clause("Builds on", env.needs, BUILDS_ON);
	const practisedIn = clause("Practised in", env.practisedIn, MUTED_COLOR);
	const leadsTo = clause("Leads to", env.leadsTo, LEADS_TO);

	return {
		bay: (
			<RelationsBay
				clauses={[needs, practisedIn, leadsTo]}
				threads={env.threads}
			/>
		),
		key: env.anchor,
		recalled: env.recalled,
		strip: withThreads(env.strip, env.threads),
		summary:
			firstClause([needs, leadsTo, practisedIn]) ??
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
	const link = (lead: string, direction: Direction) =>
		clause(lead, page.links[direction], DIRECTION_COLORS[direction]);

	return {
		bay: (
			<RelationsBay
				clauses={[
					link("This page builds on", "builds-on"),
					link("It leads to", "leads-to"),
				]}
				threads={threads}
			/>
		),
		key: "page",
		strip: withThreads(page.strip, threads),
		summary:
			firstClause([
				link("Builds on", "builds-on"),
				link("Leads to", "leads-to"),
			]) ?? UNLINKED,
		title: page.title,
	};
}

function clause(lead: string, list: DockList, color: string): Clause {
	return { color, lead, list };
}

function firstClause(clauses: readonly Clause[]): ReactNode | undefined {
	const found = clauses.find(({ list }) => list.items.length > 0);
	if (!found) {
		return;
	}

	const { count, items } = found.list;
	const [first] = items;
	return (
		<>
			{found.lead} <InlineHtml html={first.title.html} />
			{count > 1 ? ` and ${count - 1} more` : ""}.
		</>
	);
}

function RelationsBay({
	clauses,
	threads,
}: {
	clauses: readonly Clause[];
	threads: readonly DockThread[];
}) {
	const linked =
		threads.length > 0 || clauses.some(({ list }) => list.count > 0);

	return (
		<>
			{clauses.map((entry) => (
				<ClauseLine key={entry.lead} {...entry} />
			))}
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

function ClauseLine({ color, lead, list }: Clause) {
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
	const aside = [item.place, item.difficulty].filter(Boolean).join(", ");

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
