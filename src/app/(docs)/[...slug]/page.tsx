import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LLMCopyButton } from "@/components/export/copy-markdown";
import { PageActions } from "@/components/export/page-actions";
import { InlineHtml } from "@/components/markdown/html";
import { MarkdownLabel } from "@/components/markdown/label";
import { getMDXComponents } from "@/components/mdx";
import { ReadingDock } from "@/components/relations/dock";
import { loadPageContent } from "@/lib/compile/content";
import { contentSourceUrl } from "@/lib/compile/content-dir";
import { source } from "@/lib/compile/source";
import { promptTargetFor } from "@/lib/export/server";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import { getKindViewToc } from "@/lib/mdx-env/kind-view";
import { buildPageDock } from "@/lib/relations/dock";
import {
	docsStaticParams,
	getCorpus,
	resolveDocsPage,
} from "@/lib/site/corpus";
import { describeDocsPage } from "@/lib/site/docs-page";

export default async function Page(props: PageProps<"/[...slug]">) {
	const params = await props.params;
	const resolved = resolveDocsPage(params.slug);
	if (!resolved) {
		notFound();
	}

	const corpus = getCorpus();
	const { envs, page } = resolved.source;
	const { body: MDX, toc } = await loadPageContent(page.path);
	const view = resolved.kind === "kind-view" ? resolved.view : undefined;
	const target =
		promptTargetFor(corpus.exportGraph, view?.url ?? page.url) ?? notFound();
	const dock = buildPageDock(corpus, envs, {
		title: page.data.title,
		url: page.url,
	});

	return (
		<DocsPage
			full={page.data.full}
			tableOfContent={{
				style: "clerk",
			}}
			toc={view === undefined ? toc : getKindViewToc(toc, envs, view.kind)}
		>
			<DocsTitle>
				<MarkdownLabel source={resolved.title} />
			</DocsTitle>
			<DocsDescription className="mb-0">
				{resolved.description ? (
					<MarkdownLabel source={resolved.description} />
				) : null}
			</DocsDescription>
			<div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
				<PageActions
					githubUrl={
						view === undefined ? contentSourceUrl(page.path) : undefined
					}
					target={target}
				/>
				<LLMCopyButton id={target.id} />
				{view === undefined ? null : (
					<BackToNotes title={page.data.title} url={page.url} />
				)}
			</div>
			<DocsBody data-prose="">
				<MDX
					components={getMDXComponents(
						{
							a: createRelativeLink(source, page),
						},
						{
							courseIndex: corpus.courseIndex,
							pageEnvs: envs,
							pageTitle: page.data.title,
							pageUrl: page.url,
							promptTarget: (id) => promptTargetFor(corpus.exportGraph, id),
							tenetIndex: corpus.tenets,
							threadIndex: corpus.threads,
							threadMap: corpus.threadMap,
							viewKind: view?.kind,
						}
					)}
				/>
			</DocsBody>
			<ReadingDock dock={dock} key={page.url} />
		</DocsPage>
	);
}

function BackToNotes({ title, url }: { title: string; url: string }) {
	const notesTitle = compileMarkdownFragment(title, "inline");
	return (
		<Link
			aria-label={`Back to ${notesTitle.plain}`}
			className="text-fd-muted-foreground text-sm hover:text-fd-foreground"
			href={url}
		>
			Back to <InlineHtml html={notesTitle.html} />
		</Link>
	);
}

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
	return docsStaticParams();
}

export async function generateMetadata(
	props: PageProps<"/[...slug]">
): Promise<Metadata> {
	const params = await props.params;
	const resolved = resolveDocsPage(params.slug);
	if (!resolved) {
		notFound();
	}

	return describeDocsPage(resolved).metadata;
}
