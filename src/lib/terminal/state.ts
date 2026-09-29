import {
	emptyHistory,
	type HistoryState,
	historyDown,
	historyUp,
	historyValue,
} from "./history";
import {
	applyCommandLocation,
	clearView,
	followRoute,
	initialLocation,
} from "./location";
import {
	dismissLayer,
	draftSurface,
	emptySurface,
	leaveOutput,
	showOutput,
	type TerminalSurface,
} from "./mode";
import { applyCompletion, parseLine } from "./parse";
import type {
	CommandResult,
	Completion,
	TerminalLocation,
	TerminalOutput,
} from "./types";

interface CompletionCycle {
	index: number;
	list: Completion[];
}

export interface TerminalState {
	cycle: CompletionCycle | null;
	hadOutput: boolean;
	history: HistoryState;
	location: TerminalLocation;
	pendingNavigation: string | null;
	route: string;
	surface: TerminalSurface;
}

export type TerminalAction =
	| { type: "input"; text: string }
	| { type: "cycle"; completions: Completion[]; direction: -1 | 1 }
	| { type: "history"; direction: "up" | "down" }
	| { type: "history-loaded"; entries: string[] }
	| { type: "ran"; entries: string[] }
	| { type: "dismiss" }
	| { type: "dismiss-window" }
	| { type: "focus" }
	| { type: "show"; echo?: string; output: TerminalOutput }
	| { type: "result"; echo: string; result: CommandResult }
	| { type: "clear-inspect" }
	| { type: "show-tree" }
	| { type: "change-directory"; url: string }
	| { type: "route"; url: string; inCourse: boolean };

export function initialTerminalState(
	route: string,
	inCourse: boolean
): TerminalState {
	return {
		cycle: null,
		hadOutput: false,
		history: emptyHistory(),
		location: initialLocation(route, inCourse),
		pendingNavigation: null,
		route,
		surface: emptySurface(),
	};
}

export function selectedCompletion(state: TerminalState): number {
	return state.cycle?.index ?? 0;
}

export function terminalReducer(
	state: TerminalState,
	action: TerminalAction
): TerminalState {
	switch (action.type) {
		case "input":
			return {
				...state,
				cycle: null,
				history: { ...state.history, cursor: null },
				surface: draftSurface(action.text),
			};
		case "cycle":
			return cycleCompletion(state, action.completions, action.direction);
		case "history": {
			const history =
				action.direction === "up"
					? historyUp(state.history, state.surface.input)
					: historyDown(state.history);
			return {
				...state,
				cycle: null,
				history,
				surface: draftSurface(historyValue(history)),
			};
		}
		case "history-loaded":
			return {
				...state,
				history: { ...state.history, entries: action.entries },
			};
		case "ran":
			return {
				...state,
				cycle: null,
				history: { cursor: null, draft: "", entries: action.entries },
			};
		case "dismiss":
			return {
				...state,
				cycle: null,
				surface: dismissLayer(state.surface).surface,
			};
		case "dismiss-window": {
			const dismissed = dismissLayer(state.surface);
			return dismissed.consumed
				? { ...state, surface: dismissed.surface }
				: { ...state, location: clearView(state.location) };
		}
		case "focus":
			return {
				...state,
				location: clearView(state.location),
				surface: leaveOutput(state.surface),
			};
		case "show":
			return {
				...state,
				cycle: null,
				hadOutput: true,
				surface: showOutput(action.output, action.echo),
			};
		case "result":
			return applyResult(state, action.result, action.echo);
		case "clear-inspect":
			return state.surface.output?.kind === "inspect"
				? { ...state, surface: emptySurface() }
				: state;
		case "show-tree":
			return { ...state, surface: leaveOutput(state.surface) };
		case "change-directory":
			return { ...state, location: { cwd: action.url, view: null } };
		case "route":
			return followNavigation(state, action.url, action.inCourse);
		default: {
			const unknown: never = action;
			return unknown;
		}
	}
}

function cycleCompletion(
	state: TerminalState,
	completions: Completion[],
	direction: -1 | 1
): TerminalState {
	const list = state.cycle?.list ?? completions;
	const index =
		(selectedCompletion(state) + direction + list.length) % list.length;
	const selected = list[index];
	if (!selected) {
		return state;
	}

	const { input } = state.surface;
	return {
		...state,
		cycle: { index, list },
		surface: {
			...draftSurface(
				applyCompletion(input, parseLine(input), selected.replace)
			),
			completionsOpen: true,
		},
	};
}

function applyResult(
	state: TerminalState,
	result: CommandResult,
	echo: string
): TerminalState {
	const next: TerminalState = {
		...state,
		location: applyCommandLocation(state.location, result),
		pendingNavigation: result.navigate ?? state.pendingNavigation,
	};

	if (result.output === null) {
		return { ...next, surface: emptySurface() };
	}

	return {
		...next,
		hadOutput: true,
		surface: showOutput(result.output, echo),
	};
}

function followNavigation(
	state: TerminalState,
	url: string,
	inCourse: boolean
): TerminalState {
	if (url === state.route) {
		return state;
	}

	const moved = {
		...state,
		location: followRoute(state.location, url, inCourse),
		route: url,
	};
	if (state.pendingNavigation === url) {
		return { ...moved, pendingNavigation: null };
	}

	return {
		...moved,
		cycle: null,
		pendingNavigation: null,
		surface: emptySurface(),
	};
}
