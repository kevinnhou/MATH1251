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
import { type PageEnvs, threadId } from "@/lib/math-env/page-envs";
import { getTenetHref, type TenetIndex } from "@/lib/math-env/tenet";
import { chapterOfId, hasMemberOn, type MapIndex, neighbours } from "./query";
import {
	byDirection,
	type DockEnv,
	type DockList,
	type DockRef,
	type DockThread,
	type MapThread,
	type PageDock,
} from "./types";

const NEEDS_LIMIT = 6;
const PRACTISED_LIMIT = 4;
const LEADS_LIMIT = 4;
const PAGE_LIST_LIMIT = 5;
const THREAD_MEMBER_LIMIT = 8;

interface DockSources {
	courseIndex: MapIndex;
	exportGraph: ExportGraph;
	tenets: TenetIndex;
}

interface DockContext {
	chapter: string | undefined;
	graph: ExportGraph;
	index: MapIndex;
	pageUrl: string;
}

export function buildPageDock(
	{ courseIndex: index, exportGraph: graph, tenets }: DockSources,
	envs: PageEnvs,
	page: { title: string; url: string }
): PageDock {
	const ctx: DockContext = {
		chapter: chapterOfId(index, page.url)?.id,
		graph,
		index,
		pageUrl: page.url,
	};
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
				refList(links[direction], PAGE_LIST_LIMIT, ({ page: other }) => ({
					id: other.id,
					title: other.title,
					...placeOf(ctx, other.id),
				}))
			),
			strip: byDirection((direction) =>
				positions(
					ctx,
					links[direction].map(({ page: other }) => other.id)
				)
			),
			title: compileMarkdownFragment(page.title, "inline"),
		},
		threads: index.threads
			.filter(
				(thread) =>
					threadAnchor(ctx, thread) !== undefined ||
					hasMemberOn(thread, page.url)
			)
			.map((thread) => dockThread(ctx, thread)),
	};
}

function dockThread(
	ctx: DockContext,
	thread: MapThread,
	exclude?: string
): DockThread {
	const members = thread.members.filter((member) => member.href !== exclude);
	const anchor = threadAnchor(ctx, thread);

	return {
		href: thread.href,
		members: refList(members, THREAD_MEMBER_LIMIT, (member) => ({
			id: member.href,
			title: member.title,
			...placeOf(ctx, member.page),
			...(member.role ? { role: member.role } : {}),
		})),
		positions: positions(
			ctx,
			members.map((member) => member.page)
		),
		slug: thread.slug,
		summary: thread.summary,
		title: thread.title,
		...(anchor ? { anchor } : {}),
	};
}

function threadAnchor(ctx: DockContext, thread: MapThread): string | undefined {
	const anchor = threadId(thread.slug);
	return thread.href === `${ctx.pageUrl}#${anchor}` ? anchor : undefined;
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
		threads: ctx.index.threads
			.filter((thread) =>
				thread.members.some((member) => member.href === node.id)
			)
			.map((thread) => dockThread(ctx, thread, node.id)),
		title: compileMarkdownFragment(node.title || node.label, "inline"),
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
		title: compileMarkdownFragment(source, "inline"),
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
