import type { ExampleDifficulty, MathEnvKind } from "./kinds";

export interface EnvHeading {
	title: string;
	url: string;
}

export interface EnvOccurrence {
	body?: string;
	difficulty?: ExampleDifficulty;
	headings: EnvHeading[];
	id: string;
	kind: MathEnvKind;
	of: string[];
	see: string[];
	slug?: string;
	statement?: string;
	title?: string;
}

export interface RecallOccurrence {
	id: string;
	of: string;
}

export type PageSegment =
	| { markdown: string; type: "prose" }
	| { id: string; type: "env" }
	| { id: string; type: "recall" };

export interface PageEnvs {
	entries: EnvOccurrence[];
	recalls: RecallOccurrence[];
	segments: PageSegment[];
}

export function recallId(of: string, index: number): string {
	return `recall-${of}-${index}`;
}
