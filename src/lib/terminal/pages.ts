import { literalInlineFragment } from "@/lib/markdown/types";
import type { CatalogPage, CurrentPages, PageCatalog } from "./types";

const TRAILING_SLASHES = /\/+$/;

export function parentPath(url: string): string | null {
	const trimmed = url.replace(TRAILING_SLASHES, "");
	const slash = trimmed.lastIndexOf("/");
	if (slash <= 0) {
		return null;
	}

	return trimmed.slice(0, slash);
}

export function findPageByUrl(
	catalog: PageCatalog,
	url: string
): CatalogPage | undefined {
	const normalised = normalisePath(url);
	return catalog.pages.find((page) => page.url === normalised);
}

export function placeholderPage(url: string): CatalogPage {
	const normalised = normalisePath(url.split("#")[0] ?? url);
	return {
		aliases: [],
		breadcrumbs: normalised.split("/").filter(Boolean),
		kindView: false,
		markdownUrl: "",
		parentUrl: parentPath(normalised),
		title: literalInlineFragment(normalised),
		url: normalised,
	};
}

export function currentPagesFromUrl(
	catalog: PageCatalog,
	url: string
): CurrentPages {
	const hashless = url.split("#")[0] ?? url;
	const route = findPageByUrl(catalog, hashless);
	if (!route) {
		const placeholder = placeholderPage(hashless);
		return {
			inCatalog: false,
			route: placeholder,
			source: placeholder,
		};
	}

	if (route.kindView && route.parentUrl) {
		const parent = findPageByUrl(catalog, route.parentUrl);
		return {
			inCatalog: true,
			route,
			source: parent ?? route,
		};
	}

	return {
		inCatalog: true,
		route,
		source: route,
	};
}

export function normalisePath(url: string): string {
	const trimmed = url.trim();
	if (trimmed === "" || trimmed === ".") {
		return trimmed;
	}

	const withoutDot = trimmed.startsWith("./") ? trimmed.slice(2) : trimmed;
	const withSlash = withoutDot.startsWith("/") ? withoutDot : `/${withoutDot}`;
	if (withSlash === "/") {
		return "/core";
	}

	return withSlash.replace(TRAILING_SLASHES, "") || "/core";
}
