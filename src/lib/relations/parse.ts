import type { ParseResult } from "@/lib/result";
import { isMapView, MAP_VIEWS, type MapView } from "./types";

export type RelationsAction =
	| { type: "status" }
	| { type: "reset" }
	| { type: "view"; value: MapView }
	| { target: string; type: "focus" };

export const RELATIONS_SUBCOMMANDS = ["view", "focus", "reset"] as const;

export const RELATIONS_USAGE = `relations <${RELATIONS_SUBCOMMANDS.join("|")}>`;

const VIEW_USAGE = `relations view <${MAP_VIEWS.join("|")}>`;

export function parseRelationsArgs(
	args: readonly string[]
): ParseResult<RelationsAction> {
	const [action, ...rest] = args;
	const name = action?.toLowerCase();
	if (name === undefined || name === "") {
		return { ok: true, value: { type: "status" } };
	}

	if (name === "reset") {
		return { ok: true, value: { type: "reset" } };
	}

	if (name === "view") {
		const view = rest[0]?.toLowerCase();
		return view !== undefined && isMapView(view)
			? { ok: true, value: { type: "view", value: view } }
			: { error: VIEW_USAGE, ok: false };
	}

	if (isMapView(name)) {
		return { ok: true, value: { type: "view", value: name } };
	}

	if (name === "focus") {
		const target = rest.join(" ").trim();
		return target === ""
			? { error: "relations focus <page>", ok: false }
			: { ok: true, value: { target, type: "focus" } };
	}

	return { error: RELATIONS_USAGE, ok: false };
}
