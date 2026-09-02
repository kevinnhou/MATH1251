import type { GraphSession } from "./session";
import type { GraphDocument } from "./types";

export type GraphRuntime =
	| { homeId: string; status: "unavailable" }
	| {
			homeId: string;
			session: GraphSession;
			setSession: (session: GraphSession) => void;
			status: "loading";
	  }
	| {
			homeId: string;
			retry: () => void;
			session: GraphSession;
			setSession: (session: GraphSession) => void;
			status: "error";
	  }
	| {
			document: GraphDocument;
			homeId: string;
			narrow: boolean;
			session: GraphSession;
			setSession: (session: GraphSession) => void;
			status: "ready";
	  };

export function unavailableGraphRuntime(homeId: string): GraphRuntime {
	return {
		homeId,
		status: "unavailable",
	};
}
