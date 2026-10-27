export const ENV_RELATIONS = ["uses", "proves", "practises"] as const;

export type EnvRelation = (typeof ENV_RELATIONS)[number];

export const ENV_STYLES = ["plain", "emphasis", "subdued"] as const;

export type EnvStyle = (typeof ENV_STYLES)[number];

export interface EnvKindConfig {
	code: string;
	decoration?: "overline" | "underline";
	endMark?: boolean;
	label: string;
	of: EnvRelation;
	optionalSlug?: boolean;
	plural: string;
	style: EnvStyle;
	untitled?: boolean;
}

export interface EnvDerivationCopy {
	intent: string;
	label: string;
	phrase: string;
	selfPhrase: string;
	task: string;
}

export interface EnvPromptCopy {
	check: string;
	explain: string;
	explainPractice: string;
	quizPractice: string;
	subject: string;
}

export interface EnvPack {
	derivation: EnvDerivationCopy;
	difficulties: readonly string[];
	kinds: Readonly<Record<string, EnvKindConfig>>;
	prompts: EnvPromptCopy;
	summary: string;
}

export const ENGINE_TAGS = [
	"KindFilter",
	"Prose",
	"Recall",
	"Statement",
	"Thread",
	"ThreadMap",
] as const;

export type EngineTag = (typeof ENGINE_TAGS)[number];

const RESERVED_KINDS = new Set(["page", "recall", "thread"]);

const RESERVED_TAGS = new Set<string>(ENGINE_TAGS);

const KIND_NAME = /^[a-z][a-z-]*$/;
const TAG_NAME = /^[A-Z][A-Za-z]*$/;
const PLURAL_NAME = /^[A-Za-z][A-Za-z-]*$/;

export function assertEnvPack(pack: EnvPack): void {
	const problems = [
		...kindProblems(pack),
		...derivationProblems(pack),
		...difficultyProblems(pack),
	];

	if (problems.length > 0) {
		throw new Error(`Invalid environment pack: ${problems.join("; ")}.`);
	}
}

function kindProblems(pack: EnvPack): string[] {
	const problems: string[] = [];
	const seen = { code: new Set<string>(), label: new Set<string>() };
	const views = new Set<string>();

	for (const [kind, config] of Object.entries(pack.kinds)) {
		if (!KIND_NAME.test(kind) || RESERVED_KINDS.has(kind)) {
			problems.push(`kind "${kind}" must be lower-case and not reserved`);
		}

		if (!TAG_NAME.test(config.label) || RESERVED_TAGS.has(config.label)) {
			problems.push(
				`label "${config.label}" must be a PascalCase tag the engine does not define`
			);
		}

		for (const field of ["code", "label"] as const) {
			if (seen[field].has(config[field])) {
				problems.push(`${field} "${config[field]}" is used twice`);
			}
			seen[field].add(config[field]);
		}

		if (!PLURAL_NAME.test(config.plural)) {
			problems.push(
				`plural "${config.plural}" must be letters and hyphens, as it names a URL`
			);
		}

		const view = config.plural.toLowerCase();
		if (views.has(view)) {
			problems.push(`plural "${config.plural}" is used twice`);
		}
		views.add(view);

		if (!ENV_RELATIONS.includes(config.of)) {
			problems.push(`kind "${kind}" has unknown relation "${config.of}"`);
		}

		if (!ENV_STYLES.includes(config.style)) {
			problems.push(`kind "${kind}" has unknown style "${config.style}"`);
		}
	}

	return problems;
}

function derivationProblems(pack: EnvPack): string[] {
	const { intent } = pack.derivation;
	return KIND_NAME.test(intent)
		? []
		: [`derivation intent "${intent}" must be one lower-case word`];
}

function difficultyProblems(pack: EnvPack): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();

	for (const difficulty of pack.difficulties) {
		if (difficulty.length === 0 || difficulty !== difficulty.trim()) {
			problems.push(`difficulty "${difficulty}" must be non-empty and trimmed`);
		}
		if (seen.has(difficulty)) {
			problems.push(`difficulty "${difficulty}" is used twice`);
		}
		seen.add(difficulty);
	}

	const practises = Object.values(pack.kinds).some(
		({ of }) => of === "practises"
	);
	if (practises && seen.size === 0) {
		problems.push("practice kinds need at least one difficulty");
	}

	return problems;
}
