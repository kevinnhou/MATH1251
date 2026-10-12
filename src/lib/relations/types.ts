import type { MarkdownFragment, RenderedMarkdown } from "@/lib/markdown/types";
import type { ExampleDifficulty } from "@/lib/math-env/kinds";

export const DIRECTIONS = ["builds-on", "leads-to"] as const;

export type Direction = (typeof DIRECTIONS)[number];

export const DIRECTION_LABELS: Record<Direction, string> = {
	"builds-on": "builds on",
	"leads-to": "leads to",
};

export function byDirection<T>(
	value: (direction: Direction) => T
): Record<Direction, T> {
	return { "builds-on": value("builds-on"), "leads-to": value("leads-to") };
}

export interface CourseStrand {
	id: string;
	title: string;
}

export interface CourseChapter {
	id: string;
	number: number;
	strand: string;
	title: string;
}

export interface CoursePage {
	chapter: number;
	id: string;
	title: MarkdownFragment<"inline">;
}

export interface CourseIndex {
	chapters: CourseChapter[];
	neighbours: Record<Direction, ReadonlyMap<string, readonly CoursePage[]>>;
	pageById: ReadonlyMap<string, CoursePage>;
	pages: CoursePage[];
	position: ReadonlyMap<string, number>;
	strands: CourseStrand[];
}

export interface DockRef {
	difficulty?: ExampleDifficulty;
	id: string;
	place?: string;
	role?: RenderedMarkdown<"inline">;
	title: RenderedMarkdown<"inline">;
}

export interface DockList {
	count: number;
	items: DockRef[];
}

export type DockStrip = Record<Direction, number[]>;

export interface RouteStop {
	chapter?: number;
	code: string;
	href: string;
	lane: number;
	place?: string;
	role?: RenderedMarkdown<"inline">;
	station: string;
	title: RenderedMarkdown<"inline">;
}

export interface ThreadRoute {
	lanes: string[];
	stops: RouteStop[];
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

export interface DockThread extends ThreadMapThread {
	anchor?: string;
	here: number[];
	positions: number[];
}

export interface DockEnv {
	anchor: string;
	leadsTo: DockList;
	needs: DockList;
	practisedIn: DockList;
	recalled: boolean;
	strip: DockStrip;
	threads: DockThread[];
	title: RenderedMarkdown<"inline">;
}

export interface PageDock {
	course: { length: number; position: number } | undefined;
	envs: DockEnv[];
	page: {
		links: Record<Direction, DockList>;
		strip: DockStrip;
		title: RenderedMarkdown<"inline">;
	};
	threads: DockThread[];
}
