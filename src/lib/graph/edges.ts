import { type GraphEdge, graphEdgeId } from "./types";

export function pushEdge(
	edges: GraphEdge[],
	seen: Set<string>,
	edge: Omit<GraphEdge, "id">
) {
	const id = graphEdgeId(edge.kind, edge.source, edge.target);
	if (seen.has(id)) {
		return;
	}

	seen.add(id);
	edges.push({ ...edge, id });
}

export function collectReferenceEdges(
	page: {
		path: string;
		references: ReadonlyArray<{ href: string }>;
		url: string;
	},
	resolveHref: (href: string, dir: string) => string | undefined
): GraphEdge[] {
	const dir = posixDirname(page.path);
	const edges: GraphEdge[] = [];
	const seen = new Set<string>();

	for (const reference of page.references) {
		if (reference.href.length === 0 || reference.href.startsWith("#")) {
			continue;
		}

		const target = resolveHref(reference.href, dir);
		if (!target || target === page.url) {
			continue;
		}

		pushEdge(edges, seen, {
			kind: "reference",
			source: page.url,
			target,
		});
	}

	return edges;
}

function posixDirname(filePath: string): string {
	const normalized = filePath.replaceAll("\\", "/");
	const slash = normalized.lastIndexOf("/");
	return slash === -1 ? "." : normalized.slice(0, slash);
}
