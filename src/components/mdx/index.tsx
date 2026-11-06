import domainComponents from "course.components";
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
import { envKindFromTag } from "@/lib/mdx-env/kinds";

const DOMAIN_COMPONENTS: MDXComponents = Object.assign({}, ...domainComponents);

const ENV_BODIES = Object.fromEntries(
	Object.entries(DOMAIN_COMPONENTS).filter(
		([tag]) => envKindFromTag(tag) !== undefined
	)
);

const OTHER_COMPONENTS = Object.fromEntries(
	Object.entries(DOMAIN_COMPONENTS).filter(
		([tag]) => envKindFromTag(tag) === undefined
	)
);

export function getMDXComponents(
	components?: MDXComponents,
	options: EnvMdxOptions & ThreadMdxOptions = {}
) {
	return {
		...defaultMdxComponents,
		...getEnvMdxComponents({ ...options, bodies: ENV_BODIES }),
		...getThreadMdxComponents(options),
		...OTHER_COMPONENTS,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
