import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreadsPage } from "@/components/threads/page";
import { siteName } from "@/lib/site/config";
import { getCorpus } from "@/lib/site/corpus";

export default async function Page(props: PageProps<"/threads/[slug]">) {
	const { slug } = await props.params;
	if (!getCorpus().threads.bySlug.has(slug)) {
		notFound();
	}

	return <ThreadsPage focus={slug} />;
}

export const dynamicParams = false;

export function generateStaticParams() {
	return [...getCorpus().threads.bySlug.keys()].map((slug) => ({ slug }));
}

export async function generateMetadata(
	props: PageProps<"/threads/[slug]">
): Promise<Metadata> {
	const { slug } = await props.params;
	const thread = getCorpus().threads.bySlug.get(slug) ?? notFound();
	return {
		description: thread.summary.plain,
		title: `${siteName} ${thread.title.plain}`,
	};
}
