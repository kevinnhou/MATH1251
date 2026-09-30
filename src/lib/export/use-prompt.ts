import { useState, useSyncExternalStore } from "react";
import { openPrompt, prefetchContext } from "./client";
import type { PromptTarget } from "./model";
import {
	DEFAULT_INTENT,
	DEFAULT_PROVIDER,
	intentsFor,
	isLlmProvider,
	isPromptIntent,
	type LlmProvider,
} from "./prompt";

export interface BlockedPrompt {
	provider: LlmProvider;
	url: string;
}

function storedPreference<T extends string>(
	key: string,
	fallback: T,
	isValid: (value: unknown) => value is T
) {
	const listeners = new Set<() => void>();

	function read(): T {
		try {
			const stored = window.localStorage.getItem(key);
			return isValid(stored) ? stored : fallback;
		} catch {
			return fallback;
		}
	}

	function write(value: T) {
		try {
			window.localStorage.setItem(key, value);
		} catch {
			//
		}
		for (const listener of listeners) {
			listener();
		}
	}

	function subscribe(listener: () => void) {
		listeners.add(listener);
		window.addEventListener("storage", listener);
		return () => {
			listeners.delete(listener);
			window.removeEventListener("storage", listener);
		};
	}

	return {
		use: () => useSyncExternalStore(subscribe, read, () => fallback),
		write,
	};
}

const intentPreference = storedPreference(
	"export:intent",
	DEFAULT_INTENT,
	isPromptIntent
);
const providerPreference = storedPreference(
	"export:provider",
	DEFAULT_PROVIDER,
	isLlmProvider
);

export function usePrompt(target: PromptTarget) {
	const intents = intentsFor(target);
	const preferred = intentPreference.use();
	const intent = intents.includes(preferred) ? preferred : DEFAULT_INTENT;
	const provider = providerPreference.use();
	const [blocked, setBlocked] = useState<BlockedPrompt>();

	// Call straight from the click or keypress: `openPrompt` needs the gesture.
	function launch() {
		setBlocked(undefined);
		openPrompt({ intent, provider, target }).then((result) => {
			if (result.status === "blocked") {
				setBlocked({ provider, url: result.url });
			}
		});
	}

	return {
		blocked,
		dismissBlocked: () => setBlocked(undefined),
		intent,
		intents,
		launch,
		prefetch: () => prefetchContext(target.id),
		provider,
		setIntent: intentPreference.write,
		setProvider: providerPreference.write,
	};
}
