import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import type { PromptTargetLookup } from "@/lib/mdx-env/env-meta";
import type { ThreadIndex } from "@/lib/mdx-env/thread";
import type {
	CourseIndex,
	ThreadMap as ThreadMapData,
} from "@/lib/relations/types";
import { ThreadList } from "./thread-list";
import { ThreadSection } from "./thread-section";

export interface ThreadMdxOptions {
	courseIndex?: CourseIndex;
	promptTarget?: PromptTargetLookup;
	threadIndex?: ThreadIndex;
	threadMap?: ThreadMapData;
}

export function getThreadMdxComponents(
	options: ThreadMdxOptions = {}
): MDXComponents {
	return {
		Thread: ({
			children,
			id,
			slug,
		}: {
			children?: ReactNode;
			id?: string;
			slug: string;
		}) => {
			const thread = options.threadIndex?.bySlug.get(slug);
			return (
				<ThreadSection
					courseIndex={options.courseIndex}
					id={id}
					target={thread && options.promptTarget?.(thread.href)}
					thread={thread}
				>
					{children}
				</ThreadSection>
			);
		},
		ThreadMap: () =>
			options.threadMap ? <ThreadList map={options.threadMap} /> : null,
	};
}
