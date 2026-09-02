import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import type { MarkdownFragment } from "@/lib/markdown/types";
import { type KindView, uniqueTrimmed } from "@/lib/math-env/kind-view";
import type { GraphModule } from "@/lib/site/strands";
import { parentPath } from "./pages";
import type { CatalogPage, PageCatalog } from "./types";

const LEADING_SLASH = /^\//;

export interface CatalogSourcePage {
	breadcrumbs: string[];
	description?: MarkdownFragment<"inline">;
	markdownUrl: string;
	strand?: GraphModule;
	title: MarkdownFragment<"inline">;
	url: string;
}

export function catalogFromPages(
	pages: readonly CatalogSourcePage[],
	kindViews: readonly KindView[],
	kindViewMarkdownUrl: (view: KindView) => string
): PageCatalog {
	const markdownByUrl = new Map(
		pages.map((page) => [page.url, page.markdownUrl])
	);
	const strandByUrl = new Map(pages.map((page) => [page.url, page.strand]));
	const records: CatalogPage[] = pages.map((page) => ({
		aliases: uniqueTrimmed([
			page.title.source,
			page.title.plain,
			...page.breadcrumbs,
			page.url.replace(LEADING_SLASH, ""),
		]),
		breadcrumbs: page.breadcrumbs,
		description: page.description,
		kindView: false,
		markdownUrl: page.markdownUrl,
		parentUrl: parentPath(page.url),
		strand: page.strand,
		title: page.title,
		url: page.url,
	}));

	for (const view of kindViews) {
		if (!markdownByUrl.has(view.parentUrl)) {
			continue;
		}

		const title = compileMarkdownFragment(view.title, "inline");
		records.push({
			aliases: uniqueTrimmed([...view.aliases, title.source, title.plain]),
			breadcrumbs: [...view.pageSlugs, view.slug],
			description: compileMarkdownFragment(view.description, "inline"),
			kindView: true,
			markdownUrl: kindViewMarkdownUrl(view),
			parentUrl: view.parentUrl,
			strand: strandByUrl.get(view.parentUrl),
			title,
			url: view.url,
		});
	}

	return {
		pages: records.toSorted((left, right) => left.url.localeCompare(right.url)),
	};
}
