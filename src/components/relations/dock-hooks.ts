"use client";

import {
	type FocusEvent,
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import {
	type Box,
	distanceToBox,
	type Point,
	pointer,
	pointerSpeed,
	subscribePointer,
	timeToEnter,
} from "./pointer";

const READING_LINE = 0.35;
const LINE_SLACK = 40;
const CURSOR_TTL = 6000;
const SETTLE_MS = 160;
const SETTLED_SPEED = 0.15;
const CURSOR_SLACK = 16;

const APPROACH = { horizon: 220, minSpeed: 0.3, reach: 320 } as const;

const CORRIDOR = { dwell: 500, margin: 24, minSpeed: 0.2, minTravel: 40 };

const PROXIMITY = { closeDelay: 320, openDelay: 100, radius: 48 } as const;

export type DockState = "rest" | "bay";

export interface Corridor {
	apex: Point | null;
	dock: Box | null;
}

export function useCorridor(): Corridor {
	const [corridor] = useState<Corridor>(() => ({ apex: null, dock: null }));
	return corridor;
}

function inCorridor({ apex, dock }: Corridor, { x, y }: Point): boolean {
	return (
		apex !== null &&
		dock !== null &&
		timeToEnter(dock, CORRIDOR.margin, x, y, x - apex.x, y - apex.y) !==
			Number.POSITIVE_INFINITY
	);
}

export function useDockState(
	rootRef: RefObject<HTMLElement | null>,
	corridor: Corridor
) {
	const [pinned, setPinned] = useState(false);
	const [keyboardFocus, setKeyboardFocus] = useState(false);
	const [dismissed, setDismissed] = useState(false);
	const near = useProximity(rootRef, corridor);

	if (dismissed && !near) {
		setDismissed(false);
	}

	const state: DockState =
		(near && !dismissed) || pinned || keyboardFocus ? "bay" : "rest";

	const dismiss = () => {
		setPinned(false);
		setDismissed(true);
	};

	const onEscape = useEffectEvent(() => {
		dismiss();
		const active = document.activeElement;
		if (active instanceof HTMLElement && rootRef.current?.contains(active)) {
			active.blur();
		}
	});

	const open = state === "bay";
	useEffect(() => {
		if (!open) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented) {
				event.preventDefault();
				onEscape();
			}
		};

		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [open]);

	return {
		engaged: near || keyboardFocus,
		focusHandlers: {
			onBlur: (event: FocusEvent<HTMLElement>) => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setKeyboardFocus(false);
				}
			},
			onFocus: (event: FocusEvent<HTMLElement>) => {
				if (event.target.matches(":focus-visible")) {
					setKeyboardFocus(true);
				}
			},
		},
		state,
		toggleBay: () => (state === "bay" ? dismiss() : setPinned(true)),
	};
}

export function useActiveAnchor(
	anchors: readonly string[],
	frozen: boolean,
	corridor: Corridor
): string | null {
	const [active, setActive] = useState<string | null>(null);
	const frozenRef = useRef(frozen);
	const scheduleRef = useRef<() => void>(undefined);

	useEffect(() => {
		frozenRef.current = frozen;
		if (!frozen) {
			scheduleRef.current?.();
		}
	}, [frozen]);

	useEffect(() => {
		const visible = new Set<Element>();
		let current: string | null = null;
		let frame = 0;
		let recheckTimer: ReturnType<typeof setTimeout> | undefined;
		let expiryTimer: ReturnType<typeof setTimeout> | undefined;

		const commit = (next: string | null) => {
			current = next;
			setActive(next);
		};

		const measure = () => {
			frame = 0;
			if (frozenRef.current) {
				return;
			}

			const idle = performance.now() - pointer.time;
			const cursor =
				pointer.inside &&
				idle <= CURSOR_TTL &&
				!pointer.target?.closest("[data-dock]")
					? pointer
					: undefined;
			const scan = scanEnvs(visible, {
				current,
				cursor,
				line: window.innerHeight * READING_LINE,
			});
			const decision = decide(scan, { corridor, current, cursor, idle });

			if ("hold" in decision) {
				recheckTimer ??= setTimeout(() => {
					recheckTimer = undefined;
					schedule();
				}, decision.hold);
				return;
			}

			if (decision.expiry !== undefined) {
				clearTimeout(expiryTimer);
				expiryTimer = setTimeout(schedule, decision.expiry);
			}
			commit(decision.id);
		};

		const schedule = () => {
			if (frame === 0) {
				frame = requestAnimationFrame(measure);
			}
		};
		scheduleRef.current = schedule;

		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					visible.add(entry.target);
				} else {
					visible.delete(entry.target);
				}
			}
			schedule();
		});
		for (const id of anchors) {
			const element = document.getElementById(id);
			if (element) {
				observer.observe(element);
			}
		}

		const unsubscribe = subscribePointer(schedule);
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(recheckTimer);
			clearTimeout(expiryTimer);
			observer.disconnect();
			unsubscribe();
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			scheduleRef.current = undefined;
		};
	}, [anchors, corridor]);

	return active;
}

interface Scan {
	held: boolean;
	inCurrent: boolean;
	onLine: Element | undefined;
	pointed: Element | undefined;
}

type Decision = { hold: number } | { expiry?: number; id: string | null };

function decide(
	scan: Scan,
	context: {
		corridor: Corridor;
		current: string | null;
		cursor: Point | undefined;
		idle: number;
	}
): Decision {
	const { corridor, current, cursor, idle } = context;
	if (cursor) {
		if (
			!scan.inCurrent &&
			inCorridor(corridor, cursor) &&
			idle < CORRIDOR.dwell
		) {
			return { hold: CORRIDOR.dwell - idle };
		}

		const settled = idle >= SETTLE_MS || pointerSpeed() <= SETTLED_SPEED;
		if (scan.inCurrent || settled) {
			corridor.apex = { x: cursor.x, y: cursor.y };
		}

		if (scan.pointed) {
			return settled
				? { expiry: CURSOR_TTL - idle + 1, id: scan.pointed.id }
				: { hold: SETTLE_MS };
		}
	}

	return { id: scan.onLine?.id ?? (scan.held ? current : null) };
}

function scanEnvs(
	visible: Iterable<Element>,
	options: {
		current: string | null;
		cursor: Point | undefined;
		line: number;
	}
): Scan {
	const { current, cursor, line } = options;
	let pointed: Element | undefined;
	let pointedHeight = Number.POSITIVE_INFINITY;
	let onLine: Element | undefined;
	let onLineHeight = Number.POSITIVE_INFINITY;
	let held = false;
	let inCurrent = false;

	for (const element of visible) {
		const rect = element.getBoundingClientRect();
		const under = cursor !== undefined && underCursor(rect, cursor);
		if (under && rect.height < pointedHeight) {
			pointed = element;
			pointedHeight = rect.height;
		}

		if (under && element.id === current) {
			inCurrent = true;
		}

		if (rect.top <= line && rect.bottom >= line && rect.height < onLineHeight) {
			onLine = element;
			onLineHeight = rect.height;
		}

		if (
			element.id === current &&
			rect.top - LINE_SLACK <= line &&
			rect.bottom + LINE_SLACK >= line
		) {
			held = true;
		}
	}

	return { held, inCurrent, onLine, pointed };
}

function underCursor(rect: DOMRect, cursor: Point): boolean {
	return (
		cursor.x >= rect.left - CURSOR_SLACK &&
		cursor.x <= rect.right + CURSOR_SLACK &&
		cursor.y >= rect.top &&
		cursor.y <= rect.bottom
	);
}

export function useProximity(
	ref: RefObject<HTMLElement | null>,
	corridor: Corridor
): boolean {
	const { closeDelay, openDelay, radius } = PROXIMITY;
	const [near, setNear] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		let box: Box = element.getBoundingClientRect();
		corridor.dock = box;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let target = false;
		let streak = 0;

		const measure = () => {
			box = element.getBoundingClientRect();
			corridor.dock = box;
		};

		const aim = (next: boolean, delay: number) => {
			if (next === target) {
				return;
			}

			target = next;
			clearTimeout(timer);
			if (delay === 0) {
				setNear(next);
			} else {
				timer = setTimeout(() => setNear(next), delay);
			}
		};

		const onPointer = () => {
			if (!pointer.inside) {
				streak = 0;
				aim(false, closeDelay);
				return;
			}

			const distance = distanceToBox(box, pointer.x, pointer.y);
			const heading =
				advancing(corridor, box) ||
				(distance <= APPROACH.reach && aimedAt(box));
			streak = heading ? streak + 1 : 0;

			if (streak >= 2) {
				aim(true, 0);
			} else if (distance <= radius) {
				aim(true, openDelay);
			} else {
				aim(false, closeDelay);
			}
		};

		const observer = new ResizeObserver(measure);
		observer.observe(element);
		const unsubscribe = subscribePointer(onPointer);
		window.addEventListener("resize", measure);
		return () => {
			clearTimeout(timer);
			observer.disconnect();
			unsubscribe();
			window.removeEventListener("resize", measure);
		};
	}, [corridor, ref]);

	return near;
}

function advancing(corridor: Corridor, box: Box): boolean {
	const { apex } = corridor;
	if (
		apex === null ||
		Math.hypot(pointer.x - apex.x, pointer.y - apex.y) < CORRIDOR.minTravel ||
		!inCorridor(corridor, pointer)
	) {
		return false;
	}

	const dx = (box.left + box.right) / 2 - pointer.x;
	const dy = (box.top + box.bottom) / 2 - pointer.y;
	const closing = (pointer.vx * dx + pointer.vy * dy) / Math.hypot(dx, dy);
	return closing >= CORRIDOR.minSpeed;
}

function aimedAt(box: Box): boolean {
	return (
		pointerSpeed() >= APPROACH.minSpeed &&
		timeToEnter(
			box,
			PROXIMITY.radius,
			pointer.x,
			pointer.y,
			pointer.vx,
			pointer.vy
		) <= APPROACH.horizon
	);
}

export function useBoxHeight() {
	const [height, setHeight] = useState<number>();
	const ref = useCallback((node: HTMLElement | null) => {
		if (node === null) {
			return;
		}

		const observer = new ResizeObserver(([entry]) => {
			setHeight(entry?.borderBoxSize[0]?.blockSize ?? node.offsetHeight);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return [ref, height] as const;
}
