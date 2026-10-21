import type { Metadata } from "next";
import { ThreadsPage } from "@/components/threads/page";
import { course } from "@/lib/course/config";
import { getCorpus } from "@/lib/site/corpus";

export const metadata: Metadata = {
	description: "Ideas that recur across the course.",
	title: `${course.name} Threads`,
};

export default function Page() {
	const { tenets, threadMap, threads } = getCorpus();
	return (
		<ThreadsPage tenets={tenets} threadMap={threadMap} threads={threads} />
	);
}
