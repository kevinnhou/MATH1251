"use client";

import { chapterOf, ladder, type MapIndex } from "@/lib/relations/query";
import {
	DIRECTION_LABELS,
	type Direction,
	type MapPage,
} from "@/lib/relations/types";
import {
	BracketButton,
	DIRECTION_COLORS,
	moduleColor,
	PageTitle,
	Swatch,
	type ViewProps,
} from "./parts";

const EMPTY: Record<Direction, string> = {
	"builds-on": "Nothing to read first.",
	"leads-to": "Nothing builds on this page.",
};

export function PrerequisiteLadder({ focusId, index, onFocus }: ViewProps) {
	const focus = index.pageById.get(focusId);
	if (focus === undefined) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3">
			<Rungs
				direction="builds-on"
				focusId={focusId}
				index={index}
				onFocus={onFocus}
			/>
			<div
				className="flex items-baseline justify-between gap-3 border-fd-foreground border-l-2 bg-fd-card px-3 py-2"
				style={{ borderLeftColor: moduleColor(focus.module) }}
			>
				<span className="text-[13px] text-fd-foreground">
					<PageTitle page={focus} />
				</span>
				<BracketButton href={focus.id} label="OPEN" />
			</div>
			<Rungs
				direction="leads-to"
				focusId={focusId}
				index={index}
				onFocus={onFocus}
			/>
		</div>
	);
}

function Rungs({
	direction,
	focusId,
	index,
	onFocus,
}: {
	direction: Direction;
	focusId: string;
	index: MapIndex;
	onFocus: (id: string) => void;
}) {
	const label = DIRECTION_LABELS[direction].toUpperCase();
	const rungs = ladder(index, focusId, direction);
	if (direction === "builds-on") {
		rungs.reverse();
	}

	if (rungs.length === 0) {
		return (
			<p className="m-0 font-mono text-[10px] text-fd-muted-foreground">
				{label} · {EMPTY[direction]}
			</p>
		);
	}

	return (
		<ol className="m-0 flex list-none flex-col gap-2 p-0">
			{rungs.map((rung) => (
				<li
					className="flex flex-col gap-1 sm:flex-row sm:gap-3"
					key={rung.distance}
				>
					<Swatch
						className="w-24 shrink-0 font-mono text-[10px] text-fd-muted-foreground"
						color={DIRECTION_COLORS[direction]}
						opacity={1 / rung.distance}
					>
						{direction === "builds-on" ? "−" : "+"}
						{rung.distance} {rung.distance === 1 ? "STEP" : "STEPS"}
					</Swatch>
					<div className="flex flex-wrap gap-1.5">
						{rung.pages.map((page) => (
							<RungPage
								index={index}
								key={page.id}
								onFocus={onFocus}
								page={page}
							/>
						))}
					</div>
				</li>
			))}
		</ol>
	);
}

function RungPage({
	index,
	onFocus,
	page,
}: {
	index: MapIndex;
	onFocus: (id: string) => void;
	page: MapPage;
}) {
	return (
		<button
			className="max-w-full truncate border border-fd-border border-l-2 bg-fd-card px-2 py-0.5 text-left text-[12px] text-fd-foreground outline-none hover:bg-fd-accent focus-visible:outline-1 focus-visible:outline-fd-foreground"
			onClick={() => onFocus(page.id)}
			style={{ borderLeftColor: moduleColor(page.module) }}
			title={chapterOf(index, page)?.title}
			type="button"
		>
			<PageTitle page={page} />
		</button>
	);
}
