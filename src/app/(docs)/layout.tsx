import type { ReactNode } from "react";
import { CourseRoutesProvider } from "@/components/course/provider";
import { GraphProvider } from "@/components/graph/provider";
import { VirtualDocsLayout } from "@/components/site/docs-layout";
import { TerminalProvider } from "@/components/terminal/provider";
import { getCorpus } from "@/lib/site/corpus";
import { buildSidebarTree } from "@/lib/site/sidebar-tree";

export default function Layout({ children }: { children: ReactNode }) {
	const tree = buildSidebarTree();
	const corpus = getCorpus();

	return (
		<CourseRoutesProvider routes={corpus.routes}>
			<GraphProvider>
				<TerminalProvider>
					<VirtualDocsLayout tree={tree}>{children}</VirtualDocsLayout>
				</TerminalProvider>
			</GraphProvider>
		</CourseRoutesProvider>
	);
}
