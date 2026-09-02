import {
	compileMarkdownFragment,
	highlightMarkdownFragment,
} from "@/lib/markdown/fragment";
import { literalInlineFragment } from "@/lib/markdown/types";
import { findPageByUrl } from "./pages";
import { SEARCH_LIMIT } from "./search";
import type { PageCatalog, SearchDocument, SearchHit } from "./types";

export function readSearchLimit(url: URL): number {
	const raw = url.searchParams.get("limit");
	const parsed = raw === null ? SEARCH_LIMIT : Number(raw);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return SEARCH_LIMIT;
	}

	return Math.min(parsed, SEARCH_LIMIT);
}

export function projectSearchHits(
	results: readonly SearchDocument[],
	options: { catalog: PageCatalog; query: string }
): SearchHit[] {
	return results.slice(0, SEARCH_LIMIT).map((result) => {
		const content = escapeSearchSnippet(result.content);
		const pathname = result.url.split("#")[0] ?? result.url;
		const titleFragment =
			result.type === "page" || result.type === "heading"
				? compileMarkdownFragment(content, "inline")
				: (findPageByUrl(options.catalog, pathname)?.title ??
					literalInlineFragment(pathname));

		return {
			path: result.url,
			title: highlightMarkdownFragment(titleFragment, options.query),
			url: result.url,
			...(result.type === "page"
				? {}
				: {
						snippet: highlightMarkdownFragment(
							compileMarkdownFragment(content, "block"),
							options.query
						),
					}),
		};
	});
}

function escapeSearchSnippet(value: string): string {
	return value
		.replace(/<[^>]*>/g, "")
		.replace(/\s+/g, " ")
		.trim();
}
