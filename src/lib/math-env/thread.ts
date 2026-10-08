import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import type { MarkdownFragment } from "@/lib/markdown/types";
import type { PageEnvs } from "./page-envs";
import { type EnvRef, toEnvRef } from "./tenet";

export interface ThreadMember extends EnvRef {
	pageUrl: string;
	role?: MarkdownFragment<"inline">;
	slug?: string;
}

export interface Thread {
	href: string;
	members: ThreadMember[];
	pageUrl: string;
	slug: string;
	summary: MarkdownFragment<"inline">;
	title: MarkdownFragment<"inline">;
}

export interface ThreadIndex {
	bySlug: Map<string, Thread>;
}

export interface ThreadSourcePage {
	envs: PageEnvs;
	page: { url: string };
}

export function createThreadIndex(
	pages: readonly ThreadSourcePage[],
	pageOrder: readonly string[]
): ThreadIndex {
	const bySlug = registerThreads(pages);
	const missing = new Set<string>();

	for (const { envs, page } of pages) {
		for (const entry of envs.entries) {
			for (const tag of entry.threads) {
				const thread = bySlug.get(tag.slug);
				if (thread === undefined) {
					missing.add(tag.slug);
					continue;
				}

				thread.members.push({
					...toEnvRef(page.url, entry),
					pageUrl: page.url,
					...(tag.role
						? { role: compileMarkdownFragment(tag.role, "inline") }
						: {}),
					...(entry.slug ? { slug: entry.slug } : {}),
				});
			}
		}
	}

	if (missing.size > 0) {
		const slugs = Array.from(missing).toSorted().join(", ");
		throw new Error(`Unknown thread slug(s): ${slugs}.`);
	}

	const rank = new Map(pageOrder.map((url, index) => [url, index]));
	const at = (url: string) => rank.get(url) ?? Number.POSITIVE_INFINITY;
	for (const thread of bySlug.values()) {
		thread.members.sort((left, right) => at(left.pageUrl) - at(right.pageUrl));
	}

	return { bySlug };
}

function registerThreads(
	pages: readonly ThreadSourcePage[]
): Map<string, Thread> {
	const bySlug = new Map<string, Thread>();

	for (const { envs, page } of pages) {
		for (const thread of envs.threads) {
			if (bySlug.has(thread.slug)) {
				throw new Error(
					`Thread slug "${thread.slug}" is defined more than once.`
				);
			}

			bySlug.set(thread.slug, {
				href: `${page.url}#${thread.id}`,
				members: [],
				pageUrl: page.url,
				slug: thread.slug,
				summary: compileMarkdownFragment(thread.summary, "inline"),
				title: compileMarkdownFragment(thread.title, "inline"),
			});
		}
	}

	return bySlug;
}
