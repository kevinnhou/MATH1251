import corpusMeta from "collections/corpus-meta";
import { loader, type VirtualFile } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { cache } from "react";
import { getStrand, type Strand } from "@/lib/course/strands";
import type { PageEnvs } from "@/lib/mdx-env/page-envs";
import type { CorpusMetaPage, DocsMeta } from "./corpus-meta/types";

type PageData = CorpusMetaPage["frontmatter"] &
	Pick<CorpusMetaPage, "envs" | "extractedReferences" | "structuredData">;

export const docsRoute = "/";

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
	page: (typeof source)["$inferPage"];
	strand: Strand | undefined;
}

export const getSourcePages = cache((): SourcePage[] =>
	source.getPages().map((page) => ({
		envs: page.data.envs,
		page,
		strand: getStrand(page.slugs),
	}))
);
