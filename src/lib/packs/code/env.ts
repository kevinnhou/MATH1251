import type { EnvPack } from "@/lib/mdx-env/pack";

export const codeEnv = {
	derivation: {
		intent: "solution",
		label: "Walk the solution",
		phrase: "Walk the solution to",
		selfPhrase: "Walk through",
		task: "Walk through the solution one step at a time. For each step, say what the code does, which concept or pattern from <context> it relies on and why it is the natural choice. Trace it on a small input, and after each key step check the student is following before you continue.",
	},
	difficulties: ["warm-up", "core", "stretch"],
	kinds: {
		concept: {
			code: "CN",
			decoration: "underline",
			label: "Concept",
			of: "uses",
			plural: "Concepts",
			style: "plain",
		},
		example: {
			code: "EG",
			label: "Example",
			of: "practises",
			optionalSlug: true,
			plural: "Examples",
			style: "plain",
		},
		exercise: {
			code: "EX",
			label: "Exercise",
			of: "practises",
			plural: "Exercises",
			style: "plain",
		},
		pattern: {
			code: "PT",
			label: "Pattern",
			of: "uses",
			plural: "Patterns",
			style: "emphasis",
		},
		pitfall: {
			code: "PF",
			decoration: "overline",
			label: "Pitfall",
			of: "uses",
			plural: "Pitfalls",
			style: "plain",
		},
		solution: {
			code: "SL",
			label: "Solution",
			of: "proves",
			optionalSlug: true,
			plural: "Solutions",
			style: "subdued",
			untitled: true,
		},
	},
	prompts: {
		check:
			"The student will send their own code. Do not write a solution first. Ask for their attempt, then review it against <context>: trace it on small and edge-case inputs, flag bugs, unhandled cases and unclear naming, and say what is correct.",
		explain:
			"Explain this idea: what it is, when to reach for it, how it works under the hood and which prerequisites it rests on. Show a short example. Then ask what the student would like to go deeper on.",
		explainPractice:
			"Work through this problem, explaining why each step of the code is the natural one and which concept from <context> it uses. Then ask what the student would like to explore further.",
		quizPractice:
			"Pose this problem as an exercise without revealing the solution. Offer one hint at a time when asked, then review the student's code against the solution in <context>.",
		subject: "this idea",
	},
	summary:
		"Course notes as a graph of pages and code environments (concepts, patterns, exercises, solutions, …) linked by typed relations.",
} as const satisfies EnvPack;
