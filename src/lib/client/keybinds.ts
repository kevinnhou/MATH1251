import { isEditableTarget, isModifiedKey } from "./actions";

const DIGIT = /^[0-9]$/;

export function isSearchHotkey(event: KeyboardEvent): boolean {
	const meta = event.metaKey || event.ctrlKey;
	return (event.key === "k" || event.key === "K") && meta && !event.altKey;
}

export function isSlashHotkey(event: KeyboardEvent): boolean {
	return (
		event.key === "/" &&
		!isModifiedKey(event) &&
		!isEditableTarget(event.target)
	);
}

export function sectionHotkey(event: KeyboardEvent): number | null {
	if (
		event.defaultPrevented ||
		isModifiedKey(event) ||
		event.shiftKey ||
		isEditableTarget(event.target) ||
		!DIGIT.test(event.key)
	) {
		return null;
	}

	return event.key === "0" ? 9 : Number(event.key) - 1;
}

export type Move = "up" | "down" | "left" | "right";

const MOVES: Record<string, Move> = {
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	ArrowUp: "up",
	a: "left",
	d: "right",
	s: "down",
	w: "up",
};

export function moveKey(event: KeyboardEvent): Move | null {
	if (isModifiedKey(event) || event.shiftKey) {
		return null;
	}

	return (
		MOVES[event.key.length === 1 ? event.key.toLowerCase() : event.key] ?? null
	);
}

export function cursorKey(
	event: KeyboardEvent,
	at: number,
	count: number
): number | undefined {
	if (event.key === "Home") {
		return 0;
	}
	if (event.key === "End") {
		return count - 1;
	}

	const move = moveKey(event);
	if (move === "left" || move === "right") {
		return stepWithin(at, move === "left" ? -1 : 1, count);
	}
}

export function stepWithin(at: number, by: number, count: number): number {
	return Math.min(Math.max(at + by, 0), count - 1);
}

export function focusSibling(
	from: HTMLElement,
	{ item, scope }: { item: string; scope: string },
	step: -1 | 1
) {
	const root = from.closest(scope) ?? document;
	const items = [...root.querySelectorAll<HTMLElement>(item)];
	items[items.indexOf(from) + step]?.focus();
}
