import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";
import { docsContentRoute } from "@/lib/site/config";
import { GRAPH_MODULES } from "@/lib/site/strands";

const docsRoutes = GRAPH_MODULES.map((module) => `/${module}` as const);
const rewriteDocs = docsRoutes.map(
	(route) =>
		rewritePath(
			`${route}{/*path}`,
			`${docsContentRoute}${route}{/*path}/content.md`
		).rewrite
);
const rewriteSuffix = docsRoutes.map(
	(route) =>
		rewritePath(
			`${route}{/*path}.md`,
			`${docsContentRoute}${route}{/*path}/content.md`
		).rewrite
);

export default function proxy(request: NextRequest) {
	for (const rewrite of rewriteSuffix) {
		const result = rewrite(request.nextUrl.pathname);
		if (result) {
			return NextResponse.rewrite(new URL(result, request.nextUrl));
		}
	}

	if (isMarkdownPreferred(request)) {
		for (const rewrite of rewriteDocs) {
			const result = rewrite(request.nextUrl.pathname);
			if (result) {
				return NextResponse.rewrite(new URL(result, request.nextUrl), {
					headers: { Vary: "Accept" },
				});
			}
		}
	}

	return NextResponse.next();
}
