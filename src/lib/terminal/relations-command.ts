import type { CurrentPages, PageCatalog } from "@/lib/course/catalog";
import {
	parseRelationsArgs,
	RELATIONS_SUBCOMMANDS,
	RELATIONS_USAGE,
	type RelationsAction,
} from "@/lib/relations/parse";
import { chapterOf, type MapIndex, neighbours } from "@/lib/relations/query";
import {
	DIRECTION_LABELS,
	DIRECTIONS,
	MAP_VIEW_LABELS,
	MAP_VIEWS,
	type ReadyRelations,
	type RelationsRuntime,
} from "@/lib/relations/types";
import {
	ambiguousOutput,
	errorOutput,
	groupedLinks,
	mutedMessage,
	usageOutput,
} from "./output";
import { quoteIfNeeded, tokenValues } from "./parse";
import { resolvePage } from "./resolve";
import type {
	CommandDescriptor,
	CommandResult,
	CompleteContext,
	Completion,
	ExecuteContext,
	LinkGroup,
	TerminalOutput,
} from "./types";
import { TERMINAL_COMPLETION_LIMIT } from "./types";

const NOT_READY: Record<
	Exclude<RelationsRuntime["status"], "ready">,
	string
> = {
	error:
		"Course map failed to load. Reload the page, then try relations again.",
	loading: "Course map is still loading. Try again in a moment.",
	unavailable:
		"The course map is hidden on kind-view routes. Open the parent notes page.",
};

export function relationsCommand(): CommandDescriptor {
	return {
		advertised: true,
		complete: completeRelationsCommand,
		execute: executeRelationsCommand,
		names: ["relations"],
		usage: RELATIONS_USAGE,
	};
}

function executeRelationsCommand(ctx: ExecuteContext): CommandResult {
	const { relations } = ctx;
	if (relations.status !== "ready") {
		return { output: errorOutput(NOT_READY[relations.status]) };
	}

	const parsed = parseRelationsArgs(tokenValues(ctx.parsed).slice(1));
	if (!parsed.ok) {
		return { output: usageOutput(parsed.error) };
	}

	return {
		output: runRelationsAction(
			parsed.value,
			relations,
			ctx.catalog,
			ctx.current
		),
	};
}

function runRelationsAction(
	action: RelationsAction,
	relations: ReadyRelations,
	catalog: PageCatalog,
	current: CurrentPages
): TerminalOutput {
	switch (action.type) {
		case "status":
			return linksOutput(
				relations.index,
				relations.focusId,
				`relations ${relations.view}`
			);
		case "reset":
			relations.reset();
			return mutedMessage("Reset the course map.");
		case "view":
			relations.setView(action.value);
			return mutedMessage(
				`Showing ${MAP_VIEW_LABELS[action.value].toLowerCase()}.`
			);
		case "focus": {
			const resolved = resolvePage(catalog, action.target, current);
			if (resolved.kind === "ambiguous") {
				return ambiguousOutput(action.target, resolved.pages);
			}

			const id = resolved.kind === "match" ? resolved.page.url : undefined;
			if (id === undefined || !relations.index.pageById.has(id)) {
				return errorOutput(`relations focus: no such page: ${action.target}`);
			}

			relations.setFocus(id);
			return linksOutput(relations.index, id, "focus");
		}
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}

function linksOutput(
	index: MapIndex,
	id: string,
	title: string
): TerminalOutput {
	const page = index.pageById.get(id);
	const groups = DIRECTIONS.map(
		(direction): LinkGroup => ({
			heading: DIRECTION_LABELS[direction],
			items: neighbours(index, id, direction).map(({ link, page: other }) => ({
				hint: `${chapterOf(index, other)?.short ?? ""} · ${link.weight}`,
				label: other.title,
				url: other.id,
			})),
		})
	);

	return groupedLinks(groups, {
		message: page ? page.title.plain : id,
		title,
	});
}

function completeRelationsCommand(ctx: CompleteContext): Completion[] {
	const values = tokenValues(ctx.parsed);
	const args = ctx.parsed.trailingSpace ? values.slice(1) : values.slice(1, -1);
	const partial = ctx.parsed.trailingSpace ? "" : ctx.parsed.partial;

	if (args.length === 0) {
		return prefixCompletions([...RELATIONS_SUBCOMMANDS], partial);
	}

	const name = args[0]?.toLowerCase();
	if (args.length === 1 && name === "view") {
		return prefixCompletions([...MAP_VIEWS], partial);
	}

	if (
		args.length === 1 &&
		name === "focus" &&
		ctx.relations.status === "ready"
	) {
		return pageCompletions(ctx.relations.index, partial);
	}

	return [];
}

function prefixCompletions(values: string[], partial: string): Completion[] {
	const needle = partial.toLowerCase();
	return values
		.filter((value) => needle === "" || value.startsWith(needle))
		.map((value) => ({ label: value, replace: value }));
}

function pageCompletions(index: MapIndex, partial: string): Completion[] {
	const needle = partial.toLowerCase();
	return index.pages
		.filter(
			(page) =>
				needle === "" ||
				page.title.plain.toLowerCase().includes(needle) ||
				page.id.toLowerCase().includes(needle)
		)
		.slice(0, TERMINAL_COMPLETION_LIMIT)
		.map((page) => ({
			detail: page.id,
			label: page.title,
			replace: quoteIfNeeded(page.id),
		}));
}
