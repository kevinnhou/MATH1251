"use client";

import { cn } from "@/lib/cn";

export function GraphChrome({
	onCollapse,
	onExpand,
	variant,
}: {
	onCollapse?: () => void;
	onExpand?: () => void;
	variant: "global" | "local";
}) {
	return (
		<div className="pointer-events-none absolute inset-0 z-20">
			{variant === "local" && onExpand ? (
				<BracketAction
					className="absolute right-3 bottom-3"
					label="IMMERSE"
					onClick={onExpand}
				/>
			) : null}
			{onCollapse ? (
				<BracketAction
					className="absolute right-3 bottom-3"
					label="COLLAPSE"
					onClick={onCollapse}
				/>
			) : null}
		</div>
	);
}

export function BracketAction({
	className,
	label,
	onClick,
}: {
	className?: string;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-label={bracketAriaLabel(label)}
			className={cn(
				"pointer-events-auto flex h-4 items-center font-mono text-[10px] text-fd-muted-foreground leading-none outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground",
				className
			)}
			onClick={onClick}
			type="button"
		>
			<span className="text-fd-foreground">[</span>
			{label}
			<span className="text-fd-foreground">]</span>
		</button>
	);
}

function bracketAriaLabel(label: string): string {
	if (label === "IMMERSE") {
		return "Immerse in graph";
	}

	if (label === "COLLAPSE") {
		return "Collapse graph";
	}

	if (label === "FOCUS") {
		return "Focus node";
	}

	if (label === "OPEN") {
		return "Open";
	}

	if (label === "RETRY") {
		return "Retry";
	}

	return label;
}
