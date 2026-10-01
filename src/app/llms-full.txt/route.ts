import { llmsFullText } from "@/lib/export/corpus";
import { textFileResponse } from "@/lib/site/text-response";

export const revalidate = false;

export function GET() {
	return textFileResponse(llmsFullText(), "llms-full.txt");
}
