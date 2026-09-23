import "server-only";

import { cache } from "react";
import {
	buildPageIndex,
	buildSiteCorpus,
	type PageIndex,
	type SiteCorpus,
} from "./build-corpus";
import type { SourcePage } from "./source";
import {
	getKindViewMarkdownUrl,
	getPageMarkdownUrl,
	getSourcePages,
	source,
} from "./source";
import { getStrand } from "./strands";

export type { PageIndex, ResolvedDocs, SiteCorpus } from "./build-corpus";

export const compilePageIndex = cache(() =>
	buildPageIndex({
		pageExists: (slugs) => Boolean(source.getPage(slugs)),
		pages: getSourcePages(),
	})
);

export function buildCorpusFromPageIndex(
	pageIndex: PageIndex<SourcePage>
): SiteCorpus<SourcePage> {
	return buildSiteCorpus({
		kindViewMarkdownUrl: (view) => getKindViewMarkdownUrl(view).url,
		markdownUrl: (page) => getPageMarkdownUrl(page).url,
		pageIndex,
		resolvePageHref: (href, dir) => {
			const resolved = source.getPageByHref(href, { dir });
			if (!resolved || getStrand(resolved.page.slugs) === undefined) {
				return;
			}

			return resolved.page.url;
		},
	});
}

export const compileCorpus = cache(() =>
	buildCorpusFromPageIndex(compilePageIndex())
);
