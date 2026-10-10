import {
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { ThreadSpine, threadStations } from "@/components/math-env/thread";
import { getCorpus } from "@/lib/site/corpus";
import { ThreadsExplorer } from "./explorer";

// `/threads` and `/threads/<slug>`: the same page, with that thread focused.
// The spines are rendered here, so statements never reach the client as data.
export function ThreadsPage({ focus }: { focus?: string }) {
	const { courseIndex, tenets, threadMap, threads } = getCorpus();
	const spines = Object.fromEntries(
		[...threads.bySlug.values()].map((thread) => [
			thread.slug,
			<ThreadSpine
				key={thread.slug}
				stations={threadStations(thread, courseIndex, tenets)}
			/>,
		])
	);

	return (
		<DocsPage
			full
			tableOfContent={{ enabled: false }}
			tableOfContentPopover={{ enabled: false }}
		>
			<DocsTitle>Threads</DocsTitle>
			<DocsDescription className="mb-0">
				Ideas that recur across the course, each drawn as a line through the
				chapters. Focus one to follow it; rows are chapters, taught side by
				side.
			</DocsDescription>
			<ThreadsExplorer
				initial={focus ? [focus] : []}
				map={threadMap}
				spines={spines}
			/>
		</DocsPage>
	);
}
