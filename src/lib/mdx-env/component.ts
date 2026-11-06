export const ROLES = ["uses", "derives", "practises"] as const;

export type Role = (typeof ROLES)[number];

export const ENV_STYLES = ["plain", "emphasis", "subdued"] as const;

export type EnvStyle = (typeof ENV_STYLES)[number];

export interface AskWording {
	label?: string;
	phrase?: string;
	task?: string;
}

export interface DeriveWording extends AskWording {
	selfPhrase?: string;
}

export interface AskSpec {
	check?: AskWording;
	derive?: DeriveWording;
	explain?: AskWording;
	quiz?: AskWording;
	subject?: string;
}

export interface RelationLabels {
	inverse: string;
	label: string;
}

export interface EnvironmentSpec {
	ask?: AskSpec;
	code: string;
	decoration?: "overline" | "underline";
	difficulties?: readonly string[];
	endMark?: boolean;
	label?: string;
	optionalSlug?: boolean;
	plural: string;
	relation?: RelationLabels;
	role: Role;
	style: EnvStyle;
	untitled?: boolean;
	untitledTitle?: string;
}

export interface ComponentSpec {
	role?: never;
	slugProps?: readonly string[];
}

export type Component = ComponentSpec | EnvironmentSpec;

export interface Domain {
	components: Readonly<Record<string, Component>>;
}

export interface EnvConfig extends Omit<EnvironmentSpec, "label"> {
	kind: string;
	label: string;
	tag: string;
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

export function isEnvironment(
	component: Component
): component is EnvironmentSpec {
	return component.role !== undefined;
}
