"use client";

import type { KeyboardEvent } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { moveKey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import type { ThreadMapThread } from "@/lib/relations/thread-map";
import { ACTION, Bracket } from "./bracket";

export interface IndexActions {
	all: () => void;
	only: (slug: string) => void;
	preview: (slug: string | null) => void;
	toggle: (slug: string) => void;
}

const KEY_ENTRY = "[data-index-row]";

export function ThreadIndex({
	actions,
	shown,
	threads,
}: {
	actions: IndexActions;
	shown: readonly string[];
	threads: readonly ThreadMapThread[];
}) {
	const onKey = (event: KeyboardEvent<HTMLButtonElement>, slug: string) => {
		if (event.key === " ") {
			event.preventDefault();
			actions.toggle(slug);
			return;
		}

		const move = moveKey(event.nativeEvent);
		if (move) {
			event.preventDefault();
			const list = event.currentTarget.closest("ul");
			const entries = list
				? [...list.querySelectorAll<HTMLElement>(KEY_ENTRY)]
				: [];
			const by = move === "up" || move === "left" ? -1 : 1;
			entries[entries.indexOf(event.currentTarget) + by]?.focus();
		}
	};

	return (
		<nav aria-label="Threads" className="flex items-start gap-6">
			<ul
				className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-x-6 gap-y-2 p-0"
				onPointerLeave={() => actions.preview(null)}
			>
				{threads.map((thread) => {
					const on = shown.includes(thread.slug);
					return (
						<li key={thread.slug}>
							<button
								aria-pressed={on}
								className={cn(
									"group/key flex items-center gap-2 text-left text-[13px] outline-none",
									on ? "text-fd-foreground" : "text-fd-muted-foreground"
								)}
								data-index-row=""
								data-relations-label=""
								onBlur={() => actions.preview(null)}
								onClick={(event) =>
									event.shiftKey
										? actions.toggle(thread.slug)
										: actions.only(thread.slug)
								}
								onFocus={() => actions.preview(thread.slug)}
								onKeyDown={(event) => onKey(event, thread.slug)}
								onPointerEnter={() => actions.preview(thread.slug)}
								type="button"
							>
								<span
									aria-hidden="true"
									className={cn(
										"h-0 w-5 border-t-2 group-hover/key:border-(--relations-thread) group-focus-visible/key:border-(--relations-thread)",
										on
											? "border-fd-foreground/55"
											: "border-fd-foreground/20 border-dotted"
									)}
								/>
								<span className="font-mono text-[10px] text-fd-muted-foreground">
									{thread.number}
								</span>
								<span className="underline-offset-4 group-hover/key:underline group-focus-visible/key:underline">
									<InlineHtml html={thread.title.html} />
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			<button
				className={cn(
					ACTION,
					"shrink-0 text-fd-muted-foreground leading-5",
					shown.length === threads.length && "invisible"
				)}
				inert={shown.length === threads.length}
				onClick={actions.all}
				type="button"
			>
				<Bracket>Show all</Bracket>
			</button>
		</nav>
	);
}
