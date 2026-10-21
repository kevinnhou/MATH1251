import type { Metadata } from "next";
import type { SourcePage } from "@/lib/compile/source";
import { course } from "@/lib/course/config";
import { STRAND_LABELS, type Strand } from "@/lib/course/strands";
import { markdownToPlain } from "@/lib/markdown/plain";
import { ENV_KINDS, type EnvKind, getKindViewSlug } from "@/lib/mdx-env/kinds";
import type { ResolvedDocs } from "./corpus";

const docsImageRoute = "/og/docs";

export interface DocsImageText {
	chip?: string;
	description?: string;
	ideas: string[];
	kinds: readonly EnvKind[];
	title: string;
}

export interface DocsPageModel {
	image: DocsImageText;
	metadata: Metadata;
}

export function describeDocsPage(resolved: ResolvedDocs): DocsPageModel {
	const { page, strand } = resolved.source;
	const description = resolved.description
		? markdownToPlain(resolved.description)
		: undefined;

	if (resolved.kind === "notes") {
		return {
			image: imageText(page, {
				chip: strand && strandTag(strand),
				ideas: page.data.ideas.filter(Boolean),
				kinds: ENV_KINDS,
			}),
			metadata: {
				description,
				openGraph: { images: pageImageUrl(page) },
				title: `${titlePrefix(strand)} ${markdownToPlain(page.data.title)}`,
			},
		};
	}

	const { view } = resolved;
	return {
		image: imageText(page, { chip: view.chip, ideas: [], kinds: [view.kind] }),
		metadata: {
			alternates: { canonical: page.url },
			description,
			openGraph: { images: pageImageUrl(page, view.kind) },
			robots: { follow: true, index: false },
			title: markdownToPlain(view.tabTitle),
		},
	};
}

function imageText(
	page: SourcePage["page"],
	view: Pick<DocsImageText, "chip" | "ideas" | "kinds">
): DocsImageText {
	const title = markdownToPlain(page.data.title).trim();
	const description = page.data.description
		? markdownToPlain(page.data.description).trim()
		: undefined;

	return {
		...view,
		description:
			description && description.toLowerCase() !== title.toLowerCase()
				? description
				: undefined,
		title,
	};
}

function titlePrefix(strand: Strand | undefined): string {
	return strand === undefined || strand === course.home
		? course.name
		: `[${strandTag(strand)}]`;
}

function strandTag(strand: Strand): string {
	return STRAND_LABELS[strand].toUpperCase();
}

function pageImageUrl(page: SourcePage["page"], viewKind?: EnvKind): string {
	const view = viewKind === undefined ? [] : [getKindViewSlug(viewKind)];
	const segments = [
		page.locale,
		...docsImageRoute.split("/"),
		...page.slugs,
		...view,
		"image.png",
	];

	return `/${segments.filter(Boolean).join("/")}`;
}
