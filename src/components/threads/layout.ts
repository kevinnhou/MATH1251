import type {
	CourseChapter,
	CourseStrand,
	ThreadMap,
	ThreadMapStation,
	ThreadMapThread,
} from "@/lib/relations/types";
import { chapterWidth, packChapters, squareLine } from "./geometry";

export const DIAGRAM = {
	axis: 26,
	bandGap: 22,
	bandPad: 11,
	chapterGap: 10,
	emptyChapter: 12,
	label: 92,
	maxSlot: 44,
	minSlot: 16,
	narrow: 640,
	narrowLabel: 34,
	slotPad: 4,
	track: 12,
} as const;

const SPACING = {
	empty: DIAGRAM.emptyChapter,
	gap: DIAGRAM.chapterGap,
	pad: DIAGRAM.slotPad,
};

export interface DiagramMark {
	thread: string;
	y: number;
}

export interface DiagramStation {
	chapter: CourseChapter;
	marks: DiagramMark[];
	station: ThreadMapStation;
	strand: CourseStrand;
	x: number;
}

export interface DiagramChapter {
	empty: boolean;
	number: number;
	x0: number;
	x1: number;
}

export interface DiagramBand {
	segments: DiagramChapter[];
	strand: CourseStrand;
	y0: number;
	y1: number;
}

export interface DiagramLine {
	number: number;
	slug: string;
	solid: string;
	start: { x: number; y: number };
	transit: string;
}

export interface Diagram {
	bands: DiagramBand[];
	chapters: DiagramChapter[];
	coded: boolean;
	height: number;
	lines: DiagramLine[];
	slot: number;
	stations: DiagramStation[];
	width: number;
}

type Band = Omit<DiagramBand, "segments">;

export function layoutDiagram(
	map: ThreadMap,
	shown: readonly string[],
	available: number
): Diagram {
	const threads = map.threads.filter((thread) => shown.includes(thread.slug));
	const tracks = new Map(threads.map((thread, track) => [thread.slug, track]));
	const isShown = (station: ThreadMapStation) =>
		station.stops.some((stop) => tracks.has(stop.thread));
	const bands = layoutBands(
		map.strands.filter((strand) =>
			map.rows.some((row) =>
				row.cells.some(
					(cell) => cell.strand === strand.id && cell.stations.some(isShown)
				)
			)
		),
		Math.max(threads.length, 1)
	);

	const columns = map.rows.map((row) => {
		const cells = new Map(row.cells.map((cell) => [cell.strand, cell]));
		return {
			cells,
			number: row.number,
			placed: bands.flatMap((band) => {
				const cell = cells.get(band.strand.id);
				const chapter = cell?.chapter;
				return chapter
					? cell.stations
							.filter(isShown)
							.map((station) => ({ band, chapter, station }))
					: [];
			}),
		};
	});
	const coded = available < DIAGRAM.narrow;
	const label = coded ? DIAGRAM.narrowLabel : DIAGRAM.label;
	const slot = slotWidth(
		columns.map(({ placed }) => placed.length),
		available,
		label
	);
	const packed = packChapters(
		columns,
		({ placed }) => placed.length,
		{ ...SPACING, slot },
		label
	);

	const stations = packed.flatMap(({ placed, xs }) =>
		placed.map(
			({ band, chapter, station }, at): DiagramStation => ({
				chapter,
				marks: station.stops.flatMap(({ thread }) => {
					const track = tracks.get(thread);
					return track === undefined
						? []
						: [{ thread, y: trackY(band, track) }];
				}),
				station,
				strand: band.strand,
				x: xs[at],
			})
		)
	);
	const chapters = packed.map(chapterOf);

	return {
		bands: bands.map((band) => ({
			...band,
			segments: packed
				.filter(({ cells }) => cells.get(band.strand.id)?.chapter)
				.map(chapterOf),
		})),
		chapters,
		coded,
		height: bands.at(-1)?.y1 ?? DIAGRAM.axis,
		lines: threads.flatMap((thread) => lineOf(thread, stations, slot)),
		slot,
		stations,
		width: (chapters.at(-1)?.x1 ?? label) + DIAGRAM.slotPad,
	};
}

function chapterOf({
	number,
	placed,
	x0,
	x1,
}: {
	number: number;
	placed: readonly unknown[];
	x0: number;
	x1: number;
}): DiagramChapter {
	return { empty: placed.length === 0, number, x0, x1 };
}

function slotWidth(
	counts: readonly number[],
	available: number,
	label: number
): number {
	const stops = counts.reduce((sum, count) => sum + count, 0);
	const fixed = counts.reduce(
		(sum, count) =>
			sum + chapterWidth(count, { ...SPACING, slot: 0 }) + DIAGRAM.chapterGap,
		label
	);
	const fit = stops === 0 ? DIAGRAM.maxSlot : (available - fixed) / stops;
	return Math.floor(Math.min(Math.max(fit, DIAGRAM.minSlot), DIAGRAM.maxSlot));
}

function trackY(band: Band, track: number): number {
	return band.y0 + DIAGRAM.bandPad + track * DIAGRAM.track;
}

function layoutBands(strands: readonly CourseStrand[], tracks: number): Band[] {
	const height = DIAGRAM.bandPad * 2 + (tracks - 1) * DIAGRAM.track;
	return strands.map((strand, index) => {
		const y0 = DIAGRAM.axis + index * (height + DIAGRAM.bandGap);
		return { strand, y0, y1: y0 + height };
	});
}

function lineOf(
	thread: ThreadMapThread,
	stations: readonly DiagramStation[],
	slot: number
): DiagramLine[] {
	const points = stations.flatMap(({ chapter, marks, x }) => {
		const mark = marks.find((each) => each.thread === thread.slug);
		return mark ? [{ chapter: chapter.number, x, y: mark.y }] : [];
	});
	const [start] = points;
	return start
		? [
				{
					number: thread.number,
					slug: thread.slug,
					start: { x: start.x, y: start.y },
					...squareLine(points, slot),
				},
			]
		: [];
}
