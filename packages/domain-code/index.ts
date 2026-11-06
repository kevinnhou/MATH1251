import type { AskSpec, Domain } from "engine";

const CHECK = {
	task: "The student will send their own code. Do not write a solution first. Ask for their attempt, then review it against <context>: trace it on small and edge-case inputs, flag bugs, unhandled cases and unclear naming, and say what is correct.",
};

const IDEA = {
	check: CHECK,
	explain: {
		task: "Explain this idea: what it is, when to reach for it, how it works under the hood and which prerequisites it rests on. Show a short example. Then ask what the student would like to go deeper on.",
	},
	subject: "this idea",
} as const satisfies AskSpec;

const PROBLEM = {
	check: CHECK,
	explain: {
		task: "Work through this problem, explaining why each step of the code is the natural one and which concept from <context> it uses. Then ask what the student would like to explore further.",
	},
	quiz: {
		task: "Pose this problem as an exercise without revealing the solution. Offer one hint at a time when asked, then review the student's code against the solution in <context>.",
	},
	subject: "this problem",
} as const satisfies AskSpec;

export default {
	components: {
		Concept: {
			ask: IDEA,
			code: "CN",
			decoration: "underline",
			plural: "Concepts",
			role: "uses",
			style: "plain",
		},
		Example: {
			ask: PROBLEM,
			code: "EG",
			optionalSlug: true,
			plural: "Examples",
			role: "practises",
			style: "plain",
		},
		Exercise: {
			ask: PROBLEM,
			code: "EX",
			difficulties: ["warm-up", "core", "stretch"],
			plural: "Exercises",
			role: "practises",
			style: "plain",
		},
		Output: {},
		Pattern: {
			ask: IDEA,
			code: "PT",
			plural: "Patterns",
			role: "uses",
			style: "emphasis",
		},
		Pitfall: {
			ask: IDEA,
			code: "PF",
			decoration: "overline",
			plural: "Pitfalls",
			role: "uses",
			style: "plain",
		},
		Solution: {
			ask: {
				...IDEA,
				derive: {
					label: "Walk the solution",
					phrase: "Walk the solution to",
					selfPhrase: "Walk through",
					task: "Walk through the solution one step at a time. For each step, say what the code does, which concept or pattern from <context> it relies on and why it is the natural choice. Trace it on a small input, and after each key step check the student is following before you continue.",
				},
			},
			code: "SL",
			optionalSlug: true,
			plural: "Solutions",
			relation: { inverse: "Solved by", label: "Solves" },
			role: "derives",
			style: "subdued",
			untitled: true,
			untitledTitle: "Solution to {targets}",
		},
	},
} as const satisfies Domain;
