import type { EnvPack } from "@/lib/mdx-env/pack";

export const mathEnv = {
	derivation: {
		intent: "proof",
		label: "Walk the proof",
		phrase: "Walk the proof of",
		selfPhrase: "Walk through",
		task: "Walk through the proof one step at a time. For each step, name the definition or earlier result it uses (from <context> where possible) and why it applies. After each key step, check the student is following before you continue.",
	},
	difficulties: ["challenge", "exam", "routine"],
	kinds: {
		corollary: {
			code: "CR",
			label: "Corollary",
			of: "uses",
			plural: "Corollaries",
			style: "emphasis",
		},
		definition: {
			code: "DF",
			decoration: "underline",
			label: "Definition",
			of: "uses",
			plural: "Definitions",
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
		lemma: {
			code: "LM",
			label: "Lemma",
			of: "uses",
			plural: "Lemmas",
			style: "emphasis",
		},
		method: {
			code: "MT",
			decoration: "overline",
			label: "Method",
			of: "uses",
			plural: "Methods",
			style: "plain",
		},
		proof: {
			code: "PF",
			endMark: true,
			label: "Proof",
			of: "proves",
			optionalSlug: true,
			plural: "Proofs",
			style: "subdued",
			untitled: true,
		},
		proposition: {
			code: "PR",
			label: "Proposition",
			of: "uses",
			plural: "Propositions",
			style: "emphasis",
		},
		theorem: {
			code: "TH",
			label: "Theorem",
			of: "uses",
			plural: "Theorems",
			style: "emphasis",
		},
	},
	prompts: {
		check:
			"The student will send their own attempt. Do not solve the problem first. Ask for their work, then check it line by line against <context>: flag missing hypotheses, invalid steps and gaps in justification, and say what is correct.",
		explain:
			"Explain this result: what it says, why it is true, which prerequisites it rests on and where it is used next. Work any derivation in full. Then ask what the student would like to go deeper on.",
		explainPractice:
			"Work through this example, explaining why each step is the natural one and which result from <context> it uses. Then ask what the student would like to explore further.",
		quizPractice:
			"Pose this example as an exercise without revealing the solution. Offer one hint at a time when asked, then check the student's answer against the worked solution in <context>.",
		subject: "this result",
	},
	summary:
		"Lecture notes as a graph of pages and math environments (definitions, theorems, proofs, examples, …) linked by typed relations.",
} as const satisfies EnvPack;
