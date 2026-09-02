import {
	GRAPH_HOP_MAX,
	type GraphModule,
	type GraphNode,
	type GraphQuery,
	type GraphReach,
	isGraphReach,
} from "./types";

export function createLocalGraphQuery(
	pageUrl: string,
	reach: GraphReach = 1
): GraphQuery {
	return {
		focus: { id: pageUrl, reach: clampReach(reach) },
		module: null,
	};
}

export function normaliseGraphQuery(query: GraphQuery): GraphQuery {
	return {
		focus: { id: query.focus.id, reach: clampReach(query.focus.reach) },
		module: query.module,
	};
}

export function setModuleFilter(
	query: GraphQuery,
	module: GraphModule | null
): GraphQuery {
	return {
		...query,
		module,
	};
}

export function setFocus(query: GraphQuery, id: string): GraphQuery {
	const sameNode = query.focus.id === id;

	return {
		...query,
		focus: {
			id,
			reach: sameNode ? query.focus.reach : 1,
		},
	};
}

export function setFocusReach(
	query: GraphQuery,
	reach: GraphReach
): GraphQuery {
	return {
		...query,
		focus: {
			...query.focus,
			reach: clampReach(reach),
		},
	};
}

export function clampReach(reach: GraphReach | number | string): GraphReach {
	if (isGraphReach(reach)) {
		return reach;
	}

	const parsed = typeof reach === "number" ? reach : Number.parseInt(reach, 10);
	if (Number.isNaN(parsed)) {
		return 1;
	}

	const hop = Math.trunc(parsed);
	if (hop >= GRAPH_HOP_MAX + 1) {
		return "all";
	}

	if (hop <= 1) {
		return 1;
	}

	if (hop === 2) {
		return 2;
	}

	return 3;
}

export function matchesQueryModules(
	node: GraphNode,
	module: GraphModule | null
): boolean {
	if (!module) {
		return true;
	}

	return node.module === module;
}
