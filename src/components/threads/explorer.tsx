"use client";

import { useRouter } from "next/navigation";
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { stepWithin } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import type { ThreadMap } from "@/lib/relations/types";
import { threadMapHref } from "@/lib/relations/urls";
import { threadsRoute } from "@/lib/site/config";
import { ACTION, Bracket } from "./bracket";
import {
	type DiagramReading,
	type DiagramSpur,
	ThreadDiagram,
} from "./diagram";
import { MONO } from "./format";
import { type DiagramStation, layoutDiagram } from "./layout";
import { Marks } from "./marks";
import { StopCard, ThreadCard } from "./preview";
import { type IndexActions, ThreadIndex } from "./thread-index";

export function ThreadsExplorer({
	initial,
	map,
	statements,
}: {
	initial: readonly string[];
	map: ThreadMap;
	statements: Readonly<Record<string, ReactNode>>;
}) {
	const all = useMemo(() => map.threads.map((thread) => thread.slug), [map]);
	const threads = useMemo(
		() => new Map(map.threads.map((thread) => [thread.slug, thread])),
		[map]
	);
	const { allShown, shown, show } = useShown(all, initial);
	const [preview, setPreview] = useState<string | null>(null);
	const [hover, setHover] = useState<string | null>(null);
	const [cursor, setCursor] = useState<string | null>(null);
	const router = useRouter();

	const bodyRef = useRef<HTMLDivElement>(null);
	const width = useWidth(bodyRef);
	const diagram = useMemo(
		() => layoutDiagram(map, shown, width),
		[map, shown, width]
	);
	const { stations } = diagram;
	const find = (id: string | null) =>
		stations.find((entry) => entry.station.id === id);
	const current = find(cursor);
	const hovered = find(hover);
	const resting = find(useSettled(hover, REST_MS));

	useHashCursor(stations, setCursor);
	useShownUrl(allShown ? undefined : shown[0]);

	const actions: IndexActions = { ...show, preview: setPreview };
	const step = (by: -1 | 1) => {
		const at = current ? stations.indexOf(current) : -1;
		const next = stations[stepWithin(at, by, stations.length)];
		if (next) {
			setCursor(next.station.id);
		}
	};
	const readings: DiagramReading[] = [
		...stations.map((entry) => ({
			content: (
				<StopCard
					entry={entry}
					onStep={step}
					pinned={entry === current}
					statement={statements[entry.station.href]}
					threads={threads}
				/>
			),
			key: entry.station.id,
		})),
		...map.threads
			.filter((thread) => shown.includes(thread.slug))
			.map((thread) => ({
				content: <ThreadCard thread={thread} />,
				key: threadKey(thread.slug),
			})),
	];

	return (
		<div
			className="@container not-prose mt-10 flex flex-col gap-8"
			data-threads=""
			onKeyDown={(event) => {
				if (event.key !== "Escape" || event.defaultPrevented) {
					return;
				}
				if (cursor) {
					event.preventDefault();
					setCursor(null);
				} else if (!allShown) {
					event.preventDefault();
					actions.all();
				}
			}}
		>
			<ThreadIndex actions={actions} shown={shown} threads={map.threads} />
			<section aria-label="Diagram" className="min-w-0" ref={bodyRef}>
				{stations.length > 0 ? (
					<ThreadDiagram
						cursor={current}
						diagram={diagram}
						highlight={marked(preview, hovered ?? current, shown)}
						hover={hovered}
						onCursor={setCursor}
						onHover={setHover}
						onOpen={(entry) => router.push(entry.station.href)}
						onPick={(id) =>
							setCursor((previous) => (previous === id ? null : id))
						}
						readings={readings}
						spur={spurFor(resting, preview, current, stations)}
					/>
				) : (
					<p
						className={cn(
							MONO,
							"m-0 flex items-baseline gap-3 py-16 text-fd-muted-foreground"
						)}
					>
						No threads shown
						<button className={ACTION} onClick={actions.all} type="button">
							<Bracket>Show all</Bracket>
						</button>
					</p>
				)}
			</section>
			{stations.length > 0 ? <Marks /> : null}
		</div>
	);
}

function useShown(all: readonly string[], initial: readonly string[]) {
	const [shown, setShown] = useState<readonly string[]>(
		initial.length > 0 ? initial : all
	);

	const show: Omit<IndexActions, "preview"> = {
		all: () => setShown(all),
		only: (slug) =>
			setShown((previous) =>
				previous.length === 1 && previous[0] === slug ? all : [slug]
			),
		toggle: (slug) =>
			setShown((previous) =>
				previous.includes(slug)
					? previous.filter((entry) => entry !== slug)
					: all.filter((entry) => entry === slug || previous.includes(entry))
			),
	};

	return { allShown: shown.length === all.length, show, shown };
}

function spurFor(
	resting: DiagramStation | undefined,
	preview: string | null,
	current: DiagramStation | undefined,
	stations: readonly DiagramStation[]
): DiagramSpur | undefined {
	const stop = (entry: DiagramStation): DiagramSpur => ({
		anchor: entry,
		hold: entry.station.id,
		key: entry.station.id,
		pinned: entry === current,
	});
	if (resting) {
		return stop(resting);
	}
	const first = stations.find((entry) =>
		entry.marks.some((mark) => mark.thread === preview)
	);
	if (preview && first) {
		return { anchor: first, key: threadKey(preview), pinned: false };
	}
	return current ? stop(current) : undefined;
}

function threadKey(slug: string): string {
	return `thread:${slug}`;
}

const REST_MS = 90;

function useSettled<T>(value: T, ms: number): T {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		if (Object.is(value, settled)) {
			return;
		}
		const timer = setTimeout(() => setSettled(value), ms);
		return () => clearTimeout(timer);
	}, [value, settled, ms]);
	return settled;
}

function marked(
	preview: string | null,
	entry: DiagramStation | undefined,
	shown: readonly string[]
): readonly string[] {
	if (preview) {
		return [preview];
	}
	if (entry) {
		return entry.marks.map(({ thread }) => thread);
	}
	return shown.length === 1 ? shown : [];
}

const FALLBACK_WIDTH = 1000;

function useWidth(ref: RefObject<HTMLElement | null>): number {
	const [width, setWidth] = useState(FALLBACK_WIDTH);
	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		const observer = new ResizeObserver(([entry]) => {
			if (entry) {
				setWidth(Math.round(entry.contentRect.width));
			}
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);
	return width;
}

function useHashCursor(
	stations: readonly DiagramStation[],
	setCursor: (id: string) => void
) {
	const read = useEffectEvent(() => {
		const id = decodeURIComponent(window.location.hash.slice(1));
		if (stations.some((entry) => entry.station.id === id)) {
			setCursor(id);
		}
	});

	useEffect(() => {
		const onHashChange = () => read();
		read();
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);
}

function useShownUrl(first: string | undefined) {
	const path = first === undefined ? threadsRoute : threadMapHref(first);
	useEffect(() => {
		if (window.location.pathname !== path) {
			window.history.replaceState(null, "", path);
		}
	}, [path]);
}
