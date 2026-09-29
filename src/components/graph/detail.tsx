"use client";

import { useId } from "react";
import { BlockHtml, InlineHtml } from "@/components/markdown/html";
import {
	type GraphNode,
	isEnvNode,
	isPageNode,
	nodeKindLabel,
} from "@/lib/graph/types";
import { moduleColorVar } from "./canvas-paint";
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
	const canOpen = !isCurrentPageNode(node.id, currentPageUrl);

	return (
		<section
			aria-labelledby={titleId}
			className="flex max-h-48 w-full flex-col border-fd-foreground border-l-2 bg-fd-card text-fd-foreground"
			style={{ borderLeftColor: `var(${moduleColorVar(node.module)})` }}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 py-2.5">
				<p className="font-mono text-[9px] text-fd-muted-foreground uppercase leading-none tracking-[0.16em]">
					{nodeKindLabel(node)}
				</p>
				<p className="wrap-break-word text-[13px] leading-snug" id={titleId}>
					<InlineHtml html={node.title.html} />
				</p>
				<DetailBody node={node} />
			</div>
			{onFocus || canOpen ? (
				<div className="flex shrink-0 justify-end gap-3 px-3 pb-2">
					{onFocus ? <BracketAction label="FOCUS" onClick={onFocus} /> : null}
					{canOpen ? (
						<BracketAction label="OPEN" onClick={() => onOpen(node.id)} />
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
