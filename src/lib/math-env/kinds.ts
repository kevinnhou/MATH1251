import type { ParseResult } from "@/lib/result";

export const EXAMPLE_DIFFICULTIES = ["challenge", "exam", "routine"] as const;

export type ExampleDifficulty = (typeof EXAMPLE_DIFFICULTIES)[number];

export const MATH_ENV_STYLES = ["work", "spec", "theory", "proof"] as const;

export type MathEnvStyle = (typeof MATH_ENV_STYLES)[number];

export const ENV_RELATIONS = ["uses", "proves", "practises"] as const;

export type EnvRelation = (typeof ENV_RELATIONS)[number];

interface MathEnvKindConfig {
	code: string;
	label: string;
	of: EnvRelation;
	optionalSlug?: boolean;
	plural: string;
	qed?: boolean;
	style: MathEnvStyle;
	untitled?: boolean;
	word: string;
}

export const MATH_ENV_KINDS = {
	corollary: {
		code: "CR",
		label: "Corollary",
		of: "uses",
		plural: "Corollaries",
		style: "theory",
		word: "COROLLARY",
	},
	definition: {
		code: "DF",
		label: "Definition",
		of: "uses",
		plural: "Definitions",
		style: "spec",
		word: "DEFINITION",
	},
	example: {
		code: "EG",
		label: "Example",
		of: "practises",
		optionalSlug: true,
		plural: "Examples",
		style: "work",
		word: "EXAMPLE",
	},
	lemma: {
		code: "LM",
		label: "Lemma",
		of: "uses",
		plural: "Lemmas",
		style: "theory",
		word: "LEMMA",
	},
	method: {
		code: "MT",
		label: "Method",
		of: "uses",
		plural: "Methods",
		style: "spec",
		word: "METHOD",
	},
	proof: {
		code: "PF",
		label: "Proof",
		of: "proves",
		optionalSlug: true,
		plural: "Proofs",
		qed: true,
		style: "proof",
		untitled: true,
		word: "PROOF",
	},
	proposition: {
		code: "PR",
		label: "Proposition",
		of: "uses",
		plural: "Propositions",
		style: "theory",
		word: "PROPOSITION",
	},
	theorem: {
		code: "TH",
		label: "Theorem",
		of: "uses",
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

export function envRelation(kind: MathEnvKind): EnvRelation {
	return getMathEnvConfig(kind).of;
}

export function getKindLabel(kind: MathEnvKind, plural = false): string {
	const config = getMathEnvConfig(kind);
	return plural ? config.plural : config.label;
}

export function getKindViewSlug(kind: MathEnvKind): string {
	return getKindLabel(kind, true).toLowerCase();
}

function isExampleDifficulty(value: string): value is ExampleDifficulty {
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
	return getMathEnvConfig(kind).optionalSlug !== true;
}

const EXAMPLE_DIFFICULTY_LIST = "challenge, exam, or routine";
