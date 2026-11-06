import type { AskSpec, Domain } from "engine";

const CHECK = {
	task: "The student will send their own attempt. Do not solve the problem first. Ask for their work, then check it line by line against <context>: flag missing hypotheses, invalid steps and gaps in justification, and say what is correct.",
};

const RESULT = {
	check: CHECK,
	explain: {
		task: "Explain this result: what it says, why it is true, which prerequisites it rests on and where it is used next. Work any derivation in full. Then ask what the student would like to go deeper on.",
	},
	subject: "this result",
} as const satisfies AskSpec;

export default {
	components: {
		Corollary: {
			ask: RESULT,
			code: "CR",
			plural: "Corollaries",
			role: "uses",
			style: "emphasis",
		},
		Definition: {
			ask: RESULT,
			code: "DF",
			decoration: "underline",
			plural: "Definitions",
			role: "uses",
			style: "plain",
		},
		Example: {
			ask: {
				check: CHECK,
				explain: {
					task: "Work through this example, explaining why each step is the natural one and which result from <context> it uses. Then ask what the student would like to explore further.",
				},
				quiz: {
					task: "Pose this example as an exercise without revealing the solution. Offer one hint at a time when asked, then check the student's answer against the worked solution in <context>.",
				},
				subject: "this example",
			},
			code: "EG",
			difficulties: ["challenge", "exam", "routine"],
			optionalSlug: true,
			plural: "Examples",
			role: "practises",
			style: "plain",
		},
		Lemma: {
			ask: RESULT,
			code: "LM",
			plural: "Lemmas",
			role: "uses",
			style: "emphasis",
		},
		Method: {
			ask: RESULT,
			code: "MT",
			decoration: "overline",
			plural: "Methods",
			role: "uses",
			style: "plain",
		},
		Proof: {
			ask: {
				...RESULT,
				derive: {
					label: "Walk the proof",
					phrase: "Walk the proof of",
					selfPhrase: "Walk through",
					task: "Walk through the proof one step at a time. For each step, name the definition or earlier result it uses (from <context> where possible) and why it applies. After each key step, check the student is following before you continue.",
				},
			},
			code: "PF",
			endMark: true,
			optionalSlug: true,
			plural: "Proofs",
			relation: { inverse: "Proved by", label: "Proves" },
			role: "derives",
			style: "subdued",
			untitled: true,
		},
		Proposition: {
			ask: RESULT,
			code: "PR",
			plural: "Propositions",
			role: "uses",
			style: "emphasis",
		},
		Theorem: {
			ask: RESULT,
			code: "TH",
			plural: "Theorems",
			role: "uses",
			style: "emphasis",
		},
	},
} as const satisfies Domain;
