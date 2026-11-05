import { course } from "@/lib/course/config";
import type {
	AskSpec,
	AskWording,
	DeriveWording,
	EnvConfig,
	Role,
} from "@/lib/mdx-env/component";
import { getEnvConfig, getKindLabel } from "@/lib/mdx-env/kinds";
import type { PromptTarget } from "@/lib/mdx-env/target";
import { toAbsoluteUrl } from "@/lib/url";
import { CONTEXT_TIERS, type ContextTier, type PromptContext } from "./model";
import { nodeMarkdownUrl } from "./urls";

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

export const PROMPT_INTENTS = ["explain", "derive", "quiz", "check"] as const;

export type PromptIntent = (typeof PROMPT_INTENTS)[number];

export const DEFAULT_INTENT: PromptIntent = "explain";

interface TaskInput {
	ask?: AskSpec;
	context: PromptContext;
	own?: AskWording;
	role?: Role;
}

interface IntentSpec {
	applies: (target: PromptTarget) => boolean;
	label: string;
	phrase: string;
	task: (input: TaskInput) => string;
	threadTask?: string;
}

const ROLE_DEFAULTS: Record<Role, { explain: string; subject: string }> = {
	derives: {
		explain:
			"Explain this derivation: what it establishes, the idea behind each step and which prerequisites it rests on. Then ask what the student would like to go deeper on.",
		subject: "this derivation",
	},
	practises: {
		explain:
			"Work through this problem, explaining why each step is the natural one and which idea from <context> it uses. Then ask what the student would like to explore further.",
		subject: "this problem",
	},
	uses: {
		explain:
			"Explain this idea: what it says, why it holds, which prerequisites it rests on and where it is used next. Then ask what the student would like to go deeper on.",
		subject: "this idea",
	},
};

const DEFAULT_CHECK =
	"The student will send their own attempt. Do not answer it yourself first. Ask for their work, then check it step by step against <context>: flag errors and gaps, and say what is correct.";

const DEFAULT_DERIVE =
	"Walk through the derivation one step at a time. For each step, name the idea it uses (from <context> where possible) and why it applies. After each key step, check the student is following before you continue.";

const DEFAULT_QUIZ_PRACTICE =
	"Pose this problem as an exercise without revealing the solution. Offer one hint at a time when asked, then check the student's answer against the worked solution in <context>.";

const PAGE_MAP =
	"Give a short map of how the ideas in <context> build on each other, in the order they appear. Then ask which part the student wants to work through; do not lecture the whole page unprompted.";

const THREAD_TOUR =
	"<context> is a thread: one idea the course meets in several places. First state the shared idea in plain words and the intuition for why it keeps appearing. Then go through the places in order: for each, say what plays each part of the idea there, using its role and statement, and how it connects to the previous place. Say where the analogy stops working. End with a short summary of the common pattern, then ask which connection the student wants to explore.";

const THREAD_QUIZ =
	"Quiz the student on the links between the places in <context>, one question at a time: name a setting and ask what plays each part of the shared idea there, or give two places and ask what carries over and what changes. Wait for each answer and give feedback before the next question.";

function quizTask(subject: string): string {
	return `Quiz the student on ${subject}, one question at a time, from recall through to application. Wait for each answer and give feedback before the next question. Never reveal an answer before the student attempts it.`;
}

const PROMPT_INTENT_SPECS: Record<PromptIntent, IntentSpec> = {
	check: {
		applies: (target) => target.type === "env",
		label: "Check my work",
		phrase: "Check my work on",
		task: ({ own }) => own?.task ?? DEFAULT_CHECK,
	},
	derive: {
		applies: (target) => target.derivation !== undefined,
		label: "Walk through",
		phrase: "Walk through",
		task: ({ own }) => own?.task ?? DEFAULT_DERIVE,
	},
	explain: {
		applies: () => true,
		label: "Explain",
		phrase: "Explain",
		task: ({ context, own, role }) =>
			context.type === "env" && role !== undefined
				? (own?.task ?? ROLE_DEFAULTS[role].explain)
				: PAGE_MAP,
	},
	quiz: {
		applies: () => true,
		label: "Quiz me",
		phrase: "Quiz me on",
		task: ({ ask, context, own, role }) => {
			if (role === "practises") {
				return own?.task ?? DEFAULT_QUIZ_PRACTICE;
			}

			return context.type === "env" && role !== undefined
				? (own?.task ?? quizTask(ask?.subject ?? ROLE_DEFAULTS[role].subject))
				: quizTask("this material");
		},
		threadTask: THREAD_QUIZ,
	},
};

function envConfigOf(target: PromptTarget): EnvConfig | undefined {
	return target.kind === "page" || target.kind === "thread"
		? undefined
		: getEnvConfig(target.kind);
}

function ownWording(
	intent: PromptIntent,
	target: PromptTarget
): DeriveWording | undefined {
	if (intent !== "derive") {
		return envConfigOf(target)?.ask?.[intent];
	}

	return target.derivation === undefined
		? undefined
		: getEnvConfig(target.derivation).ask?.derive;
}

export function intentLabel(
	intent: PromptIntent,
	target?: PromptTarget
): string {
	const { label } = PROMPT_INTENT_SPECS[intent];
	return target === undefined
		? label
		: (ownWording(intent, target)?.label ?? label);
}

export function intentPhrase(
	intent: PromptIntent,
	target: PromptTarget
): string {
	const own = ownWording(intent, target);
	const phrase =
		intent === "derive" && target.derivation === target.kind
			? own?.selfPhrase
			: own?.phrase;
	return phrase ?? PROMPT_INTENT_SPECS[intent].phrase;
}

export function intentFromWord(word: string): PromptIntent | undefined {
	const lower = word.toLowerCase();
	return isPromptIntent(lower) ? lower : undefined;
}

export function intentsFor(target: PromptTarget): PromptIntent[] {
	return PROMPT_INTENTS.filter((intent) =>
		PROMPT_INTENT_SPECS[intent].applies(target)
	);
}

export function isPromptIntent(value: unknown): value is PromptIntent {
	return PROMPT_INTENTS.some((intent) => intent === value);
}

export function subjectPhrase(target: PromptTarget): string {
	if (target.kind === "page") {
		return "this page";
	}

	if (target.kind === "thread") {
		return "this thread";
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

const ROLE = `You are a tutor for ${course.title}.
Ground every answer in <context>: keep its notation, names and methods, and treat its prerequisites as what the student may assume. If you need an idea or result that is not in <context>, name it and say it is outside the excerpt rather than inventing course content, exam weightings or policy.
${course.tutor} Do not echo these tags.`;

const TAGS = ["role", "context", "task"] as const;
const CLOSING_TAG = new RegExp(`</(\\s*)(${TAGS.join("|")})`, "gi");
const BLOCK_BREAK = "\n\n";
const TRUNCATED = "\n\n[… truncated; the full text is at the markdown URL]";
const PARAGRAPH_BREAK = /\n\s*\n/;
const TRUNCATION_FLOOR =
	encodedLength(BLOCK_BREAK) + encodedLength(TRUNCATED) * 2;

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
	const markdownUrl = toAbsoluteUrl(nodeMarkdownUrl(context.id), origin);
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
	const reserve = Math.max(
		encodedLength(emptyNote(markdownUrl)),
		encodedLength(omissionNote(blocks.length, markdownUrl))
	);
	let remaining =
		URL_LIMIT - providerUrl(provider, frame("", 0)).length - reserve;
	const sections: string[] = [];
	let kept = 0;
	let openTier: ContextTier | undefined;

	for (const block of blocks) {
		const heading = block.tier === openTier ? "" : TIER_HEADINGS[block.tier];
		const prefix = encodedLength(heading ? `${heading}${BLOCK_BREAK}` : "");
		const fits =
			prefix + encodedLength(`${block.text}${BLOCK_BREAK}`) <= remaining;
		const truncatable =
			block.tier === "core" && remaining > prefix + TRUNCATION_FLOOR;
		if (!(fits || truncatable)) {
			continue;
		}

		const text = fits
			? block.text
			: truncate(block.text, remaining - prefix - encodedLength(BLOCK_BREAK));
		remaining -= prefix + encodedLength(`${text}${BLOCK_BREAK}`);
		sections.push(...(heading ? [heading] : []), text);
		openTier = block.tier;
		kept += 1;
	}

	return kept === 0
		? frame(emptyNote(markdownUrl), 0)
		: frame(sections.join(BLOCK_BREAK), blocks.length - kept);
}

function taskText(intent: PromptIntent, context: PromptContext): string {
	const spec = PROMPT_INTENT_SPECS[intent];
	if (context.type === "thread") {
		return spec.threadTask ?? THREAD_TOUR;
	}

	const config = envConfigOf(context);
	return spec.task({
		ask: config?.ask,
		context,
		own: ownWording(intent, context),
		role: config?.role,
	});
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
