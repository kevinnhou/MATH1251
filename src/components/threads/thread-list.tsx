import Link from "next/link";
import { InlineHtml } from "@/components/markdown/html";
import type { ThreadMap } from "@/lib/relations/thread-map";
import { THREADS_ROUTE } from "@/lib/relations/thread-map";
import { RouteTrack } from "./route-track";

// The thread index in prose (`<ThreadMap />`): each thread's route, linking to
// the threads page with that thread focused.
export function ThreadList({ map }: { map: ThreadMap }) {
	if (map.threads.length === 0) {
		return null;
	}

	return (
		<nav aria-label="Threads" className="@container not-prose my-8">
			<div className="flex items-baseline justify-between pb-2 font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
				<span>
					<span className="text-fd-foreground">[</span>THREADS
					<span className="text-fd-foreground">]</span> {map.threads.length}
				</span>
				<Link
					className="outline-none hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground"
					href={THREADS_ROUTE}
				>
					<span className="text-fd-foreground">[</span>MAP
					<span className="text-fd-foreground">]</span>
				</Link>
			</div>
			<ol className="m-0 list-none border-fd-border border-b p-0">
				{map.threads.map((thread) => (
					<li className="border-fd-border border-t" key={thread.slug}>
						<Link
							className="group grid @min-[40rem]:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,14rem)] grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 py-3 pr-2 outline-none hover:bg-fd-accent focus-visible:bg-fd-accent"
							data-relations-label=""
							href={thread.mapHref}
						>
							<span className="font-mono text-[10px] text-fd-muted-foreground leading-5">
								{String(thread.number).padStart(2, "0")}
							</span>
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="text-[13px] text-fd-foreground leading-5 group-hover:underline group-hover:underline-offset-4">
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
