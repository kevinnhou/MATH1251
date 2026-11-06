import { describe, expect, test } from "bun:test";
import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { VFile } from "vfile";
import type { Domain } from "@/lib/mdx-env/component";
import { createComponentRegistry } from "@/lib/mdx-env/kinds";
import { type PageEnvs, replaceComponents } from "@/lib/mdx-env/page-envs";
import { remarkMdxEnv } from "@/lib/mdx-env/remark";

const domain = {
	components: {
		Plot: { slugProps: ["of"] },
		Theorem: { code: "TH", plural: "Theorems", role: "uses", style: "plain" },
	},
} as const satisfies Domain;

const env = createComponentRegistry([domain]);

async function envsOf(source: string): Promise<PageEnvs> {
	const file = new VFile({ path: "page.mdx", value: source });
	await createProcessor({
		remarkPlugins: [remarkGfm, [remarkMdxEnv, { env }]],
	}).process(file);
	const { envs } = file.data;
	if (envs === undefined) {
		throw new Error("remarkMdxEnv did not run");
	}
	return envs;
}

describe("component occurrences", () => {
	test("literal props and `export const` names are recorded", async () => {
		const envs = await envsOf(
			'export const range = { from: -2, to: 2 }\n\nSome prose.\n\n<Plot domain={[-2, 2]} range={range} label="f" smooth />\n'
		);
		expect(envs.components).toEqual([
			{
				children: "",
				props: {
					domain: [-2, 2],
					label: "f",
					range: { from: -2, to: 2 },
					smooth: true,
				},
				segment: 0,
				tag: "Plot",
			},
		]);
	});

	test("computed props fail the build", () => {
		expect(envsOf("<Plot domain={width * 2} />\n")).rejects.toThrow(
			"must be literals"
		);
	});

	test("unknown JSX fails the build", () => {
		expect(envsOf("<Callout>Hi</Callout>\n")).rejects.toThrow(
			"<Callout> is not a component of any listed domain"
		);
	});

	test("components can't sit inside tables", () => {
		expect(envsOf("| a | b |\n| - | - |\n| <Plot /> | 1 |\n")).rejects.toThrow(
			"can't sit inside a table"
		);
	});

	test("inside an environment, text content feeds the metadata and templates keep the component", async () => {
		const envs = await envsOf(
			'<Theorem slug="t">\n\n## Title\n\n<Statement>\n\nSee <Plot of="t">the plot</Plot>.\n\n</Statement>\n\n</Theorem>\n'
		);
		const [entry] = envs.entries;
		expect(entry?.statement).toBe("See the plot.");
		expect(envs.components[0]?.env).toBe("theorem-1");
		expect(envs.components[0]?.segment).toBe(0);
		expect(
			replaceComponents(entry?.templates?.statement ?? "", () => "[PLOT]")
		).toBe("See [PLOT].");
	});

	test("placeholders report the line prefix so list items can indent", async () => {
		const envs = await envsOf("- item\n\n  <Plot />\n");
		const [segment] = envs.segments;
		const prefixes: string[] = [];
		replaceComponents(
			segment?.type === "prose" ? segment.markdown : "",
			(_index, prefix) => {
				prefixes.push(prefix);
				return "";
			}
		);
		expect(prefixes).toEqual(["  "]);
	});
});
