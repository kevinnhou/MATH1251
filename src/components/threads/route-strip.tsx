"use client";

import Link from "next/link";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { cursorKey, focusSibling, moveKey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import type { RenderedMarkdown } from "@/lib/markdown/types";
import type { RouteStop, ThreadRoute } from "@/lib/relations/types";
import { MONO, placeLabel } from "./format";
import { nearestStop, RouteTrack, routeLayout } from "./route-track";

const ROUTE_NAV = { item: "[data-route-nav]", scope: "[data-route-group]" };

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
	const plotRef = useRef<HTMLSpanElement>(null);
	const stop = route.stops[cursor];
	if (stop === undefined) {
		return null;
	}

	const onKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
		const next = cursorKey(event.nativeEvent, cursor, route.stops.length);
		if (next !== undefined) {
			event.preventDefault();
			setCursor(next);
			return;
		}

		const move = moveKey(event.nativeEvent);
		if (move === "up" || move === "down") {
			event.preventDefault();
			focusRouteNav(event.currentTarget, move === "up" ? -1 : 1);
		}
	};

	const onPointerMove = (event: PointerEvent) => {
		const box = plotRef.current?.getBoundingClientRect();
		if (event.pointerType === "touch" || !box || box.width === 0) {
			return;
		}

		setEngaged((previous) => previous ?? "pointer");
		setCursor(
			nearestStop((event.clientX - box.left) / box.width, routeLayout(route))
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
				<RouteTrack
					cursor={engaged ? cursor : undefined}
					here={here}
					plotRef={plotRef}
					route={route}
				/>
			</Link>
			<RouteStatus
				here={here.includes(cursor)}
				stop={stop}
				strand={route.lanes[stop.lane]}
			/>
		</div>
	);
}

function RouteStatus({
	here,
	stop,
	strand,
}: {
	here: boolean;
	stop: RouteStop;
	strand: string | undefined;
}) {
	return (
		<div aria-live="polite" className="flex min-w-0 flex-col gap-0.5">
			<span className="flex min-w-0 items-baseline gap-2.5">
				<span className="shrink-0 font-mono text-[10px] text-fd-muted-foreground uppercase">
					{stop.code}
				</span>
				<Link
					className="truncate text-[12px] text-fd-foreground underline-offset-[3px] outline-none hover:underline focus-visible:outline-1 focus-visible:outline-fd-foreground"
					href={stop.href}
				>
					<InlineHtml html={stop.title.html} />
				</Link>
			</span>
			<span className="flex min-h-4 items-baseline justify-between gap-3 text-[11px] text-fd-muted-foreground leading-4">
				<span className="truncate italic">
					{stop.role ? <InlineHtml html={stop.role.html} /> : null}
				</span>
				<span className={cn(MONO, "shrink-0")}>
					{placeLabel(strand, stop.chapter)}
					{here ? <span className="text-fd-foreground"> / Here</span> : null}
				</span>
			</span>
		</div>
	);
}

export function focusRouteNav(from: HTMLElement, step: -1 | 1) {
	focusSibling(from, ROUTE_NAV, step);
}
