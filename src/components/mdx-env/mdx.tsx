import type { MDXComponents } from "mdx/types";
import type { ComponentType, ReactNode } from "react";
import {
	type PromptTargetLookup,
	pageEnvContext,
	resolveEnv,
	resolveRecall,
} from "@/lib/mdx-env/env-meta";
import {
	getKindViewUrl,
	type KindViewRenderOptions,
} from "@/lib/mdx-env/kind-view";
import {
	ENV_KINDS,
	type EnvKind,
	getEnvConfig,
	getKindLabel,
} from "@/lib/mdx-env/kinds";
import type { PageEnvs } from "@/lib/mdx-env/page-envs";
import type { TenetIndex } from "@/lib/mdx-env/tenet";
import { Env } from "./env";
import { Recall } from "./recall";
import { Statement } from "./statement";

type EnvBody = ComponentType<{ children?: ReactNode }>;

export type EnvMdxOptions = KindViewRenderOptions & {
	bodies?: MDXComponents;
	pageEnvs?: PageEnvs;
	pageTitle?: string;
	promptTarget?: PromptTargetLookup;
	tenetIndex?: TenetIndex;
};

export function getEnvMdxComponents(
	options: EnvMdxOptions = {}
): MDXComponents {
	const context = pageEnvContext({
		envs: options.pageEnvs,
		pageTitle: options.pageTitle,
		pageUrl: options.pageUrl,
		promptTarget: options.promptTarget,
		tenetIndex: options.tenetIndex,
	});
	const kindViewHref = (kind: EnvKind) =>
		options.viewKind === undefined && options.pageUrl
			? getKindViewUrl(options.pageUrl, kind)
			: undefined;

	const components: MDXComponents = {
		KindFilter: ({
			children,
			kind,
		}: {
			children?: ReactNode;
			kind: EnvKind;
		}) =>
			options.viewKind === undefined || options.viewKind === kind
				? children
				: null,
		Prose: ({ children }: { children?: ReactNode }) =>
			options.viewKind === undefined ? children : null,
		Recall: ({ of, id }: { id?: string; of: string }) => {
			if (options.viewKind !== undefined) {
				return null;
			}

			const { tenetIndex } = context;
			if (tenetIndex === undefined) {
				return null;
			}

			const recall = resolveRecall(of, id, { ...context, tenetIndex });
			return recall ? <Recall recall={recall} /> : null;
		},
		Statement,
	};

	for (const kind of ENV_KINDS) {
		const { tag } = getEnvConfig(kind);
		const Body = options.bodies?.[tag] as EnvBody | undefined;
		components[tag] = (props: { children?: ReactNode; id?: string }) => (
			<Env
				env={resolveEnv(props.id, kind, context)}
				markHref={kindViewHref(kind)}
				markLinkLabel={kindViewLinkLabel(kind)}
			>
				{Body === undefined ? props.children : <Body>{props.children}</Body>}
			</Env>
		);
	}

	return components;
}

function kindViewLinkLabel(kind: EnvKind): string {
	return `View all ${getKindLabel(kind, true).toLowerCase()} on this page`;
}
