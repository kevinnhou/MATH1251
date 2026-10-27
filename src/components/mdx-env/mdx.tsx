import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
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
import { ENV_KINDS, type EnvKind, getKindLabel } from "@/lib/mdx-env/kinds";
import type { PageEnvs } from "@/lib/mdx-env/page-envs";
import type { TenetIndex } from "@/lib/mdx-env/tenet";
import { Env } from "./env";
import { Recall } from "./recall";
import { Statement } from "./statement";

export type EnvMdxOptions = KindViewRenderOptions & {
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
		components[getKindLabel(kind)] = (props: {
			children?: ReactNode;
			id?: string;
		}) => (
			<Env
				env={resolveEnv(props.id, kind, context)}
				markHref={kindViewHref(kind)}
				markLinkLabel={kindViewLinkLabel(kind)}
			>
				{props.children}
			</Env>
		);
	}

	return components;
}

function kindViewLinkLabel(kind: EnvKind): string {
	return `View all ${getKindLabel(kind, true).toLowerCase()} on this page`;
}
