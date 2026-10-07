export interface Box {
	bottom: number;
	left: number;
	right: number;
	top: number;
}

export interface Point {
	x: number;
	y: number;
}

interface PointerState {
	inside: boolean;
	target: Element | null;
	time: number;
	vx: number;
	vy: number;
	x: number;
	y: number;
}

const SMOOTHING_MS = 40;
const RESTART_MS = 100;

export const pointer: PointerState = {
	inside: false,
	target: null,
	time: Number.NEGATIVE_INFINITY,
	vx: 0,
	vy: 0,
	x: 0,
	y: 0,
};

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function onPointerMove(event: PointerEvent) {
	if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
		return;
	}

	const dt = event.timeStamp - pointer.time;
	if (dt > 0 && dt < RESTART_MS) {
		const k = Math.min(dt / SMOOTHING_MS, 1);
		pointer.vx += ((event.clientX - pointer.x) / dt - pointer.vx) * k;
		pointer.vy += ((event.clientY - pointer.y) / dt - pointer.vy) * k;
	} else if (dt >= RESTART_MS) {
		pointer.vx = 0;
		pointer.vy = 0;
	}

	pointer.inside = true;
	pointer.target = event.target instanceof Element ? event.target : null;
	pointer.time = event.timeStamp;
	pointer.x = event.clientX;
	pointer.y = event.clientY;
	notify();
}

function onPointerLeave() {
	pointer.inside = false;
	pointer.vx = 0;
	pointer.vy = 0;
	notify();
}

export function subscribePointer(listener: () => void): () => void {
	if (listeners.size === 0) {
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		document.documentElement.addEventListener("pointerleave", onPointerLeave);
	}

	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			window.removeEventListener("pointermove", onPointerMove);
			document.documentElement.removeEventListener(
				"pointerleave",
				onPointerLeave
			);
		}
	};
}

export function pointerSpeed(): number {
	return Math.hypot(pointer.vx, pointer.vy);
}

export function distanceToBox(box: Box, x: number, y: number): number {
	const dx = Math.max(box.left - x, 0, x - box.right);
	const dy = Math.max(box.top - y, 0, y - box.bottom);
	return Math.hypot(dx, dy);
}

export function timeToEnter(
	box: Box,
	margin: number,
	x: number,
	y: number,
	vx: number,
	vy: number
): number {
	let enter = 0;
	let exit = Number.POSITIVE_INFINITY;
	const axes = [
		[x, vx, box.left - margin, box.right + margin],
		[y, vy, box.top - margin, box.bottom + margin],
	] as const;

	for (const [position, velocity, low, high] of axes) {
		if (velocity === 0) {
			if (position < low || position > high) {
				return Number.POSITIVE_INFINITY;
			}
			continue;
		}

		const a = (low - position) / velocity;
		const b = (high - position) / velocity;
		enter = Math.max(enter, Math.min(a, b));
		exit = Math.min(exit, Math.max(a, b));
	}

	return enter <= exit ? enter : Number.POSITIVE_INFINITY;
}
