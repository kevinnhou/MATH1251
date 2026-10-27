import { envId } from "@/lib/export/model";
import { rendered } from "@/lib/markdown/types";
import { getEnvConfig } from "@/lib/mdx-env/kinds";
import type {
	Thread,
	ThreadIndex,
	ThreadMember,
	ThreadSourcePage,
} from "@/lib/mdx-env/thread";
import { chapterOfId } from "./query";
import type {
	CourseChapter,
	CourseIndex,
	CourseStrand,
	ThreadMap,
	ThreadMapCell,
	ThreadMapRow,
	ThreadMapStation,
	ThreadMapStop,
	ThreadRoute,
} from "./types";
import { stationId, threadMapHref } from "./urls";

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

function routeMembers(
	index: CourseIndex,
	thread: Thread
): { chapter?: CourseChapter; member: ThreadMember }[] {
	const strandAt = (chapter: CourseChapter | undefined) =>
		index.strands.findIndex((strand) => strand.id === chapter?.strand);
	return thread.members
		.map((member, at) => ({
			at,
			chapter: chapterOfId(index, member.pageUrl),
			member,
		}))
		.toSorted(
			(left, right) =>
				(left.chapter?.number ?? Number.POSITIVE_INFINITY) -
					(right.chapter?.number ?? Number.POSITIVE_INFINITY) ||
				strandAt(left.chapter) - strandAt(right.chapter) ||
				left.at - right.at
		);
}

function threadRoute(index: CourseIndex, thread: Thread): ThreadRoute {
	const members = routeMembers(index, thread);
	const lanes = index.strands.filter((strand) =>
		members.some(({ chapter }) => chapter?.strand === strand.id)
	);

	return {
		lanes: lanes.map((strand) => strand.title),
		stops: members.map(({ chapter, member }) => ({
			...memberLabel(member),
			lane: Math.max(
				lanes.findIndex((strand) => strand.id === chapter?.strand),
				0
			),
			station: stationId(member.href),
			...(chapter ? { chapter: chapter.number } : {}),
			...memberRole(member),
		})),
	};
}

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
				...memberLabel(member),
				id: stationId(member.href),
				stops: [],
			};
			station.stops.push({ thread: thread.slug, ...memberRole(member) });
			stations.set(member.href, station);
		}
	}
	return stations;
}

function memberLabel(
	member: ThreadMember
): Pick<ThreadMapStation, "code" | "href" | "title"> {
	return {
		code: getEnvConfig(member.kind).code,
		href: member.href,
		title: rendered(member.title),
	};
}

function memberRole(member: ThreadMember): Pick<ThreadMapStop, "role"> {
	return member.role ? { role: rendered(member.role) } : {};
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
