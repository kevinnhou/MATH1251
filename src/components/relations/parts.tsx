"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";
import type { Strand } from "@/lib/course/strands";
import type { RenderedMarkdown } from "@/lib/markdown/types";
import type { LinkRole, MapIndex } from "@/lib/relations/query";
import type { Direction, MapChapter, MapPage } from "@/lib/relations/types";

export function moduleColor(module: Strand): string {
	return `var(--relations-strand-${module})`;
}

export const MUTED_COLOR = "var(--color-fd-muted-foreground)";

export const DIRECTION_COLORS: Record<Direction, string> = {
	"builds-on": "var(--relations-builds-on)",
	"leads-to": "var(--relations-leads-to)",
};

export const THREAD_COLOR = "var(--relations-thread)";

export function roleColor(role: LinkRole): string {
	return role === "idle"
		? "var(--color-fd-foreground)"
		: DIRECTION_COLORS[role];
}

export interface ViewProps {
	focusId: string;
	homeId: string;
	index: MapIndex;
	onFocus: (id: string) => void;
	onPreview: (id: string | null) => void;
	pairId: string | null;
	previewId: string | null;
}

export function BracketButton({
	active,
	ariaLabel,
	href,
	label,
	onClick,
}: {
	active?: boolean;
	ariaLabel?: string;
	href?: string;
	label: string;
	onClick?: () => void;
}) {
	const className = cn(
		"inline-flex shrink-0 font-mono text-[10px] leading-none outline-none focus-visible:outline-1 focus-visible:outline-fd-foreground",
		active
			? "text-fd-foreground"
			: "text-fd-muted-foreground hover:text-fd-foreground"
	);
	const content = (
		<>
			<span className="text-fd-foreground">[</span>
			{label}
			<span className="text-fd-foreground">]</span>
		</>
	);

	return href === undefined ? (
		<button
			aria-label={ariaLabel}
			aria-pressed={active}
			className={className}
			onClick={onClick}
			type="button"
		>
			{content}
		</button>
	) : (
		<Link aria-label={ariaLabel} className={className} href={href}>
			{content}
		</Link>
	);
}

export function Swatch({
	children,
	className,
	color,
	opacity,
}: {
	children: ReactNode;
	className?: string;
	color: string;
	opacity?: number;
}) {
	return (
		<span className={cn("flex items-center gap-2", className)}>
			<span
				aria-hidden="true"
				className="inline-block h-0.5 w-3"
				style={{ background: color, opacity }}
			/>
			{children}
		</span>
	);
}

export function SectionHeading({
	color,
	count,
	label,
}: {
	color: string;
	count: number;
	label: string;
}) {
	return (
		<h3 className="m-0 font-mono text-[10px] text-fd-muted-foreground tracking-wider">
			<Swatch color={color}>
				{label} {count}
			</Swatch>
		</h3>
	);
}

export function LinkRow({
	chapter,
	children,
	className,
	code,
	href,
	label,
	...handlers
}: {
	chapter: MapChapter | undefined;
	children?: ReactNode;
	className?: string;
	code?: string;
	href: string;
	label: RenderedMarkdown<"inline">;
	onBlur?: () => void;
	onFocus?: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	title?: string;
}) {
	return (
		<li
			className={cn("flex min-w-0 items-baseline gap-2", className)}
			{...handlers}
		>
			<span
				className="w-9 shrink-0 font-mono text-[10px] text-fd-muted-foreground"
				title={chapter?.title}
			>
				{chapter?.short ?? ""}
			</span>
			{code === undefined ? null : (
				<span className="shrink-0 font-mono text-[10px] text-fd-muted-foreground">
					{code}
				</span>
			)}
			<Link
				className="min-w-0 flex-1 truncate text-fd-foreground outline-none hover:underline focus-visible:outline-1 focus-visible:outline-fd-foreground"
				data-relations-label=""
				href={href}
			>
				<InlineHtml html={label.html} />
			</Link>
			{children}
		</li>
	);
}

export function RoleLabel({ role }: { role: RenderedMarkdown<"inline"> }) {
	return (
		<span
			className="ml-auto max-w-[45%] shrink-0 truncate text-[11px] text-fd-muted-foreground italic"
			data-relations-label=""
		>
			<InlineHtml html={role.html} />
		</span>
	);
}

export function PageTitle({ page }: { page: MapPage }) {
	return (
		<span data-relations-label="">
			<InlineHtml html={page.title.html} />
		</span>
	);
}
