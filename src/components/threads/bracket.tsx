import type { ReactNode } from "react";

export const ACTION =
	"font-mono text-[10px] uppercase tracking-wider outline-none hover:text-fd-foreground focus-visible:text-fd-foreground";

export function Bracket({ children }: { children: ReactNode }) {
	return (
		<span className="whitespace-nowrap">
			<span className="text-fd-foreground">[</span>
			{children}
			<span className="text-fd-foreground">]</span>
		</span>
	);
}
