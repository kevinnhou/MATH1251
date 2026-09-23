import { assembleGraphDocument } from "@/lib/graph/assemble";
import type { GraphDocument } from "@/lib/graph/types";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import { type KindView, kindViewsFromPages } from "@/lib/math-env/kind-view";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import {
	assertTenetIndex,
	createTenetIndex,
	type TenetIndex,
} from "@/lib/math-env/tenet";
import { catalogFromPages } from "@/lib/terminal/catalog";
import type { PageCatalog } from "@/lib/terminal/types";
import type { GraphModule } from "./strands";

export interface CorpusPage {
	envs: PageEnvs;
	module: GraphModule | undefined;
	page: {
		data: {
			description?: string;
			extractedReferences?: ReadonlyArray<{ href: string }>;
			ideas: string[];
			tags: string[];
			title: string;
		};
		locale?: string;
		path: string;
		slugs: string[];
		url: string;
	};
}

export type ResolvedDocs<P extends CorpusPage = CorpusPage> =
	| { kind: "notes"; source: P }
	| { kind: "kind-view"; source: P; view: KindView };

export interface PageIndex<P extends CorpusPage = CorpusPage> {
	byUrl: ReadonlyMap<string, ResolvedDocs<P>>;
	kindViews: readonly KindView[];
	pages: readonly P[];
}

export interface SiteCorpus<P extends CorpusPage = CorpusPage>
	extends PageIndex<P> {
	catalog: PageCatalog;
	graph: GraphDocument;
	tenets: TenetIndex;
}

export function urlFromSlugs(slugs: readonly string[]): string {
	return slugs.length === 0 ? "/" : `/${slugs.join("/")}`;
}

export function resolveFromPageIndex<P extends CorpusPage>(
	slugs: readonly string[],
	pageIndex: Pick<PageIndex<P>, "byUrl">
): ResolvedDocs<P> | undefined {
	return pageIndex.byUrl.get(urlFromSlugs(slugs));
}

export function buildPageIndex<P extends CorpusPage>(options: {
	pageExists: (slugs: string[]) => boolean;
	pages: readonly P[];
}): PageIndex<P> {
	const pages = [...options.pages];
	const kindViews = kindViewsFromPages(
		pages.map(({ envs, page }) => ({
			envs,
			page: {
				locale: page.locale,
				slugs: page.slugs,
				title: page.data.title,
				url: page.url,
			},
		})),
		options.pageExists
	);

	return {
		byUrl: indexByUrl(pages, kindViews),
		kindViews,
		pages,
	};
}

export function buildSiteCorpus<P extends CorpusPage>(options: {
	kindViewMarkdownUrl: (view: KindView) => string;
	markdownUrl: (page: P["page"]) => string;
	pageIndex: PageIndex<P>;
	resolvePageHref: (href: string, dir: string) => string | undefined;
}): SiteCorpus<P> {
	const { kindViews, pages } = options.pageIndex;
	const displays = new Map(
		pages.map(({ page }) => [
			page.url,
			{
				description: page.data.description
					? compileMarkdownFragment(page.data.description, "inline")
					: undefined,
				title: compileMarkdownFragment(page.data.title, "inline"),
			},
		])
	);
	const tenets = createTenetIndex(
		pages.map(({ envs, page }) => ({
			envs,
			title: page.data.title,
			url: page.url,
		}))
	);
	assertTenetIndex(tenets);

	const catalog = catalogFromPages(
		pages.map(({ module, page }) => {
			const display = displays.get(page.url);
			return {
				breadcrumbs: page.slugs,
				description: display?.description,
				markdownUrl: options.markdownUrl(page),
				strand: module,
				title:
					display?.title ?? compileMarkdownFragment(page.data.title, "inline"),
				url: page.url,
			};
		}),
		kindViews,
		options.kindViewMarkdownUrl
	);
	const graph = assembleGraphDocument(
		pages.map(({ envs, module, page }) => {
			const display = displays.get(page.url);
			return {
				envs,
				module,
				page: {
					data: {
						description: display?.description,
						extractedReferences: page.data.extractedReferences,
						ideas: page.data.ideas,
						tags: page.data.tags,
						title:
							display?.title ??
							compileMarkdownFragment(page.data.title, "inline"),
					},
					path: page.path,
					url: page.url,
				},
			};
		}),
		tenets,
		options.resolvePageHref
	);

	return {
		...options.pageIndex,
		catalog,
		graph,
		tenets,
	};
}

function indexByUrl<P extends CorpusPage>(
	pages: readonly P[],
	kindViews: readonly KindView[]
): Map<string, ResolvedDocs<P>> {
	const byUrl = new Map<string, ResolvedDocs<P>>();
	const pageByUrl = new Map(pages.map((page) => [page.page.url, page]));

	for (const view of kindViews) {
		const source = pageByUrl.get(view.parentUrl);
		if (source === undefined) {
			continue;
		}

		byUrl.set(view.url, { kind: "kind-view", source, view });
	}

	for (const source of pages) {
		byUrl.set(source.page.url, { kind: "notes", source });
	}

	return byUrl;
}
