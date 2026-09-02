const ABSOLUTE_URL = /^https?:\/\//;
const PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;
const SAFE_PROTOCOL = /^https?:$/i;
const TRAILING_SLASHES = /\/+$/;

export function toAbsoluteUrl(href: string, origin: string): string {
	if (ABSOLUTE_URL.test(href)) {
		return href;
	}

	const path = href.startsWith("/") ? href : `/${href}`;
	return `${origin.replace(TRAILING_SLASHES, "")}${path}`;
}

export function isSafeExternalUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return SAFE_PROTOCOL.test(url.protocol);
	} catch {
		return false;
	}
}

export function isSafeInternalUrl(value: string): boolean {
	if (!value.startsWith("/") || value.startsWith("//")) {
		return false;
	}

	if (value.includes("\\") || PROTOCOL.test(value)) {
		return false;
	}

	return true;
}
