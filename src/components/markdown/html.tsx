import { cn } from "@/lib/cn";
import type { InlineLabel } from "@/lib/markdown/types";

export function InlineHtml({
	className,
	html,
}: {
	className?: string;
	html: string;
}) {
	return (
		<span
			className={cn("md-fragment-inline", className)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: PASS
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

export function BlockHtml({
	className,
	html,
}: {
	className?: string;
	html: string;
}) {
	return (
		<div
			className={cn("md-fragment-block", className)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: PASS
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

export function InlineLabelView({
	className,
	label,
}: {
	className?: string;
	label: InlineLabel;
}) {
	if (typeof label === "string") {
		if (label.length === 0) {
			return null;
		}

		return <span className={cn("md-fragment-inline", className)}>{label}</span>;
	}

	if (label.html.length === 0) {
		return null;
	}

	return <InlineHtml className={className} html={label.html} />;
}
