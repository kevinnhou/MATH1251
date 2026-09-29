import { getCorpus } from "@/lib/site/corpus";

export const revalidate = false;

export function GET() {
	return Response.json(getCorpus().graph);
}
