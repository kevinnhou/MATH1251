"use client";

import {
	SidebarCollapseTrigger,
	SidebarContent,
	SidebarDrawerContent,
	SidebarDrawerOverlay,
	SidebarTrigger,
	useSidebar,
} from "fumadocs-ui/components/sidebar/base";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import type { SidebarProps } from "fumadocs-ui/layouts/docs/slots/sidebar";
import { LinkItem } from "fumadocs-ui/layouts/shared";
import { ChevronDown, Languages, SidebarIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { TerminalLauncher, TerminalPrompt } from "@/components/terminal/prompt";
import {
	useTerminalApi,
	useTerminalScreen,
} from "@/components/terminal/provider";
import { sectionHotkey } from "@/lib/client/keybinds";
import { cn } from "@/lib/cn";
import { SidebarPanes } from "./panes";
import { sectionHeader } from "./tree-keys";
import { SidebarTreeStateProvider } from "./tree-state";

export function Sidebar(props: SidebarProps) {
	return (
		<SidebarTreeStateProvider>
			<SidebarChrome {...props} />
		</SidebarTreeStateProvider>
	);
}

function SidebarChrome({
	banner,
	collapsible = true,
	components: _components,
	footer,
	...rest
}: SidebarProps) {
	const {
		props: { nav },
		slots,
		menuItems,
	} = useDocsLayout();
	const { bindSidebar, inputRef, showTree } = useTerminalApi();
	const { hadOutput, listing, pane } = useTerminalScreen();
	const { collapsed, mode, open, setCollapsed, setOpen } = useSidebar();
	const iconLinks = menuItems.filter((item) => item.type === "icon");
	const sidebarRef = useRef({ collapsed, mode, setCollapsed, setOpen });
	sidebarRef.current = { collapsed, mode, setCollapsed, setOpen };
	const showDrawerField = mode === "drawer";

	useEffect(() => {
		const show = () => {
			const sidebar = sidebarRef.current;
			if (sidebar.collapsed) {
				sidebar.setCollapsed(false);
			}

			if (sidebar.mode === "drawer") {
				sidebar.setOpen(true);
			}
		};

		const unbind = bindSidebar({
			closeDrawer: () => sidebarRef.current.setOpen(false),
			reveal: () => {
				show();
				requestAnimationFrame(() => inputRef.current?.focus());
			},
		});

		const onKeyDown = (event: KeyboardEvent) => {
			const index = sectionHotkey(event);
			if (index === null || !sectionHeader(visibleTreeRoot(), index)) {
				return;
			}

			event.preventDefault();
			showTree();
			show();
			requestAnimationFrame(() =>
				sectionHeader(visibleTreeRoot(), index)?.focus()
			);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => {
			unbind();
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [bindSidebar, inputRef, showTree]);

	useEffect(() => {
		if (!listing) {
			return;
		}

		const frame = requestAnimationFrame(() =>
			visibleTreeRoot()?.querySelector<HTMLElement>("[data-tree-row]")?.focus()
		);
		return () => cancelAnimationFrame(frame);
	}, [listing]);

	const header = (desktopField: boolean) => (
		<div className="flex flex-col gap-3 border-b p-4">
			<div className="flex">
				{slots.navTitle ? (
					<slots.navTitle className="me-auto inline-flex items-center gap-2.5 font-medium text-[0.9375rem]" />
				) : null}
				{nav?.children}
				{collapsible ? (
					<SidebarCollapseTrigger
						className={cn(
							buttonVariants({
								className: "mb-auto rounded-none text-fd-muted-foreground",
								color: "ghost",
								size: "icon-sm",
							})
						)}
					>
						<SidebarIcon />
					</SidebarCollapseTrigger>
				) : null}
			</div>
			{desktopField ? <TerminalPrompt /> : <TerminalLauncher />}
		</div>
	);

	const chromeFooter =
		slots.languageSelect ||
		iconLinks.length > 0 ||
		slots.themeSwitch ||
		footer ? (
			<div className="flex flex-col border-t">
				{slots.languageSelect ? (
					<slots.languageSelect.root
						className="m-2 mb-0 justify-start rounded-none text-start text-fd-muted-foreground"
						variant="secondary"
					>
						<Languages className="size-4.5" />
						<slots.languageSelect.text />
						<ChevronDown className="ms-auto size-3.5" />
					</slots.languageSelect.root>
				) : null}
				<div className="flex items-center px-2 py-1.5 text-fd-muted-foreground empty:hidden">
					{iconLinks.map((item, index) => (
						<LinkItem
							aria-label={item.label}
							className={cn(
								buttonVariants({
									className: "rounded-none",
									color: "ghost",
									size: "icon-sm",
								})
							)}
							item={item}
							key={`${item.url}-${index}`}
						>
							{item.icon}
						</LinkItem>
					))}
					{slots.themeSwitch ? (
						<slots.themeSwitch className="ms-auto rounded-none p-0.5 *:rounded-none" />
					) : null}
				</div>
				{footer}
			</div>
		) : null;

	const panes = (active: boolean) => (
		<SidebarPanes active={active} banner={banner} />
	);

	return (
		<>
			<SidebarContent {...rest}>
				{({ collapsed: isCollapsed, hovered, ref: asideRef, ...pointer }) => (
					<>
						<div
							className="pointer-events-none sticky top-(--fd-docs-row-1) z-20 h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] [grid-area:sidebar] *:pointer-events-auto max-md:hidden md:layout:[--fd-sidebar-width:268px]"
							data-sidebar-placeholder=""
						>
							{isCollapsed ? (
								<div
									className="absolute inset-s-0 inset-y-0 w-4"
									{...pointer}
								/>
							) : null}
							<aside
								className={cn(
									"absolute inset-s-0 inset-y-0 flex w-full flex-col items-end border-e bg-fd-card text-sm duration-250 *:w-(--fd-sidebar-width)",
									isCollapsed && [
										"inset-y-2 w-(--fd-sidebar-width) border transition-transform",
										hovered
											? "translate-x-2 shadow-[4px_4px_0_0_var(--color-fd-border)] rtl:-translate-x-2"
											: "-translate-x-(--fd-sidebar-width) rtl:translate-x-full",
									]
								)}
								data-collapsed={isCollapsed}
								data-hovered={isCollapsed && hovered}
								data-terminal-had-output={hadOutput || undefined}
								data-terminal-pane-target={pane}
								id="nd-sidebar"
								ref={asideRef}
								{...pointer}
								{...rest}
							>
								{header(mode === "full" && (!isCollapsed || hovered))}
								{panes(mode === "full")}
								{chromeFooter}
							</aside>
						</div>
						<div
							className={cn(
								"fixed inset-s-4 top-[calc(--spacing(4)+var(--fd-docs-row-3))] z-10 flex border bg-fd-card p-0.5 text-fd-muted-foreground shadow-[3px_3px_0_0_var(--color-fd-border)] transition-opacity",
								(!isCollapsed || hovered) && "pointer-events-none opacity-0"
							)}
							data-sidebar-panel=""
						>
							<SidebarCollapseTrigger
								className={cn(
									buttonVariants({
										className: "rounded-none",
										color: "ghost",
										size: "icon-sm",
									})
								)}
							>
								<SidebarIcon />
							</SidebarCollapseTrigger>
							<TerminalLauncher className="px-1" />
						</div>
					</>
				)}
			</SidebarContent>
			<SidebarDrawer className="flex flex-col" closed={!open}>
				<div className="flex flex-col gap-3 border-b p-4">
					<div className="flex items-center gap-1.5 text-fd-muted-foreground">
						<div className="flex flex-1">
							{iconLinks.map((item, index) => (
								<LinkItem
									aria-label={item.label}
									className={cn(
										buttonVariants({
											className: "rounded-none p-2",
											color: "ghost",
											size: "icon-sm",
										})
									)}
									item={item}
									key={`${item.url}-drawer-${index}`}
								>
									{item.icon}
								</LinkItem>
							))}
						</div>
						{slots.languageSelect ? (
							<slots.languageSelect.root>
								<Languages className="size-4.5" />
								<slots.languageSelect.text />
							</slots.languageSelect.root>
						) : null}
						{slots.themeSwitch ? (
							<slots.themeSwitch className="rounded-none p-0.5 *:rounded-none" />
						) : null}
						<SidebarTrigger
							className={cn(
								buttonVariants({
									className: "rounded-none p-2",
									color: "ghost",
									size: "icon-sm",
								})
							)}
						>
							<SidebarIcon />
						</SidebarTrigger>
					</div>
					{showDrawerField ? <TerminalPrompt /> : <TerminalLauncher />}
				</div>
				{panes(mode === "drawer")}
				<div className="flex flex-col border-t p-4 pt-2 empty:hidden">
					{footer}
				</div>
			</SidebarDrawer>
		</>
	);
}

function SidebarDrawer({
	children,
	className,
	closed,
}: {
	children: ReactNode;
	className?: string;
	closed: boolean;
}) {
	return (
		<>
			<SidebarDrawerOverlay className="fixed inset-0 z-40 backdrop-blur-xs data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
			<SidebarDrawerContent
				className={cn(
					"fixed inset-e-0 inset-y-0 z-40 flex w-[85%] max-w-95 flex-col border-s bg-fd-background text-[0.9375rem] data-[state=closed]:animate-fd-sidebar-out data-[state=open]:animate-fd-sidebar-in",
					className
				)}
				inert={closed || undefined}
			>
				{children}
			</SidebarDrawerContent>
		</>
	);
}

function visibleTreeRoot(): HTMLElement | null {
	for (const root of document.querySelectorAll<HTMLElement>(
		"[data-tree-root]"
	)) {
		if (root.checkVisibility()) {
			return root;
		}
	}

	return document.querySelector<HTMLElement>("[data-tree-root]");
}
