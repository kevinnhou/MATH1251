import { type EnvKind, getKindLabel, getKindViewSlug } from "./kinds";
import type { PageEnvs } from "./page-envs";

export interface KindViewRenderOptions {
	pageUrl?: string;
	viewKind?: EnvKind;
}

interface KindViewCopy {
	aliases: string[];
	chip: string;
	description: string;
	slug: string;
	tabTitle: string;
	title: string;
	url: string;
}

export interface KindView extends KindViewCopy {
	kind: EnvKind;
	locale?: string;
	pageSlugs: string[];
	parentUrl: string;
}

export type KindViewRef = Pick<KindView, "kind" | "parentUrl" | "url">;

const trailingSlashes = /\/+$/;

export function getKindViewUrl(pageUrl: string, kind: EnvKind): string {
	return `${pageUrl.replace(trailingSlashes, "")}/${getKindViewSlug(kind)}`;
}

function kindViewFor(
	page: { title: string; url: string },
	kind: EnvKind
): KindViewCopy {
	const slug = getKindViewSlug(kind);
	const label = getKindLabel(kind, true);
	const chip = label.toUpperCase();

	return {
		aliases: uniqueTrimmed([label, slug, `${page.title} ${label}`]),
		chip,
		description: `All ${label.toLowerCase()} from ${page.title}.`,
		slug,
		tabTitle: `[${chip}] ${page.title}`,
		title: `${label} from ${page.title}`,
		url: getKindViewUrl(page.url, kind),
	};
}

function kindViewRecord(
	page: { locale?: string; slugs: string[]; title: string; url: string },
	kind: EnvKind
): KindView {
	return {
		...kindViewFor(page, kind),
		kind,
		pageSlugs: page.slugs,
		parentUrl: page.url,
		...(page.locale ? { locale: page.locale } : {}),
	};
}

function kindsOnPage(envs: PageEnvs): EnvKind[] {
	const kinds: EnvKind[] = [];
	const seen = new Set<EnvKind>();

	for (const entry of envs.entries) {
		if (seen.has(entry.kind)) {
			continue;
		}

		seen.add(entry.kind);
		kinds.push(entry.kind);
	}

	return kinds;
}

export function getKindViewToc<T extends { url: string }>(
	toc: readonly T[],
	envs: PageEnvs,
	kind: EnvKind
): T[] {
	const urls = new Set(
		envs.entries
			.filter((entry) => entry.kind === kind)
			.flatMap((entry) => entry.headings.map((heading) => heading.url))
	);

	return toc.filter((item) => urls.has(item.url));
}

function generatedKindsForPage(
	kinds: readonly EnvKind[],
	pageSlugs: string[],
	pageExists: (slugs: string[]) => boolean
): EnvKind[] {
	return kinds.filter(
		(kind) => !pageExists([...pageSlugs, getKindViewSlug(kind)])
	);
}

interface KindViewPageInput {
	envs: PageEnvs;
	page: {
		data: { title: string };
		locale?: string;
		slugs: string[];
		url: string;
	};
}

export function kindViewsFromPages(
	pages: readonly KindViewPageInput[],
	pageExists: (slugs: string[]) => boolean
): KindView[] {
	return pages.flatMap(({ envs, page }) =>
		generatedKindsForPage(kindsOnPage(envs), page.slugs, pageExists).map(
			(kind) =>
				kindViewRecord(
					{
						locale: page.locale,
						slugs: page.slugs,
						title: page.data.title,
						url: page.url,
					},
					kind
				)
		)
	);
}

export function uniqueTrimmed(values: string[]): string[] {
	const seen = new Set<string>();
	const next: string[] = [];
	for (const value of values) {
		const trimmed = value.trim();
		if (trimmed === "" || seen.has(trimmed)) {
			continue;
		}

		seen.add(trimmed);
		next.push(trimmed);
	}

	return next;
}
