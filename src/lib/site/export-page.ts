import { formatPageRelated, selectPageRelated } from "@/lib/graph/related";
import type { GraphDocument } from "@/lib/graph/types";
import {
	COURSE,
	type EnvExportInput,
	formatEnvMarkdown,
	type MathEnvKind,
	type PageEnvs,
	type TenetIndex,
} from "@/lib/math-env";
import {
	indexPageEnvs,
	resolveEnv,
	resolveRecall,
} from "@/lib/math-env/env-meta";
import type { ResolvedDocs } from "./build-corpus";
import { type GraphModule, STRAND_LABELS } from "./strands";

export interface NotesExportInput {
	envs: PageEnvs;
	graph: GraphDocument;
	module?: GraphModule;
	pageTitle: string;
	pageUrl: string;
	tenets: TenetIndex;
}

export interface KindViewExportInput {
	envs: PageEnvs;
	kind: MathEnvKind;
	module?: GraphModule;
	parentTitle: string;
	parentUrl: string;
	tenets: TenetIndex;
	viewTitle: string;
	viewUrl: string;
}

export function markdownForResolved(
	resolved: ResolvedDocs,
	graph: GraphDocument,
	tenets: TenetIndex
): string {
	const { envs, module, page } = resolved.source;
	if (resolved.kind === "kind-view") {
		return assembleKindViewMarkdown({
			envs,
			kind: resolved.view.kind,
			module,
			parentTitle: page.data.title,
			parentUrl: page.url,
			tenets,
			viewTitle: resolved.view.title,
			viewUrl: resolved.view.url,
		});
	}

	return assembleNotesMarkdown({
		envs,
		graph,
		module,
		pageTitle: page.data.title,
		pageUrl: page.url,
		tenets,
	});
}

export function assembleNotesMarkdown(input: NotesExportInput): string {
	const { entriesById } = indexPageEnvs(input.envs);
	const meta = {
		entriesById,
		pageTitle: input.pageTitle,
		pageUrl: input.pageUrl,
		tenetIndex: input.tenets,
	};
	const parts = [
		...documentChrome({
			module: input.module,
			title: input.pageTitle,
			url: input.pageUrl,
		}),
	];
	const body: string[] = [];

	for (const segment of input.envs.segments) {
		if (segment.type === "prose") {
			body.push(segment.markdown.trimEnd());
			continue;
		}

		if (segment.type === "recall") {
			const card = formatRecallCard(segment.id, input);
			if (card !== undefined) {
				body.push(card.trimEnd());
			}
			continue;
		}

		const occurrence = entriesById.get(segment.id);
		if (occurrence === undefined) {
			continue;
		}

		body.push(
			formatEnvMarkdown(toEnvInput(occurrence.kind, occurrence.id, meta), {
				headingLevel: 3,
				provenance: "none",
				related: "outgoing",
			}).trimEnd()
		);
	}

	if (body.length > 0) {
		parts.push("", ...joinBlocks(body));
	}

	const related = formatPageRelated(
		selectPageRelated(input.graph, input.pageUrl)
	);
	if (related.length > 0) {
		parts.push("", "## Related", "", ...related);
	}

	return `${parts.join("\n").trim()}\n`;
}

export function assembleKindViewMarkdown(input: KindViewExportInput): string {
	const { entriesById } = indexPageEnvs(input.envs);
	const meta = {
		entriesById,
		pageTitle: input.parentTitle,
		pageUrl: input.parentUrl,
		tenetIndex: input.tenets,
	};
	const parts = [
		...documentChrome({
			module: input.module,
			notes: { href: input.parentUrl, title: input.parentTitle },
			title: input.viewTitle,
			url: input.viewUrl,
		}),
	];
	const cards: string[] = [];

	for (const entry of input.envs.entries) {
		if (entry.kind !== input.kind) {
			continue;
		}

		cards.push(
			formatEnvMarkdown(toEnvInput(entry.kind, entry.id, meta), {
				headingLevel: 2,
				provenance: "none",
				related: "outgoing",
			}).trimEnd()
		);
	}

	if (cards.length > 0) {
		parts.push("", ...joinBlocks(cards));
	}

	return `${parts.join("\n").trim()}\n`;
}

function formatRecallCard(
	id: string,
	input: NotesExportInput
): string | undefined {
	const recall = input.envs.recalls.find((item) => item.id === id);
	if (recall === undefined) {
		return;
	}

	const resolved = resolveRecall(recall.of, {
		id: recall.id,
		pageUrl: input.pageUrl,
		tenetIndex: input.tenets,
	});
	if (resolved === undefined) {
		return;
	}

	const envInput: EnvExportInput = {
		citedBy: resolved.citedBy,
		id: recall.id,
		isRecall: true,
		kind: resolved.kind,
		origin: "",
		originalHref: resolved.originalHref,
		pageTitle: input.pageTitle,
		pageUrl: input.pageUrl,
		relatedSee: resolved.relatedSee,
		relatedUses: resolved.relatedUses,
		...(resolved.statement === undefined
			? {}
			: { statement: resolved.statement.source }),
		title: resolved.title.source,
	};

	return formatEnvMarkdown(envInput, {
		headingLevel: 3,
		provenance: "none",
		related: "outgoing",
	});
}

function toEnvInput(
	kind: MathEnvKind,
	id: string,
	meta: {
		entriesById: ReturnType<typeof indexPageEnvs>["entriesById"];
		pageTitle: string;
		pageUrl: string;
		tenetIndex: TenetIndex;
	}
): EnvExportInput {
	const resolved = resolveEnv(id, kind, meta);
	return {
		citedBy: resolved.citedBy,
		id,
		kind,
		origin: "",
		pageTitle: meta.pageTitle,
		pageUrl: meta.pageUrl,
		relatedSee: resolved.relatedSee,
		relatedUses: resolved.relatedUses,
		...(resolved.body === undefined ? {} : { body: resolved.body }),
		...(resolved.difficulty === undefined
			? {}
			: { difficulty: resolved.difficulty }),
		...(resolved.statement === undefined
			? {}
			: { statement: resolved.statement.source }),
		...(resolved.exportTitle === undefined
			? {}
			: { title: resolved.exportTitle }),
	};
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
