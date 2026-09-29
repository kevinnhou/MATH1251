"use client";

import { usePathname } from "fumadocs-core/framework";
import type { Folder, Node } from "fumadocs-core/page-tree";
import {
	SidebarFolder,
	SidebarFolderContent,
	SidebarFolderLink,
	SidebarFolderTrigger,
} from "fumadocs-ui/components/sidebar/base";
import { createLinkItemRenderer } from "fumadocs-ui/components/sidebar/link-item";
import {
	Collapsible,
	CollapsibleContent,
} from "fumadocs-ui/components/ui/collapsible";
import {
	ScrollArea,
	ScrollViewport,
} from "fumadocs-ui/components/ui/scroll-area";
import { useTreeContext, useTreePath } from "fumadocs-ui/contexts/tree";
import {
	Fragment,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import { useTerminalApi } from "@/components/terminal/provider";
import { cn } from "@/lib/cn";
import { parentDirectory, rootOf } from "@/lib/terminal/dirs";
import { useRailMarks } from "./rail-marks";
import { TreeRow, TreeSeparator } from "./rows";
import { handleTreeKey } from "./tree-keys";
import { useSidebarTreeState } from "./tree-state";

export function SidebarTreeViewport({
	children,
	scrollKey,
}: {
	children: ReactNode;
	scrollKey: string;
}) {
	const { scrollTopRef } = useSidebarTreeState();
	const viewportRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const scrollKeyRef = useRef(scrollKey);

	useLayoutEffect(() => {
		if (scrollKeyRef.current !== scrollKey && viewportRef.current) {
			scrollKeyRef.current = scrollKey;
			viewportRef.current.scrollTop = 0;
		}
	}, [scrollKey]);

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) {
			return;
		}

		viewport.scrollTop = scrollTopRef.current;
		return () => {
			scrollTopRef.current = viewport.scrollTop;
		};
	}, [scrollTopRef]);

	useRailMarks(listRef);

	return (
		<ScrollArea className="min-h-0 flex-1">
			<ScrollViewport
				className="mask-[linear-gradient(to_bottom,transparent,white_12px,white_calc(100%-12px),transparent)] overscroll-contain p-4"
				data-tree-root=""
				onKeyDown={(event) => handleTreeKey(event, event.currentTarget)}
				ref={viewportRef}
			>
				<div className="flex flex-col gap-px" ref={listRef}>
					{children}
				</div>
			</ScrollViewport>
		</ScrollArea>
	);
}

function PersistentFolder({
	children,
	item,
}: {
	children: ReactNode;
	item: Folder;
}) {
	const pathname = usePathname();
	const holdsActivePage = useTreePath().includes(item);
	const { folderOpen, setFolderOpen } = useSidebarTreeState();
	const id = folderKey(item);
	const stored = folderOpen(id);
	const collapsible = item.collapsible !== false;
	const expanded =
		!collapsible || (stored ?? item.defaultOpen ?? holdsActivePage);
	const pinned = !expanded && holdsActivePage;
	const indexUrl = item.index?.url;

	const held = useRef<boolean | null>(null);
	useEffect(() => {
		const entered =
			holdsActivePage &&
			(held.current === false ||
				(held.current === null && stored === undefined));
		held.current = holdsActivePage;
		if (entered) {
			setFolderOpen(id, true);
		}
	}, [holdsActivePage, id, setFolderOpen, stored]);

	const toggle = () => setFolderOpen(id, !expanded);

	return (
		<Collapsible data-tree-folder="" open={expanded || holdsActivePage}>
			<div className="group/folder relative" data-tree-header="">
				{item.index ? (
					<>
						<TreeRow
							active={pathname === indexUrl}
							className={collapsible ? "pe-10" : undefined}
							data-tree-folder-open={expanded}
							external={item.index.external}
							header
							href={item.index.url}
							onClick={() => {
								if (pathname === indexUrl) {
									toggle();
								} else {
									setFolderOpen(id, true);
								}
							}}
						>
							{item.icon}
							{item.name}
						</TreeRow>
						{collapsible ? (
							<button
								aria-expanded={expanded}
								aria-label={expanded ? "Collapse" : "Expand"}
								className="absolute inset-e-0 inset-y-0 flex items-center px-2 text-fd-foreground"
								data-tree-toggle=""
								onClick={toggle}
								tabIndex={-1}
								type="button"
							>
								<ToggleMark open={expanded} />
							</button>
						) : null}
					</>
				) : (
					<TreeRow
						aria-expanded={collapsible ? expanded : undefined}
						as="button"
						className="w-full"
						data-tree-folder-open={expanded}
						data-tree-toggle=""
						header
						onClick={collapsible ? toggle : undefined}
					>
						{item.icon}
						{item.name}
						{collapsible ? (
							<ToggleMark className="ms-auto" open={expanded} />
						) : null}
					</TreeRow>
				)}
			</div>
			<CollapsibleContent
				className="relative flex flex-col ps-3.5 before:absolute before:inset-s-2 before:inset-y-0 before:w-1 before:bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] before:bg-size-[6px_6px] before:text-fd-foreground/25 before:content-['']"
				data-tree-content=""
				data-tree-pinned={pinned || undefined}
			>
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-s-2 top-0 z-10 w-1 bg-fd-foreground opacity-0 transition-[transform,height] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
					data-rail-mark=""
				/>
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}

function ToggleMark({
	className,
	open,
}: {
	className?: string;
	open: boolean;
}) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"shrink-0 font-mono text-[0.7rem] leading-none",
				!open &&
					"opacity-0 group-hover/folder:opacity-100 group-has-focus-visible/folder:opacity-100",
				className
			)}
		>
			<span className="font-bold">[</span>
			<span className="inline-block w-[1ch] text-center opacity-70">
				{open ? "−" : "+"}
			</span>
			<span className="font-bold">]</span>
		</span>
	);
}

export function SidebarPageTree({ dir }: { dir: string }) {
	const { root } = useTreeContext();
	const nodes = useMemo(() => directoryNodes(root, dir), [root, dir]);
	const parent = parentDirectory(dir);
	const { changeDirectory } = useTerminalApi();

	return (
		<Fragment key={dir}>
			{parent ? (
				<TreeRow
					as="button"
					className="font-mono"
					data-tree-up=""
					onClick={() => changeDirectory(parent)}
				>
					..
				</TreeRow>
			) : null}
			<TreeNodes nodes={nodes} />
		</Fragment>
	);
}

function TreeNodes({ nodes }: { nodes: Node[] }) {
	return nodes.map((node, index) => (
		<TreeNode key={node.$id ?? index} node={node} />
	));
}

function TreeNode({ node }: { node: Node }) {
	const pathname = usePathname();
	if (node.type === "separator") {
		return (
			<TreeSeparator>
				{node.icon}
				{node.name}
			</TreeSeparator>
		);
	}

	if (node.type === "folder") {
		return (
			<PersistentFolder item={node}>
				<TreeNodes nodes={node.children} />
			</PersistentFolder>
		);
	}

	return (
		<TreeRow
			active={pathname === node.url}
			external={node.external}
			href={node.url}
			icon={node.icon}
		>
			{node.name}
		</TreeRow>
	);
}

function directoryNodes(root: { children: Node[] }, dir: string): Node[] {
	if (rootOf(dir) === dir) {
		return root.children;
	}

	const folder = findFolder(root.children, dir);
	if (!folder) {
		return root.children;
	}

	return folder.index ? [folder.index, ...folder.children] : folder.children;
}

function findFolder(nodes: Node[], url: string): Folder | undefined {
	for (const node of nodes) {
		if (node.type !== "folder") {
			continue;
		}

		if (node.index?.url === url) {
			return node;
		}

		const nested = findFolder(node.children, url);
		if (nested) {
			return nested;
		}
	}
}

export const SidebarLinkItem = createLinkItemRenderer({
	SidebarFolder,
	SidebarFolderContent,
	SidebarFolderLink,
	SidebarFolderTrigger,
	SidebarItem: TreeRow,
});

function folderKey(item: Folder): string {
	if (item.$id) {
		return item.$id;
	}

	if (item.index?.url) {
		return item.index.url;
	}

	return String(item.name);
}
