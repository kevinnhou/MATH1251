import { llms } from "fumadocs-core/source";
import { source } from "@/lib/site/source";
import { textFileResponse } from "@/lib/site/text-response";

export const revalidate = false;

export function GET() {
	return textFileResponse(llms(source).index(), "llms.txt");
}
