import type { CorpusPage, PageIndex } from "./build-corpus";

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
