import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { z } from "zod";
import { rehypeKatexDisplayScroll } from "./src/lib/markdown/katex-display";
import { KATEX_OPTIONS, REMARK_MATH_OPTIONS } from "./src/lib/markdown/math";
import { remarkMathEnv } from "./src/lib/math-env/remark";
import { corpusMeta } from "./src/lib/site/corpus-meta/plugin";

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
		rehypePlugins: (v) => [
			[rehypeKatex, KATEX_OPTIONS],
			rehypeKatexDisplayScroll,
			...v,
		],
		remarkPlugins: [
			[remarkMath, REMARK_MATH_OPTIONS],
			remarkMdxMermaid,
			remarkMathEnv,
		],
		valueToExport: ["envs"],
	},
	plugins: [corpusMeta()],
});
