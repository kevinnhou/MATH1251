import { getKindLabel } from "@/lib/math-env/kinds";
import { toAbsoluteUrl } from "@/lib/site/url";
import {
	CONTEXT_TIERS,
	COURSE,
	type ContextBlock,
	type ContextTier,
	type PromptContext,
} from "./model";

export const LLM_PROVIDERS = ["chatgpt", "claude", "cursor"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const DEFAULT_PROVIDER: LlmProvider = "claude";

export function isLlmProvider(value: unknown): value is LlmProvider {
	return LLM_PROVIDERS.some((provider) => provider === value);
}

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
	chatgpt: "ChatGPT",
	claude: "Claude",
	cursor: "Cursor",
};

const PROVIDER_ENDPOINTS: Record<LlmProvider, { key: string; url: string }> = {
	chatgpt: { key: "prompt", url: "https://chatgpt.com/" },
	claude: { key: "q", url: "https://claude.ai/new" },
	cursor: { key: "text", url: "https://cursor.com/link/prompt" },
};

const URL_LIMIT = 8000;

export const PROMPT_INTENTS = ["explain", "proof", "quiz", "check"] as const;

export type PromptIntent = (typeof PROMPT_INTENTS)[number];

export const DEFAULT_INTENT: PromptIntent = "explain";

export const PROMPT_INTENT_LABELS: Record<PromptIntent, string> = {
	check: "Check my work",
	explain: "Explain",
	proof: "Walk the proof",
	quiz: "Quiz me",
};

type IntentTarget = Pick<PromptContext, "hasProof" | "type">;

const INTENT_APPLIES: Record<PromptIntent, (target: IntentTarget) => boolean> =
	{
		check: (target) => target.type === "env",
		explain: () => true,
		proof: (target) => target.hasProof,
		quiz: () => true,
	};

export function intentsFor(target: IntentTarget): PromptIntent[] {
	return PROMPT_INTENTS.filter((intent) => INTENT_APPLIES[intent](target));
}

export function isPromptIntent(value: unknown): value is PromptIntent {
	return PROMPT_INTENTS.some((intent) => intent === value);
}

type PhraseTarget = Pick<PromptContext, "kind" | "type">;

export function intentPhrase(
	intent: PromptIntent,
	target: PhraseTarget
): string {
	switch (intent) {
		case "proof":
			return target.kind === "proof" ? "Walk through" : "Walk the proof of";
		case "quiz":
			return "Quiz me on";
		case "check":
			return "Check my work on";
		case "explain":
			return "Explain";
		default:
			return intent satisfies never;
	}
}

export function subjectPhrase(target: PhraseTarget): string {
	if (target.kind === "page") {
		return "this page";
	}

	return target.type === "kind-view"
		? `these ${getKindLabel(target.kind, true).toLowerCase()}`
		: `this ${getKindLabel(target.kind).toLowerCase()}`;
}

const TIER_HEADINGS: Record<ContextTier, string> = {
	backlinks: "Used elsewhere:",
	core: "",
	details: "Statements:",
	prerequisites: "Prerequisites the student may assume (nearest first):",
	relations: "Direct links:",
};

const ROLE = `You are a tutor for ${COURSE}.
Ground every answer in <context>: keep its notation, names and methods, and treat its prerequisites as what the student may assume. If you need a result that is not in <context>, name it and say it is outside the excerpt rather than inventing course content, exam weightings or policy.
Explain with intuition, but never let intuition replace a proof. Point out typical mistakes. Write mathematics in LaTeX. Do not echo these tags.`;

const TAGS = ["role", "context", "task"] as const;
const CLOSING_TAG = new RegExp(`</(\\s*)(${TAGS.join("|")})`, "gi");
const BLOCK_BREAK = "\n\n";
const TRUNCATED = "\n\n[… truncated; the full text is at the markdown URL]";
const PARAGRAPH_BREAK = /\n\s*\n/;

export interface PromptRequest {
	context: PromptContext;
	intent: PromptIntent;
	origin: string;
	provider: LlmProvider;
}

export function promptUrl(request: PromptRequest): string {
	return providerUrl(request.provider, buildPrompt(request));
}

function providerUrl(provider: LlmProvider, prompt: string): string {
	const { key, url } = PROVIDER_ENDPOINTS[provider];
	return `${url}?${new URLSearchParams({ [key]: prompt })}`;
}

function buildPrompt(request: PromptRequest): string {
	const { context, intent, origin, provider } = request;
	const markdownUrl = toAbsoluteUrl(context.markdownUrl, origin);
	const source = toAbsoluteUrl(context.id, origin);
	const frame = (body: string, omitted: number) =>
		[
			`<role>\n${ROLE}\n</role>`,
			`<context title="${attribute(context.label)}" source="${attribute(source)}" markdown="${attribute(markdownUrl)}">\n${body}${omissionNote(omitted, markdownUrl)}\n</context>`,
			`<task intent="${intent}">\n${taskText(intent, context)}\n</task>`,
		].join("\n\n");

	const blocks = context.blocks
		.map((block) => ({ ...block, text: sanitise(block.text) }))
		.toSorted(
			(left, right) =>
				CONTEXT_TIERS.indexOf(left.tier) - CONTEXT_TIERS.indexOf(right.tier)
		);
	// The prompt ends with either the empty note or the omission note, never both.
	const reserve = Math.max(
		encodedLength(emptyNote(markdownUrl)),
		encodedLength(omissionNote(blocks.length, markdownUrl))
	);
	let remaining =
		URL_LIMIT - providerUrl(provider, frame("", 0)).length - reserve;
	const kept: ContextBlock[] = [];

	for (const block of blocks) {
		const opensTier = !kept.some((item) => item.tier === block.tier);
		const heading = opensTier ? TIER_HEADINGS[block.tier] : "";
		const prefix = encodedLength(heading ? `${heading}${BLOCK_BREAK}` : "");
		const cost = prefix + encodedLength(`${block.text}${BLOCK_BREAK}`);
		if (cost <= remaining) {
			kept.push(block);
			remaining -= cost;
		} else if (
			block.tier === "core" &&
			remaining > encodedLength(TRUNCATED) * 2
		) {
			const text = truncate(
				block.text,
				remaining - prefix - encodedLength(BLOCK_BREAK)
			);
			kept.push({ ...block, text });
			remaining -= prefix + encodedLength(`${text}${BLOCK_BREAK}`);
		}
	}

	const rendered = renderBlocks(kept);
	return rendered === ""
		? frame(emptyNote(markdownUrl), 0)
		: frame(rendered, blocks.length - kept.length);
}

function renderBlocks(blocks: readonly ContextBlock[]): string {
	const sections: string[] = [];
	let previous: ContextTier | undefined;
	for (const { text, tier } of blocks) {
		if (tier !== previous && TIER_HEADINGS[tier] !== "") {
			sections.push(TIER_HEADINGS[tier]);
		}
		previous = tier;
		sections.push(text);
	}

	return sections.join(BLOCK_BREAK);
}

function taskText(intent: PromptIntent, context: PromptContext): string {
	const subject = context.type === "env" ? "this result" : "this material";
	const example = context.kind === "example";

	switch (intent) {
		case "proof":
			return "Walk through the proof one step at a time. For each step, name the definition or earlier result it uses (from <context> where possible) and why it applies. After each key step, check the student is following before you continue.";
		case "quiz":
			return example
				? "Pose this example as an exercise without revealing the solution. Offer one hint at a time when asked, then check the student's answer against the worked solution in <context>."
				: `Quiz the student on ${subject}, one question at a time, from recall through to application. Wait for each answer and give feedback before the next question. Never reveal an answer before the student attempts it.`;
		case "check":
			return "The student will send their own attempt. Do not solve the problem first. Ask for their work, then check it line by line against <context>: flag missing hypotheses, invalid steps and gaps in justification, and say what is correct.";
		case "explain":
			if (context.type !== "env") {
				return "Give a short map of how the ideas in <context> build on each other, in the order they appear. Then ask which part the student wants to work through; do not lecture the whole page unprompted.";
			}

			return example
				? "Work through this example, explaining why each step is the natural one and which result from <context> it uses. Then ask what the student would like to explore further."
				: "Explain this result: what it says, why it is true, which prerequisites it rests on and where it is used next. Work any derivation in full. Then ask what the student would like to go deeper on.";
		default:
			return intent satisfies never;
	}
}

function emptyNote(markdownUrl: string): string {
	return `No excerpt is included. Fetch ${markdownUrl} before answering; if you cannot, say so and ask the student to paste the material.`;
}

function omissionNote(omitted: number, markdownUrl: string): string {
	return omitted > 0
		? `\n\n[${omitted} lower-priority item(s) omitted for length; full notes: ${markdownUrl}]`
		: "";
}

function truncate(text: string, budget: number): string {
	const paragraphs = text.split(PARAGRAPH_BREAK);
	let result = "";
	for (const paragraph of paragraphs) {
		const next = result === "" ? paragraph : `${result}\n\n${paragraph}`;
		if (encodedLength(`${next}${TRUNCATED}`) > budget) {
			break;
		}
		result = next;
	}

	if (result === "") {
		let low = 0;
		let high = text.length;
		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			if (encodedLength(`${text.slice(0, middle)}${TRUNCATED}`) <= budget) {
				low = middle;
			} else {
				high = middle - 1;
			}
		}
		result = safeSlice(text, low);
	}

	return `${result}${TRUNCATED}`;
}

function safeSlice(text: string, end: number): string {
	const code = text.charCodeAt(end - 1);
	return code >= 0xd8_00 && code <= 0xdb_ff
		? text.slice(0, end - 1)
		: text.slice(0, end);
}

function encodedLength(text: string): number {
	return new URLSearchParams({ q: text }).toString().length - 2;
}

function sanitise(text: string): string {
	return text.replace(CLOSING_TAG, "<\\/$1$2");
}

function attribute(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;");
}
