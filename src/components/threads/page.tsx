import { DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { StatementHtml } from "@/components/math-env/statement";
import type { TenetIndex } from "@/lib/math-env/tenet";
import { memberStatement, type ThreadIndex } from "@/lib/math-env/thread";
import { getCorpus } from "@/lib/site/corpus";
import { ThreadsExplorer } from "./explorer";

export function ThreadsPage({ focus }: { focus?: string }) {
	const { tenets, threadMap, threads } = getCorpus();

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
