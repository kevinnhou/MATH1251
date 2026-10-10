import { envId } from "@/lib/export/model";
import { type RenderedMarkdown, rendered } from "@/lib/markdown/types";
import { getMathEnvConfig } from "@/lib/math-env/kinds";
import type {
	Thread,
	ThreadIndex,
	ThreadSourcePage,
} from "@/lib/math-env/thread";
import { chapterOfId } from "./query";
import type {
	CourseChapter,
	CourseIndex,
	CourseStrand,
	ThreadRoute,
} from "./types";

export const THREADS_ROUTE = "/threads";

export function threadMapHref(slug: string, station?: string): string {
	return `${THREADS_ROUTE}/${slug}${station ? `#${station}` : ""}`;
}

const NOT_ID = /[^a-z0-9]+/gi;
const TRAILING_DASH = /-$/;

// The DOM id of an environment's station on the threads page, so a link can
// land on it (`/threads/<slug>#<station>`).
export function stationId(href: string): string {
	return `at-${href.replace(NOT_ID, "-")}`
		.replace(TRAILING_DASH, "")
		.toLowerCase();
}

export interface ThreadMapStop {
	role?: RenderedMarkdown<"inline">;
	thread: string;
}

export interface ThreadMapStation {
	code: string;
	href: string;
	id: string;
	stops: ThreadMapStop[];
	title: RenderedMarkdown<"inline">;
}

export interface ThreadMapCell {
	chapter?: CourseChapter;
	stations: ThreadMapStation[];
	strand: string;
}

export interface ThreadMapRow {
	cells: ThreadMapCell[];
	number: number;
}

export interface ThreadMapThread {
	href: string;
	mapHref: string;
	number: number;
	route: ThreadRoute;
	slug: string;
	summary: RenderedMarkdown<"inline">;
	title: RenderedMarkdown<"inline">;
}

export interface ThreadMap {
	rows: ThreadMapRow[];
	strands: CourseStrand[];
	threads: ThreadMapThread[];
}

interface Placed {
	chapter: CourseChapter;
	station: ThreadMapStation;
}

export function buildThreadMap(
	index: CourseIndex,
	threadIndex: ThreadIndex,
	pages: readonly ThreadSourcePage[]
): ThreadMap {
	const threads = [...threadIndex.bySlug.values()];
	const stations = stationsByHref(threads);
	const placed = courseEnvs(index, pages).flatMap(({ chapter, href }) => {
		const station = stations.get(href);
		return station ? [{ chapter, station }] : [];
	});
	const strands = index.strands.filter((strand) =>
		placed.some(({ chapter }) => chapter.strand === strand.id)
	);

	return {
		rows: alignedRows(index, placed, strands),
		strands,
		threads: threads.map((thread, number) => ({
			href: thread.href,
			mapHref: threadMapHref(thread.slug),
			number: number + 1,
			route: threadRoute(index, thread),
			slug: thread.slug,
			summary: rendered(thread.summary),
			title: rendered(thread.title),
		})),
	};
}

// One stop per member, in course order. Lanes are only the strands this thread
// visits, in course order, so a route has as many lanes as it needs whatever
// the number of strands in the course.
export function threadRoute(index: CourseIndex, thread: Thread): ThreadRoute {
	const chapters = thread.members.map((member) =>
		chapterOfId(index, member.pageUrl)
	);
	const lanes = index.strands.filter((strand) =>
		chapters.some((chapter) => chapter?.strand === strand.id)
	);

	return {
		lanes: lanes.map((strand) => strand.title),
		stops: thread.members.map((member, at) => {
			const chapter = chapters[at];
			return {
				code: getMathEnvConfig(member.kind).code,
				href: member.href,
				lane: Math.max(
					lanes.findIndex((strand) => strand.id === chapter?.strand),
					0
				),
				station: stationId(member.href),
				title: rendered(member.title),
				...(chapter ? { place: chapter.title } : {}),
				...(member.role ? { role: rendered(member.role) } : {}),
			};
		}),
	};
}

// Rows line up chapter N of every strand, because MATH1251 teaches its strands
// side by side. A course taught one strand after another would lay rows out by
// reading order instead; only this function would change.
function alignedRows(
	index: CourseIndex,
	placed: readonly Placed[],
	strands: readonly CourseStrand[]
): ThreadMapRow[] {
	const byChapter = Map.groupBy(placed, ({ chapter }) => chapter);

	return span(placed.map(({ chapter }) => chapter.number)).map((number) => ({
		cells: strands.map((strand): ThreadMapCell => {
			const chapter = index.chapters.find(
				(entry) => entry.strand === strand.id && entry.number === number
			);
			const here = chapter && byChapter.get(chapter);
			return {
				...(chapter ? { chapter } : {}),
				stations: here?.map(({ station }) => station) ?? [],
				strand: strand.id,
			};
		}),
		number,
	}));
}

function stationsByHref(
	threads: readonly Thread[]
): Map<string, ThreadMapStation> {
	const stations = new Map<string, ThreadMapStation>();
	for (const thread of threads) {
		for (const member of thread.members) {
			const station = stations.get(member.href) ?? {
				code: getMathEnvConfig(member.kind).code,
				href: member.href,
				id: stationId(member.href),
				stops: [],
				title: rendered(member.title),
			};
			station.stops.push({
				thread: thread.slug,
				...(member.role ? { role: rendered(member.role) } : {}),
			});
			stations.set(member.href, station);
		}
	}
	return stations;
}

function courseEnvs(
	index: CourseIndex,
	pages: readonly ThreadSourcePage[]
): { chapter: CourseChapter; href: string }[] {
	const envsByUrl = new Map(pages.map(({ envs, page }) => [page.url, envs]));
	return index.pages.flatMap((page) =>
		(envsByUrl.get(page.id)?.entries ?? []).map((entry) => ({
			chapter: index.chapters[page.chapter],
			href: envId(page.id, entry.id),
		}))
	);
}

function span(numbers: readonly number[]): number[] {
	if (numbers.length === 0) {
		return [];
	}

	const first = Math.min(...numbers);
	return Array.from(
		{ length: Math.max(...numbers) - first + 1 },
		(_, offset) => first + offset
	);
}
