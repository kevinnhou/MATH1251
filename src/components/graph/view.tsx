"use client";

import { useRouter } from "fumadocs-core/framework";
import { useEffect, useMemo, useRef } from "react";
import { useGraph } from "@/components/graph/provider";
import { useTerminalApi } from "@/components/terminal/provider";
import type { GraphAction } from "@/lib/graph/actions";
import { graphOwnsEscape, nextGraphEscapeAction } from "@/lib/graph/escape";
import {
	type InspectSource,
	inspectPolicy,
	isCompactHome,
} from "@/lib/graph/inspect";
import {
	graphSearchIndex,
	isIsolatedFocus,
	locateNodes,
	projectGraph,
} from "@/lib/graph/project";
import {
	commitGraphAction,
	type GraphActionResult,
	type GraphSession,
} from "@/lib/graph/session";
import type { GraphDocument } from "@/lib/graph/types";
import { inspectNodeOutput } from "@/lib/terminal/graph-output";
import { GraphCanvas } from "./canvas";
import { GraphChrome } from "./chrome";
import { GraphNodeDetail } from "./detail";
import { openGraphUrl } from "./url";

export function GraphHost({ pageUrl }: { pageUrl: string }) {
	const graph = useGraph();

	if (graph.status === "unavailable" || graph.homeId !== pageUrl) {
		return null;
	}

	if (graph.status === "loading") {
		return (
			<p aria-live="polite" className="text-fd-muted-foreground text-sm">
				Loading graph…
			</p>
		);
	}

	if (graph.status === "error") {
		return (
			<div aria-live="polite" className="flex flex-col gap-2" role="status">
				<p className="text-fd-muted-foreground text-sm">
					Graph failed to load.
				</p>
				<button
					className="w-fit font-mono text-[11px] text-fd-muted-foreground outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground"
					onClick={graph.retry}
					type="button"
				>
					[RETRY]
				</button>
			</div>
		);
	}

	return (
		<GraphView
			currentPageUrl={pageUrl}
			graphDocument={graph.document}
			homeId={graph.homeId}
			narrow={graph.narrow}
			onSessionChange={graph.setSession}
			session={graph.session}
		/>
	);
}

function GraphView({
	currentPageUrl,
	graphDocument,
	homeId,
	narrow,
	onSessionChange,
	session,
}: {
	currentPageUrl: string;
	graphDocument: GraphDocument;
	homeId: string;
	narrow: boolean;
	onSessionChange: (session: GraphSession) => void;
	session: GraphSession;
}) {
	const router = useRouter();
	const { clearInspectOutput, publishOutput } = useTerminalApi();
	const { query } = session;
	const rootRef = useRef<HTMLElement>(null);
	const engagedRef = useRef(false);

	const projection = useMemo(
		() => projectGraph(graphDocument, query),
		[graphDocument, query]
	);
	const searchIndex = useMemo(
		() => graphSearchIndex(projection.nodes),
		[projection.nodes]
	);
	const locateHits = useMemo(
		() => locateNodes(projection.nodes, session.locate, searchIndex),
		[projection.nodes, searchIndex, session.locate]
	);
	const locateIds = useMemo(() => {
		if (session.locate.trim() === "") {
			return null;
		}

		return new Set(locateHits.map((node) => node.id));
	}, [locateHits, session.locate]);

	const selected = projection.nodes.find(
		(node) => node.id === session.selectedId
	);
	const hideLocalHome = isCompactHome(session, homeId);
	const panelNode = hideLocalHome ? null : (selected ?? null);
	const moduleKey = query.module ?? "all";
	const fitKey = `${query.focus.id}:${query.focus.reach}:${moduleKey}:${projection.nodes.length}:${session.expanded ? "global" : "local"}`;
	const isolatedFocus = isIsolatedFocus(projection);
	const empty = projection.nodes.length === 0;
	const variant = session.expanded ? "global" : "local";

	const sessionRef = useRef(session);
	sessionRef.current = session;
	const narrowRef = useRef(narrow);
	narrowRef.current = narrow;

	function dispatch(
		action: GraphAction,
		source: InspectSource = "canvas"
	): GraphActionResult {
		const result = commitGraphAction(
			sessionRef.current,
			action,
			{
				document: graphDocument,
				homeId,
				resolveTarget: (raw) =>
					graphDocument.nodes.find((node) => node.id === raw),
			},
			onSessionChange
		);
		const decision = inspectPolicy(result, {
			homeId,
			narrow: narrowRef.current,
			source,
		});
		if (decision === "publish" && result.effect.kind === "inspect") {
			publishOutput(inspectNodeOutput(result.effect.node));
		} else if (decision === "clear") {
			clearInspectOutput();
		}
		return result;
	}

	const dispatchRef = useRef(dispatch);
	dispatchRef.current = dispatch;

	useEffect(() => {
		if (narrow) {
			clearInspectOutput();
		}
	}, [clearInspectOutput, narrow]);

	function openNode(url: string) {
		openGraphUrl(url, currentPageUrl, (next) => {
			router.push(next);
		});
	}

	useEffect(() => {
		const root = rootRef.current;
		if (!root) {
			return;
		}

		const onPointerDown = (event: PointerEvent) => {
			engagedRef.current = root.contains(event.target as Node);
		};

		window.addEventListener("pointerdown", onPointerDown, true);
		return () => window.removeEventListener("pointerdown", onPointerDown, true);
	}, []);

	useEffect(() => {
		if (variant !== "global") {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) {
				return;
			}

			if (
				!graphOwnsEscape({
					active: document.activeElement,
					engaged: engagedRef.current,
					root: rootRef.current,
				})
			) {
				return;
			}

			event.preventDefault();
			dispatchRef.current(
				nextGraphEscapeAction(sessionRef.current, homeId),
				"escape"
			);
		};

		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [homeId, variant]);

	const statusMessage = graphStatusMessage(empty, isolatedFocus);

	return (
		<section
			aria-label="Course graph"
			className="flex flex-col gap-3 font-mono"
			data-graph-host=""
			data-graph-immersed={session.expanded || undefined}
			ref={rootRef}
		>
			<div className="relative min-h-0 flex-1">
				<GraphCanvas
					className={
						session.expanded
							? "h-[min(86svh,calc(100dvh-7rem))] w-full"
							: "h-[min(42svh,24rem)] min-h-80 w-full"
					}
					fitKey={fitKey}
					focusedId={query.focus.id}
					immersed={session.expanded}
					locateIds={locateIds}
					onOpen={openNode}
					onSelect={(id) => {
						dispatch({ id, type: "select" });
					}}
					projection={projection}
					reach={query.focus.reach}
					selectedId={session.selectedId}
				>
					<GraphChrome
						onCollapse={
							session.expanded
								? () => {
										dispatch({ type: "collapse" });
									}
								: undefined
						}
						onExpand={
							session.expanded
								? undefined
								: () => {
										dispatch({ type: "immerse" });
									}
						}
						variant={variant}
					/>
					{statusMessage ? (
						<p
							aria-live="polite"
							className="pointer-events-none absolute inset-x-3 top-3 z-20 text-fd-muted-foreground text-sm"
							role="status"
						>
							{statusMessage}
						</p>
					) : null}
				</GraphCanvas>
			</div>
			{narrow && panelNode ? (
				<GraphNodeDetail
					currentPageUrl={currentPageUrl}
					node={panelNode}
					onFocus={
						panelNode.id === query.focus.id
							? undefined
							: () => {
									dispatch({ target: panelNode.id, type: "focus" });
								}
					}
					onOpen={openNode}
				/>
			) : null}
		</section>
	);
}

function graphStatusMessage(
	empty: boolean,
	isolatedFocus: boolean
): string | null {
	if (empty) {
		return "Nothing to show.";
	}

	if (isolatedFocus) {
		return "No linked results yet.";
	}

	return null;
}
