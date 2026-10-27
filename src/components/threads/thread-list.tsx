import Link from "next/link";
import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import type { ThreadMap } from "@/lib/relations/types";
import { threadsRoute } from "@/lib/relations/urls";
import { Bracket } from "./bracket";
import { MONO } from "./format";
import { RouteTrack } from "./route-track";

export function ThreadList({ map }: { map: ThreadMap }) {
	if (map.threads.length === 0) {
		return null;
	}

	return (
		<nav aria-label="Threads" className="@container not-prose my-8">
			<div
				className={cn(
					MONO,
					"flex items-baseline justify-between pb-2 text-fd-muted-foreground"
				)}
			>
				<span>
					<Bracket>THREADS</Bracket> {map.threads.length}
				</span>
				<Link
					className="outline-none hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground"
					href={threadsRoute}
				>
					<Bracket>MAP</Bracket>
				</Link>
			</div>
			<ol className="m-0 list-none border-fd-border border-b p-0">
				{map.threads.map((thread) => (
					<li className="border-fd-border border-t" key={thread.slug}>
						<Link
							className="group grid @min-[40rem]:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,14rem)] grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 py-3 pr-2 outline-none"
							data-relations-label=""
							data-thread-row=""
							href={thread.mapHref}
						>
							<span className="font-mono text-[10px] text-fd-muted-foreground leading-5">
								<span className="group-hover:hidden group-focus-visible:hidden">
									{thread.number}
								</span>
								<span
									aria-hidden="true"
									className="hidden text-[12px] text-fd-foreground group-hover:inline group-focus-visible:inline"
								>
									&gt;
								</span>
							</span>
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="text-[13px] text-fd-foreground leading-5 underline-offset-4 group-hover:underline group-focus-visible:underline">
									<InlineHtml html={thread.title.html} />
								</span>
								<span className="text-[12px] text-fd-muted-foreground leading-snug">
									<InlineHtml html={thread.summary.html} />
								</span>
							</span>
							<span className="@min-[40rem]:col-start-3 col-start-2 self-center">
								<RouteTrack here={[]} route={thread.route} tone="muted" />
							</span>
						</Link>
					</li>
				))}
			</ol>
		</nav>
	);
}
