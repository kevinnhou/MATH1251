import { getKindViewUrl, type KindViewRef } from "@/lib/math-env/kind-view";
import type { MathEnvKind } from "@/lib/math-env/kinds";
import { normalisePath, withoutHash } from "./catalog";

export interface CourseRoutes {
	kindViews: Record<string, MathEnvKind[]>;
	pages: string[];
}

export interface RouteMatch {
	inCatalog: boolean;
	kindView: boolean;
	sourceUrl: string;
}

export interface RouteIndex {
	kindViews: KindViewRef[];
	match: (url: string) => RouteMatch;
	subdirectories: (dir: string) => ReadonlySet<string>;
}

export function indexRoutes(routes: CourseRoutes): RouteIndex {
	const pages = new Set(routes.pages);
	const kindViews = Object.entries(routes.kindViews).flatMap(
		([parentUrl, kinds]) =>
			kinds.map((kind) => ({
				kind,
				parentUrl,
				url: getKindViewUrl(parentUrl, kind),
			}))
	);
	const parents = new Map(kindViews.map((view) => [view.url, view.parentUrl]));

	return {
		kindViews,
		match(url) {
			const path = normalisePath(withoutHash(url));
			const parent = parents.get(path);
			if (parent !== undefined) {
				return { inCatalog: true, kindView: true, sourceUrl: parent };
			}

			return { inCatalog: pages.has(path), kindView: false, sourceUrl: path };
		},
		subdirectories(dir) {
			const prefix = `${dir}/`;
			const urls = new Set<string>();
			for (const url of routes.pages) {
				const slash = url.indexOf("/", prefix.length);
				if (url.startsWith(prefix) && slash !== -1) {
					urls.add(url.slice(0, slash));
				}
			}

			return urls;
		},
	};
}
