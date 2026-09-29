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
import { sectionHeader, TREE, treeRoot } from "./tree-keys";
import { SidebarTreeStateProvider } from "./tree-state";

export function Sidebar({
	banner,
	collapsible = true,
	components: _components,
	footer,
	...rest
}: SidebarProps) {
	useTerminalBinding();
	useFocusTreeView();

	return (
		<SidebarTreeStateProvider>
			<DesktopSidebar
				banner={banner}
				collapsible={collapsible}
				footer={footer}
				{...rest}
			/>
			<DrawerSidebar banner={banner} footer={footer} />
		</SidebarTreeStateProvider>
	);
}

function DesktopSidebar({
	banner,
	collapsible,
	footer,
	...rest
}: Omit<SidebarProps, "components">) {
	const {
		props: { nav },
		slots,
	} = useDocsLayout();

	return (
		<SidebarContent>
			{({ collapsed, hovered, ref, ...pointer }) => (
				<>
					<div
						className="pointer-events-none sticky top-(--fd-docs-row-1) z-20 h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] [grid-area:sidebar] *:pointer-events-auto max-md:hidden md:layout:[--fd-sidebar-width:268px]"
						data-sidebar-placeholder=""
					>
						{collapsed ? (
							<div className="absolute inset-s-0 inset-y-0 w-4" {...pointer} />
						) : null}
						<aside
							className={cn(
								"absolute inset-s-0 inset-y-0 flex w-full flex-col items-end border-e bg-fd-card text-sm duration-250 *:w-(--fd-sidebar-width)",
								collapsed && [
									"inset-y-2 w-(--fd-sidebar-width) border transition-transform",
									hovered
										? "translate-x-2 shadow-[4px_4px_0_0_var(--color-fd-border)] rtl:-translate-x-2"
										: "-translate-x-(--fd-sidebar-width) rtl:translate-x-full",
								]
							)}
							data-collapsed={collapsed}
							data-hovered={collapsed && hovered}
							id="nd-sidebar"
							ref={ref}
							{...pointer}
							{...rest}
						>
							<div className="flex flex-col gap-3 border-b p-4">
								<div className="flex">
									{slots.navTitle ? (
										<slots.navTitle className="me-auto inline-flex items-center gap-2.5 font-medium text-[0.9375rem]" />
									) : null}
									{nav?.children}
									{collapsible ? (
										<SidebarCollapseTrigger
											className={iconButton(
												"mb-auto rounded-none text-fd-muted-foreground"
											)}
										>
											<SidebarIcon />
										</SidebarCollapseTrigger>
									) : null}
								</div>
								{!collapsed || hovered ? (
									<TerminalPrompt />
								) : (
									<TerminalLauncher />
								)}
							</div>
							<SidebarPanes banner={banner} />
							<DesktopFooter>{footer}</DesktopFooter>
						</aside>
					</div>
					<div
						className={cn(
							"fixed inset-s-4 top-[calc(--spacing(4)+var(--fd-docs-row-3))] z-10 flex border bg-fd-card p-0.5 text-fd-muted-foreground shadow-[3px_3px_0_0_var(--color-fd-border)] transition-opacity",
							(!collapsed || hovered) && "pointer-events-none opacity-0"
						)}
						data-sidebar-panel=""
					>
						<SidebarCollapseTrigger className={iconButton("rounded-none")}>
							<SidebarIcon />
						</SidebarCollapseTrigger>
						<TerminalLauncher className="px-1" />
					</div>
				</>
			)}
		</SidebarContent>
	);
}

function DesktopFooter({ children }: { children: ReactNode }) {
	const { slots } = useDocsLayout();
	const iconLinks = useIconLinks("rounded-none");

	if (!(slots.languageSelect || iconLinks || slots.themeSwitch || children)) {
		return null;
	}

	return (
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
				{iconLinks}
				{slots.themeSwitch ? (
					<slots.themeSwitch className="ms-auto rounded-none p-0.5 *:rounded-none" />
				) : null}
			</div>
			{children}
		</div>
	);
}

function DrawerSidebar({
	banner,
	footer,
}: Pick<SidebarProps, "banner" | "footer">) {
	const { slots } = useDocsLayout();
	const { open } = useSidebar();
	const iconLinks = useIconLinks("rounded-none p-2");

	return (
		<>
			<SidebarDrawerOverlay className="fixed inset-0 z-40 backdrop-blur-xs data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
			<SidebarDrawerContent
				className="fixed inset-e-0 inset-y-0 z-40 flex w-[85%] max-w-95 flex-col border-s bg-fd-background text-[0.9375rem] data-[state=closed]:animate-fd-sidebar-out data-[state=open]:animate-fd-sidebar-in"
				inert={!open || undefined}
			>
				<div className="flex flex-col gap-3 border-b p-4">
					<div className="flex items-center gap-1.5 text-fd-muted-foreground">
						<div className="flex flex-1">{iconLinks}</div>
						{slots.languageSelect ? (
							<slots.languageSelect.root>
								<Languages className="size-4.5" />
								<slots.languageSelect.text />
							</slots.languageSelect.root>
						) : null}
						{slots.themeSwitch ? (
							<slots.themeSwitch className="rounded-none p-0.5 *:rounded-none" />
						) : null}
						<SidebarTrigger className={iconButton("rounded-none p-2")}>
							<SidebarIcon />
						</SidebarTrigger>
					</div>
					<TerminalPrompt />
				</div>
				<SidebarPanes banner={banner} />
				<div className="flex flex-col border-t p-4 pt-2 empty:hidden">
					{footer}
				</div>
			</SidebarDrawerContent>
		</>
	);
}

function iconButton(className: string): string {
	return cn(buttonVariants({ className, color: "ghost", size: "icon-sm" }));
}

function useIconLinks(className: string): ReactNode[] | null {
	const { menuItems } = useDocsLayout();
	const links = menuItems.flatMap((item, index) =>
		item.type === "icon" ? (
			<LinkItem
				aria-label={item.label}
				className={iconButton(className)}
				item={item}
				key={`${item.url}-${index}`}
			>
				{item.icon}
			</LinkItem>
		) : (
			[]
		)
	);

	return links.length > 0 ? links : null;
}

function useTerminalBinding() {
	const { bindSidebar, showTree } = useTerminalApi();
	const sidebar = useSidebar();
	const sidebarRef = useRef(sidebar);
	sidebarRef.current = sidebar;

	useEffect(() => {
		const reveal = () => {
			const { collapsed, mode, setCollapsed, setOpen } = sidebarRef.current;
			if (collapsed) {
				setCollapsed(false);
			}

			if (mode === "drawer") {
				setOpen(true);
			}
		};

		const unbind = bindSidebar({
			closeDrawer: () => sidebarRef.current.setOpen(false),
			reveal,
		});

		const onKeyDown = (event: KeyboardEvent) => {
			const index = sectionHotkey(event);
			if (index === null || !sectionHeader(index)) {
				return;
			}

			event.preventDefault();
			showTree();
			reveal();
			requestAnimationFrame(() => sectionHeader(index)?.focus());
		};

		window.addEventListener("keydown", onKeyDown);
		return () => {
			unbind();
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [bindSidebar, showTree]);
}

function useFocusTreeView() {
	const { view } = useTerminalScreen();

	useEffect(() => {
		if (!view) {
			return;
		}

		const target =
			view.kind === "search" ? TREE.hit(view.results[0]?.url ?? "") : TREE.row;
		const frame = requestAnimationFrame(() =>
			treeRoot()?.querySelector<HTMLElement>(target)?.focus()
		);
		return () => cancelAnimationFrame(frame);
	}, [view]);
}
