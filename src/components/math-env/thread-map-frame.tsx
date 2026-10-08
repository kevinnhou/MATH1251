"use client";

import {
	type CSSProperties,
	type FocusEvent,
	type PointerEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { InlineHtml } from "@/components/markdown/html";
import { THREAD_COLOR } from "@/components/relations/colors";
import { cn } from "@/lib/cn";
import type { ThreadMapThread } from "@/lib/relations/thread-map";
import { traceRoutes } from "./thread-map-lines";

type Hover = (slugs: readonly string[]) => void;

export function ThreadMapFrame({
	children,
	style,
	threads,
}: {
	children: ReactNode;
	style?: CSSProperties;
	threads: readonly ThreadMapThread[];
}) {
	const linesRef = useRef<HTMLDivElement>(null);
	const routes = useRoutes(linesRef);
	const [selected, setSelected] = useState<string | null>(null);
	const [hovered, setHovered] = useState<readonly string[]>([]);
	const active = hovered.length > 0 || selected === null ? hovered : [selected];

	const hover: Hover = (slugs) =>
		setHovered((previous) =>
			previous.join(" ") === slugs.join(" ") ? previous : slugs
		);
	const onStation = (target: EventTarget | null) => {
		const station =
			target instanceof Element
				? target.closest<HTMLElement>("[data-tm-threads]")
				: null;
		hover(station?.dataset.tmThreads?.split(" ") ?? []);
	};
	const onPointer = (event: PointerEvent) => {
		if (event.pointerType === "mouse") {
			onStation(event.target);
		}
	};
	const leave = {
		onBlur: (event: FocusEvent) => {
			if (!event.currentTarget.contains(event.relatedTarget)) {
				hover([]);
			}
		},
		onPointerLeave: () => hover([]),
	};

	return (
		<figure
			aria-label="Thread map"
			className="not-prose my-8"
			data-active={active.length > 0 ? active.join(" ") : undefined}
			data-thread-map=""
			onKeyDown={(event) => {
				if (
					event.key === "Escape" &&
					!event.defaultPrevented &&
					selected !== null
				) {
					event.preventDefault();
					setSelected(null);
				}
			}}
			style={style}
		>
			<div {...leave}>
				<ThreadKey
					active={active}
					hover={hover}
					onSelect={(slug) =>
						setSelected((previous) => (previous === slug ? null : slug))
					}
					selected={selected}
					threads={threads}
				/>
				<ThreadSummaries
					shown={threads.find((thread) => thread.slug === active[0])}
					threads={threads}
				/>
			</div>
			<div className="relative">
				<ThreadLines active={active} routes={routes} threads={threads} />
				<div
					className="relative"
					onFocus={(event) => onStation(event.target)}
					onPointerOver={onPointer}
					{...leave}
					ref={linesRef}
				>
					{children}
				</div>
			</div>
		</figure>
	);
}

function ThreadKey({
	active,
	hover,
	onSelect,
	selected,
	threads,
}: {
	active: readonly string[];
	hover: Hover;
	onSelect: (slug: string) => void;
	selected: string | null;
	threads: readonly ThreadMapThread[];
}) {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-1.5">
			{threads.map((thread) => {
				const lit = active.includes(thread.slug);
				return (
					<button
						aria-pressed={selected === thread.slug}
						className={cn(
							"inline-flex items-center gap-2 text-[12px] outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground",
							lit
								? "text-fd-foreground"
								: "text-fd-muted-foreground hover:text-fd-foreground"
						)}
						data-relations-label=""
						key={thread.slug}
						onClick={() => onSelect(thread.slug)}
						onFocus={(event) => {
							if (event.currentTarget.matches(":focus-visible")) {
								hover([thread.slug]);
							}
						}}
						onPointerEnter={(event) => {
							if (event.pointerType === "mouse") {
								hover([thread.slug]);
							}
						}}
						type="button"
					>
						<span
							aria-hidden="true"
							className="size-1.5 shrink-0 transition-colors duration-200"
							style={{
								background: lit ? THREAD_COLOR : "var(--color-fd-border)",
							}}
						/>
						<InlineHtml html={thread.title.html} />
						<span className="font-mono text-[10px] text-fd-muted-foreground">
							{thread.size}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function ThreadSummaries({
	shown,
	threads,
}: {
	shown: ThreadMapThread | undefined;
	threads: readonly ThreadMapThread[];
}) {
	return (
		<div className="mt-3 mb-6 grid text-[13px] text-fd-muted-foreground leading-relaxed">
			<p
				aria-hidden={shown !== undefined}
				className="col-start-1 row-start-1 m-0"
				style={{ visibility: shown ? "hidden" : "visible" }}
			>
				Each line is an idea that recurs across the course. Pick one to follow
				it; rows are chapters, taught side by side.
			</p>
			{threads.map((thread) => (
				<p
					aria-hidden={shown !== thread}
					className="col-start-1 row-start-1 m-0"
					data-relations-label=""
					key={thread.slug}
					style={{ visibility: shown === thread ? "visible" : "hidden" }}
				>
					<InlineHtml html={thread.summary.html} />{" "}
					<a
						className="whitespace-nowrap font-mono text-[10px] text-fd-foreground outline-none hover:underline focus-visible:outline-1 focus-visible:outline-fd-foreground"
						href={thread.href}
						tabIndex={shown === thread ? undefined : -1}
					>
						[READ]
					</a>
				</p>
			))}
		</div>
	);
}

function ThreadLines({
	active,
	routes,
	threads,
}: {
	active: readonly string[];
	routes: ReadonlyMap<string, string>;
	threads: readonly ThreadMapThread[];
}) {
	const lit = (thread: ThreadMapThread) => active.includes(thread.slug);

	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 size-full overflow-visible"
		>
			{threads
				.toSorted((left, right) => Number(lit(left)) - Number(lit(right)))
				.map((thread) => (
					<path
						className="transition-[stroke,stroke-width] duration-200 motion-reduce:transition-none"
						d={routes.get(thread.slug) ?? ""}
						fill="none"
						key={thread.slug}
						stroke={lineColor(active.length > 0, lit(thread))}
						strokeLinejoin="round"
						strokeWidth={lit(thread) ? 2 : 1.5}
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

function useRoutes(
	ref: RefObject<HTMLElement | null>
): ReadonlyMap<string, string> {
	const [routes, setRoutes] = useState<ReadonlyMap<string, string>>(
		() => new Map()
	);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

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
