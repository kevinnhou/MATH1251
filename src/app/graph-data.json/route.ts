import { compileCorpus } from "@/lib/site/corpus";

export const revalidate = false;

export function GET() {
	return Response.json(compileCorpus().graph);
}
