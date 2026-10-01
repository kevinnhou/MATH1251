import { notFound } from "next/navigation";
import {
	exportStaticParams,
	renderPromptContext,
	resolveExportTarget,
} from "@/lib/export/corpus";

export const revalidate = false;
export const dynamicParams = false;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/llms.mdx/context/[[...slug]]">
) {
	const { slug = [] } = await params;
	const target = resolveExportTarget(slug, "context");
	if (target === undefined) {
		notFound();
	}

	return Response.json(renderPromptContext(target));
}

export function generateStaticParams() {
	return exportStaticParams("context");
}
