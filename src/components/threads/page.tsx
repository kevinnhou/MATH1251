import { DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { StatementHtml } from "@/components/mdx-env/statement";
import type { ThreadIndex } from "@/lib/mdx-env/thread";
import type { ThreadMap } from "@/lib/relations/types";
import { ThreadsExplorer } from "./explorer";

export function ThreadsPage({
	focus,
	threadMap,
	threads,
}: {
	focus?: string;
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
				statements={statementsByHref(threads)}
			/>
		</DocsPage>
	);
}

function statementsByHref(threads: ThreadIndex): Record<string, ReactNode> {
	const statements: Record<string, ReactNode> = {};
	for (const thread of threads.bySlug.values()) {
		for (const member of thread.members) {
			const { href, statement } = member;
			if (statement && !(href in statements)) {
				statements[href] = (
					<StatementHtml className="text-sm" html={statement.html} />
				);
			}
		}
	}
	return statements;
}
