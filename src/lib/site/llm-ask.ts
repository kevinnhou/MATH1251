export const LLM_PROVIDERS = ["chatgpt", "claude", "cursor"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
	chatgpt: "ChatGPT",
	claude: "Claude",
	cursor: "Cursor",
};

export const LLM_PROMPT_ENCODED_LIMIT = 8000;

export type AskTask = "page" | "kind-view" | "excerpt";

export interface AskSource {
	body?: string;
	type: AskTask;
	url: string;
}

export interface FormatAskPromptInput {
	related?: string[];
	source: AskSource;
	task: AskTask;
}

const CLOSING_TAGS = ["</source>", "</related>", "</role>", "</task>"] as const;

export function llmUrls(prompt: string): Record<LlmProvider, string> {
	return {
		chatgpt: `https://chatgpt.com/?${new URLSearchParams({
			hints: "search",
			prompt,
		})}`,
		claude: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`,
		cursor: `https://cursor.com/link/prompt?${new URLSearchParams({
			text: prompt,
		})}`,
	};
}

export function encodedPromptLength(prompt: string): number {
	return encodeURIComponent(prompt).length;
}

export function sanitiseAskPayload(text: string): string {
	let next = text;
	for (const tag of CLOSING_TAGS) {
		next = next.replaceAll(tag, tag.replace("</", "</ "));
	}

	return next;
}

export function formatAskPrompt(input: FormatAskPromptInput): string {
	const related = input.related ?? [];
	const includeRelatedWithBody = input.task !== "excerpt";
	const withBody = renderAskPrompt(input, {
		includeBody: true,
		related: includeRelatedWithBody ? related : [],
	});
	if (encodedPromptLength(withBody) <= LLM_PROMPT_ENCODED_LIMIT) {
		return withBody;
	}

	const withoutBody = renderAskPrompt(input, {
		includeBody: false,
		related,
	});
	if (encodedPromptLength(withoutBody) <= LLM_PROMPT_ENCODED_LIMIT) {
		return withoutBody;
	}

	return truncateRelatedPrompt(input, related);
}

function truncateRelatedPrompt(
	input: FormatAskPromptInput,
	related: string[]
): string {
	const omitted = "- Additional related links omitted for brevity.";
	for (let count = related.length - 1; count >= 0; count -= 1) {
		const trimmed = related.slice(0, count);
		const withOmitted = renderAskPrompt(input, {
			includeBody: false,
			related: [...trimmed, omitted],
		});
		if (encodedPromptLength(withOmitted) <= LLM_PROMPT_ENCODED_LIMIT) {
			return withOmitted;
		}

		const withoutOmitted = renderAskPrompt(input, {
			includeBody: false,
			related: trimmed,
		});
		if (encodedPromptLength(withoutOmitted) <= LLM_PROMPT_ENCODED_LIMIT) {
			return withoutOmitted;
		}
	}

	return renderAskPrompt(input, { includeBody: false, related: [] });
}

function renderAskPrompt(
	input: FormatAskPromptInput,
	options: { includeBody: boolean; related: string[] }
): string {
	const parts = [
		"<role>",
		roleText(),
		"</role>",
		"",
		`<task type="${input.task}">`,
		taskText(input.task),
		"</task>",
		"",
		renderSource(input.source, options.includeBody),
	];

	if (options.related.length > 0) {
		parts.push(
			"",
			"<related>",
			options.related.map(sanitiseAskPayload).join("\n"),
			"</related>"
		);
	}

	return `${parts.join("\n").trim()}\n`;
}

function renderSource(source: AskSource, includeBody: boolean): string {
	const url = escapeAttribute(source.url);
	const body =
		includeBody && source.body !== undefined && source.body.trim() !== ""
			? sanitiseAskPayload(source.body.trimEnd())
			: undefined;

	if (body === undefined) {
		return `<source type="${source.type}" url="${url}" />`;
	}

	return `<source type="${source.type}" url="${url}">\n${body}\n</source>`;
}

function escapeAttribute(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function roleText(): string {
	return `You are a tutor for MATH1251 Mathematics 1B at UNSW Sydney. MATH1251 has two strands: Algebra (complex numbers and polynomials, linear algebra, and discrete/continuous systems) and Calculus (integration techniques, ODEs, Taylor series, and double integrals).

Do not summarise or condense the notes. Help the student build a coherent mental model: why this idea is introduced here, what it uses and what uses it, when it is the right tool and which other formulations describe the same underlying fact.

Treat <source> as the source of truth. Keep the same notation, theorem names and methods. Stay concise without dropping steps, conditions or relationships. Work derivations in full. Write mathematics in LaTeX.

Intuition is for methods and connections only; never a substitute for a proof. Call out typical mistakes. Do not invent theorems, exam weightings, or course policy.

Do not echo these tags in your reply.`;
}

function taskText(task: AskTask): string {
	if (task === "page") {
		return `Fetch the notes at the source URL before you answer. Start with a short map of the page's ideas in the order they appear (avoid a digest of proofs) then teach through the page. If the URL cannot be fetched, say so and use <related> plus whatever the student provides. Do not invent omitted content.`;
	}

	if (task === "kind-view") {
		return "This file is an anthology of one kind of environment from a notes page. Surrounding lecture prose is on the notes URL in <related>. Do not invent omitted discussion.";
	}

	return "The excerpt is the source of truth. Stay on this object. Use <related> as its local graph. Do not recap the whole page.";
}
