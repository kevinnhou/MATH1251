import { TERMINAL_HISTORY_KEY, TERMINAL_HISTORY_LIMIT } from "./types";

export interface HistoryState {
	cursor: number | null;
	draft: string;
	entries: string[];
}

export function emptyHistory(): HistoryState {
	return {
		cursor: null,
		draft: "",
		entries: [],
	};
}

export function pushHistory(entries: string[], command: string): string[] {
	const trimmed = command.trim();
	if (trimmed === "") {
		return entries;
	}

	const without = entries.filter((entry) => entry !== trimmed);
	return [...without, trimmed].slice(-TERMINAL_HISTORY_LIMIT);
}

export function historyUp(state: HistoryState, draft: string): HistoryState {
	if (state.entries.length === 0) {
		return state;
	}

	if (state.cursor === null) {
		return {
			cursor: state.entries.length - 1,
			draft,
			entries: state.entries,
		};
	}

	if (state.cursor === 0) {
		return state;
	}

	return {
		...state,
		cursor: state.cursor - 1,
	};
}

export function historyDown(state: HistoryState): HistoryState {
	if (state.cursor === null) {
		return state;
	}

	if (state.cursor >= state.entries.length - 1) {
		return {
			cursor: null,
			draft: state.draft,
			entries: state.entries,
		};
	}

	return {
		...state,
		cursor: state.cursor + 1,
	};
}

export function historyValue(state: HistoryState): string {
	if (state.cursor === null) {
		return state.draft;
	}

	return state.entries[state.cursor] ?? state.draft;
}

export function loadHistory(): string[] {
	if (typeof sessionStorage === "undefined") {
		return [];
	}

	try {
		const raw = sessionStorage.getItem(TERMINAL_HISTORY_KEY);
		if (raw === null) {
			return [];
		}

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed
			.filter((entry): entry is string => typeof entry === "string")
			.slice(-TERMINAL_HISTORY_LIMIT);
	} catch {
		return [];
	}
}

export function saveHistory(entries: string[]) {
	if (typeof sessionStorage === "undefined") {
		return;
	}

	try {
		sessionStorage.setItem(
			TERMINAL_HISTORY_KEY,
			JSON.stringify(entries.slice(-TERMINAL_HISTORY_LIMIT))
		);
	} catch {
		// Ignore quota and private-mode failures.
	}
}
