import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import {
	indexPageEnvs,
	resolveEnv,
	resolveRecall,
} from "@/lib/math-env/env-meta";
import {
	getKindViewUrl,
	type KindViewRenderOptions,
} from "@/lib/math-env/kind-view";
import {
	getKindLabel,
	MATH_ENV_KINDS,
	type MathEnvKind,
	mathEnvTag,
} from "@/lib/math-env/kinds";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import type { TenetIndex } from "@/lib/math-env/tenet";
import { Env } from "./env";
import { Recall } from "./recall";
import { Statement } from "./statement";

export type MathEnvMdxOptions = KindViewRenderOptions & {
	pageEnvs?: PageEnvs;
	pageTitle?: string;
	tenetIndex?: TenetIndex;
};

export function getMathEnvMdxComponents(
	options: MathEnvMdxOptions = {}
): MDXComponents {
	const { entriesById } = indexPageEnvs(options.pageEnvs);
	const metaOptions = {
		entriesById,
		pageTitle: options.pageTitle,
		pageUrl: options.pageUrl,
		tenetIndex: options.tenetIndex,
	};
	const kindViewHref = (kind: MathEnvKind) =>
		options.viewKind === undefined && options.pageUrl
			? getKindViewUrl(options.pageUrl, kind)
			: undefined;

	const components: MDXComponents = {
		KindFilter: ({
			children,
			kind,
		}: {
			children?: ReactNode;
			kind: MathEnvKind;
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

			const index = options.tenetIndex;
			if (index === undefined) {
				return null;
			}

			const resolved = resolveRecall(of, {
				id,
				pageUrl: options.pageUrl,
				tenetIndex: index,
			});
			if (resolved === undefined) {
				return null;
			}

			return (
				<Recall
					citedBy={resolved.citedBy}
					id={id}
					kind={resolved.kind}
					moreHref={options.pageUrl}
					pageTitle={options.pageTitle}
					relatedSee={resolved.relatedSee}
					relatedUses={resolved.relatedUses}
					statement={resolved.statement}
					tenetHref={resolved.originalHref}
					title={resolved.title}
				/>
			);
		},
		Statement,
	};

	for (const kind of Object.keys(MATH_ENV_KINDS) as MathEnvKind[]) {
		components[mathEnvTag(kind)] = (props: {
			children?: ReactNode;
			id?: string;
		}) => (
			<Env
				{...resolveEnv(props.id, kind, metaOptions)}
				markHref={kindViewHref(kind)}
				markLinkLabel={kindViewLinkLabel(kind)}
			>
				{props.children}
			</Env>
		);
	}

	return components;
}

function kindViewLinkLabel(kind: MathEnvKind): string {
	return `View all ${getKindLabel(kind, true).toLowerCase()} on this page`;
}
