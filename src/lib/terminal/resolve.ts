import type {
	CatalogPage,
	CurrentPages,
	PageCatalog,
	RoutePage,
} from "@/lib/course/catalog";
import { findPageByUrl, normalisePath } from "@/lib/course/catalog";
import type { ResolveOutcome } from "./types";

const LEADING_SLASH = /^\//;
const PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

export function resolvePage(
	catalog: PageCatalog,
	query: string,
	current: CurrentPages
): ResolveOutcome {
	const trimmed = query.trim();
	if (trimmed === "") {
		return { kind: "empty" };
	}

	if (trimmed === ".") {
		return current.inCatalog
			? { kind: "match", page: current.route }
			: { kind: "none", query: trimmed };
	}

	const { route } = current;
	if (trimmed === "..") {
		if (route.parentUrl === null) {
			return { kind: "none", query: trimmed };
		}

		const parent = findPageByUrl(catalog, route.parentUrl);
		if (!parent) {
			return { kind: "none", query: trimmed };
		}

		return { kind: "match", page: parent };
	}

	if (looksLikeExternal(trimmed)) {
		return { kind: "none", query: trimmed };
	}

	const ranked = rankPages(catalog, trimmed, route);
	const [first] = ranked;
	if (first === undefined) {
		return { kind: "none", query: trimmed };
	}

	const ties = ranked.filter((entry) => entry.score === first.score);
	if (ties.length > 1) {
		return {
			kind: "ambiguous",
			pages: ties.map((entry) => entry.page),
			query: trimmed,
		};
	}

	return { kind: "match", page: first.page };
}

export function rankPages(
	catalog: PageCatalog,
	query: string,
	current: RoutePage
): Array<{ page: CatalogPage; score: number }> {
	const needle = query.toLowerCase();
	const pathNeedle = needle.replace(LEADING_SLASH, "");
	const normalised = normalisePath(query);
	const ranked: Array<{ page: CatalogPage; score: number }> = [];

	for (const page of catalog.pages) {
		const score = scorePage(page, needle, pathNeedle, normalised, current);
		if (score > 0) {
			ranked.push({ page, score });
		}
	}

	return ranked.toSorted((left, right) => {
		if (right.score !== left.score) {
			return right.score - left.score;
		}

		return left.page.url.localeCompare(right.page.url);
	});
}

function scorePage(
	page: CatalogPage,
	needle: string,
	pathNeedle: string,
	normalised: string,
	current: RoutePage
): number {
	if (page.url === normalised) {
		return 100;
	}

	const title = page.title.source.toLowerCase();
	if (title === needle) {
		return 90;
	}

	const path = page.url.replace(LEADING_SLASH, "").toLowerCase();
	const pathMatch = getPathMatch(path, pathNeedle);
	if (path === needle) {
		return 88;
	}

	for (const alias of page.aliases) {
		if (alias.toLowerCase() === needle) {
			return 80;
		}
	}

	if (page.breadcrumbs.at(-1)?.toLowerCase() === needle) {
		return 76;
	}

	if (title.startsWith(needle)) {
		return 60;
	}

	if (pathMatch.prefix) {
		return 55;
	}

	if (page.aliases.some((alias) => alias.toLowerCase().startsWith(needle))) {
		return 52;
	}

	if (pathMatch.suffix) {
		return 50;
	}

	if (title.includes(needle) || pathMatch.includes) {
		return current.strand !== undefined && current.strand === page.strand
			? 40
			: 30;
	}

	if (page.aliases.some((alias) => alias.toLowerCase().includes(needle))) {
		return 20;
	}

	return 0;
}

function getPathMatch(
	path: string,
	needle: string
): { includes: boolean; prefix: boolean; suffix: boolean } {
	if (needle === "") {
		return { includes: false, prefix: false, suffix: false };
	}

	return {
		includes: path.includes(needle),
		prefix: path.startsWith(needle),
		suffix: path.endsWith(`/${needle}`) || path.endsWith(needle),
	};
}

function looksLikeExternal(value: string): boolean {
	return PROTOCOL.test(value) || value.startsWith("//") || value.includes("\\");
}
