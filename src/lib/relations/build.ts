import type { Folder, Node, Root } from "fumadocs-core/page-tree";
import { getStrand, type Strand } from "@/lib/course/strands";
import type { ExportGraph } from "@/lib/export/model";
import { pageIdOf } from "@/lib/export/query";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import type { ThreadIndex } from "@/lib/math-env/thread";
import {
	type CourseMap,
	isPageLinkRelation,
	type MapChapter,
	type MapPage,
	type MapThread,
	type PageLink,
} from "./types";

const VIA_LIMIT = 4;

const STRAND_SHORT: Record<Strand, string> = {
	algebra: "ALG",
	calculus: "CALC",
	core: "CORE",
};

const CHAPTER_PREFIX: Record<Strand, string> = {
	algebra: "A",
	calculus: "C",
	core: "K",
};

export interface CourseOrder {
	chapters: MapChapter[];
	order: { chapter: number; url: string }[];
}

export function buildCourseMap(
	{ chapters, order }: CourseOrder,
	graph: ExportGraph,
	threads: ThreadIndex
): CourseMap {
	const pages = order.flatMap(({ chapter, url }): MapPage[] => {
		const node = graph.nodes.get(url);
		const module = chapters[chapter]?.module;
		if (node?.type !== "page" || module === undefined) {
			return [];
		}

		return [
			{
				chapter,
				id: url,
				module,
				title: compileMarkdownFragment(node.title, "inline"),
			},
		];
	});

	return {
		chapters,
		links: pageLinks(graph, new Set(pages.map((page) => page.id))),
		pages,
		threads: mapThreads(threads),
	};
}

function mapThreads(threads: ThreadIndex): MapThread[] {
	return [...threads.bySlug.values()].map((thread) => ({
		href: thread.href,
		members: thread.members.map((member) => ({
			href: member.href,
			kind: member.kind,
			page: member.pageUrl,
			title: member.title,
			...(member.role ? { role: member.role } : {}),
		})),
		slug: thread.slug,
		summary: thread.summary,
		title: thread.title,
	}));
}

export function courseOrder(tree: Root): CourseOrder {
	const chapters: MapChapter[] = [];
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

	for (const strand of tree.children) {
		if (strand.type !== "folder") {
			continue;
		}

		const module = strandOf(strand);
		if (module === undefined) {
			continue;
		}

		const intro = chapters.length;
		chapters.push({
			id: strand.$id ?? module,
			module,
			short: STRAND_SHORT[module],
			title: nameOf(strand),
		});
		push(strand.index?.url, intro);

		let number = 0;
		for (const child of strand.children) {
			if (child.type === "page") {
				push(child.url, intro);
			} else if (child.type === "folder") {
				number += 1;
				const chapter = chapters.length;
				chapters.push({
					id: child.$id ?? `${module}-${number}`,
					module,
					short: `${CHAPTER_PREFIX[module]}${number}`,
					title: nameOf(child),
				});
				push(child.index?.url, chapter);
				walk(child.children, chapter);
			}
		}
	}

	return { chapters, order };
}

function strandOf(folder: Folder): Strand | undefined {
	return getStrand((firstUrl(folder) ?? "").split("/").filter(Boolean));
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

function pageLinks(graph: ExportGraph, pages: ReadonlySet<string>): PageLink[] {
	const links = new Map<string, PageLink & { viaSet: Set<string> }>();
	const pageOfEnd = (id: string) => {
		const node = graph.nodes.get(id);
		const page = node && pageIdOf(node);
		return page !== undefined && pages.has(page) ? page : undefined;
	};

	for (const edge of graph.edges) {
		if (!isPageLinkRelation(edge.kind)) {
			continue;
		}

		const source = pageOfEnd(edge.source);
		const target = pageOfEnd(edge.target);
		if (source === undefined || target === undefined || source === target) {
			continue;
		}

		const key = `${source}\0${target}`;
		let link = links.get(key);
		if (link === undefined) {
			link = {
				counts: {},
				source,
				target,
				via: [],
				viaSet: new Set(),
				weight: 0,
			};
			links.set(key, link);
		}

		link.counts[edge.kind] = (link.counts[edge.kind] ?? 0) + 1;
		link.weight += 1;
		const targetNode = graph.nodes.get(edge.target);
		if (targetNode?.type === "env") {
			link.viaSet.add(
				compileMarkdownFragment(targetNode.label, "inline").plain
			);
		}
	}

	return [...links.values()].map(({ viaSet, ...link }) => ({
		...link,
		via: [...viaSet].slice(0, VIA_LIMIT),
	}));
}
