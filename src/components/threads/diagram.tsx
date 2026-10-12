"use client";

import { type KeyboardEvent, type ReactNode, useState } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { foregroundAt, THREAD_COLOR } from "@/components/relations/colors";
import { cursorKey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import { laneCode } from "./format";
import { DIAGRAM, type Diagram, type DiagramStation } from "./layout";

const STOP = 7;
const TINT = foregroundAt(5);
const COLUMN = foregroundAt(8);
const LINE = foregroundAt(55);
const QUIET = foregroundAt(20);
const NAME = foregroundAt(72);
const NAME_QUIET = foregroundAt(32);

const NAME_SIZE = { char: 5.6, code: 6, gap: 12, max: 200 } as const;
const SLANT = Math.SQRT1_2;

const SPUR = {
	at: 4.5,
	drop: 28,
	turn: 12,
} as const;

export interface DiagramReading {
	content: ReactNode;
	key: string;
}

export interface DiagramSpur {
	anchor: DiagramStation;
	hold?: string;
	key: string;
	pinned: boolean;
}

export interface DiagramProps {
	cursor: DiagramStation | undefined;
	diagram: Diagram;
	highlight: readonly string[];
	hover: DiagramStation | undefined;
	onCursor: (id: string) => void;
	onHover: (id: string | null) => void;
	onOpen: (station: DiagramStation) => void;
	onPick: (id: string) => void;
	readings: readonly DiagramReading[];
	spur: DiagramSpur | undefined;
}

export function ThreadDiagram({
	cursor,
	diagram,
	highlight,
	hover,
	onCursor,
	onHover,
	onOpen,
	onPick,
	readings,
	spur,
}: DiagramProps) {
	const { stations } = diagram;
	const [scroll, setScroll] = useState(0);
	const at = cursor ? stations.indexOf(cursor) : -1;
	const lit = (slug: string) => highlight.includes(slug);
	const colour = (slug: string) => {
		if (lit(slug)) {
			return THREAD_COLOR;
		}
		return highlight.length > 0 ? QUIET : LINE;
	};
	const top = DIAGRAM.axis - 4;
	const bottom = diagram.height + 4;
	const names = stations.map(nameWidth);
	const hang = bottom + NAME_SIZE.gap;
	const depth =
		Math.max(0, ...names.map((name) => name.estimate)) * SLANT + NAME_SIZE.gap;
	const nameColour = (entry: DiagramStation) => {
		if (entry === cursor || entry === hover) {
			return "var(--color-fd-foreground)";
		}
		if (highlight.length === 0) {
			return NAME;
		}
		return entry.marks.some(({ thread }) => lit(thread))
			? "var(--color-fd-foreground)"
			: NAME_QUIET;
	};
	const column = (entry: DiagramStation) => ({
		height: bottom - top,
		width: diagram.slot,
		x: entry.x - diagram.slot / 2,
		y: top,
	});

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = cursorKey(event.nativeEvent, at, stations.length);
		if (target !== undefined) {
			event.preventDefault();
			const next = stations[target];
			if (next) {
				onCursor(next.station.id);
			}
			return;
		}

		if (event.key === "Enter" && cursor) {
			event.preventDefault();
			onOpen(cursor);
		}
	};

	const foot = hang + depth;
	const pinned = spur?.pinned ?? false;
	const spurInk = pinned ? "var(--color-fd-foreground)" : LINE;
	const active = spur?.key;

	return (
		<div className="relative">
			<div
				aria-label="Stops in teaching order"
				aria-valuemax={stations.length}
				aria-valuemin={1}
				aria-valuenow={Math.max(at + 1, 1)}
				aria-valuetext={
					cursor
						? `${cursor.station.code} ${cursor.station.title.plain}`
						: "No stop selected"
				}
				className="overflow-x-auto outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground focus-visible:outline-offset-4"
				onKeyDown={onKeyDown}
				onScroll={(event) => setScroll(event.currentTarget.scrollLeft)}
				role="slider"
				tabIndex={0}
			>
				<div
					className="relative"
					onPointerLeave={() => onHover(null)}
					style={{ height: hang + depth, width: diagram.width }}
				>
					<svg
						aria-hidden="true"
						className="block font-mono"
						height={bottom}
						width={diagram.width}
					>
						{diagram.chapters.map((chapter) => (
							<text
								className="text-[10px]"
								fill={
									chapter.empty ? QUIET : "var(--color-fd-muted-foreground)"
								}
								key={chapter.number}
								x={chapter.x0}
								y={12}
							>
								{chapter.empty ? "" : chapter.number}
							</text>
						))}
						{diagram.bands.map((band) => (
							<g key={band.strand.id}>
								<text
									className="text-[10px] uppercase tracking-wider"
									dominantBaseline="middle"
									fill="var(--color-fd-muted-foreground)"
									x={0}
									y={(band.y0 + band.y1) / 2}
								>
									{diagram.coded
										? laneCode(band.strand.title)
										: band.strand.title.toUpperCase()}
								</text>
								{band.segments.map((segment) => (
									<rect
										fill={TINT}
										height={band.y1 - band.y0}
										key={segment.number}
										width={segment.x1 - segment.x0}
										x={segment.x0}
										y={band.y0}
									/>
								))}
							</g>
						))}
						{cursor ? <rect fill={COLUMN} {...column(cursor)} /> : null}
						{hover ? (
							<line
								stroke={QUIET}
								strokeDasharray="2 3"
								x1={hover.x}
								x2={hover.x}
								y1={top}
								y2={bottom}
							/>
						) : null}
						{diagram.lines
							.toSorted(
								(left, right) =>
									Number(lit(left.slug)) - Number(lit(right.slug))
							)
							.map((line) => (
								<g key={line.slug} stroke={colour(line.slug)}>
									<path
										d={line.transit}
										fill="none"
										strokeDasharray="1 4"
										strokeLinecap="round"
										strokeWidth={lit(line.slug) ? 2 : 1.25}
									/>
									<path
										d={line.solid}
										fill="none"
										strokeLinejoin="miter"
										strokeWidth={lit(line.slug) ? 2.5 : 1.5}
									/>
								</g>
							))}
						{diagram.lines.map((line) => (
							<text
								className="text-[9px]"
								dominantBaseline="middle"
								fill={colour(line.slug)}
								key={line.slug}
								textAnchor="end"
								x={line.start.x - STOP}
								y={line.start.y}
							>
								{line.number}
							</text>
						))}
						{stations.map((entry) => (
							<StopMarks
								colour={colour}
								cursor={entry === cursor}
								entry={entry}
								key={entry.station.id}
							/>
						))}
						{stations.map((entry) => (
							<rect
								className="cursor-pointer"
								fill="transparent"
								key={entry.station.id}
								onClick={() => onPick(entry.station.id)}
								onPointerEnter={() => onHover(entry.station.id)}
								{...column(entry)}
							/>
						))}
					</svg>
					{stations.map((entry, index) => (
						<span
							className="absolute size-0"
							key={entry.station.id}
							style={{ left: entry.x, top: hang, transform: "rotate(-45deg)" }}
						>
							<button
								className="absolute top-0 right-0 flex w-max -translate-y-1/2 items-baseline gap-1.5 whitespace-nowrap py-0.5 text-[10.5px] leading-none outline-none"
								data-relations-label=""
								onClick={() => onPick(entry.station.id)}
								onPointerEnter={() => onHover(entry.station.id)}
								style={{
									color: nameColour(entry),
									fontWeight: entry === cursor ? 600 : undefined,
									maxWidth: names[index]?.room,
								}}
								tabIndex={-1}
								type="button"
							>
								<span className="font-mono text-[9px] text-fd-muted-foreground">
									{entry.station.code}
								</span>
								<span className="min-w-0 truncate">
									<InlineHtml html={entry.station.title.html} />
								</span>
							</button>
						</span>
					))}
				</div>
			</div>
			{spur ? (
				<svg
					aria-hidden="true"
					className="pointer-events-none absolute top-0 left-0"
					height={foot + SPUR.drop}
					width="100%"
				>
					<path
						d={`M ${spur.anchor.x - scroll + 0.5} ${bottom} V ${foot + SPUR.turn} H ${SPUR.at} V ${foot + SPUR.drop}`}
						fill="none"
						stroke={spurInk}
						strokeDasharray={pinned ? undefined : "1 4"}
						strokeLinecap={pinned ? undefined : "round"}
						strokeWidth={pinned ? 1.5 : 1.25}
					/>
				</svg>
			) : null}
			<div
				className="relative mt-7 border-l-[1.5px] pb-1 pl-6"
				onPointerEnter={() => spur?.hold && onHover(spur.hold)}
				onPointerLeave={() => onHover(null)}
				style={{
					borderLeftColor: spur ? spurInk : "transparent",
					borderLeftStyle: pinned ? "solid" : "dotted",
					marginLeft: SPUR.at - 0.75,
				}}
			>
				<span
					aria-hidden="true"
					className={cn(
						"absolute top-2 left-[-4.25px] size-[7px] border-[1.5px]",
						!spur && "invisible"
					)}
					style={{
						background: pinned
							? "var(--color-fd-foreground)"
							: "var(--color-fd-background)",
						borderColor: spurInk,
					}}
				/>
				<div className="grid">
					{readings.map((reading) => {
						const on = reading.key === active;
						return (
							<div
								aria-hidden={!on}
								className={cn(
									"col-start-1 row-start-1 transition-opacity duration-150 motion-reduce:transition-none",
									on ? "visible opacity-100" : "invisible select-none opacity-0"
								)}
								inert={!on}
								key={reading.key}
							>
								{reading.content}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function nameWidth(entry: DiagramStation): { estimate: number; room: number } {
	const { code, title } = entry.station;
	const room = Math.min(entry.x / SLANT, NAME_SIZE.max);
	const estimate =
		(code.length + 1) * NAME_SIZE.code + title.plain.length * NAME_SIZE.char;
	return { estimate: Math.min(estimate, room), room };
}

function StopMarks({
	colour,
	cursor,
	entry: { marks, x },
}: {
	colour: (slug: string) => string;
	cursor: boolean;
	entry: DiagramStation;
}) {
	const ys = marks.map(({ y }) => y);

	return (
		<g>
			{marks.length > 1 ? (
				<line
					stroke="var(--color-fd-foreground)"
					strokeWidth={2}
					x1={x}
					x2={x}
					y1={Math.min(...ys)}
					y2={Math.max(...ys)}
				/>
			) : null}
			{marks.map(({ thread, y }) => (
				<rect
					fill={
						cursor ? "var(--color-fd-foreground)" : "var(--color-fd-background)"
					}
					height={STOP}
					key={y}
					stroke={cursor ? "var(--color-fd-foreground)" : colour(thread)}
					strokeWidth={1.5}
					width={STOP}
					x={x - STOP / 2}
					y={y - STOP / 2}
				/>
			))}
		</g>
	);
}
