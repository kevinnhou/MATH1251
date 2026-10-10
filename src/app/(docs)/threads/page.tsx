import type { Metadata } from "next";
import { ThreadsPage } from "@/components/threads/page";
import { siteName } from "@/lib/site/config";

export const metadata: Metadata = {
	description: "Ideas that recur across the course.",
	title: `${siteName} Threads`,
};

export default function Page() {
	return <ThreadsPage />;
}
