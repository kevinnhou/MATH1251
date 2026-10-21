import { DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { StatementHtml } from "@/components/mdx-env/statement";
import type { TenetIndex } from "@/lib/mdx-env/tenet";
import { memberStatement, type ThreadIndex } from "@/lib/mdx-env/thread";
import type { ThreadMap } from "@/lib/relations/types";
import { ThreadsExplorer } from "./explorer";

export function ThreadsPage({
	focus,
	tenets,
	threadMap,
	threads,
}: {
	focus?: string;
	tenets: TenetIndex;
	threadMap: ThreadMap;
	threads: ThreadIndex;
}) {
	return (
		<DocsPage
			full
			tableOfContent={{ enabled: false }}
			tableOfContentPopover={{ enabled: false }}
		>
			<DocsTitle>Threads</DocsTitle>
			<ThreadsExplorer
				initial={focus ? [focus] : []}
				map={threadMap}
				statements={statementsByHref(threads, tenets)}
			/>
		</DocsPage>
	);
}

function statementsByHref(
	threads: ThreadIndex,
	tenets: TenetIndex
): Record<string, ReactNode> {
	const statements: Record<string, ReactNode> = {};
	for (const thread of threads.bySlug.values()) {
		for (const member of thread.members) {
			const view = memberStatement(member, tenets);
			if (view && !(member.href in statements)) {
				statements[member.href] = (
					<StatementHtml className="text-sm" html={view.html} />
				);
			}
		}
	}
	return statements;
}
