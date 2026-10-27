import { notFound } from "next/navigation";
import {
	exportStaticParams,
	renderPromptContext,
	resolveExportTarget,
} from "@/lib/export/server";
import { getCorpus } from "@/lib/site/corpus";

export const revalidate = false;
export const dynamicParams = false;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/llms.mdx/context/[[...slug]]">
) {
	const { slug = [] } = await params;
	const graph = getCorpus().exportGraph;
	const target = resolveExportTarget(graph, slug, "context");
	if (target === undefined) {
		notFound();
	}

	return Response.json(renderPromptContext(graph, target));
}

export function generateStaticParams() {
	return exportStaticParams(getCorpus().exportGraph, "context");
}
