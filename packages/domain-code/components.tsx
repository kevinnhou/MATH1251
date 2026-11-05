import type { DomainComponents } from "engine";
import type { ReactNode } from "react";

function Output({
	children,
	command,
}: {
	children?: ReactNode;
	command?: string;
}) {
	return (
		<div className="my-4 border border-fd-border bg-fd-card px-4 py-3 font-mono text-sm *:my-0">
			{command === undefined ? null : (
				<p className="text-fd-muted-foreground">$ {command}</p>
			)}
			{children}
		</div>
	);
}

export default { Output } satisfies DomainComponents;
