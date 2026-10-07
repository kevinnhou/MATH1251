import {
	byDirection,
	type CourseMap,
	type Direction,
	type MapChapter,
	type MapPage,
	type MapThread,
	type PageLink,
} from "./types";

export type LinkRole = Direction | "idle";

export interface Neighbour {
	link: PageLink;
	page: MapPage;
}

export interface ChapterSpan {
	chapter: MapChapter;
	end: number;
	start: number;
}

export interface MapIndex extends CourseMap {
	neighbours: Record<Direction, ReadonlyMap<string, readonly Neighbour[]>>;
	pageById: ReadonlyMap<string, MapPage>;
	position: ReadonlyMap<string, number>;
	spans: readonly ChapterSpan[];
}

const ENDS: Record<
	Direction,
	{ from: "source" | "target"; to: "source" | "target" }
> = {
	"builds-on": { from: "source", to: "target" },
	"leads-to": { from: "target", to: "source" },
};

export function indexCourseMap(map: CourseMap): MapIndex {
	const pageById = new Map(map.pages.map((page) => [page.id, page]));
	const position = new Map(map.pages.map((page, index) => [page.id, index]));
	const at = (id: string) => position.get(id) ?? -1;

	const adjacency = byDirection((direction) => {
		const { from, to } = ENDS[direction];
		const grouped = Map.groupBy(
			map.links.flatMap((link): Neighbour[] => {
				const page = pageById.get(link[to]);
				return page === undefined ? [] : [{ link, page }];
			}),
			({ link }) => link[from]
		);
		for (const list of grouped.values()) {
			list.sort(
				(left, right) =>
					right.link.weight - left.link.weight ||
					at(left.page.id) - at(right.page.id)
			);
		}
		return grouped;
	});

	return {
		...map,
		neighbours: adjacency,
		pageById,
		position,
		spans: map.chapters.flatMap((chapter, number) => {
			const start = map.pages.findIndex((page) => page.chapter === number);
			const end =
				map.pages.findLastIndex((page) => page.chapter === number) + 1;
			return start === -1 ? [] : [{ chapter, end, start }];
		}),
	};
}

export function neighbours(
	index: MapIndex,
	id: string,
	direction: Direction
): readonly Neighbour[] {
	return index.neighbours[direction].get(id) ?? [];
}

export function isIsolated(index: MapIndex, id: string): boolean {
	return !(
		index.neighbours["builds-on"].has(id) ||
		index.neighbours["leads-to"].has(id)
	);
}

export interface Rung {
	distance: number;
	pages: MapPage[];
}

export function ladder(
	index: MapIndex,
	id: string,
	direction: Direction
): Rung[] {
	const rungs: Rung[] = [];
	const seen = new Set([id]);
	let frontier = [id];

	for (let distance = 1; frontier.length > 0; distance += 1) {
		const pages: MapPage[] = [];
		for (const current of frontier) {
			for (const { page } of neighbours(index, current, direction)) {
				if (!seen.has(page.id)) {
					seen.add(page.id);
					pages.push(page);
				}
			}
		}

		if (pages.length > 0) {
			rungs.push({
				distance,
				pages: pages.toSorted(
					(left, right) =>
						positionOf(index, left.id) - positionOf(index, right.id)
				),
			});
		}
		frontier = pages.map((page) => page.id);
	}

	return rungs;
}

export function linkRole(link: PageLink, activeId: string): LinkRole {
	if (link.source === activeId) {
		return "builds-on";
	}

	return link.target === activeId ? "leads-to" : "idle";
}

export function isForwardLink(index: MapIndex, link: PageLink): boolean {
	return positionOf(index, link.target) > positionOf(index, link.source);
}

export function positionOf(index: MapIndex, id: string): number {
	return index.position.get(id) ?? -1;
}

export function chapterOf(
	index: MapIndex,
	page: MapPage
): MapChapter | undefined {
	return index.chapters[page.chapter];
}

export function chapterOfId(
	index: MapIndex,
	id: string
): MapChapter | undefined {
	const page = index.pageById.get(id);
	return page && chapterOf(index, page);
}

export function hasMemberOn(thread: MapThread, pageId: string): boolean {
	return thread.members.some((member) => member.page === pageId);
}

export function linkSummary(link: PageLink): string {
	const counts = Object.entries(link.counts)
		.map(([relation, count]) => `${relation} ${count}`)
		.join(", ");
	return link.via.length === 0 ? counts : `${counts} · ${link.via.join("; ")}`;
}
