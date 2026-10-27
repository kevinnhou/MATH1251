export const THREAD_COLOR = "var(--relations-thread)";

export function foregroundAt(percent: number): string {
	return `color-mix(in oklab, var(--color-fd-foreground) ${percent}%, transparent)`;
}
