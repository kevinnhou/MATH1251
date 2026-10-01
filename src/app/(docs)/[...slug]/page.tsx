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
import { GraphHost } from "@/components/graph/view";
import { InlineHtml } from "@/components/markdown/html";
import { MarkdownLabel } from "@/components/markdown/label";
import { getMDXComponents } from "@/components/mdx";
import { LLMCopyButton } from "@/components/mdx/copy-markdown";
import { PageActions } from "@/components/mdx/page-actions";
import { promptTargetFor } from "@/lib/export/corpus";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import { getKindViewToc } from "@/lib/math-env/kind-view";
import { gitConfig } from "@/lib/site/config";
import { loadPageContent } from "@/lib/site/content";
import {
	docsStaticParams,
	getCorpus,
	resolveDocsPage,
} from "@/lib/site/corpus";
import { describeDocsPage } from "@/lib/site/docs-page";
import { source } from "@/lib/site/source";

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
	const target = promptTargetFor(view?.url ?? page.url) ?? notFound();

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
						view === undefined
							? `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`
							: undefined
					}
					target={target}
				/>
				<LLMCopyButton id={target.id} />
				{view === undefined ? null : (
					<BackToNotes title={page.data.title} url={page.url} />
				)}
			</div>
			{view === undefined ? <GraphHost pageUrl={page.url} /> : null}
			<DocsBody data-graph-prose="">
				<MDX
					components={getMDXComponents(
						{
							a: createRelativeLink(source, page),
						},
						{
							pageEnvs: envs,
							pageTitle: page.data.title,
							pageUrl: page.url,
							promptTarget: promptTargetFor,
							tenetIndex: corpus.tenets,
							viewKind: view?.kind,
						}
					)}
				/>
			</DocsBody>
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
