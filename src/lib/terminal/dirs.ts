import type { CatalogPage, PageCatalog } from "@/lib/course/catalog";
import { parentPath } from "@/lib/course/catalog";

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

interface DirectoryIndex {
	byUrl: Map<string, Directory>;
	children: Map<string, Directory[]>;
}

const LEADING_SLASH = /^\//;
const TOP = "";

const indexByCatalog = new WeakMap<PageCatalog, DirectoryIndex>();

function directoryIndex(catalog: PageCatalog): DirectoryIndex {
	const cached = indexByCatalog.get(catalog);
	if (cached) {
		return cached;
	}

	const pages = new Map(catalog.pages.map((page) => [page.url, page]));
	const index: DirectoryIndex = { byUrl: new Map(), children: new Map() };
	for (const page of catalog.pages) {
		if (page.kindView) {
			continue;
		}

		const segments = page.url.split("/").filter(Boolean);
		for (let depth = 1; depth < segments.length; depth += 1) {
			const url = `/${segments.slice(0, depth).join("/")}`;
			if (index.byUrl.has(url)) {
				continue;
			}

			const dir: Directory = {
				name: segments[depth - 1] ?? url,
				page: pages.get(url),
				parent: parentPath(url),
				url,
			};
			const siblings = index.children.get(dir.parent ?? TOP);
			if (siblings) {
				siblings.push(dir);
			} else {
				index.children.set(dir.parent ?? TOP, [dir]);
			}
			index.byUrl.set(url, dir);
		}
	}

	indexByCatalog.set(catalog, index);
	return index;
}

export function rootOf(url: string): string {
	const first = url.split("/").find(Boolean);
	return first ? `/${first}` : "/";
}

export function displayPath(url: string): string {
	return url.replace(LEADING_SLASH, "");
}

export function childDirectories(
	catalog: PageCatalog,
	url: string
): Directory[] {
	return directoryIndex(catalog).children.get(url) ?? [];
}

export function roots(catalog: PageCatalog): Directory[] {
	return childDirectories(catalog, TOP);
}

export function resolveRoot(
	catalog: PageCatalog,
	input: string
): Directory | undefined {
	return findChild(catalog, TOP, input.trim().replace(LEADING_SLASH, ""));
}

export function resolveDirectory(
	catalog: PageCatalog,
	cwd: string,
	input: string
): DirectoryOutcome {
	const { byUrl } = directoryIndex(catalog);
	const trimmed = input.trim();
	const root = rootOf(cwd);
	if (trimmed === "" || trimmed === "~") {
		const dir = byUrl.get(root);
		return dir ? { dir, kind: "dir" } : { kind: "none" };
	}

	let url = trimmed.startsWith("/") ? TOP : cwd;
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

	const dir = byUrl.get(url);
	if (!dir) {
		return { kind: "none" };
	}

	if (rootOf(dir.url) !== root) {
		return { kind: "other-root", root: byUrl.get(rootOf(dir.url)) ?? dir };
	}

	return { dir, kind: "dir" };
}

function step(
	catalog: PageCatalog,
	url: string,
	segment: string
): string | DirectoryOutcome {
	if (segment === "..") {
		return (
			directoryIndex(catalog).byUrl.get(url)?.parent ?? { kind: "above-root" }
		);
	}

	const child = findChild(catalog, url, segment);
	if (child) {
		return child.url;
	}

	const target = `${url}/${segment}`.toLowerCase();
	const page = catalog.pages.find(
		(candidate) => !candidate.kindView && candidate.url.toLowerCase() === target
	);
	return page ? { kind: "page", page } : { kind: "none" };
}

function findChild(
	catalog: PageCatalog,
	parent: string,
	name: string
): Directory | undefined {
	const needle = name.toLowerCase();
	return childDirectories(catalog, parent).find(
		(dir) =>
			dir.name.toLowerCase() === needle ||
			dir.page?.title.plain.toLowerCase() === needle
	);
}
