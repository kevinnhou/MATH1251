import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { cache } from "react";
import { z } from "zod";
import { getKindViewSlug, type MathEnvKind } from "@/lib/math-env/kinds";
import { getPageEnvs, type PageEnvs } from "@/lib/math-env/page-envs";
import { docsContentRoute, docsImageRoute, docsRoute } from "./config";
import { type GraphModule, getStrand } from "./strands";

const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: {
			extractLinkReferences: true,
			includeProcessedMarkdown: true,
		},
		schema: pageSchema.extend({
			ideas: z.array(z.string()).default([]),
			tags: z.array(z.string()).default([]),
		}),
	},
	meta: {
		schema: metaSchema,
	},
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
	baseUrl: docsRoute,
	plugins: [lucideIconsPlugin()],
	source: docs.toFumadocsSource(),
});

export interface SourcePage {
	envs: PageEnvs;
	module: GraphModule | undefined;
	page: (typeof source)["$inferPage"];
}

export const getSourcePages = cache((): SourcePage[] =>
	source.getPages().map((page) => ({
		envs: getPageEnvs(page),
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
