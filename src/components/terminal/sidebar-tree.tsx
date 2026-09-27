"use client";

import { usePathname } from "fumadocs-core/framework";
import type { Folder, Node } from "fumadocs-core/page-tree";
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
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import { cn } from "@/lib/cn";
import { handleTreeKey } from "./sidebar-keys";
import { useSidebarTreeState } from "./sidebar-state";

const itemLinkClass =
	"relative flex flex-row items-center gap-2 px-2 py-1.5 text-start text-fd-muted-foreground wrap-anywhere outline-none hover:text-fd-foreground focus-visible:bg-fd-accent focus-visible:text-fd-foreground data-[active=true]:font-medium data-[active=true]:text-fd-foreground data-[active=true]:before:-me-0.5 data-[active=true]:before:font-bold data-[active=true]:before:font-mono data-[active=true]:before:text-[0.8em] data-[active=true]:before:content-['>'] data-[active=true]:bg-[repeating-linear-gradient(315deg,var(--color-fd-border)_0_1px,#0000_0_50%)] data-[active=true]:bg-size-[6px_6px] [&_svg]:size-4 [&_svg]:shrink-0";

const ACTIVE_ROW =
	":scope > [data-active='true'], :scope > * > [data-active='true']";

const folderClass =
	"group/folder font-medium text-fd-foreground [&>svg[data-icon]]:hidden";

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
				data-tree-root=""
				onKeyDown={(event) => handleTreeKey(event, event.currentTarget)}
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
	const holdsActivePage = useMemo(
		() => item.children.some((node) => containsUrl(node, pathname)),
		[item, pathname]
	);

	return (
		<SidebarFolder
			active={active}
			collapsible={item.collapsible}
			data-tree-folder=""
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
					<FolderToggleMark />
				</StyledFolderLink>
			) : (
				<StyledFolderTrigger>
					{item.icon}
					{item.name}
					<FolderToggleMark />
				</StyledFolderTrigger>
			)}
			<StyledFolderContent pinActive={holdsActivePage}>
				{children}
			</StyledFolderContent>
		</SidebarFolder>
	);
}

function containsUrl(node: Node, url: string): boolean {
	if (node.type === "page") {
		return node.url === url;
	}

	if (node.type === "folder") {
		return (
			node.index?.url === url ||
			node.children.some((child) => containsUrl(child, url))
		);
	}

	return false;
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

function FolderToggleMark() {
	const folder = useFolder();
	if (!folder?.collapsible) {
		return null;
	}

	return (
		<span
			className={cn(
				"ms-auto shrink-0 font-mono text-[0.7rem] leading-none",
				!folder.open &&
					"opacity-0 group-hover/folder:opacity-100 group-focus-visible/folder:opacity-100"
			)}
			data-icon=""
		>
			<span className="font-bold">[</span>
			<span className="inline-block w-[1ch] text-center opacity-70">
				{folder.open ? "\u2212" : "+"}
			</span>
			<span className="font-bold">]</span>
		</span>
	);
}

function StyledSeparator({ className, ...props }: React.ComponentProps<"p">) {
	const depth = useFolderDepth();
	return (
		<SidebarSeparator
			className={cn(
				"mt-5 mb-1 gap-0 px-2 font-mono text-[0.7rem] text-fd-muted-foreground uppercase leading-none tracking-[0.16em] empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0",
				depth === 0 && "first:mt-0",
				className
			)}
			{...props}
		/>
	);
}

function StyledItem({
	className,
	...props
}: React.ComponentProps<typeof SidebarItem>) {
	return (
		<SidebarItem
			className={cn(itemLinkClass, className)}
			data-tree-row=""
			{...props}
		/>
	);
}

function StyledFolderTrigger({
	className,
	...props
}: React.ComponentProps<typeof SidebarFolderTrigger>) {
	const folder = useFolder();
	return (
		<SidebarFolderTrigger
			className={(state) =>
				cn(
					itemLinkClass,
					folderClass,
					"w-full",
					typeof className === "function" ? className(state) : className
				)
			}
			data-tree-folder-open={folder?.open}
			data-tree-row=""
			{...props}
		/>
	);
}

function StyledFolderLink({
	className,
	...props
}: React.ComponentProps<typeof SidebarFolderLink>) {
	const folder = useFolder();
	return (
		<SidebarFolderLink
			className={cn(itemLinkClass, folderClass, "w-full", className)}
			data-tree-folder-open={folder?.open}
			data-tree-row=""
			{...props}
		/>
	);
}

function StyledFolderContent({
	children,
	className,
	pinActive = false,
	...props
}: React.ComponentProps<typeof SidebarFolderContent> & {
	pinActive?: boolean;
}) {
	const folder = useFolder();
	const pinned = pinActive && folder?.open === false;
	return (
		<SidebarFolderContent
			className={(state) =>
				cn(
					"relative flex flex-col ps-3.5",
					"before:absolute before:inset-s-2 before:inset-y-0 before:w-1 before:bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] before:bg-size-[6px_6px] before:text-fd-foreground/25 before:content-['']",
					typeof className === "function" ? className(state) : className
				)
			}
			data-tree-content=""
			data-tree-pin={pinActive || undefined}
			data-tree-pinned={pinned || undefined}
			hiddenUntilFound={pinActive}
			{...props}
		>
			<RailMark />
			{children}
		</SidebarFolderContent>
	);
}

function RailMark() {
	const pathname = usePathname();
	const markRef = useRef<HTMLSpanElement>(null);
	const placed = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the active row changes
	useLayoutEffect(() => {
		const mark = markRef.current;
		const rail = mark?.parentElement;
		if (!(mark && rail)) {
			return;
		}

		const place = (slide: boolean) => {
			const row = rail.querySelector<HTMLElement>(ACTIVE_ROW);
			if (!row) {
				mark.style.opacity = "0";
				placed.current = false;
				return;
			}

			const jump = !(slide && placed.current);
			if (jump) {
				mark.style.transition = "none";
			}
			mark.style.height = `${row.offsetHeight}px`;
			mark.style.opacity = "1";
			mark.style.transform = `translateY(${row.offsetTop}px)`;
			if (jump) {
				mark.getBoundingClientRect();
				mark.style.transition = "";
				placed.current = true;
			}
		};

		place(true);
		let railHeight = rail.offsetHeight;
		const observer = new ResizeObserver(() => {
			if (rail.offsetHeight !== railHeight) {
				railHeight = rail.offsetHeight;
				place(false);
			}
		});
		observer.observe(rail);
		return () => observer.disconnect();
	}, [pathname]);

	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute inset-s-2 top-0 z-10 w-1 bg-fd-foreground opacity-0 transition-[transform,height] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
			data-rail-mark=""
			ref={markRef}
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
