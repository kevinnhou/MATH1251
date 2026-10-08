import { envId } from "@/lib/export/model";
import {
	type MarkdownFragment,
	type RenderedMarkdown,
	rendered,
} from "@/lib/markdown/types";
import type { MathEnvKind } from "@/lib/math-env/kinds";
import type {
	Thread,
	ThreadIndex,
	ThreadSourcePage,
} from "@/lib/math-env/thread";
import type { CourseChapter, CourseIndex, CourseStrand } from "./types";

export interface ThreadMapStop {
	lane: number;
	role?: MarkdownFragment<"inline">;
	slug: string;
}

export interface ThreadMapStation {
	href: string;
	kind: MathEnvKind;
	stops: ThreadMapStop[];
	title: MarkdownFragment<"inline">;
}

export interface ThreadMapCell {
	chapter?: CourseChapter;
	stations: ThreadMapStation[];
	strand: CourseStrand;
}

export interface ThreadMapRow {
	cells: ThreadMapCell[];
	number: number;
}

export interface ThreadMapThread {
	href: string;
	size: number;
	slug: string;
	summary: RenderedMarkdown<"inline">;
	title: RenderedMarkdown<"inline">;
}

export interface ThreadMap {
	rows: ThreadMapRow[];
	strands: CourseStrand[];
	threads: ThreadMapThread[];
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
	const byChapter = Map.groupBy(placed, ({ chapter }) => chapter);
	const stops = placed.flatMap(({ station }) => station.stops);
	const strands = index.strands.filter((strand) =>
		placed.some(({ chapter }) => chapter.strand === strand.id)
	);

	return {
		rows: span(placed.map(({ chapter }) => chapter.number)).map((number) => ({
			cells: strands.map((strand): ThreadMapCell => {
				const chapter = index.chapters.find(
					(entry) => entry.strand === strand.id && entry.number === number
				);
				const here = chapter && byChapter.get(chapter);
				return {
					chapter,
					stations: here?.map(({ station }) => station) ?? [],
					strand,
				};
			}),
			number,
		})),
		strands,
		threads: threads.map((thread, lane) => ({
			href: thread.href,
			size: stops.filter((stop) => stop.lane === lane).length,
			slug: thread.slug,
			summary: rendered(thread.summary),
			title: rendered(thread.title),
		})),
	};
}

function stationsByHref(
	threads: readonly Thread[]
): Map<string, ThreadMapStation> {
	const stations = new Map<string, ThreadMapStation>();
	threads.forEach((thread, lane) => {
		for (const member of thread.members) {
			const station = stations.get(member.href) ?? {
				href: member.href,
				kind: member.kind,
				stops: [],
				title: member.title,
			};
			station.stops.push({
				lane,
				slug: thread.slug,
				...(member.role ? { role: member.role } : {}),
			});
			stations.set(member.href, station);
		}
	});
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
