import type { ComponentInput, DomainServer } from "engine";

function outputFence({ children, props }: ComponentInput): string {
	const command = typeof props.command === "string" ? props.command : "";
	const lines = [command === "" ? "" : `$ ${command}`, children].filter(
		Boolean
	);
	return `\`\`\`console\n${lines.join("\n")}\n\`\`\``;
}

export default {
	components: {
		Output: { markdown: outputFence },
	},
} satisfies DomainServer;
