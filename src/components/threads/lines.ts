const LANE_WIDTH = 8;
const LANE_INSET = 3;
const GUTTER_PAD = 8;
const CHANNEL_STEP = 4;
const CHANNEL_PAD = 6;

interface Point {
	x: number;
	y: number;
}

interface Stop extends Point {
	channel?: number;
	lane: number;
}

const ROW = "[data-tm-row]";

export function laneLeft(lane: number): number {
	return LANE_INSET + lane * LANE_WIDTH;
}

function trackTop(lane: number): number {
	return CHANNEL_PAD + lane * CHANNEL_STEP;
}

export function laneSizes(lanes: number): { channel: number; gutter: number } {
	return {
		channel: trackTop(lanes) + CHANNEL_PAD,
		gutter: laneLeft(lanes) + GUTTER_PAD,
	};
}

export function traceRoutes(element: HTMLElement): Map<string, string> {
	const origin = element.getBoundingClientRect();
	const channels = new Map<Element | null, number>();
	for (const channel of element.querySelectorAll("[data-tm-channel]")) {
		const box = channel.getBoundingClientRect();
		if (box.height > 0) {
			channels.set(channel.closest(ROW), box.top - origin.top);
		}
	}

	// Document order is each thread's order through the course.
	const dots = Map.groupBy(
		element.querySelectorAll<HTMLElement>("[data-tm-dot]"),
		(dot) => dot.dataset.tmThread ?? ""
	);
	const stopAt = (dot: HTMLElement): Stop => {
		const box = dot.getBoundingClientRect();
		return {
			channel: channels.get(dot.closest(ROW)),
			lane: Number(dot.dataset.tmLane),
			x: box.left + box.width / 2 - origin.left,
			y: box.top + box.height / 2 - origin.top,
		};
	};

	return new Map(
		[...dots].map(([slug, list]) => [
			slug,
			polyline(routeThrough(list.map(stopAt))),
		])
	);
}

function routeThrough(stops: readonly Stop[]): Point[] {
	return stops.flatMap((stop, index) => {
		const previous = stops[index - 1];
		if (previous === undefined || Math.abs(previous.x - stop.x) < 1) {
			return [stop];
		}

		const y =
			stop.channel === undefined
				? (previous.y + stop.y) / 2
				: stop.channel + trackTop(stop.lane);
		return [{ x: previous.x, y }, { x: stop.x, y }, stop];
	});
}

// Square corners: a thread turns at right angles, never rounds.
function polyline(points: readonly Point[]): string {
	return points
		.filter((point, index) => {
			const previous = points[index - 1];
			const next = points[index + 1];
			return !(
				previous &&
				next &&
				((previous.x === point.x && point.x === next.x) ||
					(previous.y === point.y && point.y === next.y))
			);
		})
		.map((point, index) => `${index === 0 ? "M" : "L"}${coords(point)}`)
		.join(" ");
}

function coords({ x, y }: Point): string {
	return `${round(x)} ${round(y)}`;
}

function round(value: number): number {
	return Math.round(value * 2) / 2;
}
