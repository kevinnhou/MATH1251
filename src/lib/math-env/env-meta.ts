import type { MarkdownFragment } from "@/lib/markdown/types";
import type { ExampleDifficulty, MathEnvKind } from "./kinds";
import type { EnvOccurrence, PageEnvs } from "./page-envs";
import type { StatementView } from "./statement-html";
import {
	getTenetHref,
	type ResolvedRef,
	resolveSlugs,
	type TenetIndex,
} from "./tenet";
export interface EnvView {
	body?: string;
	citedBy: ResolvedRef[];
	difficulty?: ExampleDifficulty;
	id?: string;
	isRecall?: boolean;
	kind: MathEnvKind;
	originalHref?: string;
	pageTitle: string;
	pageUrl: string;
	relatedSee: ResolvedRef[];
	relatedUses: ResolvedRef[];
	statement?: string;
	title?: string;
}

export interface RecallView<
	Id extends string | undefined = string | undefined,
> {
	env: EnvView & { id: Id };
	statement?: StatementView;
	title: MarkdownFragment<"inline">;
}

export interface PageEnvContext {
	entriesById: ReadonlyMap<string, EnvOccurrence>;
	pageTitle: string;
	pageUrl: string;
	tenetIndex?: TenetIndex;
}

export function pageEnvContext(options: {
	envs?: PageEnvs;
	pageTitle?: string;
	pageUrl?: string;
	tenetIndex?: TenetIndex;
}): PageEnvContext {
	return {
		entriesById: new Map(
			(options.envs?.entries ?? []).map((entry) => [entry.id, entry])
		),
		pageTitle: options.pageTitle ?? "",
		pageUrl: options.pageUrl ?? "",
		tenetIndex: options.tenetIndex,
	};
}

export function resolveEnv<Id extends string | undefined>(
	id: Id,
	kind: MathEnvKind,
	context: PageEnvContext
): EnvView & { id: Id } {
	const occurrence = id === undefined ? undefined : context.entriesById.get(id);
	const index = context.tenetIndex;

	return {
		citedBy: citedByFor(occurrence?.slug, index, selfHref(context, id)),
		id,
		kind,
		pageTitle: context.pageTitle,
		pageUrl: context.pageUrl,
		relatedSee: occurrence && index ? resolveSlugs(occurrence.see, index) : [],
		relatedUses: occurrence && index ? resolveSlugs(occurrence.of, index) : [],
		...(occurrence?.body ? { body: occurrence.body } : {}),
		...(occurrence?.difficulty ? { difficulty: occurrence.difficulty } : {}),
		...(occurrence?.statement ? { statement: occurrence.statement } : {}),
		...(occurrence?.title ? { title: occurrence.title } : {}),
	};
}

export function resolveRecall<Id extends string | undefined>(
	of: string,
	id: Id,
	context: PageEnvContext & { tenetIndex: TenetIndex }
): RecallView<Id> | undefined {
	const index = context.tenetIndex;
	const tenet = index.bySlug.get(of);
	if (tenet === undefined) {
		return;
	}

	return {
		env: {
			citedBy: citedByFor(tenet.slug, index, selfHref(context, id)),
			id,
			isRecall: true,
			kind: tenet.kind,
			originalHref: getTenetHref(tenet),
			pageTitle: context.pageTitle,
			pageUrl: context.pageUrl,
			relatedSee: resolveSlugs(tenet.see, index),
			relatedUses: resolveSlugs(tenet.of, index),
			title: tenet.title.source,
			...(tenet.statementView === undefined
				? {}
				: { statement: tenet.statementView.source }),
		},
		statement: tenet.statementView,
		title: tenet.title,
	};
}

function selfHref(
	context: PageEnvContext,
	id: string | undefined
): string | undefined {
	return context.pageUrl && id ? `${context.pageUrl}#${id}` : undefined;
}

function citedByFor(
	slug: string | undefined,
	index: TenetIndex | undefined,
	self: string | undefined
): ResolvedRef[] {
	if (slug === undefined || index === undefined) {
		return [];
	}

	return (index.citedBy.get(slug) ?? []).filter((item) => item.href !== self);
}
