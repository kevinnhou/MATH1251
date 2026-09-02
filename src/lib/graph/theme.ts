import { GRAPH_MODULES, type GraphModule } from "./types";

export const GRAPH_MODULE_VARS: Record<
	GraphModule,
	`--graph-module-${GraphModule}`
> = {
	algebra: "--graph-module-algebra",
	calculus: "--graph-module-calculus",
	core: "--graph-module-core",
};

export interface GraphTheme {
	border: string;
	card: string;
	fallback: string;
	foreground: string;
	modules: Record<GraphModule, string>;
	muted: string;
	text: string;
}

function readVar(style: CSSStyleDeclaration, name: string, fallback: string) {
	return style.getPropertyValue(name).trim() || fallback;
}

export function readGraphTheme(container: HTMLElement): GraphTheme {
	const style = getComputedStyle(container);
	const modules = {} as Record<GraphModule, string>;

	for (const module of GRAPH_MODULES) {
		modules[module] = readVar(style, GRAPH_MODULE_VARS[module], "#74828a");
	}

	return {
		border: readVar(style, "--color-fd-border", "#d4d4d4"),
		card: readVar(style, "--color-fd-card", "#f1f1f1"),
		fallback: readVar(style, "--graph-node-default", "#74828a"),
		foreground: readVar(style, "--color-fd-foreground", "#111827"),
		modules,
		muted: readVar(style, "--color-fd-muted-foreground", "#9ca3af"),
		text: readVar(style, "color", "#111827"),
	};
}
