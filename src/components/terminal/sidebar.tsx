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
import { cn } from "@/lib/cn";
import { TerminalPanes } from "./panes";
import { TerminalPrompt } from "./prompt";
import { useTerminal } from "./provider";
import { SidebarTreeStateProvider } from "./sidebar-state";

export function TerminalSidebar({
	banner,
	collapsible = true,
	components,
	footer,
	...rest
}: SidebarProps) {
	return (
		<SidebarTreeStateProvider>
			<TerminalSidebarChrome
				banner={banner}
				collapsible={collapsible}
				components={components}
				footer={footer}
				{...rest}
			/>
		</SidebarTreeStateProvider>
	);
}

function TerminalSidebarChrome({
	banner,
	collapsible = true,
	components,
	footer,
	...rest
}: SidebarProps) {
	const {
		props: { nav },
		slots,
		menuItems,
	} = useDocsLayout();
	const { closeDrawerAfter, focusEpoch, hadOutput, inputRef, pane, surface } =
		useTerminal();
	const { collapsed, mode, open, setCollapsed, setOpen } = useSidebar();
	const iconLinks = menuItems.filter((item) => item.type === "icon");
	const sidebarRef = useRef({ collapsed, mode, setCollapsed, setOpen });
	sidebarRef.current = { collapsed, mode, setCollapsed, setOpen };
	const showDrawerField = mode === "drawer";

	useEffect(() => {
		if (focusEpoch === 0) {
			return;
		}

		const sidebar = sidebarRef.current;
		if (sidebar.collapsed) {
			sidebar.setCollapsed(false);
		}

		if (sidebar.mode === "drawer") {
			sidebar.setOpen(true);
		}

		const frame = window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [focusEpoch, inputRef]);

	useEffect(() => {
		if (closeDrawerAfter === 0) {
			return;
		}

		setOpen(false);
		inputRef.current?.blur();
	}, [closeDrawerAfter, inputRef, setOpen]);

	const header = (desktopField: boolean) => (
		<div className="flex flex-col gap-3 p-4 pb-2">
			<div className="flex">
				{slots.navTitle ? (
					<slots.navTitle className="me-auto inline-flex items-center gap-2.5 font-medium text-[0.9375rem]" />
				) : null}
				{nav?.children}
				{collapsible ? (
					<SidebarCollapseTrigger
						className={cn(
							buttonVariants({
								className: "mb-auto text-fd-muted-foreground",
								color: "ghost",
								size: "icon-sm",
							})
						)}
					>
						<SidebarIcon />
					</SidebarCollapseTrigger>
				) : null}
			</div>
			{desktopField ? <TerminalPrompt /> : <TerminalPrompt compact />}
		</div>
	);

	const chromeFooter =
		slots.languageSelect ||
		iconLinks.length > 0 ||
		slots.themeSwitch ||
		footer ? (
			<div className="flex flex-col p-4 pt-2">
				{slots.languageSelect ? (
					<slots.languageSelect.root
						className="mb-2 justify-start bg-fd-secondary/50 text-start text-fd-muted-foreground"
						variant="secondary"
					>
						<Languages className="size-4.5" />
						<slots.languageSelect.text />
						<ChevronDown className="ms-auto size-3.5" />
					</slots.languageSelect.root>
				) : null}
				<div className="flex items-center rounded-lg border bg-fd-secondary/50 p-0.5 pe-0 text-fd-muted-foreground empty:hidden">
					{iconLinks.map((item, index) => (
						<LinkItem
							aria-label={item.label}
							className={cn(
								buttonVariants({ color: "ghost", size: "icon-sm" })
							)}
							item={item}
							key={`${item.url}-${index}`}
						>
							{item.icon}
						</LinkItem>
					))}
					{slots.themeSwitch ? (
						<slots.themeSwitch className="ms-auto rounded-none border-y-0 border-e-0 px-1 py-0 *:rounded-md" />
					) : null}
				</div>
				{footer}
			</div>
		) : null;

	const panes = (active: boolean) => (
		<TerminalPanes active={active} banner={banner} components={components} />
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
										"inset-y-2 w-(--fd-sidebar-width) rounded-xl border transition-transform",
										hovered
											? "translate-x-2 shadow-lg rtl:-translate-x-2"
											: "-translate-x-(--fd-sidebar-width) rtl:translate-x-full",
									]
								)}
								data-collapsed={isCollapsed}
								data-hovered={isCollapsed && hovered}
								data-terminal-had-output={hadOutput || undefined}
								data-terminal-mode={surface.mode}
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
								"fixed inset-s-4 top-[calc(--spacing(4)+var(--fd-docs-row-3))] z-10 flex rounded-xl border bg-fd-muted p-0.5 text-fd-muted-foreground shadow-lg transition-opacity",
								(!isCollapsed || hovered) && "pointer-events-none opacity-0"
							)}
							data-sidebar-panel=""
						>
							<SidebarCollapseTrigger
								className={cn(
									buttonVariants({
										className: "rounded-lg",
										color: "ghost",
										size: "icon-sm",
									})
								)}
							>
								<SidebarIcon />
							</SidebarCollapseTrigger>
							<TerminalPrompt className="px-1" compact />
						</div>
					</>
				)}
			</SidebarContent>
			<SidebarDrawer className="flex flex-col" closed={!open}>
				<div className="flex flex-col gap-3 p-4 pb-2">
					<div className="flex items-center gap-1.5 text-fd-muted-foreground">
						<div className="flex flex-1">
							{iconLinks.map((item, index) => (
								<LinkItem
									aria-label={item.label}
									className={cn(
										buttonVariants({
											className: "p-2",
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
						{slots.themeSwitch ? <slots.themeSwitch className="p-0" /> : null}
						<SidebarTrigger
							className={cn(
								buttonVariants({
									className: "p-2",
									color: "ghost",
									size: "icon-sm",
								})
							)}
						>
							<SidebarIcon />
						</SidebarTrigger>
					</div>
					{showDrawerField ? <TerminalPrompt /> : <TerminalPrompt compact />}
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
					"fixed inset-e-0 inset-y-0 z-40 flex w-[85%] max-w-95 flex-col border-s bg-fd-background text-[0.9375rem] shadow-lg data-[state=closed]:animate-fd-sidebar-out data-[state=open]:animate-fd-sidebar-in",
					className
				)}
				inert={closed || undefined}
			>
				{children}
			</SidebarDrawerContent>
		</>
	);
}
