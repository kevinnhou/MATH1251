"use client";

import { usePathname, useRouter } from "fumadocs-core/framework";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useGraph } from "@/components/graph/provider";
import {
	type GraphRuntime,
	unavailableGraphRuntime,
} from "@/lib/graph/runtime";
import { completeLine, coreDescriptors } from "@/lib/terminal/commands";
import { emptyHistory, loadHistory } from "@/lib/terminal/history";
import {
	emptySurface,
	leaveOutput,
	paneTarget,
	setDraft,
	showOutput,
	type TerminalSurface,
} from "@/lib/terminal/mode";
import { announce } from "@/lib/terminal/output";
import { currentPagesFromUrl } from "@/lib/terminal/pages";
import { parseLine } from "@/lib/terminal/parse";
import { createRegistry } from "@/lib/terminal/registry";
import type {
	Completion,
	PageCatalog,
	TerminalOutput,
} from "@/lib/terminal/types";
import {
	executeTerminalLine,
	handlePromptKey,
	handleWindowKey,
	handleWindowPaste,
} from "./handlers";

export interface TerminalApi {
	clearInspectOutput: () => void;
	focusPrompt: (options?: { expand?: boolean }) => void;
	publishOutput: (output: TerminalOutput, echo?: string) => void;
}

export interface TerminalViewValue {
	closeDrawerAfter: number;
	completionListId: string;
	completions: Completion[];
	current: ReturnType<typeof currentPagesFromUrl>;
	focusEpoch: number;
	focusedEpochRef: RefObject<number>;
	focusPrompt: (options?: { expand?: boolean }) => void;
	hadOutput: boolean;
	hintId: string;
	inputRef: RefObject<HTMLInputElement | null>;
	liveMessage: string;
	onPromptKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
	outputRef: RefObject<HTMLDivElement | null>;
	pane: "output" | "tree";
	selectedCompletion: number;
	setInput: (nextInput: string) => void;
	surface: TerminalSurface;
}

const TerminalApiContext = createContext<TerminalApi | null>(null);
const TerminalViewContext = createContext<TerminalViewValue | null>(null);

export function useTerminalApi(): TerminalApi {
	const value = useContext(TerminalApiContext);
	if (!value) {
		throw new Error("useTerminalApi must be used within TerminalProvider.");
	}

	return value;
}

export function useTerminal(): TerminalViewValue & TerminalApi {
	const view = useContext(TerminalViewContext);
	const api = useContext(TerminalApiContext);
	if (!(view && api)) {
		throw new Error("useTerminal must be used within TerminalProvider.");
	}

	return { ...view, ...api };
}

export function TerminalProvider({
	catalog,
	children,
}: {
	catalog: PageCatalog;
	children: ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const routeUrl = pathname || "/core";
	const inputRef = useRef<HTMLInputElement>(null);
	const outputRef = useRef<HTMLDivElement>(null);
	const [registry] = useState(() => createRegistry(coreDescriptors()));
	const registryRef = useRef(registry);
	const generationRef = useRef(0);
	const abortRef = useRef<AbortController | null>(null);
	const retainUrlRef = useRef<string | null>(null);
	const pathRef = useRef(routeUrl);
	const frozenCompletions = useRef<Completion[] | null>(null);
	const surfaceRef = useRef(emptySurface());
	const focusedEpochRef = useRef(0);
	const graph = useGraph();
	const graphRef = useRef<GraphRuntime>(unavailableGraphRuntime(routeUrl));
	const hintId = useId();
	const completionListId = useId();
	const [surface, setSurface] = useState(emptySurface);
	const [history, setHistory] = useState(emptyHistory);
	const [selectedCompletion, setSelectedCompletion] = useState(0);
	const [focusEpoch, setFocusEpoch] = useState(0);
	const [hadOutput, setHadOutput] = useState(false);
	const [liveMessage, setLiveMessage] = useState("");
	const [closeDrawerAfter, setCloseDrawerAfter] = useState(0);
	const current = useMemo(
		() => currentPagesFromUrl(catalog, routeUrl),
		[catalog, routeUrl]
	);
	surfaceRef.current = surface;
	graphRef.current = graph;

	useEffect(() => {
		setHistory((currentHistory) => ({
			...currentHistory,
			entries: loadHistory(),
		}));
	}, []);

	useEffect(() => {
		if (pathRef.current === routeUrl) {
			return;
		}

		pathRef.current = routeUrl;
		if (retainUrlRef.current === routeUrl) {
			retainUrlRef.current = null;
			return;
		}

		generationRef.current += 1;
		abortRef.current?.abort();
		frozenCompletions.current = null;
		setSurface(emptySurface());
	}, [routeUrl]);

	useEffect(
		() => () => {
			generationRef.current += 1;
			abortRef.current?.abort();
		},
		[]
	);

	useEffect(() => {
		if (surface.mode === "output") {
			setHadOutput(true);
		}
	}, [surface.mode]);

	const parsed = useMemo(() => parseLine(surface.input), [surface.input]);
	const completions = useMemo(() => {
		if (!surface.completionsOpen) {
			return [];
		}

		if (frozenCompletions.current) {
			return frozenCompletions.current;
		}

		return completeLine(
			parsed,
			catalog,
			current,
			registryRef.current,
			graphRef.current
		);
	}, [catalog, current, parsed, surface.completionsOpen]);

	useEffect(() => {
		if (surface.mode === "output" || !surface.completionsOpen) {
			return;
		}

		if (completions.length === 0) {
			return;
		}

		setLiveMessage(
			`${completions.length} completion${completions.length === 1 ? "" : "s"}`
		);
	}, [completions, surface.completionsOpen, surface.mode]);

	const publishOutput = useCallback((output: TerminalOutput, echo?: string) => {
		setSurface(showOutput(emptySurface(), output, echo ?? ""));
		setLiveMessage(announce(output, echo));
	}, []);

	const clearInspectOutput = useCallback(() => {
		setSurface((currentSurface) => {
			if (currentSurface.output?.kind !== "inspect") {
				return currentSurface;
			}

			return emptySurface();
		});
	}, []);

	const setInput = useCallback((nextInput: string) => {
		frozenCompletions.current = null;
		setSelectedCompletion(0);
		setHistory((currentHistory) => ({ ...currentHistory, cursor: null }));
		setSurface((currentSurface) => setDraft(currentSurface, nextInput));
	}, []);

	const focusPrompt = useCallback((options?: { expand?: boolean }) => {
		if (options?.expand !== false) {
			setFocusEpoch((epoch) => epoch + 1);
		}

		setSurface((currentSurface) => {
			if (currentSurface.mode !== "output") {
				return currentSurface;
			}

			return leaveOutput(currentSurface, currentSurface.input);
		});
		queueMicrotask(() => inputRef.current?.focus());
	}, []);

	const runLine = useCallback(
		async (raw?: string) => {
			frozenCompletions.current = null;
			await executeTerminalLine(raw ?? surface.input, {
				abortRef,
				catalog,
				current,
				generationRef,
				graph: graphRef.current,
				historyEntries: history.entries,
				publishOutput,
				registry: registryRef.current,
				retainUrlRef,
				routerPush: (url) => {
					router.push(url);
				},
				setCloseDrawerAfter,
				setHistory,
				setLiveMessage,
				setSurface,
			});
		},
		[catalog, current, history.entries, publishOutput, router, surface.input]
	);

	const onPromptKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			handlePromptKey({
				completions,
				event,
				frozenCompletions,
				history,
				inputRef,
				parsed,
				runLine,
				selectedCompletion,
				setHistory,
				setSelectedCompletion,
				setSurface,
				surface,
			});
		},
		[completions, history, parsed, runLine, selectedCompletion, surface]
	);

	const focusPromptRef = useRef(focusPrompt);
	const setInputRef = useRef(setInput);
	focusPromptRef.current = focusPrompt;
	setInputRef.current = setInput;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			handleWindowKey({
				event,
				focusPrompt: focusPromptRef.current,
				inputRef,
				outputRoot: outputRef.current,
				setHistory,
				setInput: setInputRef.current,
				setSelectedCompletion,
				setSurface,
				surface: surfaceRef.current,
			});
		};
		const onPaste = (event: ClipboardEvent) => {
			handleWindowPaste({
				event,
				focusPrompt: focusPromptRef.current,
				inputRef,
				outputRoot: outputRef.current,
				setInput: setInputRef.current,
				surface: surfaceRef.current,
			});
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("paste", onPaste);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("paste", onPaste);
		};
	}, []);

	const api = useMemo(
		(): TerminalApi => ({
			clearInspectOutput,
			focusPrompt,
			publishOutput,
		}),
		[clearInspectOutput, focusPrompt, publishOutput]
	);

	const view = useMemo(
		(): TerminalViewValue => ({
			closeDrawerAfter,
			completionListId,
			completions,
			current,
			focusEpoch,
			focusedEpochRef,
			focusPrompt,
			hadOutput,
			hintId,
			inputRef,
			liveMessage,
			onPromptKeyDown,
			outputRef,
			pane: paneTarget(surface),
			selectedCompletion,
			setInput,
			surface,
		}),
		[
			closeDrawerAfter,
			completionListId,
			completions,
			current,
			focusEpoch,
			focusPrompt,
			hadOutput,
			hintId,
			liveMessage,
			onPromptKeyDown,
			selectedCompletion,
			setInput,
			surface,
		]
	);

	return (
		<TerminalApiContext.Provider value={api}>
			<TerminalViewContext.Provider value={view}>
				<div className="sr-only" id={hintId}>
					Type a command or search the notes. Tab cycles completions. Up and
					down recall history when blank. Escape dismisses, then leaves the
					prompt.
				</div>
				<div aria-live="polite" className="sr-only">
					{liveMessage}
				</div>
				{children}
			</TerminalViewContext.Provider>
		</TerminalApiContext.Provider>
	);
}
