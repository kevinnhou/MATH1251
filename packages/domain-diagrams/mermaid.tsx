import { renderMermaidASCII } from "beautiful-mermaid";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";

export function Mermaid({ chart }: { chart: string }) {
	try {
		const diagram = renderMermaidASCII(chart, {
			colorMode: "none",
			useAscii: false,
		});

		return (
			<div className="max-w-full overflow-x-auto">
				<Pre className="text-xs leading-tight">{diagram}</Pre>
			</div>
		);
	} catch {
		return (
			<CodeBlock title="Mermaid">
				<Pre>{chart}</Pre>
			</CodeBlock>
		);
	}
}
