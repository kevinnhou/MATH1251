import type { ParseResult } from "@/lib/result";
import type { GraphAction } from "./actions";
import { GRAPH_STRAND_ARGS, isGraphModule } from "./types";

export function parseGraphArgs(
	args: readonly string[]
): ParseResult<GraphAction> {
	const [action, ...rest] = args;
	if (action === undefined || action === "") {
		return { ok: true, value: { type: "status" } };
	}

	return parseGraphSubcommand(action.toLowerCase(), rest);
}

function parseGraphSubcommand(
	name: string,
	rest: string[]
): ParseResult<GraphAction> {
	if (name === "help") {
		return usage();
	}

	if (name === "immerse") {
		return ok({ type: "immerse" });
	}

	if (name === "collapse") {
		return ok({ type: "collapse" });
	}

	if (name === "reset") {
		return ok({ type: "reset" });
	}

	if (name === "depth" || name === "reach") {
		return parseDepth(rest[0]);
	}

	if (name === "strand" || name === "module") {
		return parseStrand(rest[0]);
	}

	if (name === "focus") {
		const target = rest.join(" ").trim();
		return target === ""
			? usage("graph focus <page>")
			: ok({ target, type: "focus" });
	}

	if (name === "find") {
		const target = rest.join(" ").trim();
		if (target === "") {
			return usage("graph find <text>");
		}

		if (target.toLowerCase() === "clear") {
			return ok({ type: "find-clear" });
		}

		return ok({ text: target, type: "find" });
	}

	return usage();
}

function parseDepth(value: string | undefined): ParseResult<GraphAction> {
	if (value === undefined) {
		return usage("graph depth <1|2|3|all>");
	}

	if (value === "all") {
		return ok({ type: "set-depth", value: "all" });
	}

	if (value === "1") {
		return ok({ type: "set-depth", value: 1 });
	}

	if (value === "2") {
		return ok({ type: "set-depth", value: 2 });
	}

	if (value === "3") {
		return ok({ type: "set-depth", value: 3 });
	}

	return usage("graph depth <1|2|3|all>");
}

function parseStrand(value: string | undefined): ParseResult<GraphAction> {
	if (value === undefined) {
		return usage("graph strand <all|core|algebra|calculus>");
	}

	const strand = value.toLowerCase();
	if (
		!GRAPH_STRAND_ARGS.includes(strand as (typeof GRAPH_STRAND_ARGS)[number])
	) {
		return usage("graph strand <all|core|algebra|calculus>");
	}

	if (strand === "all") {
		return ok({ type: "set-strand", value: null });
	}

	if (!isGraphModule(strand)) {
		return usage("graph strand <all|core|algebra|calculus>");
	}

	return ok({ type: "set-strand", value: strand });
}

function ok(action: GraphAction): ParseResult<GraphAction> {
	return { ok: true, value: action };
}

function usage(
	text = "graph <depth|strand|focus|find|immerse|collapse|reset>"
): ParseResult<GraphAction> {
	return { error: text, ok: false };
}
