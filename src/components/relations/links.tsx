"use client";

import { useState } from "react";
import {
	chapterOf,
	linkSummary,
	type MapIndex,
	neighbours,
} from "@/lib/relations/query";
import {
	DIRECTION_LABELS,
	DIRECTIONS,
	type Direction,
} from "@/lib/relations/types";
import {
	BracketButton,
	DIRECTION_COLORS,
	LinkRow,
	SectionHeading,
} from "./parts";

const LIST_LIMIT = 6;

const EMPTY: Record<Direction, string> = {
	"builds-on": "It cites no other page.",
	"leads-to": "No other page cites this one.",
};

export function FocusLinks({
	id,
	index,
	onPair,
}: {
	id: string;
	index: MapIndex;
	onPair: (id: string | null) => void;
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			{DIRECTIONS.map((direction) => (
				<LinkList
					direction={direction}
					id={id}
					index={index}
					key={`${direction}:${id}`}
					onPair={onPair}
				/>
			))}
		</div>
	);
}

function LinkList({
	direction,
	id,
	index,
	onPair,
}: {
	direction: Direction;
	id: string;
	index: MapIndex;
	onPair: (id: string | null) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const items = neighbours(index, id, direction);
	const shown = expanded ? items : items.slice(0, LIST_LIMIT);
	const spacers = Math.max(LIST_LIMIT - Math.max(shown.length, 1), 0);

	return (
		<section className="flex min-w-0 flex-col gap-1.5">
			<SectionHeading
				color={DIRECTION_COLORS[direction]}
				count={items.length}
				label={DIRECTION_LABELS[direction].toUpperCase()}
			/>
			<ol className="m-0 flex list-none flex-col gap-1 p-0">
				{items.length === 0 ? (
					<li className="text-[13px] text-fd-muted-foreground">
						{EMPTY[direction]}
					</li>
				) : null}
				{shown.map(({ link, page }) => (
					<LinkRow
						chapter={chapterOf(index, page)}
						className="text-[13px]"
						href={page.id}
						key={page.id}
						label={page.title}
						onBlur={() => onPair(null)}
						onFocus={() => onPair(page.id)}
						onMouseEnter={() => onPair(page.id)}
						onMouseLeave={() => onPair(null)}
						title={linkSummary(link)}
					>
						<span className="shrink-0 font-mono text-[10px] text-fd-muted-foreground tabular-nums">
							{link.weight}
						</span>
					</LinkRow>
				))}
				{Array.from({ length: spacers }, (_, spacer) => (
					<li aria-hidden="true" className="text-[13px]" key={spacer}>
						{" "}
					</li>
				))}
			</ol>
			<div className="flex h-2.5">
				{items.length > LIST_LIMIT ? (
					<BracketButton
						label={expanded ? "FEWER" : `+${items.length - LIST_LIMIT} MORE`}
						onClick={() => setExpanded((value) => !value)}
					/>
				) : null}
			</div>
		</section>
	);
}
