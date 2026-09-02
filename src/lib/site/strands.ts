export const GRAPH_MODULES = ["core", "algebra", "calculus"] as const;

export type GraphModule = (typeof GRAPH_MODULES)[number];

export const STRAND_LABELS: Record<GraphModule, string> = {
	algebra: "Algebra",
	calculus: "Calculus",
	core: "CORE",
};

export function isGraphModule(value: string): value is GraphModule {
	return GRAPH_MODULES.some((module) => module === value);
}

export function getStrand(slugs: string[]): GraphModule | undefined {
	const [strand] = slugs;
	if (strand !== undefined && isGraphModule(strand)) {
		return strand;
	}
}

export function getTitleStrand(
	slugs: string[]
): "algebra" | "calculus" | undefined {
	const strand = getStrand(slugs);
	if (strand === "algebra" || strand === "calculus") {
		return strand;
	}
}
