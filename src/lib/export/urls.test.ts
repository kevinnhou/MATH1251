import { describe, expect, test } from "bun:test";
import {
	nodeContextUrl,
	nodeFileName,
	nodeFileSegments,
	nodeMarkdownUrl,
	parseNodeFile,
} from "./urls";

const IDS = [
	"/algebra/complex-numbers/complex-polynomials",
	"/algebra/complex-numbers/complex-polynomials#theorem-1",
	"/algebra/complex-numbers/complex-polynomials/proofs",
];

describe("node files", () => {
	for (const id of IDS) {
		test(`round-trips ${id}`, () => {
			for (const format of ["markdown", "context"] as const) {
				expect(parseNodeFile(nodeFileSegments(id, format), format)).toBe(id);
			}
		});
	}

	test("names a page's file content", () => {
		expect(nodeMarkdownUrl("/algebra/x")).toBe(
			"/llms.mdx/docs/algebra/x/content.md"
		);
		expect(nodeContextUrl("/algebra/x#thm-y")).toBe(
			"/llms.mdx/context/algebra/x/thm-y.json"
		);
	});

	test("rejects the reserved anchor", () => {
		expect(() => nodeFileSegments("/algebra/x#content", "markdown")).toThrow();
	});

	test("rejects files in the other format or with no name", () => {
		expect(parseNodeFile(["algebra", "x", "content.json"], "markdown")).toBe(
			undefined
		);
		expect(parseNodeFile(["algebra", ".md"], "markdown")).toBe(undefined);
		expect(parseNodeFile([], "markdown")).toBe(undefined);
	});

	test("flattens the download name", () => {
		expect(nodeFileName("/a/b#thm-x", "markdown")).toBe("a-b-thm-x.md");
	});
});
