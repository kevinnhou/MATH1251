import { docs } from "collections/server";

const entries = new Map(docs.docs.map((entry) => [entry.info.path, entry]));

export function loadPageContent(path: string) {
	const entry = entries.get(path);
	if (!entry) {
		throw new Error(
			`[CONTENT] no compiled page for ${path}; corpus-meta and the docs collection disagree`
		);
	}
	return entry.load();
}
