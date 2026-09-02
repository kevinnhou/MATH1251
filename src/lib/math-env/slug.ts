import type { ParseResult } from "@/lib/result";

export const TENET_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

export function parseTenetSlug(value: string): ParseResult<string> {
	const slug = value.trim();
	if (slug.length === 0) {
		return { error: "Tenet slug cannot be empty.", ok: false };
	}

	if (slug.startsWith("/")) {
		return {
			error: `Tenet slug cannot be a page path; received "${slug}".`,
			ok: false,
		};
	}

	if (slug.includes(":")) {
		return {
			error: `Tenet slug cannot contain a prefix; received "${slug}".`,
			ok: false,
		};
	}

	if (!TENET_SLUG_PATTERN.test(slug)) {
		return {
			error: `Tenet slug must match ${TENET_SLUG_PATTERN.source}; received "${slug}".`,
			ok: false,
		};
	}

	return { ok: true, value: slug };
}

export function parseTenetSlugList(value: string): ParseResult<string[]> {
	const parts = value.split(",");
	const slugs: string[] = [];
	const seen = new Set<string>();

	for (const part of parts) {
		if (part.trim().length === 0) {
			return {
				error: "Tenet slug list cannot contain empty entries.",
				ok: false,
			};
		}

		const parsed = parseTenetSlug(part);
		if (!parsed.ok) {
			return parsed;
		}

		if (seen.has(parsed.value)) {
			continue;
		}

		seen.add(parsed.value);
		slugs.push(parsed.value);
	}

	if (slugs.length === 0) {
		return { error: "Tenet slug list cannot be empty.", ok: false };
	}

	return { ok: true, value: slugs };
}
