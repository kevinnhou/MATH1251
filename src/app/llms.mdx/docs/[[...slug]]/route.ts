import { notFound } from "next/navigation";
import {
	docsStaticParams,
	getCorpus,
	resolveDocsPage,
} from "@/lib/site/corpus";
import { docsMarkdown } from "@/lib/site/export-page";
import { textFileResponse } from "@/lib/site/text-response";

export const revalidate = false;
export const dynamicParams = true;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/llms.mdx/docs/[[...slug]]">
) {
	const { slug } = await params;
	if (slug?.at(-1) !== "content.md") {
		notFound();
	}

	const pageSlugs = slug.slice(0, -1);
	const resolved = resolveDocsPage(pageSlugs);
	if (!resolved) {
		notFound();
	}

	return textFileResponse(
		docsMarkdown(resolved, getCorpus()),
		`${pageSlugs.join("-")}.md`
	);
}

export function generateStaticParams() {
	return docsStaticParams("content.md");
}
