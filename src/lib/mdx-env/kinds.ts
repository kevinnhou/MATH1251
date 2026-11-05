import course from "course.config";
import type { ParseResult } from "@/lib/result";
import {
	type ComponentSpec,
	type Domain,
	ENGINE_TAGS,
	ENV_STYLES,
	type EnvConfig,
	type EnvironmentSpec,
	isEnvironment,
	ROLES,
} from "./component";

export type EnvKind = string;

export type Difficulty = string;

const OR_LIST = new Intl.ListFormat("en", { type: "disjunction" });

export interface ComponentRegistry {
	components: ReadonlyMap<string, ComponentSpec>;
	envKindFromTag: (tag: string) => EnvKind | undefined;
	envs: readonly EnvConfig[];
	getEnvConfig: (kind: EnvKind) => EnvConfig;
	getKindLabel: (kind: EnvKind, plural?: boolean) => string;
	getKindViewSlug: (kind: EnvKind) => string;
	isDerivation: (kind: string) => boolean;
	isPractice: (kind: string) => boolean;
	kinds: readonly EnvKind[];
	parseDifficulty: (kind: EnvKind, value: string) => ParseResult<Difficulty>;
	practiceLabels: readonly string[];
}

const RESERVED_KINDS = new Set(["page", "recall", "thread"]);
const RESERVED_TAGS = new Set<string>(ENGINE_TAGS);

const TAG_NAME = /^[A-Z][A-Za-z]*$/;
const KIND_NAME = /^[a-z][a-z-]*$/;
const PLURAL_NAME = /^[A-Za-z][A-Za-z-]*$/;
const WORD_START = /(?<!^)([A-Z])/g;

export function kindOfTag(tag: string): EnvKind {
	return tag.replace(WORD_START, "-$1").toLowerCase();
}

export function createComponentRegistry(
	domains: readonly Domain[]
): ComponentRegistry {
	const tags: string[] = [];
	const envs: EnvConfig[] = [];
	const components = new Map<string, ComponentSpec>();
	for (const [tag, spec] of domains.flatMap((domain) =>
		Object.entries(domain.components)
	)) {
		tags.push(tag);
		if (isEnvironment(spec)) {
			envs.push(envConfig(tag, spec));
		} else {
			components.set(tag, spec);
		}
	}
	assertComponents(tags, envs);

	const byKind = new Map(envs.map((config) => [config.kind, config]));
	const byTag = new Map(envs.map((config) => [config.tag, config.kind]));
	const getEnvConfig = (kind: EnvKind): EnvConfig => {
		const config = byKind.get(kind);
		if (config === undefined) {
			throw new Error(`Unknown environment kind "${kind}".`);
		}

		return config;
	};
	const roleOf = (kind: string) => byKind.get(kind)?.role;

	return {
		components,
		envKindFromTag: (tag) => byTag.get(tag),
		envs,
		getEnvConfig,
		getKindLabel: (kind, plural = false) =>
			getEnvConfig(kind)[plural ? "plural" : "label"],
		getKindViewSlug: (kind) => getEnvConfig(kind).plural.toLowerCase(),
		isDerivation: (kind) => roleOf(kind) === "derives",
		isPractice: (kind) => roleOf(kind) === "practises",
		kinds: envs.map(({ kind }) => kind),
		parseDifficulty(kind, value) {
			const { difficulties = [], label } = getEnvConfig(kind);
			if (difficulties.length === 0) {
				return { error: `${label} has no difficulty scale.`, ok: false };
			}

			const difficulty = value.trim();
			return difficulties.includes(difficulty)
				? { ok: true, value: difficulty }
				: {
						error: `Difficulty must be one of ${OR_LIST.format(difficulties)}; received "${value}".`,
						ok: false,
					};
		},
		practiceLabels: envs
			.filter(
				({ difficulties = [], role }) =>
					role === "practises" && difficulties.length > 0
			)
			.map(({ tag }) => tag),
	};
}

function envConfig(tag: string, spec: EnvironmentSpec): EnvConfig {
	return { ...spec, kind: kindOfTag(tag), label: spec.label ?? tag, tag };
}

function assertComponents(
	tags: readonly string[],
	envs: readonly EnvConfig[]
): void {
	const problems = [...tagProblems(tags), ...envs.flatMap(envProblems)];
	for (const field of ["code", "kind", "label"] as const) {
		problems.push(
			...duplicates(
				envs.map((env) => env[field]),
				field
			)
		);
	}
	problems.push(
		...duplicates(
			envs.map((env) => env.plural.toLowerCase()),
			"plural"
		)
	);

	if (problems.length > 0) {
		throw new Error(`Invalid domain components: ${problems.join("; ")}.`);
	}
}

function tagProblems(tags: readonly string[]): string[] {
	return [
		...tags.flatMap((tag) =>
			TAG_NAME.test(tag) && !RESERVED_TAGS.has(tag)
				? []
				: [`tag "${tag}" must be PascalCase and not an engine component`]
		),
		...duplicates(tags, "tag"),
	];
}

function envProblems(env: EnvConfig): string[] {
	const problems: string[] = [];
	if (!KIND_NAME.test(env.kind) || RESERVED_KINDS.has(env.kind)) {
		problems.push(`kind "${env.kind}" (from <${env.tag}>) is reserved`);
	}

	if (!PLURAL_NAME.test(env.plural)) {
		problems.push(
			`plural "${env.plural}" must be letters and hyphens, as it names a URL`
		);
	}

	if (!ROLES.includes(env.role)) {
		problems.push(`<${env.tag}> has unknown role "${env.role}"`);
	}

	if (!ENV_STYLES.includes(env.style)) {
		problems.push(`<${env.tag}> has unknown style "${env.style}"`);
	}

	const difficulties = env.difficulties ?? [];
	if (difficulties.length > 0 && env.role !== "practises") {
		problems.push(`<${env.tag}> has difficulties but is not a practice`);
	}

	for (const difficulty of difficulties) {
		if (difficulty.length === 0 || difficulty !== difficulty.trim()) {
			problems.push(`difficulty "${difficulty}" must be non-empty and trimmed`);
		}
	}

	return [...problems, ...duplicates(difficulties, `<${env.tag}> difficulty`)];
}

function duplicates(values: readonly string[], field: string): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();
	for (const value of values) {
		(seen.has(value) ? repeated : seen).add(value);
	}

	return [...repeated].map((value) => `${field} "${value}" is used twice`);
}

export const ENV = createComponentRegistry(course.domains);

export const {
	envKindFromTag,
	getEnvConfig,
	getKindLabel,
	getKindViewSlug,
	isDerivation,
	isPractice,
	kinds: ENV_KINDS,
	parseDifficulty,
} = ENV;
