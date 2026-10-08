import type { Folder, Node, Root } from "fumadocs-core/page-tree";
import {
	DEPENDENCY_EDGES,
	type ExportEdgeKind,
	type ExportGraph,
} from "@/lib/export/model";
import { pageIdOf } from "@/lib/export/query";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import {
	byDirection,
	type CourseChapter,
	type CourseIndex,
	type CoursePage,
	type CourseStrand,
	type Direction,
} from "./types";

const PAGE_LINK_RELATIONS: readonly ExportEdgeKind[] = [
	...DEPENDENCY_EDGES,
	"recalls",
];

export interface CourseOrder {
	chapters: CourseChapter[];
	order: { chapter: number; url: string }[];
	strands: CourseStrand[];
}

interface PageLink {
	source: string;
	target: string;
	weight: number;
}

type LinkEnd = "source" | "target";

const ENDS: Record<Direction, { from: LinkEnd; to: LinkEnd }> = {
	"builds-on": { from: "source", to: "target" },
	"leads-to": { from: "target", to: "source" },
};

export function buildCourseIndex(
	{ chapters, order, strands }: CourseOrder,
	graph: ExportGraph
): CourseIndex {
	const pages = order.flatMap(({ chapter, url }): CoursePage[] => {
		const node = graph.nodes.get(url);
		if (node?.type !== "page") {
			return [];
		}

		return [
			{
				chapter,
				id: url,
				title: compileMarkdownFragment(node.title, "inline"),
			},
		];
	});
	const pageById = new Map(pages.map((page) => [page.id, page]));
	const position = new Map(pages.map((page, index) => [page.id, index]));
	const links = pageLinks(graph, pageById);
	const at = (id: string) => position.get(id) ?? -1;

	const neighbours = byDirection((direction) => {
		const { from, to } = ENDS[direction];
		const byPage = Map.groupBy(links, (link) => link[from]);
		return new Map(
			[...byPage].map(([id, list]) => [
				id,
				list
					.toSorted(
						(left, right) =>
							right.weight - left.weight || at(left[to]) - at(right[to])
					)
					.flatMap((link) => pageById.get(link[to]) ?? []),
			])
		);
	});

	return { chapters, neighbours, pageById, pages, position, strands };
}

export function courseOrder(tree: Root): CourseOrder {
	const strands: CourseStrand[] = [];
	const chapters: CourseChapter[] = [];
	const order: CourseOrder["order"] = [];
	const seen = new Set<string>();

	function push(url: string | undefined, chapter: number) {
		if (url !== undefined && !seen.has(url)) {
			seen.add(url);
			order.push({ chapter, url });
		}
	}

	function walk(nodes: readonly Node[], chapter: number) {
		for (const node of nodes) {
			if (node.type === "page") {
				push(node.url, chapter);
			} else if (node.type === "folder") {
				push(node.index?.url, chapter);
				walk(node.children, chapter);
			}
		}
	}

	for (const folder of tree.children) {
		if (folder.type !== "folder") {
			continue;
		}

		const strand = strandOf(folder);
		if (strand === undefined) {
			continue;
		}

		strands.push(strand);
		const intro = chapters.length;
		chapters.push({
			id: folder.$id ?? strand.id,
			number: 0,
			strand: strand.id,
			title: strand.title,
		});
		push(folder.index?.url, intro);

		let number = 0;
		for (const child of folder.children) {
			if (child.type === "page") {
				push(child.url, intro);
			} else if (child.type === "folder") {
				number += 1;
				const chapter = chapters.length;
				chapters.push({
					id: child.$id ?? `${strand.id}-${number}`,
					number,
					strand: strand.id,
					title: nameOf(child),
				});
				push(child.index?.url, chapter);
				walk(child.children, chapter);
			}
		}
	}

	return { chapters, order, strands };
}

function strandOf(folder: Folder): CourseStrand | undefined {
	const [id] = (firstUrl(folder) ?? "").split("/").filter(Boolean);
	return id === undefined ? undefined : { id, title: nameOf(folder) || id };
}

function firstUrl(folder: Folder): string | undefined {
	if (folder.index) {
		return folder.index.url;
	}

	for (const child of folder.children) {
		if (child.type === "page") {
			return child.url;
		}

		const url = child.type === "folder" ? firstUrl(child) : undefined;
		if (url !== undefined) {
			return url;
		}
	}
}

function nameOf(folder: Folder): string {
	return typeof folder.name === "string" ? folder.name : "";
}

function pageLinks(
	graph: ExportGraph,
	pages: ReadonlyMap<string, CoursePage>
): PageLink[] {
	const links = new Map<string, PageLink>();
	const pageOfEnd = (id: string) => {
		const node = graph.nodes.get(id);
		const page = node && pageIdOf(node);
		return page !== undefined && pages.has(page) ? page : undefined;
	};

	for (const edge of graph.edges) {
		if (!PAGE_LINK_RELATIONS.includes(edge.kind)) {
			continue;
		}

		const source = pageOfEnd(edge.source);
		const target = pageOfEnd(edge.target);
		if (source === undefined || target === undefined || source === target) {
			continue;
		}

		const key = `${source}\0${target}`;
		const link = links.get(key) ?? { source, target, weight: 0 };
		link.weight += 1;
		links.set(key, link);
	}

	return [...links.values()];
}
