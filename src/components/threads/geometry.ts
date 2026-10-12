export interface ChapterSpacing {
	empty?: number;
	gap: number;
	pad: number;
	slot: number;
}

export interface ChapterSpan {
	x0: number;
	x1: number;
	xs: number[];
}

export function packChapters<T>(
	chapters: readonly T[],
	count: (chapter: T) => number,
	spacing: ChapterSpacing,
	start = 0
): (T & ChapterSpan)[] {
	let x0 = start;
	return chapters.map((chapter) => {
		const stops = count(chapter);
		const span = {
			x0,
			x1: x0 + chapterWidth(stops, spacing),
			xs: Array.from(
				{ length: stops },
				(_, at) => x0 + spacing.pad + (at + 0.5) * spacing.slot
			),
		};
		x0 = span.x1 + spacing.gap;
		return { ...chapter, ...span };
	});
}

export function chapterWidth(
	stops: number,
	{ empty, pad, slot }: ChapterSpacing
): number {
	return stops === 0 && empty !== undefined ? empty : stops * slot + pad * 2;
}

export interface LinePoint {
	chapter: number | undefined;
	x: number;
	y: number;
}

export function squareLine(
	points: readonly LinePoint[],
	slot: number
): { solid: string; transit: string } {
	const solid: string[] = [];
	const transit: string[] = [];
	for (const [at, to] of points.entries()) {
		const from = points[at - 1];
		if (from === undefined) {
			continue;
		}

		const turn = from.y === to.y ? "" : ` H${from.x + slot / 2} V${to.y}`;
		(from.chapter === to.chapter ? solid : transit).push(
			`M${from.x} ${from.y}${turn} H${to.x}`
		);
	}
	return { solid: solid.join(" "), transit: transit.join(" ") };
}
