import type { DomainServer } from "engine";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";

export default {
	components: {
		Mermaid: {
			markdown: ({ props }) => {
				const chart = typeof props.chart === "string" ? props.chart : "";
				return `\`\`\`mermaid\n${chart}\n\`\`\``;
			},
		},
	},
	syntax: { remarkPlugins: [remarkMdxMermaid] },
} satisfies DomainServer;
