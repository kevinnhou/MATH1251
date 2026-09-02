import type { ParseResult } from "@/lib/result";

export const EXAMPLE_DIFFICULTIES = ["challenge", "exam", "routine"] as const;

export type ExampleDifficulty = (typeof EXAMPLE_DIFFICULTIES)[number];

export const MATH_ENV_STYLES = ["work", "spec", "theory", "proof"] as const;

export type MathEnvStyle = (typeof MATH_ENV_STYLES)[number];

export type GraphMaterialisation = "always" | "if-cited" | "never";

export interface MathEnvKindConfig {
	code: string;
	graph: GraphMaterialisation;
	label: string;
	plural: string;
	qed?: boolean;
	style: MathEnvStyle;
	untitled?: boolean;
	word: string;
}

export const MATH_ENV_KINDS = {
	corollary: {
		code: "CR",
		graph: "always",
		label: "Corollary",
		plural: "Corollaries",
		style: "theory",
		word: "COROLLARY",
	},
	definition: {
		code: "DF",
		graph: "always",
		label: "Definition",
		plural: "Definitions",
		style: "spec",
		word: "DEFINITION",
	},
	example: {
		code: "EG",
		graph: "if-cited",
		label: "Example",
		plural: "Examples",
		style: "work",
		word: "EXAMPLE",
	},
	lemma: {
		code: "LM",
		graph: "always",
		label: "Lemma",
		plural: "Lemmas",
		style: "theory",
		word: "LEMMA",
	},
	method: {
		code: "MT",
		graph: "always",
		label: "Method",
		plural: "Methods",
		style: "spec",
		word: "METHOD",
	},
	proof: {
		code: "PF",
		graph: "if-cited",
		label: "Proof",
		plural: "Proofs",
		qed: true,
		style: "proof",
		untitled: true,
		word: "PROOF",
	},
	proposition: {
		code: "PR",
		graph: "always",
		label: "Proposition",
		plural: "Propositions",
		style: "theory",
		word: "PROPOSITION",
	},
	theorem: {
		code: "TH",
		graph: "always",
		label: "Theorem",
		plural: "Theorems",
		style: "theory",
		word: "THEOREM",
	},
} as const satisfies Record<string, MathEnvKindConfig>;

export type MathEnvKind = keyof typeof MATH_ENV_KINDS;

export function getMathEnvConfig(kind: MathEnvKind): MathEnvKindConfig {
	return MATH_ENV_KINDS[kind];
}

export function mathEnvTag(kind: MathEnvKind): string {
	return MATH_ENV_KINDS[kind].label;
}

export function mathEnvKindFromTag(tag: string): MathEnvKind | undefined {
	for (const kind of Object.keys(MATH_ENV_KINDS) as MathEnvKind[]) {
		if (MATH_ENV_KINDS[kind].label === tag) {
			return kind;
		}
	}
}

export function graphMaterialisation(kind: MathEnvKind): GraphMaterialisation {
	return MATH_ENV_KINDS[kind].graph;
}

export function isMathEnvKind(value: string): value is MathEnvKind {
	return Object.hasOwn(MATH_ENV_KINDS, value);
}

export function getKindLabel(kind: MathEnvKind, plural = false): string {
	const config = getMathEnvConfig(kind);
	return plural ? config.plural : config.label;
}

export function getKindViewSlug(kind: MathEnvKind): string {
	return getKindLabel(kind, true).toLowerCase();
}

export function parseKindViewSlug(slug: string): MathEnvKind | undefined {
	for (const kind of Object.keys(MATH_ENV_KINDS) as MathEnvKind[]) {
		if (getKindViewSlug(kind) === slug) {
			return kind;
		}
	}
}

export function isExampleDifficulty(value: string): value is ExampleDifficulty {
	return EXAMPLE_DIFFICULTIES.some((difficulty) => difficulty === value);
}

export function parseDifficulty(value: string): ParseResult<ExampleDifficulty> {
	const difficulty = value.trim();
	if (!isExampleDifficulty(difficulty)) {
		return {
			error: `Difficulty must be one of ${EXAMPLE_DIFFICULTY_LIST}; received "${value}".`,
			ok: false,
		};
	}

	return { ok: true, value: difficulty };
}

export function isSlugRequired(kind: MathEnvKind): boolean {
	return graphMaterialisation(kind) === "always";
}

const EXAMPLE_DIFFICULTY_LIST = "challenge, exam, or routine";
