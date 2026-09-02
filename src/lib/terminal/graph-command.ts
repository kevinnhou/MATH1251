import { inspectPolicy } from "@/lib/graph/inspect";
import { nodePlainTitle } from "@/lib/graph/node-summary";
import { parseGraphArgs } from "@/lib/graph/parse";
import { commitGraphAction, resolveGraphTarget } from "@/lib/graph/session";
import {
	GRAPH_DEPTH_ARGS,
	GRAPH_STRAND_ARGS,
	type GraphDocument,
	type GraphNode,
} from "@/lib/graph/types";
import { graphOutcomeToTerminal } from "./graph-output";
import { errorOutput, mutedMessage, usageOutput } from "./output";
import { quoteIfNeeded, tokenValues } from "./parse";
import { resolvePage } from "./resolve";
import type {
	CommandDescriptor,
	CommandResult,
	CompleteContext,
	Completion,
	CurrentPages,
	ExecuteContext,
	PageCatalog,
	ParsedLine,
} from "./types";
import { TERMINAL_COMPLETION_LIMIT } from "./types";

const GRAPH_SUBCOMMANDS = [
	"depth",
	"strand",
	"focus",
	"find",
	"immerse",
	"collapse",
	"reset",
] as const;

export function graphCommand(): CommandDescriptor {
	return {
		advertised: true,
		complete: completeGraphCommand,
		execute: executeGraphCommand,
		id: "graph",
		names: ["graph"],
		usage: "graph <depth|strand|focus|find|immerse|collapse|reset>",
	};
}

function completeGraphCommand(ctx: CompleteContext): Completion[] {
	if (ctx.graph.status !== "ready") {
		return [];
	}

	return completeGraph(ctx.parsed, ctx.graph.document.nodes);
}

function executeGraphCommand(ctx: ExecuteContext): CommandResult {
	const { graph } = ctx;
	if (graph.status === "unavailable") {
		return {
			output: errorOutput(
				"Graph canvas is hidden on kind-view routes. Open the parent notes page."
			),
		};
	}

	if (graph.status === "loading") {
		return {
			output: errorOutput("Graph is still loading. Try again in a moment."),
		};
	}

	if (graph.status === "error") {
		return {
			output: errorOutput(
				"Graph failed to load. Use RETRY on the canvas, then try graph again."
			),
		};
	}

	const parsed = parseGraphArgs(tokenValues(ctx.parsed).slice(1));
	if (!parsed.ok) {
		return { output: usageOutput(parsed.error) };
	}

	const { document } = graph;
	const result = commitGraphAction(
		graph.session,
		parsed.value,
		{
			document,
			homeId: graph.homeId,
			resolveTarget: (raw) =>
				resolveFocusTarget(
					raw,
					document,
					graph.homeId,
					ctx.catalog,
					ctx.current
				),
		},
		graph.setSession
	);
	const output = graphOutcomeToTerminal(result.effect);
	if (!output) {
		throw new Error("graph command produced no output");
	}

	const decision = inspectPolicy(result, {
		homeId: graph.homeId,
		narrow: graph.narrow,
		source: "cli",
	});
	if (decision === "clear" && result.effect.kind === "inspect") {
		return {
			output: mutedMessage(`Focused ${nodePlainTitle(result.effect.node)}.`),
		};
	}

	return { output };
}

export function completeGraph(
	parsed: ParsedLine,
	nodes: GraphNode[]
): Completion[] {
	const values = tokenValues(parsed);
	const args = parsed.trailingSpace ? values.slice(1) : values.slice(1, -1);
	const partial = parsed.trailingSpace ? "" : parsed.partial;
	if (args.length === 0) {
		return prefixCompletions([...GRAPH_SUBCOMMANDS], partial);
	}

	const [action] = args;
	const name = action?.toLowerCase();
	if (args.length === 1 && (name === "depth" || name === "reach")) {
		return prefixCompletions([...GRAPH_DEPTH_ARGS], partial);
	}

	if (args.length === 1 && (name === "strand" || name === "module")) {
		return prefixCompletions([...GRAPH_STRAND_ARGS], partial);
	}

	if (args.length === 1 && name === "find") {
		return prefixCompletions(["clear"], partial);
	}

	if (args.length === 1 && name === "focus") {
		return nodeCompletions(nodes, partial);
	}

	return [];
}

export function resolveFocusTarget(
	raw: string,
	document: GraphDocument,
	homeId: string,
	catalog: PageCatalog,
	current: CurrentPages
): GraphNode | GraphNode[] | undefined {
	const fromGraph = resolveGraphTarget(raw, document, homeId);
	if (fromGraph) {
		return fromGraph;
	}

	const resolved = resolvePage(catalog, raw, current.route);
	if (resolved.kind === "match") {
		return document.nodes.find((node) => node.id === resolved.page.url);
	}

	if (resolved.kind === "ambiguous") {
		return resolved.pages.flatMap((page) =>
			document.nodes.filter((node) => node.id === page.url)
		);
	}
}

function prefixCompletions(values: string[], partial: string): Completion[] {
	const needle = partial.toLowerCase();
	return values
		.filter((value) => needle === "" || value.startsWith(needle))
		.map((value) => ({ label: value, replace: value }));
}

function nodeCompletions(nodes: GraphNode[], partial: string): Completion[] {
	const needle = partial.toLowerCase();
	return nodes
		.filter(
			(node) =>
				needle === "" ||
				node.title.source.toLowerCase().includes(needle) ||
				node.title.plain.toLowerCase().includes(needle) ||
				node.id.toLowerCase().includes(needle)
		)
		.slice(0, TERMINAL_COMPLETION_LIMIT)
		.map((node) => ({
			detail: node.id,
			label: node.title,
			replace: quoteIfNeeded(node.id),
		}));
}
