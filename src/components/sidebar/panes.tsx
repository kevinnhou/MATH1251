"use client";

import { SidebarTabsDropdown } from "fumadocs-ui/components/sidebar/tabs/dropdown";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { TerminalOutputPane } from "@/components/terminal/output";
import { useTerminalScreen } from "@/components/terminal/provider";
import type { TerminalPane } from "@/lib/terminal/types";
import { SearchPreview } from "./search-preview";
import { SidebarSearchTree } from "./search-tree";
import { SidebarLinkItem, SidebarPageTree, SidebarTreeViewport } from "./tree";

export function SidebarPanes({ banner }: { banner?: ReactNode }) {
	const {
		menuItems,
		props: { tabMode, tabs },
	} = useDocsLayout();
	const { cwd, hadOutput, pane, view } = useTerminalScreen();
	const search = view?.kind === "search" ? view : null;
	const dir = view?.kind === "list" ? view.dir : cwd;

	return (
		<div
			className="relative min-h-0 flex-1"
			data-terminal-had-output={hadOutput || undefined}
			data-terminal-pane-target={pane}
		>
			<Pane name="tree" target={pane}>
				<div
					className="flex flex-col gap-3 p-4 pb-2 empty:hidden"
					data-terminal-cascade="1"
				>
					{tabs.length > 0 && tabMode === "auto" ? (
						<SidebarTabsDropdown
							className="rounded-none bg-transparent"
							options={tabs}
						/>
					) : null}
					{banner}
				</div>
				<div className="flex min-h-0 flex-1 flex-col" data-terminal-cascade="3">
					<SidebarTreeViewport
						scrollKey={search ? `search:${search.query}` : dir}
					>
						{search ? (
							<SidebarSearchTree
								query={search.query}
								results={search.results}
							/>
						) : (
							<>
								{menuItems
									.filter((item) => item.type !== "icon")
									.map((item, index, list) => (
										<SidebarLinkItem
											className={index === list.length - 1 ? "mb-4" : undefined}
											item={item}
											key={`${item.type}-${index}`}
										/>
									))}
								<SidebarPageTree dir={dir} />
							</>
						)}
					</SidebarTreeViewport>
					{search ? (
						<SearchPreview key={search.query} results={search.results} />
					) : null}
				</div>
			</Pane>
			<Pane name="output" target={pane}>
				<TerminalOutputPane />
			</Pane>
		</div>
	);
}

function Pane({
	children,
	name,
	target,
}: {
	children: ReactNode;
	name: TerminalPane;
	target: TerminalPane;
}) {
	const hidden = name !== target;

	return (
		<div
			aria-hidden={hidden}
			className="absolute inset-0 flex flex-col"
			data-terminal-pane={name}
			inert={hidden || undefined}
		>
			{children}
		</div>
	);
}
