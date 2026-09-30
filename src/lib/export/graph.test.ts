import { describe, expect, test } from "bun:test";
import type { EnvOccurrence, PageEnvs } from "@/lib/math-env/page-envs";
import type { Tenet, TenetIndex } from "@/lib/math-env/tenet";
import { buildExportGraph, type ExportPageInput } from "./build";
import { envContext } from "./context";
import { prerequisites, relationsOf, requireNode } from "./query";

const P1 = "/algebra/one";
const P2 = "/algebra/two";

function env(
	entry: Partial<EnvOccurrence> & Pick<EnvOccurrence, "id" | "kind">
) {
	return { headings: [], of: [], see: [], ...entry };
}

function page(
	url: string,
	entries: EnvOccurrence[],
	recalls: PageEnvs["recalls"] = []
): ExportPageInput {
	return {
		envs: {
			entries,
			recalls,
			segments: entries.map((entry) => ({ id: entry.id, type: "env" })),
		},
		module: "algebra",
		page: { data: { ideas: [], tags: [], title: url }, url },
	};
}

const pages = [
	page(P1, [
		env({
			id: "definition-1",
			kind: "definition",
			slug: "def-a",
			statement: "A is a thing.",
			title: "A",
		}),
		env({
			body: "Some remarks.",
			id: "theorem-1",
			kind: "theorem",
			of: ["def-a"],
			slug: "thm-b",
			statement: "B holds.",
			title: "B",
		}),
		env({ body: "Because A.", id: "proof-1", kind: "proof", of: ["thm-b"] }),
	]),
	page(
		P2,
		[
			env({
				id: "lemma-1",
				kind: "lemma",
				of: ["thm-b"],
				slug: "lem-c",
				statement: "C holds.",
				title: "C",
			}),
			env({
				body: "Both.",
				id: "proof-1",
				kind: "proof",
				of: ["lem-c", "thm-b"],
			}),
		],
		[{ id: "recall-thm-b-0", of: "thm-b" }]
	),
];

const tenets: TenetIndex = {
	bySlug: new Map(
		[
			["def-a", P1, "definition-1"],
			["thm-b", P1, "theorem-1"],
			["lem-c", P2, "lemma-1"],
		].map(([slug, pageUrl, occurrenceId]) => [
			slug,
			{ occurrenceId, pageUrl } as Tenet,
		])
	),
	citedBy: new Map(),
};

const graph = buildExportGraph(pages, tenets, {
	edges: [
		{ kind: "reference", source: P2, target: `${P1}#theorem-1` },
		{ kind: "reference", source: P2, target: "/nowhere" },
		{ kind: "reference", source: P2, target: `${P1}#theorem-1` },
	],
});

describe("buildExportGraph", () => {
	test("drops edges to unknown nodes and duplicates", () => {
		const references = graph.edges.filter((edge) => edge.kind === "references");
		expect(references).toEqual([
			{ kind: "references", source: P2, target: `${P1}#theorem-1` },
		]);
	});

	test("labels an untitled proof after everything it proves", () => {
		expect(requireNode(graph, `${P1}#proof-1`).label).toBe(
			"Proof of Theorem. B"
		);
		expect(requireNode(graph, `${P2}#proof-1`).label).toBe(
			"Proof of Lemma. C and Theorem. B"
		);
	});

	test("links a recall to the original on another page", () => {
		expect(graph.edges).toContainEqual({
			kind: "recalls",
			source: P2,
			target: `${P1}#theorem-1`,
		});
	});
});

describe("prerequisites", () => {
	test("counts a proof's dependencies as the result's, foundations first", () => {
		const needs = prerequisites(graph, `${P2}#lemma-1`);
		expect(needs.map(({ distance, node }) => [node.id, distance])).toEqual([
			[`${P1}#definition-1`, 2],
			[`${P1}#theorem-1`, 1],
		]);
	});

	test("leaves out a page's own environments", () => {
		const needs = prerequisites(graph, P2);
		expect(needs.map(({ node }) => node.id)).toEqual([
			`${P1}#definition-1`,
			`${P1}#theorem-1`,
		]);
	});
});

describe("relationsOf", () => {
	test("sorts by relation order, then reading order", () => {
		const names = relationsOf(graph, `${P1}#theorem-1`).map(
			({ name, node }) => `${name} ${node.id}`
		);
		expect(names).toEqual([
			`part_of ${P1}`,
			`uses ${P1}#definition-1`,
			`proved_by ${P1}#proof-1`,
			`proved_by ${P2}#proof-1`,
			`used_by ${P2}#lemma-1`,
			`recalled_by ${P2}`,
			`referenced_by ${P2}`,
		]);
	});
});

describe("envContext", () => {
	test("puts notes after the proofs", () => {
		const texts = envContext(requireNode(graph, `${P1}#theorem-1`), graph)
			.blocks.filter((block) => block.tier === "core")
			.map((block) => block.text.split("\n")[0]);
		expect(texts.slice(1)).toEqual([
			"Statement:",
			"Proof:",
			"Proof:",
			"Notes:",
		]);
	});
});
