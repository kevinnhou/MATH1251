import {
	DIRECTION_LABELS,
	DIRECTIONS,
	type DockList,
	type PageDock,
} from "@/lib/relations/types";
import { errorOutput, groupedLinks, plural, usageOutput } from "./output";
import { tokenValues } from "./parse";
import type {
	CommandDescriptor,
	CommandResult,
	ExecuteContext,
	LinkGroup,
	TerminalOutput,
} from "./types";

const RELATIONS_USAGE = "relations";

const UNAVAILABLE = "Open a course page to see what it builds on and leads to.";

export function relationsCommand(): CommandDescriptor {
	return {
		advertised: true,
		execute: executeRelationsCommand,
		names: ["relations"],
		usage: RELATIONS_USAGE,
	};
}

function executeRelationsCommand(ctx: ExecuteContext): CommandResult {
	if (tokenValues(ctx.parsed).length > 1) {
		return { output: usageOutput(RELATIONS_USAGE) };
	}

	return {
		output: ctx.dock ? relationsOutput(ctx.dock) : errorOutput(UNAVAILABLE),
	};
}

function relationsOutput({ page, threads }: PageDock): TerminalOutput {
	const groups: LinkGroup[] = [
		...DIRECTIONS.map((direction) =>
			listGroup(DIRECTION_LABELS[direction], page.links[direction])
		),
		{
			heading: "threads",
			items: threads.map((thread) => ({
				hint: plural(thread.route.stops.length, "place"),
				label: thread.title,
				url: thread.href,
			})),
		},
	];

	return groupedLinks(
		groups.filter((group) => group.items.length > 0),
		{ message: page.title.plain, title: "relations" }
	);
}

function listGroup(heading: string, list: DockList): LinkGroup {
	const hidden = list.count - list.items.length;
	return {
		heading: hidden > 0 ? `${heading} (${hidden} more)` : heading,
		items: list.items.map((item) => ({
			hint: item.place,
			label: item.title,
			url: item.id,
		})),
	};
}
