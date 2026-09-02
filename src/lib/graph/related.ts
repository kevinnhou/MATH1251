import {
	formatRefLink,
	type RelatedLink,
} from "@/lib/math-env/export-markdown";
import { getKindLabel } from "@/lib/math-env/kinds";
import {
	type EnvNode,
	type GraphDocument,
	isEnvNode,
	isPageNode,
} from "./types";

export const PAGE_RELATED_LIMIT = 24;

export function selectPageRelated(
	document: GraphDocument,
	pageUrl: string
): RelatedLink[] {
	const nodes = new Map(document.nodes.map((node) => [node.id, node]));
	const items: RelatedLink[] = [];
	const seen = new Set<string>();

	for (const edge of document.edges) {
		if (edge.source !== pageUrl || edge.target === pageUrl) {
			continue;
		}

		if (edge.kind === "reference") {
			const target = nodes.get(edge.target);
			if (target === undefined || !isPageNode(target) || seen.has(target.id)) {
				continue;
			}

			seen.add(target.id);
			items.push({
				href: target.id,
				label: "Notes",
				title: target.title.source,
			});
			continue;
		}

		if (edge.kind !== "recall") {
			continue;
		}

		const target = nodes.get(edge.target);
		if (
			target === undefined ||
			!isEnvNode(target) ||
			target.pageId === pageUrl ||
			seen.has(target.id)
		) {
			continue;
		}

		seen.add(target.id);
		items.push(recallLink(target));
	}

	return items;
}

export function formatPageRelated(
	items: readonly RelatedLink[],
	options: { limit?: number; origin?: string } = {}
): string[] {
	const { origin, limit = PAGE_RELATED_LIMIT } = options;
	const capped = items.slice(0, limit);
	const lines = capped.map((item) =>
		formatRefLink(origin === undefined ? item : { ...item, origin })
	);

	if (items.length > limit) {
		lines.push("- Additional related links omitted for brevity.");
	}

	return lines;
}

export function kindViewNotesLink(
	view: { parentUrl: string },
	title: string
): RelatedLink {
	return {
		href: view.parentUrl,
		label: "Notes",
		title,
	};
}

function recallLink(node: EnvNode): RelatedLink {
	const kind = getKindLabel(node.kind);
	const title = node.title.source;
	return {
		href: node.id,
		label: "Recalls",
		title: title.startsWith(`${kind}. `) ? title : `${kind}. ${title}`,
	};
}
