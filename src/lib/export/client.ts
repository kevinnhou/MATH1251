import { fetchText } from "@/lib/client/actions";
import {
	CONTEXT_TIERS,
	PROMPT_TARGET_TYPES,
	type PromptContext,
	type PromptTarget,
} from "./model";
import {
	LLM_PROVIDER_LABELS,
	type LlmProvider,
	type PromptIntent,
	promptUrl,
} from "./prompt";
import { nodeContextUrl, nodeMarkdownUrl } from "./urls";

const FETCH_TIMEOUT_MS = 8000;
const PROMPT_WAIT_MS = 3000;

const markdown = new Map<string, Promise<string>>();
const contexts = new Map<string, Promise<PromptContext>>();

export function loadMarkdown(id: string): Promise<string> {
	return cached(markdown, id, () => fetchExport(nodeMarkdownUrl(id)));
}

function loadContext(id: string): Promise<PromptContext> {
	return cached(contexts, id, async () =>
		parsePromptContext(await fetchExport(nodeContextUrl(id)))
	);
}

export function loadPromptContext(
	target: PromptTarget
): Promise<PromptContext> {
	return loadContext(target.id).catch(() => fallbackContext(target));
}

function fallbackContext(target: PromptTarget): PromptContext {
	return { ...target, blocks: [], markdownUrl: nodeMarkdownUrl(target.id) };
}

export function prefetchContext(id: string) {
	loadContext(id).catch(() => undefined);
}

export function prefetchMarkdown(id: string) {
	loadMarkdown(id).catch(() => undefined);
}

export interface OpenPromptRequest {
	intent: PromptIntent;
	provider: LlmProvider;
	target: PromptTarget;
}

export type OpenPromptResult =
	| { status: "opened" }
	| { status: "blocked"; url: string };

export async function openPrompt(
	request: OpenPromptRequest
): Promise<OpenPromptResult> {
	const popup = window.open("about:blank", "_blank");
	if (popup !== null) {
		showPending(popup, request.provider);
	}
	const context = await Promise.race([
		loadPromptContext(request.target),
		new Promise<PromptContext>((resolve) =>
			window.setTimeout(
				() => resolve(fallbackContext(request.target)),
				PROMPT_WAIT_MS
			)
		),
	]);
	const url = promptUrl({
		context,
		intent: request.intent,
		origin: window.location.origin,
		provider: request.provider,
	});

	if (popup === null || popup.closed) {
		return { status: "blocked", url };
	}

	popup.opener = null;
	popup.location.replace(url);
	return { status: "opened" };
}

// The new tab starts on the opener's origin, so it can say what it's waiting
// for instead of sitting blank while the context loads.
function showPending(popup: Window, provider: LlmProvider) {
	try {
		const label = LLM_PROVIDER_LABELS[provider];
		const { body } = popup.document;
		popup.document.title = `Opening ${label}…`;
		body.style.cssText =
			"margin:2rem;font:13px/1.5 ui-monospace,monospace;color-scheme:light dark";
		body.textContent = `Preparing the prompt for ${label}…`;
	} catch {
		// Not writable in this browser; the tab stays blank until it redirects.
	}
}

function fetchExport(url: string): Promise<string> {
	return fetchText(url, AbortSignal.timeout(FETCH_TIMEOUT_MS));
}

function parsePromptContext(text: string): PromptContext {
	const value: unknown = JSON.parse(text);
	if (!isPromptContext(value)) {
		throw new Error("Malformed prompt context.");
	}

	return value;
}

function isPromptContext(value: unknown): value is PromptContext {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.label === "string" &&
		typeof value.markdownUrl === "string" &&
		typeof value.kind === "string" &&
		typeof value.hasProof === "boolean" &&
		PROMPT_TARGET_TYPES.some((type) => type === value.type) &&
		Array.isArray(value.blocks) &&
		value.blocks.every(
			(block) =>
				isRecord(block) &&
				typeof block.text === "string" &&
				CONTEXT_TIERS.some((tier) => tier === block.tier)
		)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function cached<T>(
	store: Map<string, Promise<T>>,
	id: string,
	load: () => Promise<T>
): Promise<T> {
	let pending = store.get(id);
	if (pending === undefined) {
		pending = load();
		store.set(id, pending);
		pending.catch(() => store.delete(id));
	}

	return pending;
}
