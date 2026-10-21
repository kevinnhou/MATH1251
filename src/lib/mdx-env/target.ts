import type { EnvKind } from "./kinds";

export interface PromptTarget {
	hasDerivation: boolean;
	id: string;
	kind: EnvKind | "page" | "thread";
	label: string;
	type: "page" | "env" | "kind-view" | "thread";
}
