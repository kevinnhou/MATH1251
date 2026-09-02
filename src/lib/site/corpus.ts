import "server-only";

import { cache } from "react";
import { buildSiteCorpus } from "./build-corpus";
import {
	getKindViewMarkdownUrl,
	getPageMarkdownUrl,
	getSourcePages,
	source,
} from "./source";
import { getStrand } from "./strands";

export type { ResolvedDocs, SiteCorpus } from "./build-corpus";

export const compileCorpus = cache(() =>
	buildSiteCorpus({
		kindViewMarkdownUrl: (view) => getKindViewMarkdownUrl(view).url,
		markdownUrl: (page) => getPageMarkdownUrl(page).url,
		pageExists: (slugs) => Boolean(source.getPage(slugs)),
		pages: getSourcePages(),
		resolvePageHref: (href, dir) => {
			const resolved = source.getPageByHref(href, { dir });
			if (!resolved || getStrand(resolved.page.slugs) === undefined) {
				return;
			}

			return resolved.page.url;
		},
	})
);
