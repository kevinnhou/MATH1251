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
import { kindViewNotesLink, selectPageRelated } from "@/lib/graph/related";
import { markdownToPlain } from "@/lib/markdown";
import { compileMarkdownFragment } from "@/lib/markdown/fragment";
import type { RelatedLink } from "@/lib/math-env/export-markdown";
import { getKindViewToc } from "@/lib/math-env/kind-view";
import { gitConfig } from "@/lib/site/config";
import { compileCorpus, compilePageIndex } from "@/lib/site/corpus";
import { resolveDocsPage } from "@/lib/site/docs-page";
import { getDocsRouteSlugs } from "@/lib/site/docs-routes";
import {
	getKindViewMarkdownUrl,
	getPageImageUrl,
	getPageMarkdownUrl,
	source,
} from "@/lib/site/source";
import { getTitleStrand } from "@/lib/site/strands";

export default async function Page(props: PageProps<"/[...slug]">) {
	const params = await props.params;
	const resolved = resolveDocsPage(params.slug);
	if (!resolved) {
		notFound();
	}

	const corpus = compileCorpus();
	const { source: sourcePage } = resolved;
	const { page } = sourcePage;
	const view = resolved.kind === "kind-view" ? resolved.view : undefined;
	const MDX = page.data.body;
	const markdownUrl =
		view === undefined
			? getPageMarkdownUrl(page).url
			: getKindViewMarkdownUrl(view).url;
	const related: RelatedLink[] =
		view === undefined
			? selectPageRelated(corpus.graph, page.url)
			: [kindViewNotesLink(view, page.data.title)];
	const githubUrl =
		view === undefined
			? `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`
			: undefined;
	const title = view?.title ?? page.data.title;
	const description = view?.description ?? page.data.description;
	const notesTitle = compileMarkdownFragment(page.data.title, "inline");

	return (
		<DocsPage
			full={page.data.full}
			tableOfContent={{
				style: "clerk",
			}}
			toc={
				view === undefined
					? page.data.toc
					: getKindViewToc(page.data.toc, sourcePage.envs, view.kind)
			}
		>
			<DocsTitle>
				<MarkdownLabel source={title} />
			</DocsTitle>
			<DocsDescription className="mb-0">
				{description ? <MarkdownLabel source={description} /> : null}
			</DocsDescription>
			<div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
				<LLMCopyButton markdownUrl={markdownUrl} />
				<PageActions
					githubUrl={githubUrl}
					markdownUrl={markdownUrl}
					related={related}
					task={view === undefined ? "page" : "kind-view"}
				/>
				{view === undefined ? null : (
					<Link
						aria-label={`Back to ${notesTitle.plain}`}
						className="text-fd-muted-foreground text-sm hover:text-fd-foreground"
						href={page.url}
					>
						Back to <InlineHtml html={notesTitle.html} />
					</Link>
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
							pageEnvs: sourcePage.envs,
							pageTitle: page.data.title,
							pageUrl: page.url,
							tenetIndex: corpus.tenets,
							viewKind: view?.kind,
						}
					)}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export const dynamicParams = true;

export async function generateStaticParams() {
	return getDocsRouteSlugs(compilePageIndex()).map((slug) => ({ slug }));
}

export async function generateMetadata(
	props: PageProps<"/[...slug]">
): Promise<Metadata> {
	const params = await props.params;
	const resolved = resolveDocsPage(params.slug);
	if (!resolved) {
		notFound();
	}

	const { page } = resolved.source;
	const view = resolved.kind === "kind-view" ? resolved.view : undefined;
	const strand = getTitleStrand(page.slugs);
	const plainPageTitle = markdownToPlain(page.data.title);
	const pageTitle = strand
		? `[${strand.toUpperCase()}] ${plainPageTitle}`
		: `MATH[1251] ${plainPageTitle}`;
	const title = view === undefined ? pageTitle : markdownToPlain(view.tabTitle);
	const descriptionSource = view?.description ?? page.data.description;

	return {
		alternates: view === undefined ? undefined : { canonical: page.url },
		description: descriptionSource
			? markdownToPlain(descriptionSource)
			: undefined,
		openGraph: {
			images: getPageImageUrl(page, view?.kind).url,
		},
		robots: view === undefined ? undefined : { follow: true, index: false },
		title,
	};
}
