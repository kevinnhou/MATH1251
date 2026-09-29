import type { CatalogPage, PageCatalog, TerminalLocation } from "./types";

export interface Directory {
	name: string;
	page?: CatalogPage;
	parent: string | null;
	url: string;
}

export type DirectoryOutcome =
	| { kind: "dir"; dir: Directory }
	| { kind: "page"; page: CatalogPage }
	| { kind: "none" }
	| { kind: "other-root"; root: Directory }
	| { kind: "above-root" };

const LEADING_SLASH = /^\//;

const directoriesByCatalog = new WeakMap<PageCatalog, Map<string, Directory>>();

export function directories(catalog: PageCatalog): Map<string, Directory> {
	const cached = directoriesByCatalog.get(catalog);
	if (cached) {
		return cached;
	}

	const pages = new Map(catalog.pages.map((page) => [page.url, page]));
	const dirs = new Map<string, Directory>();
	for (const page of catalog.pages) {
		if (page.kindView) {
			continue;
		}

		const segments = page.url.split("/").filter(Boolean);
		for (let depth = 1; depth < segments.length; depth += 1) {
			const url = `/${segments.slice(0, depth).join("/")}`;
			if (!dirs.has(url)) {
				dirs.set(url, {
					name: segments[depth - 1] ?? url,
					page: pages.get(url),
					parent: parentDirectory(url),
					url,
				});
			}
		}
	}

	directoriesByCatalog.set(catalog, dirs);
	return dirs;
}

export function rootOf(url: string): string {
	const first = url.split("/").find(Boolean);
	return first ? `/${first}` : "/";
}

export function isWithin(url: string, dir: string): boolean {
	return url === dir || url.startsWith(`${dir}/`);
}

export function displayPath(url: string): string {
	return url.replace(LEADING_SLASH, "");
}

export function roots(catalog: PageCatalog): Directory[] {
	return [...directories(catalog).values()].filter((dir) => !dir.parent);
}

export function childDirectories(
	catalog: PageCatalog,
	url: string
): Directory[] {
	return [...directories(catalog).values()].filter((dir) => dir.parent === url);
}

export function resolveDirectory(
	catalog: PageCatalog,
	cwd: string,
	input: string
): DirectoryOutcome {
	const dirs = directories(catalog);
	const trimmed = input.trim();
	const root = rootOf(cwd);
	if (trimmed === "" || trimmed === "~") {
		const dir = dirs.get(root);
		return dir ? { dir, kind: "dir" } : { kind: "none" };
	}

	let url = trimmed.startsWith("/") ? "" : cwd;
	for (const segment of trimmed.split("/")) {
		if (segment === "" || segment === ".") {
			continue;
		}

		const next = step(catalog, url, segment);
		if (typeof next !== "string") {
			return next;
		}

		url = next;
	}

	const dir = dirs.get(url);
	if (!dir) {
		return { kind: "none" };
	}

	if (rootOf(dir.url) !== root) {
		return { kind: "other-root", root: dirs.get(rootOf(dir.url)) ?? dir };
	}

	return { dir, kind: "dir" };
}

export function resolveRoot(
	catalog: PageCatalog,
	input: string
): Directory | undefined {
	const needle = input.trim().replace(LEADING_SLASH, "").toLowerCase();
	return roots(catalog).find((dir) => matches(dir, needle));
}

function step(
	catalog: PageCatalog,
	url: string,
	segment: string
): string | DirectoryOutcome {
	if (segment === "..") {
		return directories(catalog).get(url)?.parent ?? { kind: "above-root" };
	}

	const child = matchChild(catalog, url, segment);
	if (child) {
		return child.url;
	}

	const target = `${url}/${segment}`.toLowerCase();
	const page = catalog.pages.find(
		(candidate) => !candidate.kindView && candidate.url.toLowerCase() === target
	);
	return page ? { kind: "page", page } : { kind: "none" };
}

function matchChild(
	catalog: PageCatalog,
	url: string,
	segment: string
): Directory | undefined {
	const needle = segment.toLowerCase();
	const candidates =
		url === "" ? roots(catalog) : childDirectories(catalog, url);
	return candidates.find((dir) => matches(dir, needle));
}

function matches(dir: Directory, needle: string): boolean {
	return (
		dir.name.toLowerCase() === needle ||
		dir.page?.title.plain.toLowerCase() === needle
	);
}

export function parentDirectory(url: string): string | null {
	return rootOf(url) === url ? null : url.slice(0, url.lastIndexOf("/"));
}

export function initialLocation(route: string): TerminalLocation {
	return { cwd: rootOf(route), listing: null };
}

export function followRoute(
	location: TerminalLocation,
	route: string
): TerminalLocation {
	const cwd = isWithin(route, location.cwd) ? location.cwd : rootOf(route);
	if (cwd === location.cwd && location.listing === null) {
		return location;
	}

	return { cwd, listing: null };
}

export function clearListing(location: TerminalLocation): TerminalLocation {
	return location.listing === null ? location : { ...location, listing: null };
}
