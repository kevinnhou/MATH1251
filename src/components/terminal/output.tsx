"use client";

import Link from "fumadocs-core/link";
import { useState } from "react";
import { useGraph } from "@/components/graph/provider";
import {
	BlockHtml,
	InlineHtml,
	InlineLabelView,
} from "@/components/markdown/html";
import { copyText } from "@/lib/client/actions";
import { cn } from "@/lib/cn";
import { commitGraphAction } from "@/lib/graph/session";
import type { RenderedMarkdown } from "@/lib/markdown/types";
import { plainInlineLabel } from "@/lib/markdown/types";
import { groupSearchHits } from "@/lib/terminal/search";
import type {
	LinkGroup,
	OutputLink,
	SearchHit,
	TerminalOutput,
} from "@/lib/terminal/types";
import { useTerminal } from "./provider";

export function TerminalOutputPane({
	captureRef = true,
}: {
	captureRef?: boolean;
}) {
	const { outputRef, surface } = useTerminal();
	const { echo, output } = surface;
	if (!output) {
		return null;
	}

	return (
		<div
			aria-live="off"
			className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4 font-mono text-[12px] text-fd-foreground"
			ref={captureRef ? outputRef : undefined}
			role="log"
		>
			{echo ? <p className="text-fd-muted-foreground">{echo}</p> : null}
			<OutputBody output={output} />
		</div>
	);
}

function OutputBody({ output }: { output: TerminalOutput }) {
	switch (output.kind) {
		case "loading":
			return <p className="text-fd-muted-foreground">{output.message}</p>;
		case "error":
			return <p className="text-fd-foreground">{output.message}</p>;
		case "usage":
			return (
				<pre className="wrap-break-word whitespace-pre-wrap font-mono text-[12px]">
					{output.message}
				</pre>
			);
		case "message":
			return (
				<div className="flex flex-col gap-2">
					<pre
						className={
							output.tone === "muted"
								? "wrap-break-word whitespace-pre-wrap font-mono text-[12px] text-fd-muted-foreground"
								: "wrap-break-word whitespace-pre-wrap font-mono text-[12px]"
						}
					>
						{output.message}
					</pre>
					{output.action ? (
						<BracketLink href={output.action.url} label={output.action.label} />
					) : null}
				</div>
			);
		case "link-list":
			return (
				<div className="flex flex-col gap-2">
					{output.message ? (
						<p className="text-fd-muted-foreground">{output.message}</p>
					) : null}
					{output.title ? (
						<p className="text-fd-muted-foreground uppercase tracking-wider">
							{output.title}
						</p>
					) : null}
					<GroupedLinks groups={output.groups} />
				</div>
			);
		case "search-results":
			return (
				<div className="flex flex-col gap-5">
					<p className="text-fd-muted-foreground">{output.message}</p>
					<SearchList hits={output.hits} />
				</div>
			);
		case "markdown":
			return <MarkdownBlock output={output} />;
		case "inspect":
			return (
				<div className="flex flex-col gap-2">
					{output.type ? (
						<p className="text-fd-muted-foreground uppercase tracking-wider">
							{output.type}
						</p>
					) : null}
					<p className="text-fd-foreground">
						<InlineLabelView label={output.title} />
					</p>
					<InspectPreview message={output.message} preview={output.preview} />
					<InspectActions actionUrl={output.actionUrl} nodeId={output.nodeId} />
				</div>
			);
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
}

function InspectActions({
	actionUrl,
	nodeId,
}: {
	actionUrl?: string;
	nodeId: string;
}) {
	const graph = useGraph();
	const canFocus =
		graph.status === "ready" && graph.session.query.focus.id !== nodeId;

	function focusNode() {
		if (graph.status !== "ready") {
			return;
		}

		commitGraphAction(
			graph.session,
			{ target: nodeId, type: "focus" },
			{
				document: graph.document,
				homeId: graph.homeId,
				resolveTarget: (raw) =>
					graph.document.nodes.find((node) => node.id === raw),
			},
			graph.setSession
		);
	}

	if (!(canFocus || actionUrl)) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-3">
			{canFocus ? <BracketButton label="FOCUS" onClick={focusNode} /> : null}
			{actionUrl ? <BracketLink href={actionUrl} label="OPEN" /> : null}
		</div>
	);
}

function InspectPreview({
	message,
	preview,
}: {
	message?: string;
	preview?: RenderedMarkdown<"block" | "inline">;
}) {
	if (preview) {
		if (preview.mode === "block") {
			return (
				<BlockHtml
					className="md-fragment-compact mb-0 text-[12px] text-fd-muted-foreground leading-snug"
					html={preview.html}
				/>
			);
		}

		return (
			<p className="md-fragment-compact text-[12px] text-fd-muted-foreground leading-snug">
				<InlineHtml html={preview.html} />
			</p>
		);
	}

	if (!message) {
		return null;
	}

	return <p className="text-fd-muted-foreground">{message}</p>;
}

function GroupedLinks({ groups }: { groups: LinkGroup[] }) {
	const items = groups.flatMap((group) => group.items);

	if (items.length === 0) {
		return <p className="text-fd-muted-foreground">Nothing to list.</p>;
	}

	return (
		<div className="flex flex-col gap-3">
			{groups.map((group) =>
				group.items.length === 0 ? null : (
					<div className="flex flex-col gap-1" key={group.heading}>
						<p className="text-fd-muted-foreground uppercase tracking-wider">
							{group.heading}
						</p>
						<LinkList items={group.items} />
					</div>
				)
			)}
		</div>
	);
}

function LinkList({ items }: { items: OutputLink[] }) {
	return (
		<ul className="flex flex-col gap-1">
			{items.map((item) => (
				<li key={`${item.url}-${plainInlineLabel(item.label)}`}>
					<Link
						aria-label={plainInlineLabel(item.label)}
						className="flex items-baseline gap-2 rounded-sm outline-none hover:text-fd-primary focus-visible:outline-1 focus-visible:outline-fd-foreground"
						href={item.url}
					>
						<span className="md-fragment-chip min-w-0">
							<InlineLabelView label={item.label} />
						</span>
						{item.hint ? (
							<span className="text-fd-muted-foreground">{item.hint}</span>
						) : null}
					</Link>
				</li>
			))}
		</ul>
	);
}

const SEARCH_SNIPPET_CLASS =
	"md-fragment-compact mb-0 bg-fd-card/40 px-2 py-2 text-[12px] text-fd-muted-foreground leading-snug [&_mark]:rounded-sm [&_mark]:bg-fd-primary/20 [&_mark]:px-0.5 [&_mark]:text-fd-foreground";

function SearchList({ hits }: { hits: SearchHit[] }) {
	if (hits.length === 0) {
		return null;
	}

	const groups = groupSearchHits(hits);

	return (
		<div className="flex flex-col gap-8">
			{groups.map((group, groupIndex) => (
				<section
					className="flex flex-col gap-4"
					key={`${group.path}-${groupIndex}`}
				>
					<p className="text-[11px] text-fd-muted-foreground tracking-wide">
						{group.path}
					</p>
					<ol className="flex list-none flex-col gap-6 p-0">
						{group.hits.map((hit, index) => (
							<SearchHitRow
								hit={hit}
								index={index + 1}
								key={`${hit.url}-${hit.title.plain}`}
							/>
						))}
					</ol>
				</section>
			))}
		</div>
	);
}

function SearchHitRow({ hit, index }: { hit: SearchHit; index: number }) {
	const fragment = hitFragment(hit.path);

	return (
		<li>
			<Link
				className="group grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 rounded-sm outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground"
				href={hit.url}
			>
				<span className="pt-px text-fd-muted-foreground transition-colors group-hover:text-fd-primary">
					{index}
				</span>
				<span className="flex min-w-0 flex-col gap-2 border-fd-border border-l pl-3 transition-colors group-hover:border-fd-primary">
					<span className="text-fd-foreground [&_mark]:rounded-sm [&_mark]:bg-fd-primary/20 [&_mark]:px-0.5">
						<InlineHtml html={hit.title.html} />
					</span>
					{fragment ? (
						<span className="text-[11px] text-fd-muted-foreground">
							{fragment}
						</span>
					) : null}
					{hit.snippet ? (
						<BlockHtml
							className={SEARCH_SNIPPET_CLASS}
							html={hit.snippet.html}
						/>
					) : null}
				</span>
			</Link>
		</li>
	);
}

function hitFragment(path: string): string | undefined {
	const hashIndex = path.indexOf("#");
	if (hashIndex === -1) {
		return;
	}

	return `#${path.slice(hashIndex + 1)}`;
}

function MarkdownBlock({
	output,
}: {
	output: Extract<TerminalOutput, { kind: "markdown" }>;
}) {
	const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
		"idle"
	);

	return (
		<div className="flex min-h-0 flex-col gap-2">
			<p className="text-fd-muted-foreground">{output.title}</p>
			<pre className="wrap-break-word max-h-full min-h-0 overflow-auto whitespace-pre-wrap rounded-md border bg-fd-card p-2 text-[11px] text-fd-foreground">
				{output.markdown}
			</pre>
			<div className="flex flex-wrap gap-3">
				<button
					className="outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground"
					onClick={() => {
						copyText(output.markdown)
							.then((ok) => {
								setCopyState(ok ? "copied" : "failed");
							})
							.catch(() => {
								setCopyState("failed");
							});
					}}
					type="button"
				>
					[{copyState === "copied" ? "copied" : "COPY"}]
				</button>
				<BracketLink href={output.markdownUrl} label="OPEN SOURCE" />
			</div>
			{copyState === "failed" ? (
				<p className="text-fd-muted-foreground">
					Clipboard is unavailable. Select the Markdown and copy it yourself.
				</p>
			) : null}
		</div>
	);
}

function BracketButton({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-label={label === "FOCUS" ? "Focus node" : label}
			className="inline-flex outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground"
			onClick={onClick}
			type="button"
		>
			[{label}]
		</button>
	);
}

function BracketLink({ href, label }: { href: string; label: string }) {
	return (
		<Link
			className={cn(
				"inline-flex outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground"
			)}
			href={href}
			rel="noreferrer noopener"
			target={href.startsWith("http") ? "_blank" : undefined}
		>
			[{label}]
		</Link>
	);
}
