import { notFound } from "next/navigation";
import { urlFromSlugs } from "@/lib/site/build-corpus";
import { compileCorpus } from "@/lib/site/corpus";
import { markdownForResolved } from "@/lib/site/export-page";
import { getKindViewMarkdownUrl, getPageMarkdownUrl } from "@/lib/site/source";

export const revalidate = false;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/llms.mdx/docs/[[...slug]]">
) {
	const { slug } = await params;
	if (slug?.at(-1) !== "content.md") {
		notFound();
	}

	const corpus = compileCorpus();
	const resolved = corpus.byUrl.get(urlFromSlugs(slug.slice(0, -1)));
	if (!resolved) {
		notFound();
	}

	return new Response(
		markdownForResolved(resolved, corpus.graph, corpus.tenets),
		{
			headers: {
				"Content-Type": "text/markdown",
			},
		}
	);
}

export function generateStaticParams() {
	const corpus = compileCorpus();

	return [
		...corpus.pages.map(({ page }) => ({
			lang: page.locale,
			slug: getPageMarkdownUrl(page).segments,
		})),
		...corpus.kindViews.map((view) => ({
			lang: view.locale,
			slug: getKindViewMarkdownUrl(view).segments,
		})),
	];
}
