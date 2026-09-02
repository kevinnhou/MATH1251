import type { GraphModule, GraphReach } from "./types";

export type GraphAction =
	| { type: "status" }
	| { type: "immerse" }
	| { type: "collapse" }
	| { type: "reset" }
	| { type: "set-depth"; value: GraphReach }
	| { type: "set-strand"; value: GraphModule | null }
	| { type: "focus"; target: string }
	| { type: "select"; id: string | null }
	| { type: "find"; text: string }
	| { type: "find-clear" };
