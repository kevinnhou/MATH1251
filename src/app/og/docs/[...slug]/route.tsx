import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OgImage, toOgImageProps } from "@/lib/og";
import { docsStaticParams, resolveDocsPage } from "@/lib/site/corpus";

export const revalidate = false;
export const dynamicParams = true;

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

	return new ImageResponse(<OgImage {...toOgImageProps(resolved)} />, {
		height: 630,
		width: 1200,
	});
}

export function generateStaticParams() {
	return docsStaticParams("image.png");
}
