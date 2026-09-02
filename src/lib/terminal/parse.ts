import type { ParsedLine, Token } from "./types";

const WHITESPACE = /\s/;

export function parseLine(raw: string): ParsedLine {
	const tokens: Token[] = [];
	let index = 0;
	let trailingSpace = false;

	while (index < raw.length) {
		while (index < raw.length && WHITESPACE.test(raw[index] ?? "")) {
			trailingSpace = true;
			index += 1;
		}

		if (index >= raw.length) {
			break;
		}

		trailingSpace = false;
		const next = readToken(raw, index);
		tokens.push(next);
		index = next.end;
	}

	const last = tokens.at(-1);
	const partial = trailingSpace ? "" : (last?.value ?? "");

	return {
		partial,
		raw,
		tokens,
		trailingSpace,
	};
}

function readToken(raw: string, start: number): Token {
	const opener = raw[start];
	if (opener === '"' || opener === "'") {
		return readQuoted(raw, start, opener);
	}

	return readBare(raw, start);
}

function readQuoted(raw: string, start: number, quote: string): Token {
	let index = start + 1;
	let value = "";

	while (index < raw.length) {
		const char = raw[index] ?? "";
		if (char === "\\" && index + 1 < raw.length) {
			value += raw[index + 1] ?? "";
			index += 2;
			continue;
		}

		if (char === quote) {
			return { end: index + 1, start, value };
		}

		value += char;
		index += 1;
	}

	return { end: index, start, value };
}

function readBare(raw: string, start: number): Token {
	let index = start;
	let value = "";

	while (index < raw.length) {
		const char = raw[index] ?? "";
		if (WHITESPACE.test(char)) {
			break;
		}

		if (char === "\\" && index + 1 < raw.length) {
			value += raw[index + 1] ?? "";
			index += 2;
			continue;
		}

		value += char;
		index += 1;
	}

	return { end: index, start, value };
}

export function commandToken(parsed: ParsedLine): string | undefined {
	return parsed.tokens[0]?.value;
}

export function tokenValues(parsed: ParsedLine): string[] {
	return parsed.tokens.map((token) => token.value);
}

export function argumentText(parsed: ParsedLine): string {
	return tokenValues(parsed).slice(1).join(" ").trim();
}

export function applyCompletion(
	raw: string,
	parsed: ParsedLine,
	replace: string
): string {
	if (parsed.tokens.length === 0 || parsed.trailingSpace) {
		const prefix = raw.trimEnd();
		return prefix === "" ? replace : `${prefix} ${replace}`;
	}

	const last = parsed.tokens.at(-1);
	if (!last) {
		return replace;
	}

	return `${raw.slice(0, last.start)}${replace}`;
}

const NEEDS_QUOTES = /[\s#]/;

export function quoteIfNeeded(value: string): string {
	if (value === "" || NEEDS_QUOTES.test(value)) {
		return `"${value}"`;
	}

	return value;
}
