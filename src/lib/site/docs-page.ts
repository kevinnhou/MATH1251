import type { Metadata } from "next";
import type { GraphModule } from "@/lib/course/strands";
import { markdownToPlain } from "@/lib/markdown/plain";
import { MATH_ENV_KINDS, type MathEnvKind } from "@/lib/math-env/kinds";
import { siteName } from "./config";
import type { ResolvedDocs } from "./corpus";
import { getPageImageUrl, type SourcePage } from "./source";

const MATH_ENV_KIND_ORDER = Object.keys(MATH_ENV_KINDS) as MathEnvKind[];

export interface DocsImageText {
	chip?: string;
	description?: string;
	ideas: string[];
	kinds: readonly MathEnvKind[];
	title: string;
}

export interface DocsPageModel {
	image: DocsImageText;
	metadata: Metadata;
}

export function describeDocsPage(resolved: ResolvedDocs): DocsPageModel {
	const { module, page } = resolved.source;
	const description = resolved.description
		? markdownToPlain(resolved.description)
		: undefined;

	if (resolved.kind === "notes") {
		return {
			image: imageText(page, {
				chip: module?.toUpperCase(),
				ideas: page.data.ideas.filter(Boolean),
				kinds: MATH_ENV_KIND_ORDER,
			}),
			metadata: {
				description,
				openGraph: { images: getPageImageUrl(page).url },
				title: `${titlePrefix(module)} ${markdownToPlain(page.data.title)}`,
			},
		};
	}

	const { view } = resolved;
	return {
		image: imageText(page, { chip: view.chip, ideas: [], kinds: [view.kind] }),
		metadata: {
			alternates: { canonical: page.url },
			description,
			openGraph: { images: getPageImageUrl(page, view.kind).url },
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

function titlePrefix(module: GraphModule | undefined): string {
	return module === undefined || module === "core"
		? siteName
		: `[${module.toUpperCase()}]`;
}
