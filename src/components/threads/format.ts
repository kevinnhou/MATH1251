export const MONO = "font-mono text-[10px] uppercase tracking-wider";

export function laneCode(title: string): string {
	return title.slice(0, 3).toUpperCase();
}

export function placeLabel(strand?: string, chapter?: number): string {
	return [strand ? laneCode(strand) : undefined, chapter]
		.filter((part) => part !== undefined)
		.join(" ");
}
