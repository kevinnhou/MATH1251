import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OgImage, toOgImageProps } from "@/lib/og";
import { compileCorpus } from "@/lib/site/corpus";
import { resolveDocsPage } from "@/lib/site/docs-page";

export const revalidate = false;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/og/docs/[...slug]">
) {
	const { slug } = await params;
	if (slug.at(-1) !== "image.png") {
		notFound();
	}

	const resolved = resolveDocsPage(slug.slice(0, -1));
	if (!resolved) {
		notFound();
	}

	return new ImageResponse(
		<OgImage
			{...toOgImageProps({
				chip: resolved.kind === "kind-view" ? resolved.view.chip : undefined,
				envs: resolved.source.envs,
				page: resolved.source.page,
				viewKind:
					resolved.kind === "kind-view" ? resolved.view.kind : undefined,
			})}
		/>,
		{
			height: 630,
			width: 1200,
		}
	);
}

export function generateStaticParams() {
	const corpus = compileCorpus();

	return [
		...corpus.pages.map(({ page }) => ({
			lang: page.locale,
			slug: [...page.slugs, "image.png"],
		})),
		...corpus.kindViews.map((view) => ({
			lang: view.locale,
			slug: [...view.pageSlugs, view.slug, "image.png"],
		})),
	];
}
