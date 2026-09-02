"use client";

import { useId } from "react";
import { BlockHtml, InlineHtml } from "@/components/markdown/html";
import { summariseGraphNode } from "@/lib/graph/node-summary";
import { GRAPH_MODULE_VARS } from "@/lib/graph/theme";
import { type GraphNode, isEnvNode, isPageNode } from "@/lib/graph/types";
import { BracketAction } from "./chrome";
import { isCurrentPageNode } from "./url";

export function GraphNodeDetail({
	currentPageUrl,
	node,
	onFocus,
	onOpen,
}: {
	currentPageUrl?: string;
	node: GraphNode;
	onFocus?: () => void;
	onOpen: (url: string) => void;
}) {
	const titleId = useId();
	const summary = summariseGraphNode(node);
	const accent = summary.module
		? `var(${GRAPH_MODULE_VARS[summary.module]})`
		: undefined;
	const canOpen =
		Boolean(summary.url) && !isCurrentPageNode(summary.url, currentPageUrl);
	const kindLabel = summary.kindCode
		? `${summary.kindCode} / ${summary.kindWord}`
		: summary.type;

	return (
		<section
			aria-labelledby={titleId}
			className="flex max-h-48 w-full flex-col border-fd-foreground border-l-2 bg-fd-card text-fd-foreground"
			style={{ borderLeftColor: accent }}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 py-2.5">
				<p className="font-mono text-[9px] text-fd-muted-foreground uppercase leading-none tracking-[0.16em]">
					{kindLabel}
				</p>
				<p className="wrap-break-word text-[13px] leading-snug" id={titleId}>
					<InlineHtml html={node.title.html} />
				</p>
				<DetailBody node={node} />
			</div>
			{onFocus || (canOpen && summary.url) ? (
				<div className="flex shrink-0 justify-end gap-3 px-3 pb-2">
					{onFocus ? <BracketAction label="FOCUS" onClick={onFocus} /> : null}
					{canOpen && summary.url ? (
						<BracketAction label="OPEN" onClick={() => onOpen(summary.url)} />
					) : null}
				</div>
			) : null}
		</section>
	);
}

function DetailBody({ node }: { node: GraphNode }) {
	if (isEnvNode(node)) {
		if (!node.preview) {
			return null;
		}

		return (
			<div className="max-h-28 min-h-0 overflow-hidden">
				<BlockHtml
					className="md-fragment-compact mb-0 line-clamp-6 text-[12px] leading-snug [&_p]:mb-0"
					html={node.preview.html}
				/>
			</div>
		);
	}

	if (isPageNode(node)) {
		return (
			<>
				<PageDescription node={node} />
				{node.tags.length > 0 ? (
					<MetadataLine label="tags" values={node.tags} />
				) : null}
				{node.ideas.length > 0 ? (
					<MetadataLine label="ideas" values={node.ideas} />
				) : null}
			</>
		);
	}

	return null;
}

function PageDescription({
	node,
}: {
	node: Extract<GraphNode, { type: "page" }>;
}) {
	if (!node.description) {
		return null;
	}

	return (
		<p className="md-fragment-compact line-clamp-4 min-h-0 overflow-hidden text-[12px] text-fd-muted-foreground leading-snug">
			<InlineHtml html={node.description.html} />
		</p>
	);
}

function MetadataLine({ label, values }: { label: string; values: string[] }) {
	return (
		<p className="font-mono text-[9px] text-fd-muted-foreground leading-relaxed">
			<span className="mr-1.5 text-fd-foreground/70 uppercase tracking-wider">
				[{label}]
			</span>
			{values.join(" · ")}
		</p>
	);
}
