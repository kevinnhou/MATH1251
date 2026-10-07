export const STRANDS = ["core", "algebra", "calculus"] as const;

export type Strand = (typeof STRANDS)[number];

export const STRAND_LABELS: Record<Strand, string> = {
	algebra: "Algebra",
	calculus: "Calculus",
	core: "CORE",
};

export function isStrand(value: string): value is Strand {
	return STRANDS.some((module) => module === value);
}

export function getStrand(slugs: string[]): Strand | undefined {
	const [strand] = slugs;
	if (strand !== undefined && isStrand(strand)) {
		return strand;
	}
}
