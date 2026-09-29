import { getCorpus } from "@/lib/site/corpus";
import { notesMarkdown } from "@/lib/site/export-page";
import { textFileResponse } from "@/lib/site/text-response";

export const revalidate = false;

export function GET() {
	const corpus = getCorpus();
	const pages = corpus.pages.map((page) => notesMarkdown(page, corpus));

	return textFileResponse(pages.join("\n\n"), "llms-full.txt");
}
