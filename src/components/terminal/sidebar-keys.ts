import { isEditableTarget, isModifiedKey } from "@/lib/client/actions";

const ROW = "[data-tree-row]";
const FOLDER = "[data-tree-folder]";
const HEADER_ROW = ":scope > [data-tree-header] [data-tree-row]";
const TOGGLE = ":scope > [data-tree-header] [data-tree-toggle]";
const DIGIT = /^[0-9]$/;

const MOVES: Record<string, "up" | "down" | "out" | "in"> = {
	ArrowDown: "down",
	ArrowLeft: "out",
	ArrowRight: "in",
	ArrowUp: "up",
	a: "out",
	d: "in",
	s: "down",
	w: "up",
};

export function handleTreeKey(
	event: React.KeyboardEvent<HTMLElement>,
	root: HTMLElement
): void {
	if (isModifiedKey(event.nativeEvent) || event.shiftKey) {
		return;
	}

	const row = (event.target as HTMLElement).closest<HTMLElement>(ROW);
	if (!(row && root.contains(row))) {
		return;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		row.blur();
		return;
	}

	if (event.key === " " && row.tagName === "A") {
		event.preventDefault();
		row.click();
		return;
	}

	const move =
		MOVES[event.key.length === 1 ? event.key.toLowerCase() : event.key];
	if (!move) {
		return;
	}

	event.preventDefault();
	const target = resolveMove(move, row, root);
	if (target instanceof HTMLElement) {
		target.focus();
	} else if (target === "toggle") {
		toggleFolder(row);
	}
}

function resolveMove(
	move: "up" | "down" | "out" | "in",
	row: HTMLElement,
	root: HTMLElement
): HTMLElement | "toggle" | null {
	if (move === "up" || move === "down") {
		const rows = visibleRows(root);
		const index = rows.indexOf(row);
		return rows[index + (move === "up" ? -1 : 1)] ?? null;
	}

	const isHeader = row.dataset.treeFolderOpen !== undefined;
	const open = row.dataset.treeFolderOpen === "true";

	if (move === "in") {
		if (!isHeader) {
			return null;
		}

		if (!open) {
			return "toggle";
		}

		const content = row
			.closest(FOLDER)
			?.querySelector(":scope > [data-tree-content]");
		return content ? (visibleRows(content)[0] ?? null) : null;
	}

	if (isHeader && open) {
		return "toggle";
	}

	const own = row.closest(FOLDER);
	const parent = isHeader ? own?.parentElement?.closest(FOLDER) : own;
	return parent?.querySelector<HTMLElement>(HEADER_ROW) ?? null;
}

function toggleFolder(header: HTMLElement): void {
	header.closest(FOLDER)?.querySelector<HTMLElement>(TOGGLE)?.click();
}

function visibleRows(scope: Element): HTMLElement[] {
	return [...scope.querySelectorAll<HTMLElement>(ROW)].filter((row) =>
		row.checkVisibility({ visibilityProperty: true })
	);
}

export function sectionIndex(event: KeyboardEvent): number | null {
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

export function focusSection(root: HTMLElement, index: number): boolean {
	const sections = [...root.querySelectorAll<HTMLElement>(FOLDER)].filter(
		(folder) => !folder.parentElement?.closest(FOLDER)
	);
	const header = sections[index]?.querySelector<HTMLElement>(HEADER_ROW);
	header?.focus();
	return header !== undefined;
}
