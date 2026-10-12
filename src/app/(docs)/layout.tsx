import type { ReactNode } from "react";
import { CourseRoutesProvider } from "@/components/course/provider";
import { RelationsProvider } from "@/components/relations/provider";
import { VirtualDocsLayout } from "@/components/site/docs-layout";
import { TerminalProvider } from "@/components/terminal/provider";
import { getCorpus } from "@/lib/site/corpus";
import { buildSidebarTree } from "@/lib/site/sidebar-tree";

export default function Layout({ children }: { children: ReactNode }) {
	const tree = buildSidebarTree();
	const corpus = getCorpus();

	return (
		<CourseRoutesProvider routes={corpus.routes}>
			<RelationsProvider>
				<TerminalProvider>
					<VirtualDocsLayout tree={tree}>{children}</VirtualDocsLayout>
				</TerminalProvider>
			</RelationsProvider>
		</CourseRoutesProvider>
	);
}
