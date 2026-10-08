import type { CSSProperties } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { THREAD_COLOR } from "@/components/relations/colors";
import { getMathEnvConfig } from "@/lib/math-env/kinds";
import type {
	ThreadMapCell,
	ThreadMap as ThreadMapData,
	ThreadMapRow,
	ThreadMapStation,
} from "@/lib/relations/thread-map";
import { ThreadMapFrame } from "./thread-map-frame";
import { laneLeft, laneSizes } from "./thread-map-lines";

const COLUMN_MIN_REM = 14;
const COLUMN_GAP_REM = 2;

export function ThreadMap({ map }: { map: ThreadMapData }) {
	const lanes = map.threads.length;
	if (lanes === 0) {
		return null;
	}

	const { channel, gutter } = laneSizes(lanes);
	const style = {
		"--tm-channel": `${channel}px`,
		"--tm-gutter": `${gutter}px`,
	} as CSSProperties;

	return (
		<ThreadMapFrame style={style} threads={map.threads}>
			<style>
				{threadMapCss(
					map.strands.length,
					map.threads.map((thread) => thread.slug)
				)}
			</style>
			<div
				className="font-mono text-[10px] text-fd-muted-foreground tracking-wider"
				data-tm-strands=""
			>
				{map.strands.map((strand) => (
					<span className="pl-(--tm-gutter)" key={strand.id}>
						{strand.title.toUpperCase()}
					</span>
				))}
			</div>
			{map.rows.map((row) => (
				<MapRow key={row.number} row={row} />
			))}
		</ThreadMapFrame>
	);
}

function MapRow({ row }: { row: ThreadMapRow }) {
	return (
		<div className="border-fd-border border-t pt-3 pb-5" data-tm-row="">
			<div aria-hidden="true" data-tm-channel="" />
			{row.cells.map((cell, column) => (
				<MapCell cell={cell} column={column} key={cell.strand.id} />
			))}
		</div>
	);
}

function MapCell({
	cell: { chapter, stations, strand },
	column,
}: {
	cell: ThreadMapCell;
	column: number;
}) {
	const place = { gridColumn: column + 1 };

	return (
		<div data-empty={stations.length === 0 || undefined} data-tm-cell="">
			<p
				className="m-0 pl-(--tm-gutter) text-[12px] text-fd-muted-foreground"
				data-tm-head=""
				style={place}
			>
				{chapter ? (
					<>
						<span className="font-mono text-[10px]">
							{chapterNumber(chapter.number)}
						</span>{" "}
						<span data-tm-tag="">{strand.title} · </span>
						<span className="italic">{chapter.title}</span>
					</>
				) : null}
			</p>
			<ol
				className="m-0 flex list-none flex-col gap-3 p-0 pt-2.5 pb-3"
				data-tm-stops=""
				style={place}
			>
				{stations.map((station) => (
					<Station key={station.href} station={station} />
				))}
			</ol>
		</div>
	);
}

function Station({ station }: { station: ThreadMapStation }) {
	const lanes = station.stops.map((stop) => stop.lane);
	const first = Math.min(...lanes);
	const last = Math.max(...lanes);

	return (
		<li
			className="relative pl-(--tm-gutter) transition-opacity duration-200 motion-reduce:transition-none"
			data-tm-station=""
			data-tm-threads={station.stops.map((stop) => stop.slug).join(" ")}
		>
			<span
				aria-hidden="true"
				className="absolute top-2.5 left-0 h-0 w-(--tm-gutter)"
			>
				{lanes.length > 1 ? (
					<span
						className="absolute h-0.5 -translate-y-1/2 bg-(--tm-dot)"
						style={{
							left: laneLeft(first) + 1,
							width: laneLeft(last) - laneLeft(first) + 4,
						}}
					/>
				) : null}
				{station.stops.map((stop) => (
					<span
						className="absolute size-1.5 -translate-y-1/2"
						data-tm-dot=""
						data-tm-lane={stop.lane}
						data-tm-thread={stop.slug}
						key={stop.slug}
						style={{ left: laneLeft(stop.lane) }}
					/>
				))}
			</span>
			<a
				className="flex items-baseline gap-2 text-[13px] text-fd-foreground leading-5 underline-offset-4 outline-none hover:underline focus-visible:outline-1 focus-visible:outline-fd-foreground"
				data-relations-label=""
				href={station.href}
			>
				<span className="shrink-0 font-mono text-[10px] text-fd-muted-foreground">
					{getMathEnvConfig(station.kind).code}
				</span>
				<InlineHtml html={station.title.html} />
			</a>
			{station.stops.map((stop) =>
				stop.role ? (
					<span
						className="block text-[12px] text-fd-muted-foreground italic leading-snug"
						data-relations-label=""
						key={stop.slug}
					>
						<InlineHtml html={stop.role.html} />
					</span>
				) : null
			)}
		</li>
	);
}

function chapterNumber(number: number): string {
	return number === 0 ? "—" : String(number).padStart(2, "0");
}

function threadMapCss(columns: number, slugs: readonly string[]): string {
	const wide =
		columns * COLUMN_MIN_REM + Math.max(columns - 1, 0) * COLUMN_GAP_REM;
	const lit = slugs.flatMap((slug) => [
		`[data-thread-map][data-active~="${slug}"] [data-tm-station][data-tm-threads~="${slug}"]{opacity:1}`,
		`[data-thread-map][data-active~="${slug}"] [data-tm-dot][data-tm-thread="${slug}"]{background:${THREAD_COLOR}}`,
	]);

	return [
		`@container thread-map (min-width:${wide}rem){`,
		`[data-tm-strands],[data-tm-row]{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));column-gap:${COLUMN_GAP_REM}rem}`,
		"[data-tm-strands]{margin-bottom:.5rem}",
		"[data-tm-channel]{display:block;grid-row:2;grid-column:1/-1}",
		"[data-tm-cell][data-empty]{display:contents}",
		"[data-tm-head]{grid-row:1}",
		"[data-tm-stops]{grid-row:3}",
		"[data-tm-tag]{display:none}",
		"}",
		...lit,
	].join("\n");
}
