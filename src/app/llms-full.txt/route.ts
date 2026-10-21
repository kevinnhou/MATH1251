import { llmsFullText } from "@/lib/export/server";
import { getCorpus } from "@/lib/site/corpus";
import { textFileResponse } from "@/lib/site/text-response";

export const revalidate = false;

export function GET() {
	return textFileResponse(
		llmsFullText(getCorpus().exportGraph),
		"llms-full.txt"
	);
}
