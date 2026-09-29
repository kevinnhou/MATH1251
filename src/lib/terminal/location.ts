import { rootOf } from "./dirs";
import type { CommandResult, TerminalLocation } from "./types";

export function initialLocation(route: string): TerminalLocation {
	return { cwd: rootOf(route), view: null };
}

export function applyCommandLocation(
	location: TerminalLocation,
	{ cwd, view }: Pick<CommandResult, "cwd" | "view">
): TerminalLocation {
	const moved = cwd === undefined ? location : moveTo(location, cwd);
	return view === undefined ? moved : { ...moved, view };
}

export function followRoute(
	location: TerminalLocation,
	route: string
): TerminalLocation {
	return moveTo(
		location,
		isWithin(route, location.cwd) ? location.cwd : rootOf(route)
	);
}

export function clearView(location: TerminalLocation): TerminalLocation {
	return location.view === null ? location : { ...location, view: null };
}

function moveTo(location: TerminalLocation, cwd: string): TerminalLocation {
	const view = location.view?.kind === "search" ? location.view : null;
	if (cwd === location.cwd && view === location.view) {
		return location;
	}

	return { cwd, view };
}

function isWithin(url: string, dir: string): boolean {
	return url === dir || url.startsWith(`${dir}/`);
}
