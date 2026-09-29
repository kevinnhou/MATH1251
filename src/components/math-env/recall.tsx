import { InlineHtml } from "@/components/markdown/html";
import type { RecallView } from "@/lib/math-env/env-meta";
import { Env } from "./env";
import { StatementHtml } from "./statement";

export function Recall({ recall }: { recall: RecallView }) {
	return (
		<Env
			env={recall.env}
			markHref={recall.env.originalHref}
			markLinkLabel="Go to original"
		>
			<h3>
				<InlineHtml html={recall.title.html} />
			</h3>
			{recall.statement ? <StatementHtml html={recall.statement.html} /> : null}
		</Env>
	);
}
