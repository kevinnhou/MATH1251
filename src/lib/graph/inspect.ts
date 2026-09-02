import type { GraphEffect } from "./session";

export type InspectSource = "cli" | "canvas" | "escape";
export type InspectDispatch = "publish" | "clear" | "ignore";

export function isCompactHome(
	session: { expanded: boolean; selectedId: string | null },
	homeId: string
): boolean {
	return !session.expanded && session.selectedId === homeId;
}

export function inspectPolicy(
	result: {
		effect: GraphEffect;
		session: { expanded: boolean; selectedId: string | null };
	},
	options: { homeId: string; narrow: boolean; source: InspectSource }
): InspectDispatch {
	const inspect = result.effect.kind === "inspect";

	if (options.source === "escape") {
		if (inspect || result.session.selectedId === null) {
			return "clear";
		}

		return "ignore";
	}

	if (inspect) {
		if (options.narrow) {
			return "clear";
		}

		if (
			options.source === "canvas" &&
			isCompactHome(result.session, options.homeId)
		) {
			return "clear";
		}

		return "publish";
	}

	if (options.source === "cli") {
		return "publish";
	}

	if (result.session.selectedId === null) {
		return "clear";
	}

	return "ignore";
}
