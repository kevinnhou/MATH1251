import { llms } from "fumadocs-core/source";
import { source } from "@/lib/site/source";

export const revalidate = false;

export function GET() {
	return new Response(llms(source).index());
}
