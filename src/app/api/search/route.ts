import { createFromSource } from "fumadocs-core/search/server";
import { compileCorpus } from "@/lib/site/corpus";
import { source } from "@/lib/site/source";
import { isTerminalSearchRequest } from "@/lib/terminal/search";
import {
	projectSearchHits,
	readSearchLimit,
} from "@/lib/terminal/search-server";

const searchApi = createFromSource(source);

export async function GET(request: Request) {
	const url = new URL(request.url);
	if (!isTerminalSearchRequest(url)) {
		return searchApi.GET(request);
	}

	const query = url.searchParams.get("query") ?? "";
	if (query.length === 0) {
		return Response.json([]);
	}

	const results = await searchApi.search(query, {
		limit: readSearchLimit(url),
	});
	return Response.json(
		projectSearchHits(results, {
			catalog: compileCorpus().catalog,
			query,
		})
	);
}
