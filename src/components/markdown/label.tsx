import type { ReactNode } from "react";
import { InlineHtml } from "@/components/markdown/html";
import { renderMarkdownInline } from "@/lib/markdown";

export function MarkdownLabel({
	className,
	source,
}: {
	className?: string;
	source: string;
}) {
	const html = renderMarkdownInline(source);
	if (html.length === 0) {
		return null;
	}

	return <InlineHtml className={className} html={html} />;
}

export function markdownLabelNode(
	value: ReactNode | undefined
): ReactNode | undefined {
	if (typeof value !== "string") {
		return value;
	}

	const html = renderMarkdownInline(value);
	if (html.length === 0) {
		return value;
	}

	return <InlineHtml html={html} />;
}
