import type { Direction } from "@/lib/relations/types";

export const MUTED_COLOR = "var(--color-fd-muted-foreground)";

export const DIRECTION_COLORS: Record<Direction, string> = {
	"builds-on": "var(--relations-builds-on)",
	"leads-to": "var(--relations-leads-to)",
};
