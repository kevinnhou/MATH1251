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
} from "fumadocs-ui/components/sidebar/base";
import { createLinkItemRenderer } from "fumadocs-ui/components/sidebar/link-item";
import { createPageTreeRenderer } from "fumadocs-ui/components/sidebar/page-tree";
import {
	Collapsible,
	CollapsibleContent,
} from "fumadocs-ui/components/ui/collapsible";
import {
	ScrollArea,
	ScrollViewport,
} from "fumadocs-ui/components/ui/scroll-area";
import { useTreePath } from "fumadocs-ui/contexts/tree";
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";
import { cn } from "@/lib/cn";
import { handleTreeKey } from "./sidebar-keys";
import { useSidebarTreeState } from "./sidebar-state";

const rowClass =
	"relative flex flex-row items-center gap-2 px-2 py-1.5 text-start text-fd-muted-foreground wrap-anywhere outline-none hover:text-fd-foreground [&_svg]:size-4 [&_svg]:shrink-0";

// Current page: a `>` cursor over the hatched field. The rail bar beside it
// is placed by useRailMarks.
const activeRowClass =
	"data-[active=true]:font-medium data-[active=true]:text-fd-foreground data-[active=true]:before:-me-0.5 data-[active=true]:before:font-bold data-[active=true]:before:font-mono data-[active=true]:before:text-[0.8em] data-[active=true]:before:content-['>'] data-[active=true]:bg-[repeating-linear-gradient(315deg,var(--color-fd-border)_0_1px,#0000_0_50%)] data-[active=true]:bg-size-[6px_6px]";

// Keyboard highlight, distinct from the current page.
const focusRowClass =
	"focus-visible:bg-fd-accent focus-visible:text-fd-foreground";

const itemClass = cn(rowClass, activeRowClass, focusRowClass);

const headerClass = "font-medium text-fd-foreground";

const railClass =
	"relative flex flex-col ps-3.5 before:absolute before:inset-s-2 before:inset-y-0 before:w-1 before:bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] before:bg-size-[6px_6px] before:text-fd-foreground/25 before:content-['']";

const ROW = "[data-tree-row]";
const HEADER_ROW = ":scope > [data-tree-header] [data-tree-row]";
// The direct child of a rail that is, or contains, the current page.
const ACTIVE_CHILD =
	":scope > [data-active='true'], :scope > :has([data-active='true'])";

export function SidebarTreeViewport({ children }: { children: ReactNode }) {
	const { scrollTopRef } = useSidebarTreeState();
	const viewportRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

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

// One controller per tree places the bar on every rail. Route changes slide
// it; size changes (folding, opening) jump it so it stays on its row.
function useRailMarks(listRef: RefObject<HTMLDivElement | null>) {
	const pathname = usePathname();

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-place when the route changes
	useLayoutEffect(() => {
		if (listRef.current) {
			placeRailMarks(listRef.current, true);
		}
	}, [listRef, pathname]);

	useEffect(() => {
		const list = listRef.current;
		if (!list) {
			return;
		}

		let height = -1;
		const observer = new ResizeObserver(([entry]) => {
			const next = entry?.contentRect.height;
			if (next !== undefined && next !== height) {
				height = next;
				placeRailMarks(list, false);
			}
		});
		observer.observe(list);
		return () => observer.disconnect();
	}, [listRef]);
}

function placeRailMarks(list: HTMLElement, slide: boolean) {
	// Read every rail before writing any mark, so layout is computed once.
	const placements = [
		...list.querySelectorAll<HTMLElement>("[data-rail-mark]"),
	].map((mark) => {
		const rail = mark.parentElement;
		const child = rail?.querySelector<HTMLElement>(ACTIVE_CHILD);
		const row = child?.matches(ROW)
			? child
			: child?.querySelector<HTMLElement>(HEADER_ROW);
		if (!(rail && row)) {
			return { mark };
		}

		const railTop = rail.getBoundingClientRect().top;
		const box = row.getBoundingClientRect();
		return { height: box.height, mark, top: box.top - railTop };
	});

	const jumped: HTMLElement[] = [];
	for (const { height, mark, top } of placements) {
		if (top === undefined) {
			mark.style.opacity = "0";
			delete mark.dataset.placed;
			continue;
		}

		if (!(slide && mark.dataset.placed !== undefined)) {
			mark.style.transition = "none";
			jumped.push(mark);
		}
		mark.style.height = `${height}px`;
		mark.style.opacity = "1";
		mark.style.transform = `translateY(${top}px)`;
		mark.dataset.placed = "";
	}

	if (jumped.length > 0) {
		requestAnimationFrame(() => {
			for (const mark of jumped) {
				mark.style.transition = "";
			}
		});
	}
}

// Page-tree folder. `expanded` is the persisted [+]/[−] state; the panel stays
// open while the folder holds the current page, and a collapsed folder then
// folds every row but the active one (see [data-tree-pinned] in global.css).
export function PersistentFolder({
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

	// Entering a folder opens it, as Fumadocs does. On first mount this only
	// records the default, so a folder the reader collapsed stays collapsed.
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
						<SidebarItem
							active={pathname === indexUrl}
							className={cn(itemClass, headerClass, collapsible && "pe-10")}
							data-tree-folder-open={expanded}
							data-tree-row=""
							external={item.index.external}
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
						</SidebarItem>
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
					<button
						aria-expanded={collapsible ? expanded : undefined}
						className={cn(itemClass, headerClass, "w-full")}
						data-tree-folder-open={expanded}
						data-tree-row=""
						data-tree-toggle=""
						onClick={collapsible ? toggle : undefined}
						type="button"
					>
						{item.icon}
						{item.name}
						{collapsible ? (
							<ToggleMark className="ms-auto" open={expanded} />
						) : null}
					</button>
				)}
			</div>
			<CollapsibleContent
				className={railClass}
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

function StyledSeparator({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<SidebarSeparator
			className={cn(
				"mt-5 mb-1 gap-0 px-2 font-mono text-[0.7rem] text-fd-muted-foreground uppercase leading-none tracking-[0.16em] first:mt-0 empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0",
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
			className={cn(itemClass, className)}
			data-tree-row=""
			{...props}
		/>
	);
}

// Folders in the page tree render through the `Folder` prop (PersistentFolder),
// so the folder parts registered here are the library defaults and only reach
// menu-link folders, which this site does not configure.
const libraryFolderParts = {
	SidebarFolder,
	SidebarFolderContent,
	SidebarFolderLink,
	SidebarFolderTrigger,
};

export const SidebarPageTree = createPageTreeRenderer({
	...libraryFolderParts,
	SidebarItem: StyledItem,
	SidebarSeparator: StyledSeparator,
});

export const SidebarLinkItem = createLinkItemRenderer({
	...libraryFolderParts,
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
