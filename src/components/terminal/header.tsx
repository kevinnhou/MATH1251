"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { SidebarIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { TerminalPrompt } from "./prompt";

export function TerminalHeader(props: ComponentProps<"header">) {
	const {
		isNavTransparent,
		props: { nav },
		slots,
	} = useDocsLayout();

	if (nav?.component) {
		return nav.component;
	}

	return (
		<header
			className={cn(
				"sticky top-(--fd-docs-row-1) z-30 flex h-(--fd-header-height) items-center border-b ps-4 pe-2.5 backdrop-blur-sm transition-colors [grid-area:header] data-[transparent=false]:bg-fd-background/80 md:hidden max-md:layout:[--fd-header-height:--spacing(14)]",
				props.className
			)}
			data-transparent={isNavTransparent}
			id="nd-subnav"
			{...props}
		>
			{slots.navTitle ? (
				<slots.navTitle className="inline-flex items-center gap-2.5 font-semibold" />
			) : null}
			<div className="flex-1">{nav?.children}</div>
			<TerminalPrompt compact />
			{slots.sidebar ? (
				<slots.sidebar.trigger
					className={cn(
						buttonVariants({
							className: "p-2",
							color: "ghost",
							size: "icon-sm",
						})
					)}
				>
					<SidebarIcon />
				</slots.sidebar.trigger>
			) : null}
		</header>
	);
}
