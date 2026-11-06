import type { Difficulty, EnvKind } from "./kinds";

export interface EnvHeading {
	title: string;
	url: string;
}

export type PropValue =
	| boolean
	| number
	| string
	| null
	| readonly PropValue[]
	| { readonly [key: string]: PropValue };

export interface ComponentOccurrence {
	children: string;
	env?: string;
	props: Readonly<Record<string, PropValue>>;
	segment: number;
	tag: string;
}

export interface EnvTemplates {
	body?: string;
	statement?: string;
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
	templates?: EnvTemplates;
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
	components: ComponentOccurrence[];
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

const PLACEHOLDER = /\uE000(\d+)\uE001/g;

export function componentPlaceholder(index: number): string {
	return `\uE000${index}\uE001`;
}

export function replaceComponents(
	template: string,
	replace: (index: number, linePrefix: string) => string
): string {
	return template.replace(
		PLACEHOLDER,
		(_match, index: string, offset: number) => {
			const lineStart = template.lastIndexOf("\n", offset - 1) + 1;
			return replace(Number(index), template.slice(lineStart, offset));
		}
	);
}
