import type { ReactNode } from "react";
import { BlockHtml } from "@/components/markdown/html";
import { cn } from "@/lib/cn";

export function Statement({ children }: { children?: ReactNode }) {
	return <div className="math-env-statement mb-3">{children}</div>;
}

export function StatementHtml({
	className,
	html,
}: {
	className?: string;
	html: string;
}) {
	return (
		<BlockHtml
			className={cn("math-env-statement mb-3", className)}
			html={html}
		/>
	);
}
