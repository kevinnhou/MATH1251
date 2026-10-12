import {
	type ExportGraph,
	type ExportNode,
	envId,
	type RelationName,
} from "@/lib/export/model";
import {
	pageIdOf,
	pageOf,
	prerequisites,
	relationsOf,
} from "@/lib/export/query";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import { type RenderedMarkdown, rendered } from "@/lib/markdown/types";
import { type PageEnvs, threadId } from "@/lib/math-env/page-envs";
import { getTenetHref, type TenetIndex } from "@/lib/math-env/tenet";
import type { Thread, ThreadIndex, ThreadMember } from "@/lib/math-env/thread";
import { chapterOfId, neighbours } from "./query";
import {
	byDirection,
	type CourseIndex,
	type DockEnv,
	type DockList,
	type DockRef,
	type DockThread,
	type PageDock,
	type ThreadMap,
	type ThreadMapThread,
} from "./types";

const NEEDS_LIMIT = 6;
const PRACTISED_LIMIT = 4;
const LEADS_LIMIT = 4;
const PAGE_LIST_LIMIT = 5;

interface DockSources {
	courseIndex: CourseIndex;
	exportGraph: ExportGraph;
	tenets: TenetIndex;
	threadMap: ThreadMap;
	threads: ThreadIndex;
}

interface DockThreadSource {
	thread: Thread;
	view: ThreadMapThread;
}

interface DockContext {
	chapter: string | undefined;
	graph: ExportGraph;
	index: CourseIndex;
	pageUrl: string;
	threads: readonly DockThreadSource[];
}

type MemberTest = (member: ThreadMember) => boolean;

export function buildPageDock(
	{
		courseIndex: index,
		exportGraph: graph,
		tenets,
		threadMap,
		threads,
	}: DockSources,
	envs: PageEnvs,
	page: { title: string; url: string }
): PageDock {
	const ctx: DockContext = {
		chapter: chapterOfId(index, page.url)?.id,
		graph,
		index,
		pageUrl: page.url,
		threads: threadMap.threads.flatMap((view) => {
			const thread = threads.bySlug.get(view.slug);
			return thread ? [{ thread, view }] : [];
		}),
	};
	const onPage: MemberTest = (member) => member.pageUrl === page.url;
	const own = envs.entries.flatMap((entry) => {
		const node = graph.nodes.get(envId(page.url, entry.id));
		return node?.type === "env" ? [dockEnv(ctx, entry.id, node, false)] : [];
	});
	const recalled = envs.recalls.flatMap((recall) => {
		const tenet = tenets.bySlug.get(recall.of);
		const node = tenet && graph.nodes.get(getTenetHref(tenet));
		return node?.type === "env" ? [dockEnv(ctx, recall.id, node, true)] : [];
	});

	const links = byDirection((direction) =>
		neighbours(index, page.url, direction)
	);
	const position = index.position.get(page.url);

	return {
		course:
			position === undefined
				? undefined
				: { length: index.pages.length, position },
		envs: [...own, ...recalled],
		page: {
			links: byDirection((direction) =>
				refList(links[direction], PAGE_LIST_LIMIT, (other) => ({
					id: other.id,
					title: rendered(other.title),
					...placeOf(ctx, other.id),
				}))
			),
			strip: byDirection((direction) =>
				positions(
					ctx,
					links[direction].map((other) => other.id)
				)
			),
			title: inline(page.title),
		},
		threads: ctx.threads
			.filter(
				({ thread }) =>
					thread.pageUrl === page.url || thread.members.some(onPage)
			)
			.map((source) => dockThread(ctx, source, onPage)),
	};
}

function dockThread(
	ctx: DockContext,
	{ thread, view }: DockThreadSource,
	isHere: MemberTest
): DockThread {
	const members = new Map(
		thread.members.map((member) => [member.href, member])
	);
	const here = view.route.stops.flatMap((stop, at) => {
		const member = members.get(stop.href);
		return member && isHere(member) ? [at] : [];
	});

	return {
		...view,
		here,
		positions: positions(
			ctx,
			thread.members
				.filter((member) => !isHere(member))
				.map((member) => member.pageUrl)
		),
		...(thread.pageUrl === ctx.pageUrl
			? { anchor: threadId(thread.slug) }
			: {}),
	};
}

function dockEnv(
	ctx: DockContext,
	anchor: string,
	node: ExportNode,
	recalled: boolean
): DockEnv {
	const needs = prerequisites(ctx.graph, node.id)
		.toSorted((left, right) => left.distance - right.distance)
		.map((prerequisite) => prerequisite.node);
	const practisedIn = related(ctx, node.id, "practised_by");
	const leadsTo = related(ctx, node.id, "used_by");
	const ref = (target: ExportNode) => dockRef(ctx, target);
	const isEnv: MemberTest = (member) => member.href === node.id;

	return {
		anchor,
		leadsTo: refList(leadsTo, LEADS_LIMIT, ref),
		needs: refList(needs, NEEDS_LIMIT, ref),
		practisedIn: refList(practisedIn, PRACTISED_LIMIT, ref),
		recalled,
		strip: {
			"builds-on": positions(ctx, needs.map(pageIdOf)),
			"leads-to": positions(ctx, [...leadsTo, ...practisedIn].map(pageIdOf)),
		},
		threads: ctx.threads
			.filter(({ thread }) => thread.members.some(isEnv))
			.map((source) => dockThread(ctx, source, isEnv)),
		title: inline(node.title || node.label),
	};
}

function related(
	ctx: DockContext,
	id: string,
	name: RelationName
): ExportNode[] {
	return relationsOf(ctx.graph, id, [name]).map((relation) => relation.node);
}

function refList<T>(
	items: readonly T[],
	limit: number,
	toRef: (item: T) => DockRef
): DockList {
	return { count: items.length, items: items.slice(0, limit).map(toRef) };
}

function dockRef(ctx: DockContext, node: ExportNode): DockRef {
	const page = node.type === "page" ? node : pageOf(ctx.graph, node);
	const pageId = page?.id ?? node.id;
	const local = pageId === ctx.pageUrl;
	const untitled = node.title === "" && !local && page !== undefined;
	const source = untitled
		? `${node.label} (${page.title})`
		: node.title || node.label;

	return {
		id: node.id,
		title: inline(source),
		...placeOf(ctx, pageId),
		...(node.difficulty ? { difficulty: node.difficulty } : {}),
	};
}

function placeOf(ctx: DockContext, pageId: string): { place?: string } {
	const chapter = chapterOfId(ctx.index, pageId);
	return chapter && chapter.id !== ctx.chapter ? { place: chapter.title } : {};
}

function positions(
	ctx: DockContext,
	pageIds: readonly (string | undefined)[]
): number[] {
	const pages = new Set(pageIds);
	pages.delete(ctx.pageUrl);
	return [...pages].flatMap((id) => {
		const position = id === undefined ? undefined : ctx.index.position.get(id);
		return position === undefined ? [] : [position];
	});
}

function inline(source: string): RenderedMarkdown<"inline"> {
	return rendered(compileMarkdownFragment(source, "inline"));
}
