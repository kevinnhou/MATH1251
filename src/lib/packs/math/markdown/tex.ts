import type { Element } from "hast";
import { classList } from "@/lib/markdown/element";

const WHITESPACE = /\s+/;

export function isMathElement(node: Element): boolean {
	const classes = classList(node);
	return (
		classes.includes("language-math") ||
		classes.includes("math-inline") ||
		classes.includes("math-display")
	);
}

export function simplifyTex(tex: string): string {
	return tex
		.replace(/\\mathrm\{([^}]+)\}/g, "$1")
		.replace(/\\operatorname\{([^}]+)\}/g, "$1")
		.replace(/\\text\{([^}]+)\}/g, "$1")
		.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
		.replace(/\\left/g, "")
		.replace(/\\right/g, "")
		.replace(/\\,/g, " ")
		.replace(/\\;/g, " ")
		.replace(/\\!/g, "")
		.replace(/\\ /g, " ")
		.replace(/\\([a-zA-Z]+)/g, " $1")
		.replace(/[{}]/g, "")
		.replace(/~/g, " ")
		.replaceAll(/\s+/g, " ")
		.trim();
}

export function mathMatchesQuery(
	tex: string,
	terms: readonly string[]
): boolean {
	const tokens = new Set(
		simplifyTex(tex).toLowerCase().split(WHITESPACE).filter(Boolean)
	);

	return terms.some((term) => {
		const lower = term.toLowerCase();
		if (tokens.has(lower)) {
			return true;
		}

		return new RegExp(`\\\\${escapeRegExp(lower)}(?![a-zA-Z])`, "i").test(tex);
	});
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
