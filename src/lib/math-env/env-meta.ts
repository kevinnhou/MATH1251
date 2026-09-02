import type { MarkdownFragment } from "@/lib/markdown/types";
import type { ExampleDifficulty, MathEnvKind } from "./kinds";
import type { EnvOccurrence, PageEnvs } from "./page-envs";
import { compileStatement, type StatementView } from "./statement-html";
import {
	getTenetHref,
	type ResolvedRef,
	resolveSlugs,
	type TenetIndex,
} from "./tenet";

export interface ResolvedEnv {
	body?: string;
	citedBy?: ResolvedRef[];
	difficulty?: ExampleDifficulty;
	exportTitle?: string;
	id?: string;
	kind: MathEnvKind;
	moreHref?: string;
	pageTitle?: string;
	relatedSee?: ResolvedRef[];
	relatedUses?: ResolvedRef[];
	statement?: MarkdownFragment<"block">;
}

export interface EnvMetaOptions {
	entriesById: Map<string, EnvOccurrence>;
	pageTitle?: string;
	pageUrl?: string;
	tenetIndex?: TenetIndex;
}

export function indexPageEnvs(pageEnvs: PageEnvs | undefined): {
	entriesById: Map<string, EnvOccurrence>;
} {
	return {
		entriesById: new Map(
			(pageEnvs?.entries ?? []).map((entry) => [entry.id, entry])
		),
	};
}

export function resolveEnv(
	id: string | undefined,
	kind: MathEnvKind,
	options: EnvMetaOptions
): ResolvedEnv {
	const occurrence = id === undefined ? undefined : options.entriesById.get(id);
	const index = options.tenetIndex;
	const selfHref =
		options.pageUrl && id ? `${options.pageUrl}#${id}` : undefined;
	const tenet =
		occurrence?.slug === undefined || index === undefined
			? undefined
			: index.bySlug.get(occurrence.slug);

	return {
		id,
		kind,
		moreHref: options.pageUrl,
		pageTitle: options.pageTitle,
		...(occurrence?.body ? { body: occurrence.body } : {}),
		...(occurrence?.difficulty ? { difficulty: occurrence.difficulty } : {}),
		...(occurrence?.title ? { exportTitle: occurrence.title } : {}),
		...resolvedStatement(tenet?.statementView, occurrence?.statement),
		citedBy: citedByFor(occurrence?.slug, index, selfHref),
		relatedSee: occurrence && index ? resolveSlugs(occurrence.see, index) : [],
		relatedUses: occurrence && index ? resolveSlugs(occurrence.of, index) : [],
	};
}

export interface ResolvedRecall {
	citedBy: ResolvedRef[];
	kind: MathEnvKind;
	originalHref: string;
	relatedSee: ResolvedRef[];
	relatedUses: ResolvedRef[];
	statement?: StatementView;
	title: MarkdownFragment<"inline">;
}

export function resolveRecall(
	of: string,
	options: {
		id?: string;
		pageUrl?: string;
		tenetIndex: TenetIndex;
	}
): ResolvedRecall | undefined {
	const tenet = options.tenetIndex.bySlug.get(of);
	if (tenet === undefined) {
		return;
	}

	const selfHref =
		options.pageUrl !== undefined && options.id !== undefined
			? `${options.pageUrl}#${options.id}`
			: undefined;

	return {
		citedBy: citedByFor(tenet.slug, options.tenetIndex, selfHref),
		kind: tenet.kind,
		originalHref: getTenetHref(tenet),
		relatedSee: resolveSlugs(tenet.see, options.tenetIndex),
		relatedUses: resolveSlugs(tenet.of, options.tenetIndex),
		title: tenet.title,
		...(tenet.statementView === undefined
			? {}
			: { statement: tenet.statementView }),
	};
}

export function citedByFor(
	slug: string | undefined,
	index: TenetIndex | undefined,
	selfHref: string | undefined
): ResolvedRef[] {
	if (slug === undefined || index === undefined) {
		return [];
	}

	return (index.citedBy.get(slug) ?? []).filter(
		(item) => item.href !== selfHref
	);
}

function resolvedStatement(
	compiled: StatementView | undefined,
	markdown: string | undefined
): { statement?: StatementView } {
	if (compiled !== undefined) {
		return { statement: compiled };
	}

	if (markdown !== undefined) {
		return { statement: compileStatement(markdown) };
	}

	return {};
}
