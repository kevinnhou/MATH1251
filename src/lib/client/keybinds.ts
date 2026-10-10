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

// Arrows and WASD, for widgets that own them while focused (sidebar tree,
// route strip, thread map). Nothing listens for these on the window.
export function moveKey(event: KeyboardEvent): Move | null {
	if (isModifiedKey(event) || event.shiftKey) {
		return null;
	}

	return (
		MOVES[event.key.length === 1 ? event.key.toLowerCase() : event.key] ?? null
	);
}
