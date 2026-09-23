interface DocsRouteIndex {
	kindViews: readonly {
		pageSlugs: readonly string[];
		slug: string;
	}[];
	pages: readonly {
		page: {
			slugs: readonly string[];
		};
	}[];
}

export function getDocsRouteSlugs(index: DocsRouteIndex): string[][] {
	return [
		...index.pages.map(({ page }) => [...page.slugs]),
		...index.kindViews.map(({ pageSlugs, slug }) => [...pageSlugs, slug]),
	];
}

export function appendDocsRouteSuffix(
	routes: readonly (readonly string[])[],
	suffix: readonly string[]
): string[][] {
	return routes.map((route) => [...route, ...suffix]);
}
