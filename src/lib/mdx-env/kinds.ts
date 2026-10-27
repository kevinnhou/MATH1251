import course from "course.config";
import type { ParseResult } from "@/lib/result";
import { assertEnvPack, type EnvKindConfig, type EnvPack } from "./pack";

export type EnvKind = string;

export type Difficulty = string;

const OR_LIST = new Intl.ListFormat("en", { type: "disjunction" });

export interface EnvRegistry {
	envKindFromTag: (tag: string) => EnvKind | undefined;
	getEnvConfig: (kind: EnvKind) => EnvKindConfig;
	getKindLabel: (kind: EnvKind, plural?: boolean) => string;
	getKindViewSlug: (kind: EnvKind) => string;
	isDerivation: (kind: string) => boolean;
	isPractice: (kind: string) => boolean;
	kinds: readonly EnvKind[];
	pack: EnvPack;
	parseDifficulty: (value: string) => ParseResult<Difficulty>;
	practiceLabels: readonly string[];
}

export function createEnvRegistry(pack: EnvPack): EnvRegistry {
	assertEnvPack(pack);

	const entries = Object.entries(pack.kinds);
	const byTag = new Map(entries.map(([kind, { label }]) => [label, kind]));
	const getEnvConfig = (kind: EnvKind): EnvKindConfig => {
		const config = pack.kinds[kind];
		if (config === undefined) {
			throw new Error(`Unknown environment kind "${kind}".`);
		}

		return config;
	};
	const relationOf = (kind: string) => pack.kinds[kind]?.of;
	const difficultyList = OR_LIST.format(pack.difficulties);

	return {
		envKindFromTag: (tag) => byTag.get(tag),
		getEnvConfig,
		getKindLabel: (kind, plural = false) =>
			getEnvConfig(kind)[plural ? "plural" : "label"],
		getKindViewSlug: (kind) => getEnvConfig(kind).plural.toLowerCase(),
		isDerivation: (kind) => relationOf(kind) === "proves",
		isPractice: (kind) => relationOf(kind) === "practises",
		kinds: entries.map(([kind]) => kind),
		pack,
		parseDifficulty(value) {
			const difficulty = value.trim();
			return pack.difficulties.includes(difficulty)
				? { ok: true, value: difficulty }
				: {
						error: `Difficulty must be one of ${difficultyList}; received "${value}".`,
						ok: false,
					};
		},
		practiceLabels: entries
			.filter(([, { of }]) => of === "practises")
			.map(([, { label }]) => label),
	};
}

export const ENV = createEnvRegistry(course.env);

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
