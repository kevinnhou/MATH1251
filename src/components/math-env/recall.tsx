import { InlineHtml } from "@/components/markdown/html";
import type { MarkdownFragment } from "@/lib/markdown/types";
import type { MathEnvKind } from "@/lib/math-env/kinds";
import type { StatementView } from "@/lib/math-env/statement-html";
import type { ResolvedRef } from "@/lib/math-env/tenet";
import { Env } from "./env";
import { StatementHtml } from "./statement";

export interface RecallProps {
	citedBy?: ResolvedRef[];
	id?: string;
	kind: MathEnvKind;
	moreHref?: string;
	pageTitle?: string;
	relatedSee?: ResolvedRef[];
	relatedUses?: ResolvedRef[];
	statement?: StatementView;
	tenetHref?: string;
	title?: MarkdownFragment<"inline">;
}

export function Recall({
	citedBy,
	id,
	kind,
	moreHref,
	pageTitle,
	relatedSee,
	relatedUses,
	statement,
	tenetHref,
	title,
}: RecallProps) {
	return (
		<Env
			citedBy={citedBy}
			exportTitle={title?.source}
			id={id}
			isRecall
			kind={kind}
			markHref={tenetHref}
			markLinkLabel="Go to original"
			moreHref={moreHref}
			originalHref={tenetHref}
			pageTitle={pageTitle}
			relatedSee={relatedSee}
			relatedUses={relatedUses}
			statementMarkdown={statement?.source}
		>
			{title ? (
				<h3>
					<InlineHtml html={title.html} />
				</h3>
			) : null}
			{statement ? <StatementHtml html={statement.html} /> : null}
		</Env>
	);
}
