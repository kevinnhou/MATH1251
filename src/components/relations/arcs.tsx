"use client";

import {
	chapterOf,
	isForwardLink,
	type LinkRole,
	linkRole,
	type MapIndex,
	positionOf,
} from "@/lib/relations/query";
import type { PageLink } from "@/lib/relations/types";
import { moduleColor, PageTitle, roleColor, type ViewProps } from "./parts";

const STEP = 10;
const PAD = 12;
const TOP = 6;
const ARC_HEIGHT = 116;
const FORWARD_HEIGHT = 32;
const LABEL_HEIGHT = 16;
const AXIS = TOP + ARC_HEIGHT;
const HEIGHT = AXIS + FORWARD_HEIGHT + LABEL_HEIGHT;

export function ArcDiagram({
	focusId,
	homeId,
	index,
	onFocus,
	onPreview,
	pairId,
	previewId,
}: ViewProps) {
	const activeId = previewId ?? focusId;
	const width = PAD * 2 + Math.max(index.pages.length - 1, 1) * STEP;
	const x = (id: string) => PAD + positionOf(index, id) * STEP;
	const links = index.links
		.map((link) => ({ link, role: linkRole(link, activeId) }))
		.toSorted(
			(left, right) =>
				Number(left.role !== "idle") - Number(right.role !== "idle")
		);
	const preview =
		previewId === null ? undefined : index.pageById.get(previewId);

	return (
		<div className="relative">
			<div className="overflow-x-auto">
				<svg
					aria-hidden="true"
					className="block w-full min-w-160 select-none"
					onMouseLeave={() => onPreview(null)}
					viewBox={`0 0 ${width} ${HEIGHT}`}
				>
					<ChapterBands index={index} />
					<line
						stroke="var(--color-fd-border)"
						x1={PAD}
						x2={width - PAD}
						y1={AXIS}
						y2={AXIS}
					/>
					{links.map(({ link, role }) => (
						<Arc
							emphasised={
								role !== "idle" &&
								pairId !== null &&
								(link.source === pairId || link.target === pairId)
							}
							forward={isForwardLink(index, link)}
							key={`${link.source}\0${link.target}`}
							link={link}
							role={role}
							x={x}
						/>
					))}
					{index.pages.map((page) => (
						<PageDot
							active={page.id === activeId}
							color={moduleColor(page.module)}
							home={page.id === homeId}
							key={page.id}
							x={x(page.id)}
						/>
					))}
					{index.pages.map((page) => (
						<rect
							className="cursor-pointer"
							fill="transparent"
							height={HEIGHT}
							key={page.id}
							onClick={() => onFocus(page.id)}
							onMouseEnter={() => onPreview(page.id)}
							width={STEP}
							x={x(page.id) - STEP / 2}
							y={0}
						/>
					))}
				</svg>
			</div>
			{preview ? (
				<p
					className="pointer-events-none absolute top-0 m-0 max-w-64 -translate-x-1/2 truncate border border-fd-border bg-fd-popover px-2 py-1 text-[12px] text-fd-popover-foreground shadow-sm"
					style={{
						left: `clamp(8rem, ${(x(preview.id) / width) * 100}%, calc(100% - 8rem))`,
					}}
				>
					<span className="mr-2 font-mono text-[10px] text-fd-muted-foreground">
						{chapterOf(index, preview)?.short}
					</span>
					<PageTitle page={preview} />
				</p>
			) : null}
		</div>
	);
}

function Arc({
	emphasised,
	forward,
	link,
	role,
	x,
}: {
	emphasised: boolean;
	forward: boolean;
	link: PageLink;
	role: LinkRole;
	x: (id: string) => number;
}) {
	const [left, right] = [x(link.source), x(link.target)].toSorted(
		(a, b) => a - b
	);
	const span = right - left;
	const rx = span / 2;
	const reach = forward ? FORWARD_HEIGHT : ARC_HEIGHT;
	const ry = Math.max(reach * Math.sqrt(span / (STEP * 80)), 3);
	const sweep = forward ? 0 : 1;
	const base = 0.75 + Math.log2(link.weight) * 0.6;

	return (
		<path
			d={`M ${left} ${AXIS} A ${rx} ${Math.min(ry, reach)} 0 0 ${sweep} ${right} ${AXIS}`}
			fill="none"
			opacity={role === "idle" ? 0.16 : 0.9}
			stroke={roleColor(role)}
			strokeDasharray={forward ? "3 2" : undefined}
			strokeLinecap="round"
			strokeWidth={Math.min(base, 3) + (emphasised ? 1.5 : 0)}
		/>
	);
}

function PageDot({
	active,
	color,
	home,
	x,
}: {
	active: boolean;
	color: string;
	home: boolean;
	x: number;
}) {
	return (
		<g>
			{home ? (
				<line
					stroke="var(--color-fd-foreground)"
					strokeWidth={1}
					x1={x}
					x2={x}
					y1={AXIS + 6}
					y2={AXIS + 11}
				/>
			) : null}
			<circle
				cx={x}
				cy={AXIS}
				fill={color}
				r={active ? 4.5 : 3}
				stroke={
					active ? "var(--color-fd-foreground)" : "var(--color-fd-background)"
				}
				strokeWidth={active ? 1.5 : 1}
			/>
		</g>
	);
}

function ChapterBands({ index }: { index: MapIndex }) {
	return (
		<g>
			{index.spans.map(({ chapter, end, start }, number) => {
				const left = PAD + (start - 0.5) * STEP;
				const right = PAD + (end - 0.5) * STEP;
				return (
					<g key={chapter.id}>
						{number % 2 === 0 ? (
							<rect
								fill="var(--color-fd-muted)"
								height={HEIGHT - LABEL_HEIGHT}
								opacity={0.5}
								width={right - left}
								x={left}
								y={0}
							/>
						) : null}
						<text
							className="font-mono"
							fill="var(--color-fd-muted-foreground)"
							fontSize={7}
							textAnchor="middle"
							x={(left + right) / 2}
							y={HEIGHT - 5}
						>
							{chapter.short}
						</text>
					</g>
				);
			})}
		</g>
	);
}
