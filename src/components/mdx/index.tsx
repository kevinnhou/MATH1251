import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
	type EnvMdxOptions,
	getEnvMdxComponents,
} from "@/components/mdx-env/mdx";
import {
	getThreadMdxComponents,
	type ThreadMdxOptions,
} from "@/components/threads/mdx";
import { Mermaid } from "./mermaid";

export function getMDXComponents(
	components?: MDXComponents,
	options: EnvMdxOptions & ThreadMdxOptions = {}
) {
	return {
		...defaultMdxComponents,
		...getEnvMdxComponents(options),
		...getThreadMdxComponents(options),
		Mermaid,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
