"use client";

import { SidebarTabsDropdown } from "fumadocs-ui/components/sidebar/tabs/dropdown";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { TerminalOutputPane } from "./output";
import { useTerminal } from "./provider";
import {
	PersistentFolder,
	SidebarLinkItem,
	SidebarPageTree,
	SidebarTreeViewport,
} from "./sidebar-tree";

export function TerminalPanes({
	active,
	banner,
	components,
}: {
	active: boolean;
	banner?: ReactNode;
	components?: Parameters<typeof SidebarPageTree>[0];
}) {
	const {
		menuItems,
		props: { tabMode, tabs },
	} = useDocsLayout();
	const { hadOutput, pane } = useTerminal();
	const treeHidden = pane === "output";
	const outputHidden = pane === "tree";

	return (
		<div
			className="relative min-h-0 flex-1"
			data-terminal-had-output={hadOutput || undefined}
			data-terminal-pane-target={pane}
		>
			<div
				aria-hidden={treeHidden}
				className="absolute inset-0 flex flex-col"
				data-terminal-pane="tree"
				inert={treeHidden || undefined}
			>
				<div className="flex flex-col gap-3 p-4 pb-2" data-terminal-cascade="1">
					{tabs.length > 0 && tabMode === "auto" ? (
						<SidebarTabsDropdown options={tabs} />
					) : null}
					{banner}
				</div>
				<div className="flex min-h-0 flex-1 flex-col" data-terminal-cascade="3">
					<SidebarTreeViewport>
						<div className="flex flex-col gap-0.5">
							{menuItems
								.filter((item) => item.type !== "icon")
								.map((item, index, list) => (
									<SidebarLinkItem
										className={index === list.length - 1 ? "mb-4" : undefined}
										item={item}
										key={`${item.type}-${index}`}
									/>
								))}
							<SidebarPageTree
								{...components}
								Folder={({ children, item }) => (
									<PersistentFolder item={item}>{children}</PersistentFolder>
								)}
							/>
						</div>
					</SidebarTreeViewport>
				</div>
			</div>
			<div
				aria-hidden={outputHidden}
				className="absolute inset-0 flex flex-col"
				data-terminal-pane="output"
				inert={outputHidden || undefined}
			>
				<TerminalOutputPane captureRef={active} />
			</div>
		</div>
	);
}
