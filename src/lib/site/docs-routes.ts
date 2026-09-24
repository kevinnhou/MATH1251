import type { CorpusPage, PageIndex } from "./build-corpus";

/**
 * Only notes pages are prerendered. Kind views are left out on purpose; with
 * `dynamicParams = true` and `revalidate = false` they render on first request
 * and are then cached for the deployment.
 */
export function getPrerenderedDocsSlugs(
	index: Pick<PageIndex<CorpusPage>, "pages">
): string[][] {
	return index.pages.map(({ page }) => [...page.slugs]);
}

export function appendDocsRouteSuffix(
	routes: readonly (readonly string[])[],
	suffix: readonly string[]
): string[][] {
	return routes.map((route) => [...route, ...suffix]);
}
