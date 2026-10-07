"use client";

import { type MouseEvent, useState } from "react";
import {
	chapterOf,
	isForwardLink,
	linkRole,
	linkSummary,
	type MapIndex,
	neighbours,
	positionOf,
} from "@/lib/relations/query";
import type { MapPage, PageLink } from "@/lib/relations/types";
import {
	DIRECTION_COLORS,
	PageTitle,
	roleColor,
	type ViewProps,
} from "./parts";

const CELL = 8;
const MARGIN = 24;

interface Hover {
	link?: PageLink;
	row: MapPage;
}

export function DependencyMatrix({
	focusId,
	index,
	onFocus,
	onPreview,
	previewId,
}: ViewProps) {
	const [hover, setHover] = useState<Hover | null>(null);
	const activeId = previewId ?? focusId;
	const count = index.pages.length;
	const size = MARGIN + count * CELL;
	const at = (id: string) => MARGIN + positionOf(index, id) * CELL;
	const maxWeight = Math.max(1, ...index.links.map((link) => link.weight));
	const active = index.pageById.get(activeId);

	function locate(event: MouseEvent<SVGSVGElement>): Hover | null {
		const box = event.currentTarget.getBoundingClientRect();
		const scale = size / box.width;
		const column = Math.floor(
			((event.clientX - box.left) * scale - MARGIN) / CELL
		);
		const rowIndex = Math.floor(
			((event.clientY - box.top) * scale - MARGIN) / CELL
		);
		const row = index.pages[rowIndex];
		if (row === undefined || column < 0 || column >= count) {
			return null;
		}

		const target = index.pages[column];
		const link = neighbours(index, row.id, "builds-on").find(
			(item) => item.page.id === target?.id
		)?.link;
		return { link, row };
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="mx-auto w-full max-w-[640px]">
				<svg
					aria-hidden="true"
					className="block w-full cursor-pointer select-none"
					onClick={(event) => {
						const next = locate(event);
						if (next) {
							onFocus(next.row.id);
						}
					}}
					onPointerLeave={() => {
						setHover(null);
						onPreview(null);
					}}
					onPointerMove={(event) => {
						const next = locate(event);
						if (next?.row !== hover?.row || next?.link !== hover?.link) {
							setHover(next);
							onPreview(next?.row.id ?? null);
						}
					}}
					viewBox={`0 0 ${size} ${size}`}
				>
					{active ? (
						<>
							<rect
								fill={DIRECTION_COLORS["builds-on"]}
								height={CELL}
								opacity={0.12}
								width={count * CELL}
								x={MARGIN}
								y={at(active.id)}
							/>
							<rect
								fill={DIRECTION_COLORS["leads-to"]}
								height={count * CELL}
								opacity={0.12}
								width={CELL}
								x={at(active.id)}
								y={MARGIN}
							/>
						</>
					) : null}
					{index.spans.map(({ chapter, end, start }) => (
						<g key={chapter.id}>
							<line
								stroke="var(--color-fd-border)"
								x1={MARGIN + start * CELL}
								x2={MARGIN + start * CELL}
								y1={MARGIN}
								y2={size}
							/>
							<line
								stroke="var(--color-fd-border)"
								x1={MARGIN}
								x2={size}
								y1={MARGIN + start * CELL}
								y2={MARGIN + start * CELL}
							/>
							{end - start >= 2 ? (
								<>
									<text
										className="font-mono"
										fill="var(--color-fd-muted-foreground)"
										fontSize={6}
										textAnchor="middle"
										x={MARGIN + ((start + end) / 2) * CELL}
										y={MARGIN - 6}
									>
										{chapter.short}
									</text>
									<text
										className="font-mono"
										dominantBaseline="middle"
										fill="var(--color-fd-muted-foreground)"
										fontSize={6}
										textAnchor="end"
										x={MARGIN - 4}
										y={MARGIN + ((start + end) / 2) * CELL}
									>
										{chapter.short}
									</text>
								</>
							) : null}
						</g>
					))}
					<line
						stroke="var(--color-fd-muted-foreground)"
						strokeDasharray="2 2"
						strokeWidth={0.5}
						x1={MARGIN}
						x2={size}
						y1={MARGIN}
						y2={size}
					/>
					{index.links.map((link) => {
						const forward = isForwardLink(index, link);
						return (
							<rect
								fill={roleColor(linkRole(link, activeId))}
								height={CELL - 1}
								key={`${link.source}\0${link.target}`}
								opacity={
									0.3 +
									(0.7 * Math.log2(link.weight + 1)) / Math.log2(maxWeight + 1)
								}
								rx={1}
								stroke={forward ? "var(--color-fd-foreground)" : undefined}
								strokeWidth={forward ? 0.75 : undefined}
								width={CELL - 1}
								x={at(link.target) + 0.5}
								y={at(link.source) + 0.5}
							/>
						);
					})}
				</svg>
			</div>
			<p className="m-0 min-h-5 truncate text-[12px] text-fd-muted-foreground">
				{hover ? <HoverLine hover={hover} index={index} /> : null}
			</p>
		</div>
	);
}

function HoverLine({ hover, index }: { hover: Hover; index: MapIndex }) {
	const target =
		hover.link === undefined
			? undefined
			: index.pageById.get(hover.link.target);
	return (
		<>
			<span className="mr-2 font-mono text-[10px]">
				{chapterOf(index, hover.row)?.short}
			</span>
			<span className="text-fd-foreground">
				<PageTitle page={hover.row} />
			</span>
			{hover.link && target ? (
				<>
					{" builds on "}
					<span className="text-fd-foreground">
						<PageTitle page={target} />
					</span>
					<span className="ml-2 font-mono text-[10px]">
						{linkSummary(hover.link)}
					</span>
				</>
			) : null}
		</>
	);
}
