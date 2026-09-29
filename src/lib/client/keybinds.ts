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
