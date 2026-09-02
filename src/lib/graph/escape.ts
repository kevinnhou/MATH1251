import { isEditableTarget } from "@/lib/client/actions";
import type { GraphAction } from "./actions";
import type { GraphSession } from "./session";

export function nextGraphEscapeAction(
	session: GraphSession,
	homeId: string
): GraphAction {
	if (session.locate !== "") {
		return { type: "find-clear" };
	}

	if (session.selectedId !== null) {
		return { id: null, type: "select" };
	}

	if (session.query.focus.id !== homeId) {
		return { target: homeId, type: "focus" };
	}

	return { type: "collapse" };
}

export function graphOwnsEscape(options: {
	active: EventTarget | null;
	engaged: boolean;
	root: Node | null;
}): boolean {
	const { active, engaged, root } = options;
	if (
		isEditableTarget(active) &&
		!(root && active instanceof Node && root.contains(active))
	) {
		return false;
	}

	if (engaged) {
		return true;
	}

	return Boolean(root && active instanceof Node && root.contains(active));
}
