import type { ReactNode } from "react";
import { MONO } from "./format";

export const ACTION = `${MONO} outline-none hover:text-fd-foreground focus-visible:text-fd-foreground`;

export function Bracket({ children }: { children: ReactNode }) {
	return (
		<span className="whitespace-nowrap">
			<span className="text-fd-foreground">[</span>
			{children}
			<span className="text-fd-foreground">]</span>
		</span>
	);
}
