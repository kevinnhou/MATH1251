export type ParseResult<T> =
	| { error: string; ok: false }
	| { ok: true; value: T };

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
