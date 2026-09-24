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

function memoInProduction<T>(build: () => T): () => T {
	// Development must stay per-request so MDX edits show up without a restart.
	if (process.env.NODE_ENV !== "production") {
		return cache(build);
	}

	let memo: { current: T } | undefined;
	return () => {
		memo ??= { current: build() };
		return memo.current;
	};
}

export const compilePageIndex = memoInProduction(() =>
	buildPageIndex({
		pageExists: (slugs) => Boolean(source.getPage(slugs)),
		pages: getSourcePages(),
	})
);

function buildCorpusFromPageIndex(
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

export const compileCorpus = memoInProduction(() =>
	buildCorpusFromPageIndex(compilePageIndex())
);
