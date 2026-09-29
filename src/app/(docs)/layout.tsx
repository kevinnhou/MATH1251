import type { ReactNode } from "react";
import { GraphProvider } from "@/components/graph/provider";
import { VirtualDocsLayout } from "@/components/site/docs-layout";
import { TerminalProvider } from "@/components/terminal/provider";
import { getCorpus } from "@/lib/site/corpus";
import { buildSidebarTree } from "@/lib/site/sidebar-tree";

export default function Layout({ children }: { children: ReactNode }) {
	const tree = buildSidebarTree();
	const corpus = getCorpus();

	return (
		<GraphProvider catalog={corpus.catalog}>
			<TerminalProvider catalog={corpus.catalog}>
				<VirtualDocsLayout kindViewPages={corpus.kindViews} tree={tree}>
					{children}
				</VirtualDocsLayout>
			</TerminalProvider>
		</GraphProvider>
	);
}
