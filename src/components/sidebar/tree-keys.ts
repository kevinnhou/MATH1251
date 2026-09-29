import { isModifiedKey } from "@/lib/client/actions";

export const TREE = {
	folder: "[data-tree-folder]",
	headerRow: ":scope > [data-tree-header] [data-tree-row]",
	hit: (url: string) => `[data-hit-url="${CSS.escape(url)}"]`,
	root: "[data-tree-root]",
	row: "[data-tree-row]",
	section: "[data-tree-section]",
	toggle: ":scope > [data-tree-header] [data-tree-toggle]",
} as const;

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

	const row = (event.target as HTMLElement).closest<HTMLElement>(TREE.row);
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
			.closest(TREE.folder)
			?.querySelector(":scope > [data-tree-content]");
		return content ? (visibleRows(content)[0] ?? null) : null;
	}

	if (isHeader && open) {
		return "toggle";
	}

	const own = row.closest(TREE.folder);
	const parent = isHeader ? own?.parentElement?.closest(TREE.folder) : own;
	return parent?.querySelector<HTMLElement>(TREE.headerRow) ?? null;
}

function toggleFolder(header: HTMLElement): void {
	header.closest(TREE.folder)?.querySelector<HTMLElement>(TREE.toggle)?.click();
}

function visibleRows(scope: Element): HTMLElement[] {
	return [...scope.querySelectorAll<HTMLElement>(TREE.row)].filter((row) =>
		row.checkVisibility({ visibilityProperty: true })
	);
}

export function treeRoot(): HTMLElement | null {
	return document.querySelector<HTMLElement>(TREE.root);
}

export function sectionHeader(index: number): HTMLElement | undefined {
	return (
		treeRoot()?.querySelectorAll<HTMLElement>(TREE.section)[index] ?? undefined
	);
}
