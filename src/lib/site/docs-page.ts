import "server-only";

import {
	type ResolvedDocs as CorpusResolved,
	type PageIndex,
	resolveFromPageIndex,
} from "./build-corpus";

import { compilePageIndex } from "./corpus";
import type { SourcePage } from "./source";

export type ResolvedDocs = CorpusResolved<SourcePage>;

export function resolveDocsPage(
	slugs: readonly string[],
	pageIndex: PageIndex<SourcePage> = compilePageIndex()
): ResolvedDocs | undefined {
	return resolveFromPageIndex(slugs, pageIndex);
}
