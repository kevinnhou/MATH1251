import { type GraphModule, STRAND_LABELS } from "@/lib/course/strands";
import { formatPageRelated, selectPageRelated } from "@/lib/graph/related";
import {
	type EnvView,
	type PageEnvContext,
	pageEnvContext,
	resolveEnv,
	resolveRecall,
} from "@/lib/math-env/env-meta";
import { COURSE, formatEnvMarkdown } from "@/lib/math-env/export-markdown";
import type { KindView } from "@/lib/math-env/kind-view";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import type { TenetIndex } from "@/lib/math-env/tenet";
import type { Corpus, ResolvedDocs } from "./corpus";
import type { SourcePage } from "./source";

type ExportCorpus = Pick<Corpus, "graph" | "tenets">;

const CARD = { provenance: "none", related: "outgoing" } as const;

export function docsMarkdown(
	resolved: ResolvedDocs,
	corpus: ExportCorpus
): string {
	return resolved.kind === "kind-view"
		? kindViewMarkdown(resolved.source, resolved.view, corpus.tenets)
		: notesMarkdown(resolved.source, corpus);
}

export function notesMarkdown(
	{ envs, module, page }: SourcePage,
	corpus: ExportCorpus
): string {
	const context = envContext(page, envs, corpus.tenets);
	const parts = documentChrome({
		module,
		title: page.data.title,
		url: page.url,
	});
	const body = envs.segments.flatMap((segment) => {
		if (segment.type === "prose") {
			return [segment.markdown.trimEnd()];
		}

		const env =
			segment.type === "recall"
				? recallEnv(segment.id, envs, context, corpus.tenets)
				: occurrenceEnv(segment.id, context);
		return env === undefined
			? []
			: [formatEnvMarkdown(env, { ...CARD, headingLevel: 3 }).trimEnd()];
	});

	if (body.length > 0) {
		parts.push("", ...joinBlocks(body));
	}

	const related = formatPageRelated(selectPageRelated(corpus.graph, page.url));
	if (related.length > 0) {
		parts.push("", "## Related", "", ...related);
	}

	return `${parts.join("\n").trim()}\n`;
}

function kindViewMarkdown(
	{ envs, module, page }: SourcePage,
	view: KindView,
	tenets: TenetIndex
): string {
	const context = envContext(page, envs, tenets);
	const parts = documentChrome({
		module,
		notes: { href: page.url, title: page.data.title },
		title: view.title,
		url: view.url,
	});
	const cards = envs.entries
		.filter((entry) => entry.kind === view.kind)
		.map((entry) =>
			formatEnvMarkdown(resolveEnv(entry.id, entry.kind, context), {
				...CARD,
				headingLevel: 2,
			}).trimEnd()
		);

	if (cards.length > 0) {
		parts.push("", ...joinBlocks(cards));
	}

	return `${parts.join("\n").trim()}\n`;
}

function envContext(
	page: SourcePage["page"],
	envs: PageEnvs,
	tenets: TenetIndex
): PageEnvContext {
	return pageEnvContext({
		envs,
		pageTitle: page.data.title,
		pageUrl: page.url,
		tenetIndex: tenets,
	});
}

function occurrenceEnv(
	id: string,
	context: PageEnvContext
): (EnvView & { id: string }) | undefined {
	const occurrence = context.entriesById.get(id);
	return occurrence && resolveEnv(occurrence.id, occurrence.kind, context);
}

function recallEnv(
	id: string,
	envs: PageEnvs,
	context: PageEnvContext,
	tenets: TenetIndex
): (EnvView & { id: string }) | undefined {
	const recall = envs.recalls.find((item) => item.id === id);
	return (
		recall &&
		resolveRecall(recall.of, recall.id, { ...context, tenetIndex: tenets })?.env
	);
}

function documentChrome(options: {
	module?: GraphModule;
	notes?: { href: string; title: string };
	title: string;
	url: string;
}): string[] {
	const course =
		options.module === undefined
			? COURSE
			: `${COURSE} · ${STRAND_LABELS[options.module]}`;
	const lines = [`# ${options.title}`, "", course, `Source: ${options.url}`];
	if (options.notes !== undefined) {
		const title = options.notes.title
			.replaceAll("[", "\\[")
			.replaceAll("]", "\\]");
		lines.push(`Notes: [${title}](${options.notes.href})`);
	}

	return lines;
}

function joinBlocks(blocks: string[]): string[] {
	const lines: string[] = [];
	for (const block of blocks) {
		if (lines.length > 0) {
			lines.push("");
		}
		lines.push(block);
	}

	return lines;
}
