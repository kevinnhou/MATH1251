import { exportGraphJson } from "@/lib/export/corpus";

export const revalidate = false;

export function GET() {
	return Response.json(exportGraphJson());
}
