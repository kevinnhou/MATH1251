import { THREAD_COLOR } from "@/components/relations/colors";
import { cn } from "@/lib/cn";
import type { ThreadRoute } from "@/lib/relations/types";

const LANE = 12;
const INSET = 4;

// Stops are evenly spaced in course order, like a metro diagram: the order and
// the strand changes matter, the distance between stops doesn't.
export function stopX(at: number, count: number): number {
	return count <= 1 ? 50 : INSET + (at * (100 - 2 * INSET)) / (count - 1);
}

export function nearestStop(ratio: number, count: number): number {
	if (count <= 1) {
		return 0;
	}

	const at = Math.round(
		((ratio * 100 - INSET) / (100 - 2 * INSET)) * (count - 1)
	);
	return Math.min(Math.max(at, 0), count - 1);
}

function laneY(lane: number): number {
	return lane * LANE + LANE / 2;
}

export function laneCode(title: string): string {
	return title.slice(0, 3).toUpperCase();
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
	const { lanes, stops } = route;
	const height = Math.max(lanes.length, 1) * LANE;
	const at = (index: number) => ({
		left: `${stopX(index, stops.length)}%`,
		top: laneY(stops[index]?.lane ?? 0),
	});

	return (
		<span
			className="grid grid-cols-[1.75rem_minmax(0,1fr)]"
			data-route-track=""
		>
			<span
				aria-hidden="true"
				className="flex flex-col font-mono text-[9px] text-fd-muted-foreground leading-none tracking-wider"
			>
				{lanes.map((lane) => (
					<span
						className="flex items-center"
						key={lane}
						style={{ height: LANE }}
					>
						{laneCode(lane)}
					</span>
				))}
			</span>
			<span aria-hidden="true" className="relative block" style={{ height }}>
				{lanes.map((lane, index) => (
					<span
						className="absolute inset-x-0 border-fd-border border-t border-dashed"
						key={lane}
						style={{ top: laneY(index) }}
					/>
				))}
				<svg
					aria-hidden="true"
					className="absolute inset-0 size-full overflow-visible"
					preserveAspectRatio="none"
					viewBox={`0 0 100 ${height}`}
				>
					<path
						d={routePath(route)}
						fill="none"
						stroke={
							tone === "thread"
								? THREAD_COLOR
								: "color-mix(in oklab, var(--color-fd-foreground) 40%, transparent)"
						}
						strokeWidth={1.5}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				{stops.map((stop, index) => (
					<span
						className={cn(
							"absolute size-1.5 -translate-x-1/2 -translate-y-1/2",
							here.includes(index)
								? "bg-fd-foreground"
								: "border border-fd-muted-foreground bg-(--route-bg)"
						)}
						key={stop.href}
						style={at(index)}
					/>
				))}
				{cursor === undefined ? null : (
					<span
						className="absolute size-3 -translate-x-1/2 -translate-y-1/2 border border-fd-foreground"
						data-route-cursor=""
						style={at(cursor)}
					/>
				)}
			</span>
		</span>
	);
}

function routePath({ stops }: ThreadRoute): string {
	return stops
		.flatMap((stop, index) => {
			const x = stopX(index, stops.length);
			const y = laneY(stop.lane);
			const previous = stops[index - 1];
			if (previous === undefined) {
				return [`M${x} ${y}`];
			}

			if (previous.lane === stop.lane) {
				return [`H${x}`];
			}

			const turn = (stopX(index - 1, stops.length) + x) / 2;
			return [`H${turn}`, `V${y}`, `H${x}`];
		})
		.join(" ");
}
