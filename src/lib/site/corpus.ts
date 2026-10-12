import "server-only";

import { posix } from "node:path";
import { cache } from "react";
import {
	type CatalogPage,
	type PageCatalog,
	parentPath,
} from "@/lib/course/catalog";
import type { CourseRoutes } from "@/lib/course/routes";
import { getStrand } from "@/lib/course/strands";
import { buildExportGraph } from "@/lib/export/build";
import { kindViewTarget, pageTarget } from "@/lib/export/context";
import type { ExportGraph } from "@/lib/export/model";
import { requireKindView, requireNode } from "@/lib/export/query";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import {
	type KindView,
	kindViewsFromPages,
	uniqueTrimmed,
} from "@/lib/math-env/kind-view";
import {
	assertTenetIndex,
	createTenetIndex,
	type TenetIndex,
} from "@/lib/math-env/tenet";
import { createThreadIndex, type ThreadIndex } from "@/lib/math-env/thread";
import { buildCourseIndex, courseOrder } from "@/lib/relations/build";
import { buildThreadMap } from "@/lib/relations/thread-map";
import type { CourseIndex, ThreadMap } from "@/lib/relations/types";
import { getSourcePages, type SourcePage, source } from "./source";

export type ResolvedDocs = {
	source: SourcePage;
	title: string;
} & (
	| { description?: string; kind: "notes" }
	| { description: string; kind: "kind-view"; view: KindView }
);

interface PageIndex {
	byUrl: ReadonlyMap<string, ResolvedDocs>;
	kindViews: readonly KindView[];
	pages: readonly SourcePage[];
}

export interface Corpus extends PageIndex {
	catalog: PageCatalog;
	courseIndex: CourseIndex;
	exportGraph: ExportGraph;
	routes: CourseRoutes;
	tenets: TenetIndex;
	threadMap: ThreadMap;
	threads: ThreadIndex;
}

const LEADING_SLASH = /^\//;

function memoInProduction<T>(build: () => T): () => T {
	if (process.env.NODE_ENV !== "production") {
		return cache(build);
	}

	let memo: { current: T } | undefined;
	return () => {
		memo ??= { current: build() };
		return memo.current;
	};
}

const getPageIndex = memoInProduction((): PageIndex => {
	const pages = getSourcePages();
	const kindViews = kindViewsFromPages(pages, (slugs) =>
		Boolean(source.getPage(slugs))
	);
	return { byUrl: indexByUrl(pages, kindViews), kindViews, pages };
});

export const getCorpus = memoInProduction((): Corpus => {
	const index = getPageIndex();
	const tenets = createTenetIndex(index.pages);
	assertTenetIndex(tenets);

	const order = courseOrder(source.getPageTree());
	const threads = createThreadIndex(
		index.pages,
		order.order.map(({ url }) => url)
	);
	const exportGraph = buildExportGraph(
		index.pages,
		tenets,
		resolvePageHref,
		index.kindViews,
		threads
	);
	const courseIndex = buildCourseIndex(order, exportGraph);

	return {
		...index,
		catalog: buildCatalog(index.byUrl, exportGraph),
		courseIndex,
		exportGraph,
		routes: buildRoutes(index),
		tenets,
		threadMap: buildThreadMap(courseIndex, threads, index.pages),
		threads,
	};
});

export function resolveDocsPage(
	slugs: readonly string[]
): ResolvedDocs | undefined {
	return resolveDocsUrl(slugs.length === 0 ? "/" : `/${slugs.join("/")}`);
}

export function resolveDocsUrl(url: string): ResolvedDocs | undefined {
	return getPageIndex().byUrl.get(url);
}

export function docsStaticParams(...suffix: string[]): { slug: string[] }[] {
	return getPageIndex().pages.map(({ page }) => ({
		slug: [...page.slugs, ...suffix],
	}));
}

function indexByUrl(
	pages: readonly SourcePage[],
	kindViews: readonly KindView[]
): Map<string, ResolvedDocs> {
	const byUrl = new Map<string, ResolvedDocs>();
	const pageByUrl = new Map(pages.map((page) => [page.page.url, page]));

	for (const view of kindViews) {
		const parent = pageByUrl.get(view.parentUrl);
		if (parent !== undefined) {
			byUrl.set(view.url, {
				description: view.description,
				kind: "kind-view",
				source: parent,
				title: view.title,
				view,
			});
		}
	}

	for (const notes of pages) {
		const { page } = notes;
		byUrl.set(page.url, {
			description: page.data.description,
			kind: "notes",
			source: notes,
			title: page.data.title,
		});
	}

	return byUrl;
}

function resolvePageHref(href: string, fromPath: string): string | undefined {
	const resolved = source.getPageByHref(href, {
		dir: posix.dirname(fromPath.replaceAll("\\", "/")),
	});
	if (!resolved || getStrand(resolved.page.slugs) === undefined) {
		return;
	}

	return resolved.page.url;
}

function buildRoutes({ kindViews, pages }: PageIndex): CourseRoutes {
	const kinds: CourseRoutes["kindViews"] = {};
	for (const { kind, parentUrl } of kindViews) {
		kinds[parentUrl] = [...(kinds[parentUrl] ?? []), kind];
	}

	return {
		kindViews: kinds,
		pages: pages.map(({ page }) => page.url).toSorted(),
	};
}

function buildCatalog(
	byUrl: ReadonlyMap<string, ResolvedDocs>,
	graph: ExportGraph
): PageCatalog {
	return {
		pages: [...byUrl.values()]
			.map((resolved) => catalogPage(resolved, graph))
			.toSorted((left, right) => left.url.localeCompare(right.url)),
	};
}

function catalogPage(resolved: ResolvedDocs, graph: ExportGraph): CatalogPage {
	const { module, page } = resolved.source;
	const title = compileMarkdownFragment(resolved.title, "inline");
	const common = { strand: module, title };

	if (resolved.kind === "kind-view") {
		const { view } = resolved;
		return {
			...common,
			aliases: uniqueTrimmed([...view.aliases, title.source, title.plain]),
			breadcrumbs: [...view.pageSlugs, view.slug],
			description: compileMarkdownFragment(resolved.description, "inline"),
			kindView: true,
			parentUrl: view.parentUrl,
			prompt: kindViewTarget(requireKindView(graph, view.url)),
			url: view.url,
		};
	}

	return {
		...common,
		aliases: uniqueTrimmed([
			title.source,
			title.plain,
			...page.slugs,
			page.url.replace(LEADING_SLASH, ""),
		]),
		breadcrumbs: page.slugs,
		description: resolved.description
			? compileMarkdownFragment(resolved.description, "inline")
			: undefined,
		kindView: false,
		parentUrl: parentPath(page.url),
		prompt: pageTarget(requireNode(graph, page.url)),
		url: page.url,
	};
}
