import { compileCorpus } from "@/lib/site/corpus";
import { assembleNotesMarkdown } from "@/lib/site/export-page";

export const revalidate = false;

export function GET() {
	const corpus = compileCorpus();
	const pages = corpus.pages.map((page) =>
		assembleNotesMarkdown({
			envs: page.envs,
			graph: corpus.graph,
			module: page.module,
			pageTitle: page.page.data.title,
			pageUrl: page.page.url,
			tenets: corpus.tenets,
		})
	);

	return new Response(pages.join("\n\n"));
}
