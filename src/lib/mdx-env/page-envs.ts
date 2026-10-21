import type { Difficulty, EnvKind } from "./kinds";

export interface EnvHeading {
	title: string;
	url: string;
}

export interface EnvOccurrence {
	body?: string;
	difficulty?: Difficulty;
	headings: EnvHeading[];
	id: string;
	kind: EnvKind;
	of: string[];
	see: string[];
	slug?: string;
	statement?: string;
	threads: ThreadTag[];
	title?: string;
}

export interface ThreadTag {
	role?: string;
	slug: string;
}

export interface ThreadOccurrence {
	id: string;
	slug: string;
	summary: string;
	title: string;
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
	threads: ThreadOccurrence[];
}

export function recallId(of: string, index: number): string {
	return `recall-${of}-${index}`;
}

export function threadId(slug: string): string {
	return `thread-${slug}`;
}
