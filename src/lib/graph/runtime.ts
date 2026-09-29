import type { GraphAction } from "./actions";
import type {
	GraphActionResult,
	GraphSession,
	GraphTargetResolver,
} from "./session";
import type { GraphDocument } from "./types";

export type GraphDispatch = (
	action: GraphAction,
	resolveTarget?: GraphTargetResolver
) => GraphActionResult;

export interface ReadyGraph {
	dispatch: GraphDispatch;
	document: GraphDocument;
	homeId: string;
	narrow: boolean;
	session: GraphSession;
	status: "ready";
}

export type GraphRuntime =
	| { homeId: string; status: "unavailable" }
	| { homeId: string; status: "loading" }
	| { homeId: string; retry: () => void; status: "error" }
	| ReadyGraph;
