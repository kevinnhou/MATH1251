import "server-only";

import {
	type ResolvedDocs as CorpusResolved,
	urlFromSlugs,
} from "./build-corpus";

import { compileCorpus } from "./corpus";
import type { SourcePage } from "./source";

export type ResolvedDocs = CorpusResolved<SourcePage>;

export function resolveDocsPage(slugs: string[]): ResolvedDocs | undefined {
	return compileCorpus().byUrl.get(urlFromSlugs(slugs));
}
