import type { EnvKind } from "./kinds";

export interface PromptTarget {
	derivation?: EnvKind;
	id: string;
	kind: EnvKind | "page" | "thread";
	label: string;
	type: "page" | "env" | "kind-view" | "thread";
}
