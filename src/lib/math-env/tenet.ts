import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import {
	literalInlineFragment,
	type MarkdownFragment,
} from "@/lib/markdown/types";
import {
	type ExampleDifficulty,
	getMathEnvConfig,
	type MathEnvKind,
} from "./kinds";
import type { EnvOccurrence, PageEnvs } from "./page-envs";
import { compileStatement, type StatementView } from "./statement-html";

export interface ResolvedRef {
	href: string;
	kind: MathEnvKind | "recall";
	title: MarkdownFragment<"inline">;
}

export interface Tenet {
	difficulty?: ExampleDifficulty;
	kind: MathEnvKind;
	occurrenceId: string;
	of: string[];
	pageUrl: string;
	see: string[];
	slug: string;
	statement?: string;
	statementView?: StatementView;
	title: MarkdownFragment<"inline">;
}

export interface TenetIndex {
	bySlug: Map<string, Tenet>;
	citedBy: Map<string, ResolvedRef[]>;
}

export interface TenetSourcePage {
	envs: PageEnvs;
	title: string;
	url: string;
}

export function getTenetHref(tenet: Tenet): string {
	return `${tenet.pageUrl}#${tenet.occurrenceId}`;
}

export function toResolvedRef(tenet: Tenet): ResolvedRef {
	return {
		href: getTenetHref(tenet),
		kind: tenet.kind,
		title: tenet.title,
	};
}

export function resolveSlugs(
	slugs: readonly string[],
	index: TenetIndex
): ResolvedRef[] {
	return slugs.flatMap((slug) => {
		const tenet = index.bySlug.get(slug);
		return tenet === undefined ? [] : [toResolvedRef(tenet)];
	});
}

export function createTenetIndex(
	pages: readonly TenetSourcePage[]
): TenetIndex {
	const bySlug = registerTenets(pages);
	return { bySlug, citedBy: collectCitations(pages) };
}

function registerTenets(pages: readonly TenetSourcePage[]): Map<string, Tenet> {
	const bySlug = new Map<string, Tenet>();

	for (const page of pages) {
		for (const entry of page.envs.entries) {
			const { slug } = entry;
			if (slug === undefined) {
				continue;
			}

			if (bySlug.has(slug)) {
				throw new Error(`Tenet slug "${slug}" is defined more than once.`);
			}

			bySlug.set(slug, toTenet(page, { ...entry, slug }));
		}
	}

	return bySlug;
}

function toTenet(
	page: TenetSourcePage,
	entry: EnvOccurrence & { slug: string }
): Tenet {
	return {
		kind: entry.kind,
		occurrenceId: entry.id,
		of: entry.of,
		pageUrl: page.url,
		see: entry.see,
		slug: entry.slug,
		title: compileTitle(entry.title, entry.slug),
		...(entry.difficulty ? { difficulty: entry.difficulty } : {}),
		...(entry.statement
			? {
					statement: entry.statement,
					statementView: compileStatement(entry.statement),
				}
			: {}),
	};
}

function collectCitations(
	pages: readonly TenetSourcePage[]
): Map<string, ResolvedRef[]> {
	const citedBy = new Map<string, ResolvedRef[]>();

	for (const page of pages) {
		for (const entry of page.envs.entries) {
			addCitations(citedBy, [...entry.of, ...entry.see], {
				href: `${page.url}#${entry.id}`,
				kind: entry.kind,
				title: compileTitle(
					entry.title,
					entry.slug ?? getMathEnvConfig(entry.kind).label
				),
			});
		}

		for (const recall of page.envs.recalls) {
			addCitations(citedBy, [recall.of], {
				href: `${page.url}#${recall.id}`,
				kind: "recall",
				title: compileMarkdownFragment(page.title, "inline"),
			});
		}
	}

	return citedBy;
}

export function assertTenetIndex(index: TenetIndex): void {
	const missing = new Set<string>();

	for (const tenet of index.bySlug.values()) {
		for (const slug of [...tenet.of, ...tenet.see]) {
			if (!index.bySlug.has(slug)) {
				missing.add(slug);
			}
		}
	}

	for (const [slug, refs] of index.citedBy) {
		if (!index.bySlug.has(slug) && refs.length > 0) {
			missing.add(slug);
		}
	}

	if (missing.size > 0) {
		const slugs = Array.from(missing).toSorted().join(", ");
		throw new Error(`Unknown tenet slug(s): ${slugs}.`);
	}
}

function compileTitle(
	title: string | undefined,
	fallback: string
): MarkdownFragment<"inline"> {
	if (title === undefined) {
		return literalInlineFragment(fallback);
	}

	return compileMarkdownFragment(title, "inline");
}

function addCitations(
	citedBy: Map<string, ResolvedRef[]>,
	slugs: readonly string[],
	source: ResolvedRef
) {
	for (const slug of slugs) {
		const existing = citedBy.get(slug);
		if (existing) {
			existing.push(source);
			continue;
		}

		citedBy.set(slug, [source]);
	}
}
