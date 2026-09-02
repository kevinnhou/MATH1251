import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { KATEX_OPTIONS, REMARK_MATH_OPTIONS } from "./src/lib/markdown/math";
import { remarkMathEnv } from "./src/lib/math-env/remark";

export default defineConfig({
	mdxOptions: {
		rehypePlugins: (v) => [[rehypeKatex, KATEX_OPTIONS], ...v],
		remarkPlugins: [
			[remarkMath, REMARK_MATH_OPTIONS],
			remarkMdxMermaid,
			remarkMathEnv,
		],
		valueToExport: ["envs"],
	},
});
