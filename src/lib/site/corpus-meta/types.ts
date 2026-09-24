import type { StructuredData } from "fumadocs-core/mdx-plugins";
import type { DocsCollection } from "fumadocs-mdx/config";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import type { docs } from "../../../../source.config";

type InferOutput<S> = S extends {
	"~standard": { types?: { output: infer O } };
}
	? O
	: never;

type Output<C> =
	C extends DocsCollection<infer Page, infer Meta>
		? {
				frontmatter: InferOutput<Page>;
				meta: InferOutput<Meta>;
			}
		: never;

export type DocsFrontmatter = Output<typeof docs>["frontmatter"];
export type DocsMeta = Output<typeof docs>["meta"];

export interface CorpusMetaPage {
	envs: PageEnvs;
	extractedReferences: { href: string }[];
	frontmatter: DocsFrontmatter;
	path: string;
	structuredData: StructuredData;
}

export interface CorpusMetaFile {
	data: DocsMeta;
	path: string;
}

export interface CorpusMeta {
	metas: CorpusMetaFile[];
	pages: CorpusMetaPage[];
}
