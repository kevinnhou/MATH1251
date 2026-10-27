import { notFound } from "next/navigation";
import {
	exportStaticParams,
	renderMarkdown,
	resolveExportTarget,
} from "@/lib/export/server";
import { nodeFileName } from "@/lib/export/urls";
import { getCorpus } from "@/lib/site/corpus";
import { textFileResponse } from "@/lib/site/text-response";

export const revalidate = false;
export const dynamicParams = false;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/llms.mdx/docs/[[...slug]]">
) {
	const { slug = [] } = await params;
	const graph = getCorpus().exportGraph;
	const target = resolveExportTarget(graph, slug, "markdown");
	if (target === undefined) {
		notFound();
	}

	return textFileResponse(
		renderMarkdown(graph, target),
		nodeFileName(target.id, "markdown")
	);
}

export function generateStaticParams() {
	return exportStaticParams(getCorpus().exportGraph, "markdown");
}
