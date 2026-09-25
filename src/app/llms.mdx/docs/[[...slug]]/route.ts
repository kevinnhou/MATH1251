import { notFound } from "next/navigation";
import { compileCorpus, compilePageIndex } from "@/lib/site/corpus";
import { resolveDocsPage } from "@/lib/site/docs-page";
import {
	appendDocsRouteSuffix,
	getPrerenderedDocsSlugs,
} from "@/lib/site/docs-routes";
import { markdownForResolved } from "@/lib/site/export-page";
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

	const corpus = compileCorpus();
	return textFileResponse(
		markdownForResolved(resolved, corpus.graph, corpus.tenets),
		`${pageSlugs.join("-")}.md`
	);
}

export function generateStaticParams() {
	return appendDocsRouteSuffix(getPrerenderedDocsSlugs(compilePageIndex()), [
		"content.md",
	]).map((slug) => ({ slug }));
}
