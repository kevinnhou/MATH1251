import {
	getKindLabel,
	getKindViewSlug,
	type MathEnvKind,
	parseKindViewSlug,
} from "./kinds";
import type { PageEnvs } from "./page-envs";

export interface KindRoute {
	kind: MathEnvKind;
	pageSlugs: string[];
}

export interface KindViewRenderOptions {
	pageUrl?: string;
	viewKind?: MathEnvKind;
}

export interface KindViewCopy {
	aliases: string[];
	chip: string;
	description: string;
	slug: string;
	tabTitle: string;
	title: string;
	url: string;
}

export interface KindView extends KindViewCopy {
	kind: MathEnvKind;
	locale?: string;
	pageSlugs: string[];
	parentUrl: string;
}

const trailingSlashes = /\/+$/;

export function getKindViewUrl(pageUrl: string, kind: MathEnvKind): string {
	return `${pageUrl.replace(trailingSlashes, "")}/${getKindViewSlug(kind)}`;
}

export function kindViewFor(
	page: { title: string; url: string },
	kind: MathEnvKind
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

export function kindViewRecord(
	page: { locale?: string; slugs: string[]; title: string; url: string },
	kind: MathEnvKind
): KindView {
	return {
		...kindViewFor(page, kind),
		kind,
		pageSlugs: page.slugs,
		parentUrl: page.url,
		...(page.locale ? { locale: page.locale } : {}),
	};
}

export function kindsOnPage(envs: PageEnvs): MathEnvKind[] {
	const kinds: MathEnvKind[] = [];
	const seen = new Set<MathEnvKind>();

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
	kind: MathEnvKind
): T[] {
	const urls = new Set(
		envs.entries
			.filter((entry) => entry.kind === kind)
			.flatMap((entry) => entry.headings.map((heading) => heading.url))
	);

	return toc.filter((item) => urls.has(item.url));
}

export function generatedKindsForPage(
	kinds: readonly MathEnvKind[],
	pageSlugs: string[],
	pageExists: (slugs: string[]) => boolean
): MathEnvKind[] {
	return kinds.filter(
		(kind) => !pageExists([...pageSlugs, getKindViewSlug(kind)])
	);
}

export interface KindViewPageInput {
	envs: PageEnvs;
	page: {
		locale?: string;
		slugs: string[];
		title: string;
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
						title: page.title,
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

export function parseKindView(slugs: string[]): KindRoute | undefined {
	if (slugs.length < 2) {
		return;
	}

	const kindSegment = slugs.at(-1);
	if (kindSegment === undefined) {
		return;
	}

	const kind = parseKindViewSlug(kindSegment);
	if (kind === undefined) {
		return;
	}

	return {
		kind,
		pageSlugs: slugs.slice(0, -1),
	};
}
