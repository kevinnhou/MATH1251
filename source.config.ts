import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";
import { corpusMeta } from "./src/lib/compile/corpus-meta/plugin";
import { REHYPE_PLUGINS, REMARK_PLUGINS } from "./src/lib/markdown/syntaxes";
import { remarkMdxEnv } from "./src/lib/mdx-env/remark";

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		async: true,
		schema: pageSchema.extend({
			ideas: z.array(z.string()).default([]),
			tags: z.array(z.string()).default([]),
		}),
	},
	meta: {
		schema: metaSchema,
	},
});

export default defineConfig({
	mdxOptions: {
		rehypePlugins: (v) => [...REHYPE_PLUGINS, ...v],
		remarkPlugins: [...REMARK_PLUGINS, remarkMdxMermaid, remarkMdxEnv],
	},
	plugins: [corpusMeta()],
});
