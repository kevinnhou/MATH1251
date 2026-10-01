import type { PromptTarget } from "@/lib/export/model";
import type { MarkdownFragment } from "@/lib/markdown/types";
import { literalInlineFragment } from "@/lib/markdown/types";
import { homeRoute } from "@/lib/site/config";
import type { GraphModule } from "./strands";

export interface CatalogPage {
	aliases: string[];
	breadcrumbs: string[];
	description?: MarkdownFragment<"inline">;
	kindView: boolean;
	parentUrl: string | null;
	prompt: PromptTarget | null;
	strand?: GraphModule;
	title: MarkdownFragment<"inline">;
	url: string;
}

export interface PageCatalog {
	pages: CatalogPage[];
}

export interface CurrentPages {
	inCatalog: boolean;
	route: CatalogPage;
	source: CatalogPage;
}

const TRAILING_SLASHES = /\/+$/;

export function parentPath(url: string): string | null {
	const trimmed = url.replace(TRAILING_SLASHES, "");
	const slash = trimmed.lastIndexOf("/");
	if (slash <= 0) {
		return null;
	}

	return trimmed.slice(0, slash);
}

export function withoutHash(url: string): string {
	return url.split("#")[0] ?? url;
}

export function findPageByUrl(
	catalog: PageCatalog,
	url: string
): CatalogPage | undefined {
	const normalised = normalisePath(url);
	return catalog.pages.find((page) => page.url === normalised);
}

function placeholderPage(url: string): CatalogPage {
	const normalised = normalisePath(withoutHash(url));
	return {
		aliases: [],
		breadcrumbs: normalised.split("/").filter(Boolean),
		kindView: false,
		parentUrl: parentPath(normalised),
		prompt: null,
		title: literalInlineFragment(normalised),
		url: normalised,
	};
}

export function currentPagesFromUrl(
	catalog: PageCatalog,
	url: string
): CurrentPages {
	const hashless = withoutHash(url);
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
		return homeRoute;
	}

	return withSlash.replace(TRAILING_SLASHES, "") || homeRoute;
}
