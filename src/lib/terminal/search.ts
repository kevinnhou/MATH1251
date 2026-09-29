import type { PageCatalog } from "@/lib/course/catalog";
import { findPageByUrl, withoutHash } from "@/lib/course/catalog";
import { isRecord } from "@/lib/result";
import type { SearchHit, SearchResult } from "./types";

export const SEARCH_LIMIT = 24;

export function terminalSearchUrl(origin: string, query: string): URL {
	const url = new URL("/api/search", origin);
	url.searchParams.set("format", "terminal");
	url.searchParams.set("limit", String(SEARCH_LIMIT));
	url.searchParams.set("query", query);
	return url;
}

export async function fetchNotesSearch(
	query: string,
	origin: string,
	signal: AbortSignal
): Promise<SearchHit[]> {
	const response = await fetch(terminalSearchUrl(origin, query), { signal });
	if (!response.ok) {
		throw new Error("Unable to search.");
	}

	const data: unknown = await response.json();
	if (!(Array.isArray(data) && data.every(isSearchHit))) {
		throw new Error("Unable to search.");
	}

	return data;
}

export interface SearchHitGroup {
	hits: SearchHit[];
	path: string;
}

export function groupSearchHits(hits: SearchHit[]): SearchHitGroup[] {
	const groups: SearchHitGroup[] = [];
	for (const hit of hits) {
		const path = withoutHash(hit.path);
		const current = groups.at(-1);
		if (current?.path === path) {
			current.hits.push(hit);
			continue;
		}

		groups.push({ hits: [hit], path });
	}

	return groups;
}

export function searchResults(
	catalog: PageCatalog,
	hits: SearchHit[]
): SearchResult[] {
	const results = new Map<string, SearchHit[]>();
	for (const hit of hits) {
		const page = findPageByUrl(catalog, withoutHash(hit.url));
		const url = page?.kindView ? page.parentUrl : page?.url;
		if (!url) {
			continue;
		}

		const pageHits = results.get(url);
		if (pageHits) {
			pageHits.push(hit);
		} else {
			results.set(url, [hit]);
		}
	}

	return [...results].map(([url, pageHits]) => ({ hits: pageHits, url }));
}

export function isTerminalSearchRequest(url: URL): boolean {
	return url.searchParams.get("format") === "terminal";
}

function isSearchHit(value: unknown): value is SearchHit {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.path === "string" &&
		typeof value.url === "string" &&
		isRendered(value.title, "inline") &&
		(value.snippet === undefined || isRendered(value.snippet, "block"))
	);
}

function isRendered(value: unknown, mode: "inline" | "block"): boolean {
	return (
		isRecord(value) &&
		value.mode === mode &&
		typeof value.html === "string" &&
		typeof value.plain === "string"
	);
}
