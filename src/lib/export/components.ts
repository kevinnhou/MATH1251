import courseServers from "course.server";
import { ENV } from "@/lib/mdx-env/kinds";
import {
	type ComponentOccurrence,
	replaceComponents,
} from "@/lib/mdx-env/page-envs";
import type {
	ComponentExport,
	ComponentInput,
	ContextOutput,
	DomainServer,
	ExportSurface,
	GraphReader,
} from "./domain";
import { nodeLink } from "./format";
import type {
	ContextBlock,
	ExportGraph,
	ExportNode,
	ExportSegment,
} from "./model";
import {
	derivationsOf,
	pageIdOf,
	prerequisites,
	relationsOf,
	threadsOf,
} from "./query";

const servers: readonly DomainServer[] = courseServers;

const EXPORTS = new Map<string, ComponentExport>(
	servers.flatMap((server) => Object.entries(server.components ?? {}))
);

for (const tag of EXPORTS.keys()) {
	if (!ENV.components.has(tag)) {
		const reason =
			ENV.envKindFromTag(tag) === undefined
				? "which no listed domain's index.ts defines as a component"
				: "which is an environment; only plain components have export methods";
		throw new Error(`A domain's server.ts exports <${tag}>, ${reason}.`);
	}
}

export interface Renderer {
	body: (node: ExportNode) => string | undefined;
	extraBlocks: () => ContextBlock[];
	prose: (pageId: string, markdown: string) => string;
	statement: (node: ExportNode) => string | undefined;
}

const LIST_MARKER = /[-*+]|\d+[.)]/g;
const LINE_PREFIX = /^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)*$/;

export function exportRenderer(
	graph: ExportGraph,
	surface: ExportSurface
): Renderer {
	const extra: ContextBlock[] = [];

	const fill = (pageId: string | undefined, template: string): string => {
		const occurrences =
			pageId === undefined ? undefined : graph.components.get(pageId);
		if (pageId === undefined || occurrences === undefined) {
			return template;
		}

		return fillTemplate(template, occurrences, (occurrence) => {
			const output = renderOccurrence(graph, surface, pageId, occurrence);
			if (typeof output === "string") {
				return output;
			}

			extra.push(...(output.blocks ?? []));
			return output.text;
		});
	};

	const field =
		(name: "body" | "statement") =>
		(node: ExportNode): string | undefined => {
			const template = graph.templates.get(node.id)?.[name];
			return template === undefined
				? node[name]
				: fill(pageIdOf(node), template);
		};

	return {
		body: field("body"),
		extraBlocks: () =>
			extra
				.map((block) => ({ ...block, text: block.text.trim() }))
				.filter((block) => block.text !== ""),
		prose: fill,
		statement: field("statement"),
	};
}

function renderOccurrence(
	graph: ExportGraph,
	surface: ExportSurface,
	pageId: string,
	occurrence: ComponentOccurrence
): ContextOutput {
	const methods = EXPORTS.get(occurrence.tag);
	const method =
		surface === "context"
			? (methods?.context ?? methods?.markdown)
			: methods?.markdown;
	if (method === undefined) {
		return occurrence.children;
	}

	try {
		return method(componentInput(graph, surface, pageId, occurrence));
	} catch (error) {
		throw new Error(
			`<${occurrence.tag}> on ${pageId} failed to export: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		);
	}
}

function componentInput(
	graph: ExportGraph,
	surface: ExportSurface,
	pageId: string,
	occurrence: ComponentOccurrence
): ComponentInput {
	const page = graph.nodes.get(pageId);
	if (page === undefined) {
		throw new Error(`Unknown page "${pageId}".`);
	}

	const env =
		occurrence.env === undefined
			? undefined
			: graph.nodes.get(`${pageId}#${occurrence.env}`);

	return {
		children: occurrence.children,
		graph: reader(graph),
		link: (id) => {
			const node = graph.nodes.get(id);
			if (node === undefined) {
				throw new Error(`link("${id}") names no node.`);
			}
			return nodeLink(node);
		},
		page,
		props: occurrence.props,
		resolve: (slug) => {
			const id = graph.slugs.get(slug);
			return id === undefined ? undefined : graph.nodes.get(id);
		},
		segment: occurrence.segment,
		segments: textSegments(graph, pageId),
		surface,
		tag: occurrence.tag,
		...(env === undefined ? {} : { env }),
	};
}

const READERS = new WeakMap<ExportGraph, GraphReader>();

function reader(graph: ExportGraph): GraphReader {
	let cached = READERS.get(graph);
	if (cached === undefined) {
		const nodes = [...graph.nodes.values()];
		cached = {
			derivations: (id) => derivationsOf(graph, id),
			node: (id) => graph.nodes.get(id),
			nodes: () => nodes,
			prerequisites: (id) => prerequisites(graph, id),
			relations: (id, names) => relationsOf(graph, id, names),
			threads: (id) => threadsOf(graph, id),
		};
		READERS.set(graph, cached);
	}

	return cached;
}

function textSegments(
	graph: ExportGraph,
	pageId: string
): readonly ExportSegment[] {
	const occurrences = graph.components.get(pageId) ?? [];
	return (graph.segments.get(pageId) ?? []).map((segment) =>
		segment.type === "prose"
			? {
					...segment,
					markdown: fillTemplate(
						segment.markdown,
						occurrences,
						({ children }) => children
					),
				}
			: segment
	);
}

function fillTemplate(
	template: string,
	occurrences: readonly ComponentOccurrence[],
	output: (occurrence: ComponentOccurrence) => string
): string {
	return replaceComponents(template, (index, linePrefix) => {
		const occurrence = occurrences[index];
		return occurrence === undefined
			? ""
			: indent(output(occurrence).trim(), linePrefix);
	});
}

function indent(text: string, linePrefix: string): string {
	if (!(text.includes("\n") && LINE_PREFIX.test(linePrefix))) {
		return text;
	}

	const continuation = linePrefix.replace(LIST_MARKER, (marker) =>
		" ".repeat(marker.length)
	);
	return text
		.split("\n")
		.map((line, index) => {
			if (index === 0) {
				return line;
			}
			return line === "" ? continuation.trimEnd() : `${continuation}${line}`;
		})
		.join("\n");
}
