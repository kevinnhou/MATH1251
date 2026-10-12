import { threadsRoute } from "@/lib/site/config";

export function threadMapHref(slug: string): string {
	return `${threadsRoute}/${slug}`;
}

const NOT_ID = /[^a-z0-9]+/gi;
const TRAILING_DASH = /-$/;

export function stationId(href: string): string {
	return `at-${href.replace(NOT_ID, "-")}`
		.replace(TRAILING_DASH, "")
		.toLowerCase();
}
