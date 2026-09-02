import { isRecord } from "@/lib/result";
import type { ExampleDifficulty, MathEnvKind } from "./kinds";

export interface EnvHeading {
	depth: number;
	title: string;
	url: string;
}

export interface EnvOccurrence {
	body?: string;
	difficulty?: ExampleDifficulty;
	headings: EnvHeading[];
	id: string;
	index: number;
	kind: MathEnvKind;
	of: string[];
	see: string[];
	slug?: string;
	statement?: string;
	title?: string;
}

export interface RecallOccurrence {
	id: string;
	index: number;
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

export interface PageWithExports {
	data: {
		_exports?: Record<string, unknown>;
	};
}

const EMPTY_PAGE_ENVS: PageEnvs = { entries: [], recalls: [], segments: [] };

export function recallId(of: string, index: number): string {
	return `recall-${of}-${index}`;
}

export function isPageEnvs(value: unknown): value is PageEnvs {
	return (
		isRecord(value) &&
		Array.isArray(value.entries) &&
		(value.recalls === undefined || Array.isArray(value.recalls))
	);
}

export function getPageEnvs(page: PageWithExports): PageEnvs {
	const candidate = page.data._exports?.envs;
	if (!isPageEnvs(candidate)) {
		return EMPTY_PAGE_ENVS;
	}

	return {
		entries: candidate.entries,
		recalls: (candidate.recalls ?? []).map(normaliseRecall),
		segments: Array.isArray(candidate.segments)
			? candidate.segments.filter(isPageSegment)
			: [],
	};
}

function normaliseRecall(recall: RecallOccurrence): RecallOccurrence {
	return {
		...recall,
		id: recall.id ?? recallId(recall.of, recall.index),
	};
}

function isPageSegment(value: unknown): value is PageSegment {
	if (!isRecord(value) || typeof value.type !== "string") {
		return false;
	}

	if (value.type === "prose") {
		return typeof value.markdown === "string";
	}

	return (
		(value.type === "env" || value.type === "recall") &&
		typeof value.id === "string"
	);
}
