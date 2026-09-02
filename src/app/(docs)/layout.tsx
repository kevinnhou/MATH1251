import type { ReactNode } from "react";
import { GraphProvider } from "@/components/graph/provider";
import { VirtualDocsLayout } from "@/components/site/docs-layout";
import { TerminalProvider } from "@/components/terminal/provider";
import { compileCorpus } from "@/lib/site/corpus";
import { buildSidebarTree } from "@/lib/site/sidebar-tree";

export default function Layout({ children }: { children: ReactNode }) {
	const tree = buildSidebarTree();
	const corpus = compileCorpus();

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
