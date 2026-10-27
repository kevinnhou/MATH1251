"use client";

import {
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { AskShare } from "@/components/export/share";
import type { PromptTarget } from "@/lib/mdx-env/target";
import { Bracket } from "./bracket";

export function ThreadFrame({
	children,
	count,
	id,
	spine,
	target,
}: {
	children?: ReactNode;
	count: number;
	id?: string;
	spine: ReactNode;
	target?: PromptTarget;
}) {
	function renderSection(rightClickHint?: ReactElement) {
		return (
			<section className="group/thread" data-thread="" id={id}>
				{children}
				{count > 0 ? (
					<ThreadCompare count={count} hint={rightClickHint}>
						{spine}
					</ThreadCompare>
				) : null}
			</section>
		);
	}

	if (target === undefined) {
		return renderSection();
	}

	return (
		<AskShare group="thread" target={target}>
			{(rightClickHint) => renderSection(rightClickHint)}
		</AskShare>
	);
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const READING_LINE = 0.4;

function heightTiming(
	distance: number,
	opening: boolean
): KeyframeAnimationOptions {
	return opening
		? {
				duration: Math.min(220 + distance * 0.25, 460),
				easing: "cubic-bezier(0.2, 0, 0, 1)",
			}
		: {
				duration: Math.min(160 + distance * 0.12, 280),
				easing: "cubic-bezier(0.4, 0, 1, 1)",
			};
}

function ThreadCompare({
	children,
	count,
	hint,
}: {
	children: ReactNode;
	count: number;
	hint?: ReactElement;
}) {
	const [open, setOpen] = useState(false);
	const regionId = useId();
	const regionRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const animationRef = useRef<Animation>(null);

	function toggle() {
		const opening = !open;
		setOpen(opening);

		const region = regionRef.current;
		const content = contentRef.current;
		if (
			region === null ||
			content === null ||
			window.matchMedia(REDUCED_MOTION).matches
		) {
			return;
		}

		const from = region.getBoundingClientRect().height;
		const to = opening ? content.offsetHeight : 0;
		animationRef.current?.cancel();
		region.style.overflow = "hidden";
		const animation = region.animate(
			{ height: [`${from}px`, `${to}px`] },
			heightTiming(Math.abs(to - from), opening)
		);
		animation.onfinish = () => {
			region.style.overflow = "";
		};
		animationRef.current = animation;
	}

	return (
		<div className="group/spine not-prose my-6" data-open={open || undefined}>
			<div className="flex items-center justify-between gap-3">
				<button
					aria-controls={regionId}
					aria-expanded={open}
					className="group/head grid h-5 grid-cols-[0.75rem_auto] items-center gap-x-3 font-mono text-[10px] text-fd-muted-foreground uppercase leading-none tracking-[0.08em] outline-none hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground focus-visible:outline-offset-2 group-data-open/spine:text-fd-foreground"
					onClick={toggle}
					type="button"
				>
					<span aria-hidden="true" className="relative flex justify-center">
						<span className="size-1.5 border border-fd-muted-foreground transition-colors duration-200 group-hover/head:border-fd-foreground group-data-open/spine:border-fd-foreground group-data-open/spine:bg-fd-foreground motion-reduce:transition-none" />
						<span className="absolute top-1.5 left-1/2 h-5.25 origin-top -translate-x-1/2 scale-y-0 border-fd-border border-l transition-[scale] duration-150 ease-in group-data-open/spine:scale-y-100 group-data-open/spine:duration-200 group-data-open/spine:ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none" />
					</span>
					<span className="flex items-center gap-2">
						<Bracket>COMPARE</Bracket>
						<span className="normal-case tracking-normal">
							{count} {count === 1 ? "Origin" : "Origins"}
						</span>
					</span>
				</button>
				{hint}
			</div>
			<div
				className={open ? undefined : "h-0 overflow-hidden"}
				id={regionId}
				inert={!open}
				ref={regionRef}
			>
				<div className="relative" ref={contentRef}>
					{children}
					<SpineProgress contentRef={contentRef} open={open} />
				</div>
			</div>
		</div>
	);
}

function SpineProgress({
	contentRef,
	open,
}: {
	contentRef: RefObject<HTMLDivElement | null>;
	open: boolean;
}) {
	const trackRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const content = contentRef.current;
		const track = trackRef.current;
		if (!(open && content && track)) {
			return;
		}

		const stations = [
			...content.querySelectorAll<HTMLElement>("[data-station]"),
		];
		let dots: number[] = [];
		let current: number | undefined;
		let frame = 0;

		function update() {
			frame = 0;
			const [first] = dots;
			const last = dots.at(-1);
			if (!(content && track) || first === undefined || last === undefined) {
				return;
			}

			const reader =
				window.innerHeight * READING_LINE - content.getBoundingClientRect().top;
			const span = last - first;
			const progress =
				span > 0 ? Math.min(Math.max((reader - first) / span, 0), 1) : 1;
			track.style.setProperty("--progress", String(progress));

			const at = dots.findLastIndex((dot) => dot <= reader);
			if (at === current) {
				return;
			}
			current = at;
			stations.forEach((station, index) => {
				if (index < at) {
					station.dataset.state = "passed";
				} else if (index === at) {
					station.dataset.state = "current";
				} else {
					delete station.dataset.state;
				}
			});
		}

		function measure() {
			dots = stations.map((station) => station.offsetTop);
			const [first = 0] = dots;
			const span = (dots.at(-1) ?? first) - first;
			track?.style.setProperty("top", `${first}px`);
			track?.style.setProperty("height", `${span}px`);
			update();
		}

		function schedule() {
			frame ||= requestAnimationFrame(update);
		}

		const resize = new ResizeObserver(measure);
		resize.observe(content);
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);

		return () => {
			cancelAnimationFrame(frame);
			resize.disconnect();
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			for (const station of stations) {
				delete station.dataset.state;
			}
		};
	}, [contentRef, open]);

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute left-1.5 w-px opacity-0 transition-opacity duration-150 group-data-open/spine:opacity-100 group-data-open/spine:delay-300 group-data-open/spine:duration-500 motion-reduce:transition-none"
			ref={trackRef}
		>
			<span
				className="absolute inset-0 origin-top bg-fd-foreground/60"
				style={{ transform: "scaleY(var(--progress, 0))" }}
			/>
		</div>
	);
}
