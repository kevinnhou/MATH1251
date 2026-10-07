import type { Strand } from "@/lib/course/strands";
import { DEPENDENCY_EDGES, type ExportEdgeKind } from "@/lib/export/model";
import type { MarkdownFragment, RenderedMarkdown } from "@/lib/markdown/types";
import type { ExampleDifficulty, MathEnvKind } from "@/lib/math-env/kinds";
import type { MapIndex } from "./query";

export const MAP_VIEWS = ["arcs", "matrix", "ladder", "threads"] as const;

export type MapView = (typeof MAP_VIEWS)[number];

export const MAP_VIEW_LABELS: Record<MapView, string> = {
	arcs: "ARCS",
	ladder: "LADDER",
	matrix: "MATRIX",
	threads: "THREADS",
};

export function isMapView(value: string): value is MapView {
	return MAP_VIEWS.some((view) => view === value);
}

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

export const PAGE_LINK_RELATIONS = [
	...DEPENDENCY_EDGES,
	"recalls",
] as const satisfies readonly ExportEdgeKind[];

export type PageLinkRelation = (typeof PAGE_LINK_RELATIONS)[number];

export function isPageLinkRelation(
	kind: ExportEdgeKind
): kind is PageLinkRelation {
	return PAGE_LINK_RELATIONS.some((relation) => relation === kind);
}

export interface MapChapter {
	id: string;
	module: Strand;
	short: string;
	title: string;
}

export interface MapPage {
	chapter: number;
	id: string;
	module: Strand;
	title: MarkdownFragment<"inline">;
}

export interface PageLink {
	counts: Partial<Record<PageLinkRelation, number>>;
	source: string;
	target: string;
	via: string[];
	weight: number;
}

export interface MapThreadMember {
	href: string;
	kind: MathEnvKind;
	page: string;
	role?: MarkdownFragment<"inline">;
	title: MarkdownFragment<"inline">;
}

export interface MapThread {
	href: string;
	members: MapThreadMember[];
	slug: string;
	summary: MarkdownFragment<"inline">;
	title: MarkdownFragment<"inline">;
}

export interface CourseMap {
	chapters: MapChapter[];
	links: PageLink[];
	pages: MapPage[];
	threads: MapThread[];
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

export interface DockThread {
	anchor?: string;
	href: string;
	members: DockList;
	positions: number[];
	slug: string;
	summary: RenderedMarkdown<"inline">;
	title: RenderedMarkdown<"inline">;
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

export interface ReadyRelations {
	focusId: string;
	homeId: string;
	index: MapIndex;
	mapOpen: boolean;
	reset: () => void;
	setFocus: (id: string) => void;
	setMapOpen: (open: boolean) => void;
	setView: (view: MapView) => void;
	status: "ready";
	view: MapView;
}

export type RelationsRuntime =
	| { status: "unavailable" | "loading" | "error" }
	| ReadyRelations;
