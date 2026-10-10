"use client";

import Link from "next/link";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { moveKey } from "@/lib/client/keybinds";
import type { RenderedMarkdown } from "@/lib/markdown/types";
import type { RouteStop, ThreadRoute } from "@/lib/relations/types";
import { nearestStop, RouteTrack } from "./route-track";

const NAV = "[data-route-nav]";
const GROUP = "[data-route-group]";

// A thread's route as one link to the threads page. While it has focus,
// ←/→ (A/D) move a cursor along the stops, Home/End jump to the ends, ↑/↓
// (W/S) move to the next `data-route-nav` element in the same group (the other
// strips, and whatever the group adds, like the dock's rest bar), and Enter opens the page at
// the cursor. The pointer moves the cursor too, so a click opens the stop under it.
export function RouteStrip({
	here,
	mapHref,
	route,
	title,
}: {
	here: readonly number[];
	mapHref: string;
	route: ThreadRoute;
	title: RenderedMarkdown<"inline">;
}) {
	const [cursor, setCursor] = useState(here[0] ?? 0);
	const [engaged, setEngaged] = useState<"key" | "pointer" | null>(null);
	const trackRef = useRef<HTMLSpanElement>(null);
	const last = route.stops.length - 1;
	const stop = route.stops[cursor];
	if (stop === undefined) {
		return null;
	}

	const onKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
		const move = moveKey(event.nativeEvent);
		const next = (() => {
			if (event.key === "Home") {
				return 0;
			}
			if (event.key === "End") {
				return last;
			}
			if (move === "left" || move === "right") {
				return Math.min(Math.max(cursor + (move === "left" ? -1 : 1), 0), last);
			}
		})();

		if (next !== undefined) {
			event.preventDefault();
			setCursor(next);
			return;
		}

		if (move === "up" || move === "down") {
			event.preventDefault();
			focusRouteNav(event.currentTarget, move === "up" ? -1 : 1);
		}
	};

	const onPointerMove = (event: PointerEvent) => {
		const box = trackRef.current?.getBoundingClientRect();
		if (event.pointerType === "touch" || !box || box.width === 0) {
			return;
		}

		setEngaged((previous) => previous ?? "pointer");
		setCursor(
			nearestStop((event.clientX - box.left) / box.width, route.stops.length)
		);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<Link
				aria-label={`${title.plain}: open the threads page at ${stop.title.plain}`}
				className="block py-1 outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground focus-visible:outline-offset-2"
				data-route-nav=""
				data-route-strip=""
				href={`${mapHref}#${stop.station}`}
				onBlur={() => setEngaged(null)}
				onFocus={(event) => {
					if (event.currentTarget.matches(":focus-visible")) {
						setEngaged("key");
					}
				}}
				onKeyDown={onKeyDown}
				onPointerLeave={() =>
					setEngaged((previous) => (previous === "pointer" ? null : previous))
				}
				onPointerMove={onPointerMove}
			>
				<span className="block" ref={trackRef}>
					<RouteTrack
						cursor={engaged ? cursor : undefined}
						here={here}
						route={route}
					/>
				</span>
			</Link>
			<RouteStatus here={here.includes(cursor)} stop={stop} />
			{engaged === "key" ? <KeyHint /> : null}
		</div>
	);
}

function RouteStatus({ here, stop }: { here: boolean; stop: RouteStop }) {
	return (
		<div aria-live="polite" className="flex min-w-0 flex-col gap-0.5">
			<span className="flex items-baseline justify-between gap-3 font-mono text-[10px] text-fd-muted-foreground leading-4">
				<span className="truncate">
					{stop.code}
					{stop.role ? (
						<>
							{" / "}
							<InlineHtml html={stop.role.html} />
						</>
					) : null}
					{here ? <span className="text-fd-foreground"> · HERE</span> : null}
				</span>
				{stop.place ? (
					<span className="shrink-0 truncate font-sans text-[11px] italic">
						{stop.place}
					</span>
				) : null}
			</span>
			<Link
				className="truncate text-[12px] text-fd-foreground underline-offset-[3px] outline-none hover:underline focus-visible:outline-1 focus-visible:outline-fd-foreground"
				href={stop.href}
			>
				<InlineHtml html={stop.title.html} />
			</Link>
		</div>
	);
}

function KeyHint() {
	return (
		<span
			aria-hidden="true"
			className="font-mono text-[9px] text-fd-muted-foreground uppercase tracking-wider"
		>
			←→ move · ↑↓ thread · ↵ open map
		</span>
	);
}

export function focusRouteNav(from: HTMLElement, step: -1 | 1) {
	const scope = from.closest(GROUP) ?? document;
	const stops = [...scope.querySelectorAll<HTMLElement>(NAV)];
	stops[stops.indexOf(from) + step]?.focus();
}
