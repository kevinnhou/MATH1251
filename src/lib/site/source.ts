import corpusMeta from "collections/corpus-meta";
import { loader, type VirtualFile } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { cache } from "react";
import { getKindViewSlug, type MathEnvKind } from "@/lib/math-env/kinds";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import { docsContentRoute, docsImageRoute, docsRoute } from "./config";
import type { CorpusMetaPage, DocsMeta } from "./corpus-meta/types";
import { type GraphModule, getStrand } from "./strands";

type PageData = CorpusMetaPage["frontmatter"] &
	Pick<CorpusMetaPage, "envs" | "extractedReferences" | "structuredData">;

const files: VirtualFile<{ metaData: DocsMeta; pageData: PageData }>[] = [
	...corpusMeta.pages.map((page) => ({
		data: {
			...page.frontmatter,
			envs: page.envs,
			extractedReferences: page.extractedReferences,
			structuredData: page.structuredData,
		},
		path: page.path,
		type: "page" as const,
	})),
	...corpusMeta.metas.map((meta) => ({
		data: meta.data,
		path: meta.path,
		type: "meta" as const,
	})),
];

export const source = loader({
	baseUrl: docsRoute,
	plugins: [lucideIconsPlugin()],
	source: { files },
});

export interface SourcePage {
	envs: PageEnvs;
	module: GraphModule | undefined;
	page: (typeof source)["$inferPage"];
}

export const getSourcePages = cache((): SourcePage[] =>
	source.getPages().map((page) => ({
		envs: page.data.envs,
		module: getStrand(page.slugs),
		page,
	}))
);

export function getPageImageUrl(
	page: (typeof source)["$inferPage"],
	viewKind?: MathEnvKind
) {
	const segments =
		viewKind === undefined
			? [...page.slugs, "image.png"]
			: [...page.slugs, getKindViewSlug(viewKind), "image.png"];

	return {
		segments,
		url:
			"/" +
			[page.locale, ...docsImageRoute.split("/"), ...segments]
				.filter(Boolean)
				.join("/"),
	};
}

export function getPageMarkdownUrl(page: { locale?: string; slugs: string[] }) {
	return markdownContentUrl(page.slugs, page.locale);
}

export function getKindViewMarkdownUrl(view: {
	locale?: string;
	pageSlugs: string[];
	slug: string;
}) {
	return markdownContentUrl([...view.pageSlugs, view.slug], view.locale);
}

function markdownContentUrl(slugs: string[], locale?: string) {
	const segments = [...slugs, "content.md"];

	return {
		segments,
		url:
			"/" +
			[locale, ...docsContentRoute.split("/"), ...segments]
				.filter(Boolean)
				.join("/"),
	};
}
