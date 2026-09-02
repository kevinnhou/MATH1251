const HASH_PREFIX = /^#/;

export function splitGraphUrl(url: string): { hash: string; pathname: string } {
	const parsed = new URL(url, "https://math1251.local");
	return {
		hash: decodeURIComponent(parsed.hash.replace(HASH_PREFIX, "")),
		pathname: parsed.pathname,
	};
}

export function isCurrentPageNode(
	id: string | undefined,
	currentPageUrl?: string
): boolean {
	return (
		id !== undefined && currentPageUrl !== undefined && id === currentPageUrl
	);
}

export function openGraphUrl(
	url: string,
	currentPageUrl: string | undefined,
	navigate: (url: string) => void
): void {
	const { hash, pathname } = splitGraphUrl(url);
	if (currentPageUrl && pathname === currentPageUrl && hash !== "") {
		document.getElementById(hash)?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
		const next = `${pathname}${window.location.search}#${hash}`;
		const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		if (current !== next) {
			history.replaceState(null, "", next);
		}
		return;
	}

	navigate(url);
}
