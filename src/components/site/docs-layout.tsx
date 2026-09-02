"use client";

import { usePathname } from "fumadocs-core/framework";
import type { Root } from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { type ReactNode, useMemo } from "react";
import type { KindView } from "@/lib/math-env/kind-view";
import { withActiveKindViewPages } from "@/lib/math-env/kind-view-tree";
import { baseOptions } from "@/lib/site/layout";
import { terminalDocsSlots } from "../terminal/slots";
import { Header } from "./header";

const { githubUrl, nav } = baseOptions;

export function VirtualDocsLayout({
	children,
	kindViewPages,
	tree,
}: {
	children: ReactNode;
	kindViewPages: readonly KindView[];
	tree: Root;
}) {
	const pathname = usePathname();
	const visibleTree = useMemo(
		() => withActiveKindViewPages(tree, kindViewPages, pathname),
		[kindViewPages, pathname, tree]
	);

	return (
		<DocsLayout
			githubUrl={githubUrl}
			nav={{ ...nav, title: <Header /> }}
			searchToggle={{ enabled: false }}
			slots={terminalDocsSlots}
			tabs={{
				transform: (option) => {
					if (!option.icon) {
						return option;
					}

					return {
						...option,
						icon: (
							<div className="tab-icon flex size-full items-center justify-center gap-0.5 text-xs [&_svg]:size-4 [&_svg]:shrink-0">
								<span
									aria-hidden="true"
									className="font-light text-fd-muted-foreground"
								>
									[
								</span>
								{option.icon}
								<span
									aria-hidden="true"
									className="font-light text-fd-muted-foreground"
								>
									{" "}
									]
								</span>
							</div>
						),
						props: {
							...option.props,
							className: `tab-option ${option.props?.className ?? ""}`.trim(),
						},
					};
				},
			}}
			tree={visibleTree}
		>
			{children}
		</DocsLayout>
	);
}
