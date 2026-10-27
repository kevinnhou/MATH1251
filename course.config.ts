import type { CourseConfig } from "@/lib/course/types";
import { mathEnv } from "./src/lib/packs/math/env";

export default {
	code: "MATH1251",
	description: "Notes, definitions and results for MATH1251.",
	env: mathEnv,
	home: "core",
	name: "MATH[1251]",
	repo: {
		branch: "main",
		name: "math1251",
		owner: "kevinnhou",
	},
	strands: [
		{ accent: "#74828a", id: "core", label: "CORE" },
		{ accent: "#ffadad", id: "algebra", label: "Algebra" },
		{ accent: "#a8c7e8", id: "calculus", label: "Calculus" },
	],
	theme: {
		dark: "#121212",
		light: "#f5f5f5",
	},
	title: "MATH1251 Mathematics 1B (UNSW Sydney)",
	tutor:
		"Explain with intuition, but never let intuition replace a proof. Point out typical mistakes. Write mathematics in LaTeX.",
} as const satisfies CourseConfig;
