import type { MarkdownFragment, RenderedMarkdown } from "@/lib/markdown/types";
import { getMathEnvConfig } from "@/lib/math-env/kinds";
import { type GraphModule, type GraphNode, isPageNode } from "./types";

export interface GraphNodeSummary {
	id: string;
	ideas?: string[];
	kindCode?: string;
	kindWord?: string;
	module: GraphModule;
	preview: string;
	previewRendered?: RenderedMarkdown<"block" | "inline">;
	tags?: string[];
	title: MarkdownFragment<"inline">;
	type: "env" | "page";
	url: string;
}

export function summariseGraphNode(node: GraphNode): GraphNodeSummary {
	if (isPageNode(node)) {
		return {
			id: node.id,
			ideas: node.ideas,
			module: node.module,
			preview: node.description?.plain ?? node.id,
			previewRendered: node.description,
			tags: node.tags,
			title: node.title,
			type: "page",
			url: node.id,
		};
	}

	const kind = getMathEnvConfig(node.kind);
	return {
		id: node.id,
		kindCode: kind.code,
		kindWord: kind.word,
		module: node.module,
		preview: node.preview?.plain ?? node.kind,
		previewRendered: node.preview,
		title: node.title,
		type: "env",
		url: node.id,
	};
}

export function nodePlainTitle(node: GraphNode): string {
	return node.title.plain;
}
