"use client";

import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { InlineHtml } from "@/components/markdown/html";
import { THREAD_COLOR } from "@/components/relations/colors";
import { moveKey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import {
	THREADS_ROUTE,
	type ThreadMap,
	type ThreadMapRow,
	type ThreadMapStation,
	type ThreadMapThread,
	threadMapHref,
} from "@/lib/relations/thread-map";
import type { CourseStrand } from "@/lib/relations/types";
import { laneLeft, laneSizes, traceRoutes } from "./lines";
import { laneCode } from "./route-track";

const COLUMN_MIN_REM = 14;
const COLUMN_GAP_REM = 2;

type Lanes = ReadonlyMap<string, number>;

// Focus is binary: a focused thread is drawn with its roles, everything else is
// left out, and chapter rows with nothing left collapse. With no focus, every
// thread is drawn in monochrome and the cursor lights the threads it is on.
export function ThreadsExplorer({
	initial,
	map,
	spines,
}: {
	initial: readonly string[];
	map: ThreadMap;
	spines: Readonly<Record<string, ReactNode>>;
}) {
	const [focused, setFocused] = useState<readonly string[]>(initial);
	const [preview, setPreview] = useState<string | null>(null);
	const [cursor, setCursor] = useState<string | null>(null);
	const panelRef = useRef<HTMLElement>(null);

	const focusing = focused.length > 0;
	const visible = focusing
		? map.threads.filter((thread) => focused.includes(thread.slug))
		: map.threads;
	const station = cursor === null ? undefined : stationById(map, cursor);
	const solo = focused.length === 1 ? visible[0] : undefined;
	const lit = litThreads(focusing, visible, preview, station);

	useHashCursor(map, setCursor);
	useFocusUrl(focused);
	useSpineCursor(panelRef, solo?.slug, station?.href);

	const inOrder = (slugs: readonly string[]) =>
		map.threads
			.filter((thread) => slugs.includes(thread.slug))
			.map((thread) => thread.slug);
	const actions: IndexActions = {
		clear: () => setFocused([]),
		preview: setPreview,
		solo: (slug) =>
			setFocused((previous) =>
				previous.length === 1 && previous[0] === slug ? [] : [slug]
			),
		toggle: (slug) =>
			setFocused((previous) =>
				previous.includes(slug)
					? previous.filter((entry) => entry !== slug)
					: inOrder([...previous, slug])
			),
	};

	return (
		<div
			className="not-prose mt-8 flex flex-col gap-10"
			data-threads=""
			onKeyDown={(event) => {
				if (event.key === "Escape" && !event.defaultPrevented && focusing) {
					event.preventDefault();
					actions.clear();
				}
			}}
		>
			<ThreadIndex
				actions={actions}
				focused={focused}
				preview={preview}
				threads={map.threads}
			/>
			<div className="@container">
				<div
					className={cn(
						"grid gap-10",
						solo && "@min-[60rem]:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
					)}
				>
					<MapView
						cursor={cursor}
						focusing={focusing}
						key={layoutKey(map, visible, focusing)}
						lit={lit}
						map={map}
						onCursor={setCursor}
						visible={visible}
					/>
					{solo ? (
						<RoutePanel
							ref={panelRef}
							spine={spines[solo.slug]}
							thread={solo}
						/>
					) : null}
				</div>
			</div>
		</div>
	);
}

function litThreads(
	focusing: boolean,
	visible: readonly ThreadMapThread[],
	preview: string | null,
	station: ThreadMapStation | undefined
): readonly string[] {
	if (focusing) {
		return visible.map((thread) => thread.slug);
	}

	if (preview !== null) {
		return [preview];
	}

	return station?.stops.map((stop) => stop.thread) ?? [];
}

function layoutKey(
	map: ThreadMap,
	visible: readonly ThreadMapThread[],
	focusing: boolean
): string {
	return focusing
		? visible.map((thread) => thread.slug).join(" ")
		: `all ${map.threads.length}`;
}

interface IndexActions {
	clear: () => void;
	preview: (slug: string | null) => void;
	solo: (slug: string) => void;
	toggle: (slug: string) => void;
}

const INDEX_ROW = "[data-index-row]";

function ThreadIndex({
	actions,
	focused,
	preview,
	threads,
}: {
	actions: IndexActions;
	focused: readonly string[];
	preview: string | null;
	threads: readonly ThreadMapThread[];
}) {
	const onRowKey = (event: KeyboardEvent<HTMLButtonElement>, slug: string) => {
		if (event.key === " ") {
			event.preventDefault();
			actions.toggle(slug);
			return;
		}

		const move = moveKey(event.nativeEvent);
		if (move === "up" || move === "down") {
			event.preventDefault();
			const list = event.currentTarget.closest("ol");
			const rows = list
				? [...list.querySelectorAll<HTMLElement>(INDEX_ROW)]
				: [];
			rows[
				rows.indexOf(event.currentTarget) + (move === "up" ? -1 : 1)
			]?.focus();
		}
	};

	return (
		<div className="flex flex-col">
			<div className="flex items-baseline justify-between pb-2 font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
				<span>
					<Bracket>INDEX</Bracket> {threads.length} threads
					{focused.length > 0 ? ` · ${focused.length} focused` : ""}
				</span>
				<button
					className="uppercase outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground enabled:hover:text-fd-foreground disabled:opacity-40"
					disabled={focused.length === 0}
					onClick={actions.clear}
					type="button"
				>
					<Bracket>CLEAR</Bracket>
				</button>
			</div>
			<ol
				className="m-0 list-none border-fd-border border-b p-0"
				onPointerLeave={() => actions.preview(null)}
			>
				{threads.map((thread) => {
					const on = focused.includes(thread.slug);
					const dim = focused.length > 0 && !on;
					return (
						<li
							className="grid grid-cols-[2rem_minmax(0,1fr)] border-fd-border border-t"
							key={thread.slug}
						>
							<button
								aria-label={`${on ? "Unfocus" : "Also focus"} ${thread.title.plain}`}
								className="group/box flex items-center justify-center outline-none"
								onClick={() => actions.toggle(thread.slug)}
								tabIndex={-1}
								type="button"
							>
								<span
									className={cn(
										"size-2 border",
										on
											? "border-fd-foreground bg-fd-foreground"
											: "border-fd-muted-foreground group-hover/box:border-fd-foreground"
									)}
								/>
							</button>
							<button
								aria-pressed={on}
								className={cn(
									"grid grid-cols-[1.5rem_minmax(0,1fr)_auto_1.5rem] items-baseline gap-3 py-2 pr-2 text-left outline-none hover:bg-fd-accent focus-visible:bg-fd-accent",
									dim ? "text-fd-muted-foreground" : "text-fd-foreground"
								)}
								data-index-row=""
								data-relations-label=""
								onBlur={() => actions.preview(null)}
								onClick={(event) =>
									event.shiftKey
										? actions.toggle(thread.slug)
										: actions.solo(thread.slug)
								}
								onFocus={() => actions.preview(thread.slug)}
								onKeyDown={(event) => onRowKey(event, thread.slug)}
								onPointerEnter={() => actions.preview(thread.slug)}
								type="button"
							>
								<span className="font-mono text-[10px] text-fd-muted-foreground">
									{pad(thread.number)}
								</span>
								<span className="truncate text-[13px]">
									<InlineHtml html={thread.title.html} />
								</span>
								<span className="font-mono text-[9px] text-fd-muted-foreground tracking-wider">
									{thread.route.lanes.map(laneCode).join("·")}
								</span>
								<span className="text-right font-mono text-[10px] text-fd-muted-foreground">
									{pad(thread.route.stops.length)}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
			<IndexStatus preview={preview} threads={threads} />
		</div>
	);
}

// Every summary sits in the same grid cell, so the line keeps the height of
// the longest and nothing below it moves.
function IndexStatus({
	preview,
	threads,
}: {
	preview: string | null;
	threads: readonly ThreadMapThread[];
}) {
	const shown = threads.find((thread) => thread.slug === preview);

	return (
		<div className="mt-3 grid text-[13px] text-fd-muted-foreground leading-relaxed">
			<p
				aria-hidden={shown !== undefined}
				className="col-start-1 row-start-1 m-0 font-mono text-[10px] uppercase leading-5 tracking-wider"
				style={{ visibility: shown ? "hidden" : "visible" }}
			>
				↑↓ move · ↵ focus · space add · shift-click add · esc clear
			</p>
			{threads.map((thread) => (
				<p
					aria-hidden={shown !== thread}
					className="col-start-1 row-start-1 m-0"
					data-relations-label=""
					key={thread.slug}
					style={{ visibility: shown === thread ? "visible" : "hidden" }}
				>
					<InlineHtml html={thread.summary.html} />
				</p>
			))}
		</div>
	);
}

type Block =
	| { kind: "row"; row: ThreadMapRow }
	| { from: number; kind: "gap"; to: number };

function MapView({
	cursor,
	focusing,
	lit,
	map,
	onCursor,
	visible,
}: {
	cursor: string | null;
	focusing: boolean;
	lit: readonly string[];
	map: ThreadMap;
	onCursor: (id: string) => void;
	visible: readonly ThreadMapThread[];
}) {
	const linesRef = useRef<HTMLDivElement>(null);
	const routes = useRoutes(linesRef);
	const lanes: Lanes = new Map(
		visible.map((thread, lane) => [thread.slug, lane])
	);
	const shown = (station: ThreadMapStation) =>
		station.stops.some((stop) => lanes.has(stop.thread));
	const strands = map.strands.filter(
		(strand) =>
			!focusing ||
			map.rows.some((row) =>
				row.cells.some(
					(cell) => cell.strand === strand.id && cell.stations.some(shown)
				)
			)
	);
	const blocks = mapBlocks(map.rows, strands, shown);
	const stations = blocks.flatMap((block) =>
		block.kind === "row"
			? block.row.cells.flatMap((cell) => cell.stations.filter(shown))
			: []
	);
	const tabbable =
		stations.find((station) => station.id === cursor)?.id ?? stations[0]?.id;
	const numbers = new Map(
		map.threads.map((thread) => [thread.slug, thread.number])
	);
	const { channel, gutter } = laneSizes(visible.length);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const move = moveKey(event.nativeEvent);
		const links = [
			...event.currentTarget.querySelectorAll<HTMLElement>("[data-tm-link]"),
		];
		const at = links.indexOf(event.target as HTMLElement);
		if (at < 0) {
			return;
		}

		const next = (() => {
			if (event.key === "Home") {
				return links[0];
			}
			if (event.key === "End") {
				return links.at(-1);
			}
			if (move === "up" || move === "left") {
				return links[at - 1];
			}
			if (move === "down" || move === "right") {
				return links[at + 1];
			}
		})();

		if (event.key === "Home" || event.key === "End" || move !== null) {
			event.preventDefault();
			next?.focus();
		}
	};

	return (
		<figure
			aria-label="Thread map"
			className="m-0 min-w-0"
			data-thread-map=""
			style={
				{
					"--tm-channel": `${channel}px`,
					"--tm-gutter": `${gutter}px`,
				} as CSSProperties
			}
		>
			<style>{mapCss(strands.length)}</style>
			<div className="relative">
				<MapLines lit={lit} routes={routes} visible={visible} />
				<div className="relative" onKeyDown={onKeyDown} ref={linesRef}>
					<div
						className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider"
						data-tm-strands=""
					>
						{strands.map((strand) => (
							<span className="pl-(--tm-gutter)" key={strand.id}>
								{strand.title}
							</span>
						))}
					</div>
					{blocks.map((block) =>
						block.kind === "gap" ? (
							<MapGap block={block} key={`gap-${block.from}`} />
						) : (
							<MapRow
								cursor={cursor}
								focusing={focusing}
								key={block.row.number}
								lanes={lanes}
								lit={lit}
								numbers={numbers}
								onCursor={onCursor}
								row={block.row}
								shown={shown}
								strands={strands}
								tabbable={tabbable}
							/>
						)
					)}
				</div>
			</div>
		</figure>
	);
}

function mapBlocks(
	rows: readonly ThreadMapRow[],
	strands: readonly CourseStrand[],
	shown: (station: ThreadMapStation) => boolean
): Block[] {
	const blocks: Block[] = [];
	for (const row of rows) {
		const kept = row.cells.filter((cell) =>
			strands.some((strand) => strand.id === cell.strand)
		);
		if (kept.some((cell) => cell.stations.some(shown))) {
			blocks.push({ kind: "row", row: { ...row, cells: kept } });
			continue;
		}

		const last = blocks.at(-1);
		if (last?.kind === "gap") {
			last.to = row.number;
		} else {
			blocks.push({ from: row.number, kind: "gap", to: row.number });
		}
	}
	return blocks;
}

function MapGap({ block }: { block: { from: number; to: number } }) {
	return (
		<div
			className="border-fd-border border-t border-dashed py-1.5 pl-(--tm-gutter) font-mono text-[10px] text-fd-muted-foreground"
			data-tm-gap=""
		>
			{block.from === block.to
				? pad(block.from)
				: `${pad(block.from)}–${pad(block.to)}`}
		</div>
	);
}

interface RowProps {
	cursor: string | null;
	focusing: boolean;
	lanes: Lanes;
	lit: readonly string[];
	numbers: ReadonlyMap<string, number>;
	onCursor: (id: string) => void;
	shown: (station: ThreadMapStation) => boolean;
	strands: readonly CourseStrand[];
	tabbable: string | undefined;
}

function MapRow({ row, ...props }: RowProps & { row: ThreadMapRow }) {
	return (
		<div className="border-fd-border border-t pt-3 pb-5" data-tm-row="">
			<div aria-hidden="true" data-tm-channel="" />
			{row.cells.map((cell, column) => {
				const stations = cell.stations.filter(props.shown);
				const strand = props.strands.find((entry) => entry.id === cell.strand);
				const place = { gridColumn: column + 1 };
				return (
					<div
						data-empty={stations.length === 0 || undefined}
						data-tm-cell=""
						key={cell.strand}
					>
						<p
							className="m-0 pl-(--tm-gutter) text-[12px] text-fd-muted-foreground"
							data-tm-head=""
							style={place}
						>
							{cell.chapter ? (
								<>
									<span className="font-mono text-[10px]">
										{cell.chapter.number === 0 ? "—" : pad(cell.chapter.number)}
									</span>{" "}
									<span data-tm-tag="">{strand?.title} · </span>
									<span className="italic">{cell.chapter.title}</span>
								</>
							) : null}
						</p>
						<ol
							className="m-0 flex list-none flex-col gap-3 p-0 pt-2.5 pb-3"
							data-tm-stops=""
							style={place}
						>
							{stations.map((station) => (
								<Station key={station.href} station={station} {...props} />
							))}
						</ol>
					</div>
				);
			})}
		</div>
	);
}

function Station({
	cursor,
	focusing,
	lanes,
	lit,
	numbers,
	onCursor,
	station,
	tabbable,
}: RowProps & { station: ThreadMapStation }) {
	const stops = station.stops.filter((stop) => lanes.has(stop.thread));
	const laneOf = (thread: string) => lanes.get(thread) ?? 0;
	const first = Math.min(...stops.map((stop) => laneOf(stop.thread)));
	const last = Math.max(...stops.map((stop) => laneOf(stop.thread)));
	const here = cursor === station.id;

	return (
		<li
			className="relative pl-(--tm-gutter)"
			data-tm-station=""
			id={station.id}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") {
					onCursor(station.id);
				}
			}}
		>
			<span
				aria-hidden="true"
				className="absolute top-2.5 left-0 h-0 w-(--tm-gutter)"
			>
				{stops.length > 1 ? (
					<span
						className="absolute h-0.5 -translate-y-1/2 bg-(--tm-dot)"
						style={{
							left: laneLeft(first) + 1,
							width: laneLeft(last) - laneLeft(first) + 4,
						}}
					/>
				) : null}
				{stops.map((stop) => (
					<span
						className="absolute size-1.5 -translate-y-1/2"
						data-tm-dot=""
						data-tm-lane={laneOf(stop.thread)}
						data-tm-thread={stop.thread}
						key={stop.thread}
						style={{
							background: lit.includes(stop.thread)
								? THREAD_COLOR
								: "var(--tm-dot)",
							left: laneLeft(laneOf(stop.thread)),
						}}
					/>
				))}
			</span>
			<a
				className={cn(
					"-mx-1 box-decoration-clone px-1 py-px text-[13px] leading-5 outline-none",
					here
						? "bg-fd-foreground text-fd-background"
						: "text-fd-foreground underline-offset-4 hover:underline"
				)}
				data-relations-label=""
				data-tm-link=""
				href={station.href}
				onFocus={() => onCursor(station.id)}
				tabIndex={station.id === tabbable ? 0 : -1}
			>
				<span
					className={cn(
						"mr-2 font-mono text-[10px]",
						here ? "opacity-70" : "text-fd-muted-foreground"
					)}
				>
					{station.code}
				</span>
				<InlineHtml html={station.title.html} />
			</a>
			{focusing
				? stops.map((stop) =>
						stop.role ? (
							<span
								className="mt-0.5 block text-[12px] text-fd-muted-foreground italic leading-snug"
								data-relations-label=""
								key={stop.thread}
							>
								{lanes.size > 1 ? (
									<span className="font-mono text-[10px] not-italic">
										{pad(numbers.get(stop.thread) ?? 0)} /{" "}
									</span>
								) : null}
								<InlineHtml html={stop.role.html} />
							</span>
						) : null
					)
				: null}
		</li>
	);
}

function MapLines({
	lit,
	routes,
	visible,
}: {
	lit: readonly string[];
	routes: ReadonlyMap<string, string>;
	visible: readonly ThreadMapThread[];
}) {
	const isLit = (thread: ThreadMapThread) => lit.includes(thread.slug);

	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 size-full overflow-visible"
		>
			{visible
				.toSorted((left, right) => Number(isLit(left)) - Number(isLit(right)))
				.map((thread) => (
					<path
						d={routes.get(thread.slug) ?? ""}
						fill="none"
						key={thread.slug}
						stroke={lineColor(lit.length > 0, isLit(thread))}
						strokeLinejoin="miter"
						strokeWidth={isLit(thread) ? 2 : 1.5}
					/>
				))}
		</svg>
	);
}

function lineColor(dimmed: boolean, lit: boolean): string {
	if (lit) {
		return THREAD_COLOR;
	}

	return dimmed
		? "var(--color-fd-border)"
		: "color-mix(in oklab, var(--color-fd-foreground) 30%, transparent)";
}

function RoutePanel({
	ref,
	spine,
	thread,
}: {
	ref: RefObject<HTMLElement | null>;
	spine: ReactNode;
	thread: ThreadMapThread;
}) {
	return (
		<aside
			aria-label={`${thread.title.plain} route`}
			className="@min-[60rem]:sticky @min-[60rem]:top-20 flex @min-[60rem]:max-h-[calc(100dvh-7rem)] min-w-0 flex-col gap-3 @min-[60rem]:self-start @min-[60rem]:overflow-y-auto border-fd-border border-t pt-3"
			ref={ref}
		>
			<div className="flex items-baseline justify-between font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
				<span>
					<Bracket>ROUTE</Bracket> {pad(thread.number)}
				</span>
				<a
					className="outline-none hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground"
					href={thread.href}
				>
					<Bracket>READ</Bracket>
				</a>
			</div>
			<h2
				className="m-0 font-semibold text-base text-fd-foreground"
				data-relations-label=""
			>
				<InlineHtml html={thread.title.html} />
			</h2>
			<p
				className="m-0 text-[13px] text-fd-muted-foreground leading-relaxed"
				data-relations-label=""
			>
				<InlineHtml html={thread.summary.html} />
			</p>
			<div className="group/spine" data-open="">
				{spine}
			</div>
		</aside>
	);
}

function Bracket({ children }: { children: ReactNode }) {
	return (
		<span>
			<span className="text-fd-foreground">[</span>
			{children}
			<span className="text-fd-foreground">]</span>
		</span>
	);
}

function pad(number: number): string {
	return String(number).padStart(2, "0");
}

function stationById(map: ThreadMap, id: string): ThreadMapStation | undefined {
	for (const row of map.rows) {
		for (const cell of row.cells) {
			const found = cell.stations.find((station) => station.id === id);
			if (found) {
				return found;
			}
		}
	}
}

function mapCss(columns: number): string {
	const wide =
		columns * COLUMN_MIN_REM + Math.max(columns - 1, 0) * COLUMN_GAP_REM;

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
	].join("\n");
}

// The map's lines are measured from its dots. The map remounts when the
// visible threads change, so the first measure runs before paint.
function useRoutes(
	ref: RefObject<HTMLElement | null>
): ReadonlyMap<string, string> {
	const [routes, setRoutes] = useState<ReadonlyMap<string, string>>(
		() => new Map()
	);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		setRoutes(traceRoutes(element));
		let frame = 0;
		let live = true;
		const measure = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => setRoutes(traceRoutes(element)));
		};

		const observer = new ResizeObserver(measure);
		observer.observe(element);
		document.fonts?.ready.then(() => live && measure());
		return () => {
			live = false;
			observer.disconnect();
			cancelAnimationFrame(frame);
		};
	}, [ref]);

	return routes;
}

// `/threads/<slug>#<station>` puts the cursor on that station.
function useHashCursor(map: ThreadMap, setCursor: (id: string) => void) {
	useEffect(() => {
		const read = () => {
			const id = decodeURIComponent(window.location.hash.slice(1));
			if (id !== "" && stationById(map, id)) {
				setCursor(id);
				document.getElementById(id)?.scrollIntoView({ block: "center" });
			}
		};

		read();
		window.addEventListener("hashchange", read);
		return () => window.removeEventListener("hashchange", read);
	}, [map, setCursor]);
}

// The address names the first focused thread, so a reload or a shared link
// opens on it. The hash survives until the focus changes.
function useFocusUrl(focused: readonly string[]) {
	const [first] = focused;
	useEffect(() => {
		const path = first === undefined ? THREADS_ROUTE : threadMapHref(first);
		if (window.location.pathname !== path) {
			window.history.replaceState(null, "", path);
		}
	}, [first]);
}

// The route panel follows the map's cursor: its station is current, and the
// panel scrolls (by itself, never the page) to keep it in view.
function useSpineCursor(
	panelRef: RefObject<HTMLElement | null>,
	thread: string | undefined,
	href: string | undefined
) {
	useEffect(() => {
		const panel = panelRef.current;
		if (!(panel && thread)) {
			return;
		}

		let current: HTMLElement | undefined;
		for (const item of panel.querySelectorAll<HTMLElement>("[data-station]")) {
			if (item.dataset.href === href) {
				item.dataset.state = "current";
				current = item;
			} else {
				delete item.dataset.state;
			}
		}

		if (current) {
			const box = panel.getBoundingClientRect();
			const item = current.getBoundingClientRect();
			if (item.top < box.top || item.bottom > box.bottom) {
				panel.scrollTop += item.top - box.top - 16;
			}
		}
	}, [panelRef, thread, href]);
}
