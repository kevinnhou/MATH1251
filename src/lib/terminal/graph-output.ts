import { summariseGraphNode } from "@/lib/graph/node-summary";
import type { GraphEffect } from "@/lib/graph/session";
import type { GraphNode } from "@/lib/graph/types";
import {
	errorOutput,
	groupedLinks,
	inspectOutput,
	mutedMessage,
} from "./output";
import type { TerminalOutput } from "./types";

export function inspectNodeOutput(node: GraphNode): TerminalOutput {
	const summary = summariseGraphNode(node);
	return inspectOutput({
		actionUrl: summary.url,
		message: summary.preview,
		nodeId: summary.id,
		preview: summary.previewRendered,
		title: summary.title,
		type: summary.kindCode
			? `${summary.kindCode} / ${summary.kindWord}`
			: summary.type,
	});
}

export function matchesOutput(
	nodes: GraphNode[],
	query: string
): TerminalOutput {
	return groupedLinks(
		[
			{
				heading: "graph find",
				items: nodes.slice(0, 24).map((node) => ({
					hint: node.type,
					label: node.title,
					url: node.id,
				})),
			},
		],
		{
			message:
				nodes.length === 0
					? `No graph nodes match "${query}".`
					: `${nodes.length} match${nodes.length === 1 ? "" : "s"}.`,
			title: "graph find",
		}
	);
}

export function graphOutcomeToTerminal(
	effect: GraphEffect
): TerminalOutput | null {
	switch (effect.kind) {
		case "status":
			return mutedMessage(effect.message);
		case "inspect":
			return inspectNodeOutput(effect.node);
		case "matches":
			return matchesOutput(effect.nodes, effect.query);
		case "error":
			return errorOutput(effect.message);
		case "none":
			return null;
		default: {
			const _exhaustive: never = effect;
			return _exhaustive;
		}
	}
}
