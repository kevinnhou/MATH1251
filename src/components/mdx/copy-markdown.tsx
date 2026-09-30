"use client";

import { Check, Copy, LoaderCircle, X } from "lucide-react";
import { type CopyStatus, useCopyMarkdown } from "@/lib/export/use-copy";
import { COPY_LABELS, EXPORT_BUTTON_CLASS } from "./ask-panel";

export function LLMCopyButton({ id }: { id: string }) {
	const { copy, status } = useCopyMarkdown(id);

	return (
		<button
			className={EXPORT_BUTTON_CLASS}
			disabled={status === "copying"}
			onClick={copy}
			type="button"
		>
			<CopyIcon status={status} />
			<span aria-live="polite">{COPY_LABELS[status]}</span>
		</button>
	);
}

function CopyIcon({ status }: { status: CopyStatus }) {
	switch (status) {
		case "copied":
			return <Check />;
		case "copying":
			return (
				<LoaderCircle className="animate-spin motion-reduce:animate-none" />
			);
		case "failed":
			return <X />;
		case "idle":
			return <Copy />;
		default:
			return status satisfies never;
	}
}
