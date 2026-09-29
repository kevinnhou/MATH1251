"use client";

import {
	SidebarItem,
	SidebarSeparator,
} from "fumadocs-ui/components/sidebar/base";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function TreeSeparator({ className, ...props }: ComponentProps<"p">) {
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

type TreeRowProps = { header?: boolean } & (
	| ComponentProps<typeof SidebarItem>
	| ({ as: "button" } & ComponentProps<"button">)
	| ({ as: "div" } & ComponentProps<"div">)
);

export function TreeRow({ className, header = false, ...props }: TreeRowProps) {
	const rowClassName = cn(
		"wrap-anywhere relative flex flex-row items-center gap-2 px-2 py-1.5 text-start text-fd-muted-foreground outline-none hover:text-fd-foreground focus-visible:bg-fd-accent focus-visible:text-fd-foreground [&_svg]:size-4 [&_svg]:shrink-0",
		"data-[active=true]:bg-[repeating-linear-gradient(315deg,var(--color-fd-border)_0_1px,#0000_0_50%)] data-[active=true]:bg-size-[6px_6px] data-[active=true]:font-medium data-[active=true]:text-fd-foreground data-[active=true]:before:-me-0.5 data-[active=true]:before:font-bold data-[active=true]:before:font-mono data-[active=true]:before:text-[0.8em] data-[active=true]:before:content-['>']",
		header && "font-medium text-fd-foreground",
		className
	);

	if (!("as" in props)) {
		return <SidebarItem className={rowClassName} data-tree-row="" {...props} />;
	}

	if (props.as === "div") {
		const { as: _as, ...rest } = props;
		return <div className={rowClassName} {...rest} />;
	}

	const { as: _as, ...rest } = props;
	return (
		<button className={rowClassName} data-tree-row="" type="button" {...rest} />
	);
}
