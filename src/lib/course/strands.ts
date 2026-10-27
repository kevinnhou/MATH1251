import { course } from "./config";
import type { StrandConfig } from "./types";

export type Strand = (typeof course.strands)[number]["id"];

export const STRANDS: readonly Strand[] = course.strands.map(({ id }) => id);

function byStrand<K extends keyof StrandConfig>(field: K) {
	return Object.fromEntries(
		course.strands.map((strand) => [strand.id, strand[field]])
	) as Record<Strand, StrandConfig[K]>;
}

export const STRAND_LABELS = byStrand("label");

export const STRAND_ACCENTS = byStrand("accent");

export function isStrand(value: string): value is Strand {
	return STRANDS.some((strand) => strand === value);
}

export function assertStrands(folders: readonly string[]): void {
	const expected = STRANDS.join(", ");
	const actual = folders.join(", ");
	if (actual !== expected) {
		throw new Error(
			`course.config strands [${expected}] do not match the top-level content folders [${actual}]; keep content/docs/meta.json and course.config.ts in the same order.`
		);
	}
}

export function getStrand(slugs: string[]): Strand | undefined {
	const [strand] = slugs;
	if (strand !== undefined && isStrand(strand)) {
		return strand;
	}
}
