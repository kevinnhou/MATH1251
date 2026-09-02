export function graphEdgeInk(
	ink: string,
	options: { dimmed: boolean; emphasised: boolean }
): string {
	if (options.emphasised && !options.dimmed) {
		return ink;
	}

	if (options.dimmed) {
		return mixInk(ink, 10);
	}

	return mixInk(ink, 18);
}

export function graphEdgeWidth(
	kind: "contains" | "of" | "reference" | "see" | "recall",
	emphasised: boolean
): number {
	let base = 1;
	if (kind === "contains") {
		base = 0.6;
	} else if (kind === "of" || kind === "reference") {
		base = 1.4;
	}

	return emphasised ? Math.max(base, 2) : base;
}

export function graphEdgeDash(
	kind: "contains" | "of" | "reference" | "see" | "recall"
): number[] | null {
	if (kind === "see") {
		return [6, 4];
	}

	if (kind === "recall") {
		return [1.5, 2];
	}

	return null;
}

function mixInk(ink: string, percent: number): string {
	return `color-mix(in oklab, ${ink} ${percent}%, transparent)`;
}
