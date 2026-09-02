import { toAbsoluteUrl } from "@/lib/site/url";
import {
	type ExampleDifficulty,
	getKindLabel,
	type MathEnvKind,
} from "./kinds";
import type { ResolvedRef } from "./tenet";

export { toAbsoluteUrl } from "@/lib/site/url";

export const COURSE = "MATH1251 Mathematics 1B (UNSW Sydney)";

export type EnvHeadingLevel = 1 | 2 | 3;
export type EnvProvenance = "excerpt" | "none";
export type EnvRelatedMode = "full" | "outgoing" | "none";

export interface EnvMarkdownOptions {
	headingLevel?: EnvHeadingLevel;
	maxCitedBy?: number;
	provenance?: EnvProvenance;
	related?: EnvRelatedMode;
}

export interface EnvExportInput {
	body?: string;
	citedBy?: ResolvedRef[];
	difficulty?: ExampleDifficulty;
	id: string;
	isRecall?: boolean;
	kind: MathEnvKind;
	origin: string;
	originalHref?: string;
	pageTitle: string;
	pageUrl: string;
	relatedSee?: ResolvedRef[];
	relatedUses?: ResolvedRef[];
	statement?: string;
	title?: string;
}

export type EnvRelatedInput = Pick<
	EnvExportInput,
	| "citedBy"
	| "isRecall"
	| "kind"
	| "origin"
	| "originalHref"
	| "relatedSee"
	| "relatedUses"
>;

export interface RelatedLink {
	href: string;
	kind?: string;
	label: string;
	title: string;
}

const DEFAULT_OPTIONS = {
	headingLevel: 1,
	provenance: "excerpt",
	related: "full",
} as const satisfies Required<
	Pick<EnvMarkdownOptions, "headingLevel" | "provenance" | "related">
>;

export function formatEnvMarkdown(
	input: EnvExportInput,
	options: EnvMarkdownOptions = {}
): string {
	const headingLevel = options.headingLevel ?? DEFAULT_OPTIONS.headingLevel;
	const provenance = options.provenance ?? DEFAULT_OPTIONS.provenance;
	const relatedMode = options.related ?? DEFAULT_OPTIONS.related;
	const sectionLevel = (headingLevel + 1) as 2 | 3 | 4;
	const lines = [formatHeading(input, headingLevel)];

	if (provenance === "excerpt") {
		const source = toAbsoluteUrl(`${input.pageUrl}#${input.id}`, input.origin);
		lines.push(
			"",
			`Excerpt from ${COURSE}: ${input.pageTitle}.`,
			`Source: ${source}`
		);
	}

	if (input.difficulty !== undefined) {
		if (lines.at(-1) !== "") {
			lines.push("");
		}
		lines.push(`Difficulty: ${input.difficulty}.`);
	}

	if (input.statement !== undefined) {
		lines.push(
			"",
			`${hashes(sectionLevel)} Statement`,
			"",
			input.statement.trimEnd()
		);
	}

	if (input.body !== undefined) {
		const bodyHeading = bodySectionHeading(input, sectionLevel);
		lines.push("");
		if (bodyHeading !== undefined) {
			lines.push(bodyHeading, "");
		}
		lines.push(input.body.trimEnd());
	}

	const related = formatEnvRelated(input, relatedMode, options.maxCitedBy);
	if (related.length > 0) {
		lines.push("", `${hashes(sectionLevel)} Related`, "", ...related);
	}

	return `${lines.join("\n").trim()}\n`;
}

export function formatEnvRelated(
	input: EnvRelatedInput,
	mode: EnvRelatedMode = "full",
	maxCitedBy?: number
): string[] {
	if (mode === "none") {
		return [];
	}

	const items: string[] = [];
	const seen = new Set<string>();
	const usesLabel = input.kind === "proof" ? "Proves" : "Uses";

	if (input.isRecall && input.originalHref !== undefined) {
		const href = toAbsoluteUrl(input.originalHref, input.origin);
		seen.add(href);
		items.push(
			formatRefLink({
				href,
				label: "Original",
				title: "Original material",
			})
		);
	}

	for (const ref of input.relatedUses ?? []) {
		addRelatedRef(items, seen, usesLabel, ref, input.origin);
	}

	for (const ref of input.relatedSee ?? []) {
		addRelatedRef(items, seen, "See also", ref, input.origin);
	}

	if (mode !== "full") {
		return items;
	}

	const citedBy = input.citedBy ?? [];
	const citedByRefs =
		maxCitedBy === undefined ? citedBy : citedBy.slice(0, maxCitedBy);
	for (const ref of citedByRefs) {
		addRelatedRef(items, seen, "Cited by", ref, input.origin);
	}

	if (maxCitedBy !== undefined && citedBy.length > maxCitedBy) {
		items.push("- Additional cited-by links omitted for brevity.");
	}

	return items;
}

export function formatRefLink(link: RelatedLink & { origin?: string }): string {
	const href =
		link.origin === undefined
			? link.href
			: toAbsoluteUrl(link.href, link.origin);
	const title = link.title.replaceAll("[", "\\[").replaceAll("]", "\\]");
	if (link.kind === undefined) {
		return `- ${link.label}: [${title}](${href})`;
	}

	return `- ${link.label} (${link.kind}): [${title}](${href})`;
}

function formatHeading(input: EnvExportInput, level: EnvHeadingLevel): string {
	const prefix = hashes(level);
	if (input.isRecall) {
		return input.title === undefined
			? `${prefix} Recall`
			: `${prefix} Recall: ${input.title}`;
	}

	if (input.kind === "proof") {
		const target = input.relatedUses?.[0]?.title.source;
		return target === undefined
			? `${prefix} Proof`
			: `${prefix} Proof of ${target}`;
	}

	const label = getKindLabel(input.kind);
	return input.title === undefined
		? `${prefix} ${label}`
		: `${prefix} ${label}. ${input.title}`;
}

function bodySectionHeading(
	input: EnvExportInput,
	sectionLevel: 2 | 3 | 4
): string | undefined {
	if (input.kind === "proof") {
		return `${hashes(sectionLevel)} Proof`;
	}

	if (input.statement === undefined) {
		return;
	}

	return `${hashes(sectionLevel)} Notes`;
}

function addRelatedRef(
	items: string[],
	seen: Set<string>,
	label: string,
	ref: ResolvedRef,
	origin: string
) {
	const href = toAbsoluteUrl(ref.href, origin);
	if (seen.has(href)) {
		return;
	}

	seen.add(href);
	const kind = ref.kind === "recall" ? "Recall" : getKindLabel(ref.kind);
	items.push(
		formatRefLink({
			href,
			kind,
			label,
			title: ref.title.source,
		})
	);
}

function hashes(level: number): string {
	return "#".repeat(level);
}
