"use client";

import { type ComponentType, useState } from "react";
import { STRAND_LABELS, STRANDS } from "@/lib/course/strands";
import { isIsolated } from "@/lib/relations/query";
import {
	DIRECTION_LABELS,
	DIRECTIONS,
	MAP_VIEW_LABELS,
	MAP_VIEWS,
	type MapView,
	type ReadyRelations,
} from "@/lib/relations/types";
import { ArcDiagram } from "./arcs";
import { PrerequisiteLadder } from "./ladder";
import { FocusLinks } from "./links";
import { DependencyMatrix } from "./matrix";
import {
	BracketButton,
	DIRECTION_COLORS,
	moduleColor,
	PageTitle,
	Swatch,
	type ViewProps,
} from "./parts";
import { ThreadGrid } from "./threads";

const VIEWS: Record<
	MapView,
	{ Component: ComponentType<ViewProps>; links: boolean; note?: string }
> = {
	arcs: {
		Component: ArcDiagram,
		links: true,
		note: "DASHED BELOW · FORWARD REFERENCE",
	},
	ladder: { Component: PrerequisiteLadder, links: false },
	matrix: {
		Component: DependencyMatrix,
		links: true,
		note: "ROW BUILDS ON COLUMN · OUTLINED · FORWARD REFERENCE",
	},
	threads: {
		Component: ThreadGrid,
		links: false,
		note: "DOT / MEMBERS IN THAT CHAPTER / RINGED / ON THIS PAGE",
	},
};

export function MapPanel({ relations }: { relations: ReadyRelations }) {
	const { focusId, homeId, index, setFocus, setMapOpen, setView, view } =
		relations;
	const [previewId, setPreviewId] = useState<string | null>(null);
	const [pairId, setPairId] = useState<string | null>(null);
	const focus = index.pageById.get(focusId);
	const { Component, links, note } = VIEWS[view];

	return (
		<section aria-label="Course map" className="flex flex-col gap-3">
			<header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
				<div className="flex items-center gap-3">
					{MAP_VIEWS.map((id) => (
						<BracketButton
							active={id === view}
							key={id}
							label={MAP_VIEW_LABELS[id]}
							onClick={() => setView(id)}
						/>
					))}
				</div>
				<div className="flex min-w-0 items-center gap-3">
					{focus && focusId !== homeId ? (
						<div className="flex min-w-0 items-center gap-2 text-[12px] text-fd-muted-foreground">
							<span className="font-mono text-[10px]">FOCUS</span>
							<span className="truncate text-fd-foreground">
								<PageTitle page={focus} />
							</span>
							<BracketButton
								ariaLabel="Back to this page"
								label="BACK"
								onClick={() => setFocus(homeId)}
							/>
						</div>
					) : null}
					<BracketButton
						ariaLabel="Close course map"
						label="CLOSE"
						onClick={() => setMapOpen(false)}
					/>
				</div>
			</header>
			<Component
				focusId={focusId}
				homeId={homeId}
				index={index}
				onFocus={setFocus}
				onPreview={setPreviewId}
				pairId={pairId}
				previewId={previewId}
			/>
			{links ? (
				<FocusLinks
					id={previewId ?? focusId}
					index={index}
					onPair={setPairId}
				/>
			) : null}
			<p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-fd-muted-foreground">
				{STRANDS.map((module) => (
					<span className="flex items-center gap-1.5" key={module}>
						<span
							aria-hidden="true"
							className="inline-block size-2 rounded-full"
							style={{ background: moduleColor(module) }}
						/>
						{STRAND_LABELS[module].toUpperCase()}
					</span>
				))}
				{DIRECTIONS.map((direction) => (
					<Swatch
						className="gap-1.5"
						color={DIRECTION_COLORS[direction]}
						key={direction}
					>
						{DIRECTION_LABELS[direction].toUpperCase()}
					</Swatch>
				))}
				{note ? <span>{note}</span> : null}
				{isIsolated(index, focusId) ? (
					<span>THIS PAGE HAS NO CROSS-PAGE LINKS YET</span>
				) : null}
			</p>
		</section>
	);
}
