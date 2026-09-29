import "server-only";

import { cache } from "react";
import {
	type CatalogPage,
	type PageCatalog,
	parentPath,
} from "@/lib/course/catalog";
import { getStrand } from "@/lib/course/strands";
import { assembleGraphDocument } from "@/lib/graph/assemble";
import type { GraphDocument } from "@/lib/graph/types";
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
import {
	getKindViewMarkdownUrl,
	getPageMarkdownUrl,
	getSourcePages,
	type SourcePage,
	source,
} from "./source";

export type ResolvedDocs = {
	markdownUrl: string;
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
	graph: GraphDocument;
	tenets: TenetIndex;
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

	return {
		...index,
		catalog: buildCatalog(index.byUrl),
		graph: assembleGraphDocument(index.pages, tenets, resolvePageHref),
		tenets,
	};
});

export function resolveDocsPage(
	slugs: readonly string[]
): ResolvedDocs | undefined {
	const url = slugs.length === 0 ? "/" : `/${slugs.join("/")}`;
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
				markdownUrl: getKindViewMarkdownUrl(view).url,
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
			markdownUrl: getPageMarkdownUrl(page).url,
			source: notes,
			title: page.data.title,
		});
	}

	return byUrl;
}

function resolvePageHref(href: string, dir: string): string | undefined {
	const resolved = source.getPageByHref(href, { dir });
	if (!resolved || getStrand(resolved.page.slugs) === undefined) {
		return;
	}

	return resolved.page.url;
}

function buildCatalog(byUrl: ReadonlyMap<string, ResolvedDocs>): PageCatalog {
	return {
		pages: [...byUrl.values()]
			.map(catalogPage)
			.toSorted((left, right) => left.url.localeCompare(right.url)),
	};
}

function catalogPage(resolved: ResolvedDocs): CatalogPage {
	const { module, page } = resolved.source;
	const title = compileMarkdownFragment(resolved.title, "inline");
	const common = {
		markdownUrl: resolved.markdownUrl,
		strand: module,
		title,
	};

	if (resolved.kind === "kind-view") {
		const { view } = resolved;
		return {
			...common,
			aliases: uniqueTrimmed([...view.aliases, title.source, title.plain]),
			breadcrumbs: [...view.pageSlugs, view.slug],
			description: compileMarkdownFragment(resolved.description, "inline"),
			kindView: true,
			parentUrl: view.parentUrl,
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
		url: page.url,
	};
}
