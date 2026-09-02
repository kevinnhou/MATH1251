"use client";

import { usePathname } from "fumadocs-core/framework";
import type { Folder } from "fumadocs-core/page-tree";
import {
	SidebarFolder,
	SidebarFolderContent,
	SidebarFolderLink,
	SidebarFolderTrigger,
	SidebarItem,
	SidebarSeparator,
	useFolder,
	useFolderDepth,
} from "fumadocs-ui/components/sidebar/base";
import { createLinkItemRenderer } from "fumadocs-ui/components/sidebar/link-item";
import { createPageTreeRenderer } from "fumadocs-ui/components/sidebar/page-tree";
import {
	ScrollArea,
	ScrollViewport,
} from "fumadocs-ui/components/ui/scroll-area";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useSidebarTreeState } from "./sidebar-state";

const itemLinkClass =
	"relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors [&_svg]:size-4 [&_svg]:shrink-0";

const highlightClass =
	"data-[active=true]:before:absolute data-[active=true]:before:inset-s-2.5 data-[active=true]:before:inset-y-2.5 data-[active=true]:before:w-px data-[active=true]:before:bg-fd-primary data-[active=true]:before:content-['']";

export function SidebarTreeViewport({ children }: { children: ReactNode }) {
	const { scrollTop, setScrollTop } = useSidebarTreeState();
	const viewportRef = useRef<HTMLDivElement>(null);
	const initialScroll = useRef(scrollTop);

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) {
			return;
		}

		viewport.scrollTop = initialScroll.current;
		return () => {
			setScrollTop(viewport.scrollTop);
		};
	}, [setScrollTop]);

	return (
		<ScrollArea className="min-h-0 flex-1">
			<ScrollViewport
				className="mask-[linear-gradient(to_bottom,transparent,white_12px,white_calc(100%-12px),transparent)] overscroll-contain p-4"
				onScroll={(event) => {
					setScrollTop(event.currentTarget.scrollTop);
				}}
				ref={viewportRef}
			>
				{children}
			</ScrollViewport>
		</ScrollArea>
	);
}

export function PersistentFolder({
	children,
	item,
}: {
	children: ReactNode;
	item: Folder;
}) {
	const pathname = usePathname();
	const { folderOpen } = useSidebarTreeState();
	const id = folderKey(item);
	const indexUrl = item.index?.url;
	const active =
		indexUrl !== undefined &&
		(pathname === indexUrl || pathname.startsWith(`${indexUrl}/`));

	return (
		<SidebarFolder
			active={active}
			collapsible={item.collapsible}
			defaultOpen={folderOpen(id, item.defaultOpen ?? false)}
		>
			<FolderOpenSync id={id} />
			{item.index ? (
				<StyledFolderLink
					active={pathname === item.index.url}
					external={item.index.external}
					href={item.index.url}
				>
					{item.icon}
					{item.name}
				</StyledFolderLink>
			) : (
				<StyledFolderTrigger>
					{item.icon}
					{item.name}
				</StyledFolderTrigger>
			)}
			<StyledFolderContent>{children}</StyledFolderContent>
		</SidebarFolder>
	);
}

function FolderOpenSync({ id }: { id: string }) {
	const folder = useFolder();
	const { setFolderOpen } = useSidebarTreeState();
	useEffect(() => {
		if (folder) {
			setFolderOpen(id, folder.open);
		}
	}, [folder, id, setFolderOpen]);
	return null;
}

function StyledSeparator({
	className,
	style,
	...props
}: React.ComponentProps<"p">) {
	const depth = useFolderDepth();
	return (
		<SidebarSeparator
			className={cn(
				"mt-6 mb-1 inline-flex items-center gap-2 px-2 empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0",
				depth === 0 && "first:mt-0",
				className
			)}
			style={{ paddingInlineStart: itemOffset(depth), ...style }}
			{...props}
		/>
	);
}

function StyledItem({
	className,
	style,
	...props
}: React.ComponentProps<typeof SidebarItem>) {
	const depth = useFolderDepth();
	return (
		<SidebarItem
			className={cn(itemLinkClass, depth >= 1 && highlightClass, className)}
			style={{ paddingInlineStart: itemOffset(depth), ...style }}
			{...props}
		/>
	);
}

function StyledFolderTrigger({
	className,
	style,
	...props
}: React.ComponentProps<typeof SidebarFolderTrigger>) {
	const folder = useFolder();
	const depth = folder?.depth ?? 1;
	return (
		<SidebarFolderTrigger
			className={(state) =>
				cn(
					"w-full",
					folder?.collapsible
						? "wrap-anywhere relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 [&_svg]:size-4 [&_svg]:shrink-0"
						: itemLinkClass,
					typeof className === "function" ? className(state) : className
				)
			}
			style={{ paddingInlineStart: itemOffset(depth - 1), ...style }}
			{...props}
		/>
	);
}

function StyledFolderLink({
	className,
	style,
	...props
}: React.ComponentProps<typeof SidebarFolderLink>) {
	const depth = useFolderDepth();
	return (
		<SidebarFolderLink
			className={cn(
				itemLinkClass,
				"w-full",
				depth > 1 && highlightClass,
				className
			)}
			style={{ paddingInlineStart: itemOffset(depth - 1), ...style }}
			{...props}
		/>
	);
}

function StyledFolderContent({
	className,
	...props
}: React.ComponentProps<typeof SidebarFolderContent>) {
	const depth = useFolderDepth();
	return (
		<SidebarFolderContent
			className={(state) =>
				cn(
					"relative flex flex-col gap-0.5 pt-0.5",
					depth === 1 &&
						"before:absolute before:inset-s-2.5 before:inset-y-1 before:w-px before:bg-fd-border before:content-['']",
					typeof className === "function" ? className(state) : className
				)
			}
			{...props}
		/>
	);
}

export const SidebarPageTree = createPageTreeRenderer({
	SidebarFolder,
	SidebarFolderContent: StyledFolderContent,
	SidebarFolderLink: StyledFolderLink,
	SidebarFolderTrigger: StyledFolderTrigger,
	SidebarItem: StyledItem,
	SidebarSeparator: StyledSeparator,
});

export const SidebarLinkItem = createLinkItemRenderer({
	SidebarFolder,
	SidebarFolderContent: StyledFolderContent,
	SidebarFolderLink: StyledFolderLink,
	SidebarFolderTrigger: StyledFolderTrigger,
	SidebarItem: StyledItem,
});

export function folderKey(item: Folder): string {
	if (item.$id) {
		return item.$id;
	}

	if (item.index?.url) {
		return item.index.url;
	}

	return String(item.name);
}

function itemOffset(depth: number): string {
	return `calc(${2 + 3 * Math.max(depth, 0)} * var(--spacing))`;
}
