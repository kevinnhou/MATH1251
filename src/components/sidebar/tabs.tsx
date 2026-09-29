"use client";

import Link from "fumadocs-core/link";
import { useSidebar } from "fumadocs-ui/components/sidebar/base";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useUnsaved } from "@/components/pwa/network";
import { useTerminalApi } from "@/components/terminal/provider";
import { cn } from "@/lib/cn";
import { rootOf } from "@/lib/terminal/dirs";

export function SidebarTabs({
	className,
	dir,
	options,
}: {
	className?: string;
	dir: string;
	options: LayoutTab[];
}) {
	const [open, setOpen] = useState(false);
	const root = rootOf(dir);
	const selected = options.findLast((option) => holdsRoot(option, root));
	if (!selected) {
		return null;
	}

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger
				className={cn(
					"flex items-center gap-2 rounded-lg border bg-fd-secondary/50 p-2 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-open:bg-fd-accent data-open:text-fd-accent-foreground",
					className
				)}
			>
				<div className="size-9 shrink-0 empty:hidden md:size-5">
					{selected.icon}
				</div>
				<div>
					<p className="font-medium text-sm">{selected.title}</p>
					<p className="text-fd-muted-foreground text-sm empty:hidden md:hidden">
						{selected.description}
					</p>
				</div>
				<ChevronsUpDown className="ms-auto size-4 shrink-0 text-fd-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent className="fd-scroll-container flex w-(--anchor-width) flex-col gap-1 p-1">
				{options.map((option) =>
					option === selected || !option.unlisted ? (
						<TabOption
							active={option === selected}
							key={option.url}
							onSelect={() => setOpen(false)}
							option={option}
						/>
					) : null
				)}
			</PopoverContent>
		</Popover>
	);
}

function TabOption({
	active,
	onSelect,
	option,
}: {
	active: boolean;
	onSelect: () => void;
	option: LayoutTab;
}) {
	const { closeOnRedirect } = useSidebar();
	const { changeDirectory } = useTerminalApi();
	const unsaved = useUnsaved(option.url);

	return (
		<Link
			href={option.url}
			{...option.props}
			className={cn(
				"flex items-center gap-2 rounded-lg p-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground",
				option.props?.className
			)}
			onClick={(event) => {
				closeOnRedirect.current = false;
				onSelect();
				if (unsaved) {
					event.preventDefault();
					changeDirectory(rootOf(option.url));
				}
			}}
		>
			<div className="size-9 shrink-0 empty:hidden md:mb-auto md:size-5">
				{option.icon}
			</div>
			<div>
				<p className="font-medium text-sm leading-none">{option.title}</p>
				<p className="mt-1 text-[0.8125rem] text-fd-muted-foreground empty:hidden">
					{option.description}
				</p>
			</div>
			<Check
				className={cn(
					"ms-auto size-3.5 shrink-0 text-fd-primary",
					!active && "invisible"
				)}
			/>
		</Link>
	);
}

function holdsRoot(option: LayoutTab, root: string): boolean {
	return option.urls ? option.urls.has(root) : rootOf(option.url) === root;
}
