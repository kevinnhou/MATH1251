import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
	getMathEnvMdxComponents,
	type MathEnvMdxOptions,
} from "@/components/math-env/mdx";
import { Mermaid } from "./mermaid";

export function getMDXComponents(
	components?: MDXComponents,
	options: MathEnvMdxOptions = {}
) {
	return {
		...defaultMdxComponents,
		...getMathEnvMdxComponents(options),
		Mermaid,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
