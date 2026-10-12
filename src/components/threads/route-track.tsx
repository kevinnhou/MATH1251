import { foregroundAt } from "@/components/relations/colors";
import { cn } from "@/lib/cn";
import type { ThreadRoute } from "@/lib/relations/types";
import { laneCode } from "./format";
import { packChapters, squareLine } from "./geometry";

const UNIT = { gap: 4, pad: 2, slot: 10 } as const;
const AXIS = 13;
const BAND = 14;
const BAND_GAP = 3;
const STOP = 7;

const TINT = foregroundAt(6);
const COLUMN = foregroundAt(12);
const INK = "var(--route-ink)";

export interface RouteLayout {
	chapters: { number?: number; x0: number; x1: number }[];
	slot: number;
	xs: number[];
}

export function routeLayout({ stops }: ThreadRoute): RouteLayout {
	const runs: { count: number; number?: number }[] = [];
	for (const stop of stops) {
		const run = runs.at(-1);
		if (run && run.number === stop.chapter) {
			run.count += 1;
		} else {
			runs.push({ count: 1, number: stop.chapter });
		}
	}

	const packed = packChapters(runs, (run) => run.count, UNIT);
	const total = packed.at(-1)?.x1 ?? 0;
	const percent = (value: number) => (total === 0 ? 50 : (value * 100) / total);

	return {
		chapters: packed.map(({ number, x0, x1 }) => ({
			number,
			x0: percent(x0),
			x1: percent(x1),
		})),
		slot: percent(UNIT.slot),
		xs: packed.flatMap(({ xs }) => xs.map(percent)),
	};
}

export function nearestStop(ratio: number, { xs }: RouteLayout): number {
	const x = ratio * 100;
	let best = 0;
	for (const [at, value] of xs.entries()) {
		if (Math.abs(value - x) < Math.abs((xs[best] ?? 0) - x)) {
			best = at;
		}
	}
	return best;
}

function bandTop(lane: number): number {
	return AXIS + lane * (BAND + BAND_GAP);
}

function trackY(lane: number): number {
	return bandTop(lane) + BAND / 2;
}

export function RouteTrack({
	cursor,
	here,
	route,
	tone = "thread",
}: {
	cursor?: number;
	here: readonly number[];
	route: ThreadRoute;
	tone?: "muted" | "thread";
}) {
	const layout = routeLayout(route);
	const { lanes, stops } = route;
	const height = bandTop(Math.max(lanes.length, 1)) - BAND_GAP;
	const points = stops.map((stop, at) => ({
		chapter: stop.chapter,
		href: stop.href,
		x: layout.xs[at] ?? 50,
		y: trackY(stop.lane),
	}));
	const { solid, transit } = squareLine(points, layout.slot);
	const cursorX = cursor === undefined ? undefined : layout.xs[cursor];

	return (
		<span
			className="grid grid-cols-[1.75rem_minmax(0,1fr)]"
			data-route-track={tone}
		>
			<span
				aria-hidden="true"
				className="relative block font-mono text-[9px] text-fd-muted-foreground leading-none tracking-wider"
				style={{ height }}
			>
				{lanes.map((lane, index) => (
					<span
						className="absolute left-0 flex items-center"
						key={lane}
						style={{ height: BAND, top: bandTop(index) }}
					>
						{laneCode(lane)}
					</span>
				))}
			</span>
			<span
				aria-hidden="true"
				className="relative block"
				data-route-plot=""
				style={{ height }}
			>
				{layout.chapters.map((chapter) => (
					<span key={chapter.x0}>
						<span
							className="absolute top-0 font-mono text-[9px] text-fd-muted-foreground leading-none"
							style={{ left: `${chapter.x0}%` }}
						>
							{chapter.number ?? ""}
						</span>
						{lanes.map((lane, index) => (
							<span
								className="absolute"
								key={lane}
								style={{
									background: TINT,
									height: BAND,
									left: `${chapter.x0}%`,
									top: bandTop(index),
									width: `${chapter.x1 - chapter.x0}%`,
								}}
							/>
						))}
					</span>
				))}
				{cursorX === undefined ? null : (
					<span
						className="absolute"
						data-route-cursor=""
						style={{
							background: COLUMN,
							height: height - AXIS + 2,
							left: `${cursorX - layout.slot / 2}%`,
							top: AXIS - 1,
							width: `${layout.slot}%`,
						}}
					/>
				)}
				<svg
					aria-hidden="true"
					className="absolute inset-0 size-full overflow-visible"
					preserveAspectRatio="none"
					viewBox={`0 0 100 ${height}`}
				>
					<path
						className="transition-[stroke] duration-300"
						d={transit}
						fill="none"
						strokeDasharray="1 3"
						strokeWidth={1.25}
						style={{ stroke: INK }}
						vectorEffect="non-scaling-stroke"
					/>
					<path
						className="transition-[stroke] duration-300"
						d={solid}
						fill="none"
						strokeWidth={1.75}
						style={{ stroke: INK }}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				{points.map(({ href, x, y }, at) => {
					const filled = here.includes(at) || at === cursor;
					return (
						<span
							className={cn(
								"absolute -translate-x-1/2 -translate-y-1/2 border-[1.5px] transition-colors duration-300",
								filled ? "bg-fd-foreground" : "bg-(--route-bg)"
							)}
							key={href}
							style={{
								borderColor: filled ? "var(--color-fd-foreground)" : INK,
								height: STOP,
								left: `${x}%`,
								top: y,
								width: STOP,
							}}
						/>
					);
				})}
			</span>
		</span>
	);
}
