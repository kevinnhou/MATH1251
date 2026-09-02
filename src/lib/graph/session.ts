import type { GraphAction } from "./actions";
import { nodePlainTitle } from "./node-summary";
import { locateNodes, projectGraph } from "./project";
import {
	createLocalGraphQuery,
	matchesQueryModules,
	normaliseGraphQuery,
	setFocus,
	setFocusReach,
	setModuleFilter,
} from "./query";
import {
	GRAPH_MODULE_LABELS,
	type GraphDocument,
	type GraphNode,
	type GraphQuery,
} from "./types";

export interface GraphSession {
	expanded: boolean;
	locate: string;
	query: GraphQuery;
	selectedId: string | null;
}

export interface GraphActionContext {
	document: GraphDocument;
	homeId: string;
	resolveTarget: (raw: string) => GraphNode | GraphNode[] | undefined;
}

export type GraphEffect =
	| { kind: "status"; message: string }
	| { kind: "inspect"; node: GraphNode }
	| { kind: "matches"; nodes: GraphNode[]; query: string }
	| { kind: "error"; message: string }
	| { kind: "none" };

export interface GraphActionResult {
	effect: GraphEffect;
	session: GraphSession;
}

export function createGraphSession(pageUrl: string): GraphSession {
	return {
		expanded: false,
		locate: "",
		query: createLocalGraphQuery(pageUrl, 1),
		selectedId: null,
	};
}

export function applyGraphAction(
	session: GraphSession,
	action: GraphAction,
	ctx: GraphActionContext
): GraphActionResult {
	switch (action.type) {
		case "status":
			return status(session, statusText(session, ctx.document, ctx.homeId));
		case "immerse":
			return status({ ...session, expanded: true }, "Immersed in the graph.");
		case "collapse":
			return status(
				collapseSession(session, ctx.homeId),
				"Collapsed the graph."
			);
		case "reset":
			return status(createGraphSession(ctx.homeId), "Reset the graph.");
		case "set-depth":
			return commitQuery(
				session,
				setFocusReach(session.query, action.value),
				ctx.document,
				`Depth set to ${action.value}.`
			);
		case "set-strand": {
			const label =
				action.value === null ? "all" : GRAPH_MODULE_LABELS[action.value];
			return commitQuery(
				session,
				setModuleFilter(session.query, action.value),
				ctx.document,
				`Strand filter: ${label}.`
			);
		}
		case "focus":
			return focusNode(session, action.target, ctx);
		case "select":
			return selectNode(session, action.id, ctx.document);
		case "find": {
			const projection = projectGraph(ctx.document, session.query);
			const hits = locateNodes(projection.nodes, action.text);
			return {
				effect: { kind: "matches", nodes: hits, query: action.text },
				session: { ...session, locate: action.text },
			};
		}
		case "find-clear":
			return status({ ...session, locate: "" }, "Cleared graph locate.");
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}

export function commitGraphAction(
	session: GraphSession,
	action: GraphAction,
	ctx: GraphActionContext,
	setSession: (session: GraphSession) => void
): GraphActionResult {
	const result = applyGraphAction(session, action, ctx);
	setSession(result.session);
	return result;
}

function focusNode(
	session: GraphSession,
	target: string,
	ctx: GraphActionContext
): GraphActionResult {
	const resolved = ctx.resolveTarget(target);
	if (Array.isArray(resolved)) {
		return {
			effect: { kind: "matches", nodes: resolved, query: target },
			session,
		};
	}

	if (!resolved) {
		return {
			effect: {
				kind: "error",
				message: `graph focus: no such node: ${target}`,
			},
			session,
		};
	}

	if (!matchesQueryModules(resolved, session.query.module)) {
		return {
			effect: {
				kind: "error",
				message: `graph focus: ${nodePlainTitle(resolved)} is outside the current strand.`,
			},
			session,
		};
	}

	const next = transitionQuery(
		{
			...session,
			expanded: true,
			selectedId: resolved.id,
		},
		setFocus(session.query, resolved.id),
		ctx.document
	);
	return {
		effect: { kind: "inspect", node: resolved },
		session: next.session,
	};
}

function selectNode(
	session: GraphSession,
	id: string | null,
	document: GraphDocument
): GraphActionResult {
	if (id === null) {
		return {
			effect: { kind: "none" },
			session: { ...session, selectedId: null },
		};
	}

	const node = document.nodes.find((entry) => entry.id === id);
	if (!node) {
		return {
			effect: { kind: "error", message: `graph: no such node: ${id}` },
			session,
		};
	}

	return {
		effect: { kind: "inspect", node },
		session: { ...session, selectedId: node.id },
	};
}

function collapseSession(session: GraphSession, homeId: string): GraphSession {
	return {
		expanded: false,
		locate: "",
		query: normaliseGraphQuery({
			focus: {
				id: homeId,
				reach: session.query.focus.reach,
			},
			module: null,
		}),
		selectedId: null,
	};
}

function transitionQuery(
	session: GraphSession,
	query: GraphQuery,
	document: GraphDocument
): { nodeCount: number; session: GraphSession } {
	const nextQuery = normaliseGraphQuery(query);
	const projection = projectGraph(document, nextQuery);
	const selectedStillVisible =
		session.selectedId !== null &&
		projection.nodes.some((node) => node.id === session.selectedId);

	return {
		nodeCount: projection.nodes.length,
		session: {
			...session,
			query: nextQuery,
			selectedId: selectedStillVisible ? session.selectedId : null,
		},
	};
}

function commitQuery(
	session: GraphSession,
	query: GraphQuery,
	document: GraphDocument,
	message: string
): GraphActionResult {
	const next = transitionQuery(session, query, document);
	return status(
		next.session,
		`${message} ${next.nodeCount} node${next.nodeCount === 1 ? "" : "s"}.`
	);
}

export function statusText(
	session: GraphSession,
	document: GraphDocument,
	homeId: string
): string {
	const projection = projectGraph(document, session.query);
	const strand =
		session.query.module === null
			? "all"
			: GRAPH_MODULE_LABELS[session.query.module];
	return [
		`focus ${session.query.focus.id}`,
		`depth ${session.query.focus.reach}`,
		`strand ${strand}`,
		session.expanded ? "immersed" : "compact",
		`${projection.nodes.length} nodes`,
		session.locate === "" ? "locate off" : `locate "${session.locate}"`,
		`home ${homeId}`,
		"",
		"Subcommands: depth, strand, focus, find, immerse, collapse, reset.",
	].join("\n");
}

export function resolveGraphTarget(
	raw: string,
	document: GraphDocument,
	homeId: string
): GraphNode | GraphNode[] | undefined {
	if (raw === "." || raw === "") {
		return document.nodes.find((node) => node.id === homeId);
	}

	const exact = document.nodes.find((node) => node.id === raw);
	if (exact) {
		return exact;
	}

	const needle = raw.toLowerCase();
	const titled = document.nodes.filter((node) => {
		if (
			node.title.source.toLowerCase() === needle ||
			node.title.plain.toLowerCase() === needle
		) {
			return true;
		}

		return node.type === "env" && node.slug.toLowerCase() === needle;
	});
	if (titled.length === 1) {
		return titled[0];
	}

	if (titled.length > 1) {
		return titled;
	}
}

function status(session: GraphSession, message: string): GraphActionResult {
	return {
		effect: { kind: "status", message },
		session,
	};
}
