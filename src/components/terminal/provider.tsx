"use client";

import { usePathname, useRouter } from "fumadocs-core/framework";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useEffectEvent,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { useGraph } from "@/components/graph/provider";
import type { PageCatalog } from "@/lib/course/catalog";
import { currentPagesFromUrl } from "@/lib/course/catalog";
import { homeRoute } from "@/lib/site/config";
import { completeLine } from "@/lib/terminal/commands";
import { loadHistory } from "@/lib/terminal/history";
import { paneTarget, type TerminalSurface } from "@/lib/terminal/mode";
import { announce, plural } from "@/lib/terminal/output";
import { parseLine } from "@/lib/terminal/parse";
import {
	initialTerminalState,
	selectedCompletion,
	terminalReducer,
} from "@/lib/terminal/state";
import type {
	Completion,
	TerminalOutput,
	TerminalPane,
	TreeView,
} from "@/lib/terminal/types";
import { SearchHighlight } from "./highlight";
import { handlePromptKey, handleWindowKey, handleWindowPaste } from "./keys";
import { runTerminalLine } from "./run";

interface SidebarControls {
	closeDrawer: () => void;
	reveal: () => void;
}

interface TerminalApi {
	bindSidebar: (controls: SidebarControls) => () => void;
	catalog: PageCatalog;
	changeDirectory: (url: string) => void;
	clearInspectOutput: () => void;
	focusPrompt: (options?: { expand?: boolean }) => void;
	inputRef: RefObject<HTMLInputElement | null>;
	outputRef: RefObject<HTMLDivElement | null>;
	publishOutput: (output: TerminalOutput, echo?: string) => void;
	showTree: () => void;
}

interface TerminalScreen {
	cwd: string;
	echo: string;
	hadOutput: boolean;
	output: TerminalOutput | null;
	pane: TerminalPane;
	view: TreeView | null;
}

interface TerminalViewValue {
	completionListId: string;
	completions: Completion[];
	focusEpoch: number;
	focusedEpochRef: RefObject<number>;
	hintId: string;
	onPromptKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
	selectedCompletion: number;
	setInput: (nextInput: string) => void;
	surface: TerminalSurface;
}

const TerminalApiContext = createContext<TerminalApi | null>(null);
const TerminalScreenContext = createContext<TerminalScreen | null>(null);
const TerminalViewContext = createContext<TerminalViewValue | null>(null);

export function useTerminalApi(): TerminalApi {
	const value = useContext(TerminalApiContext);
	if (!value) {
		throw new Error("useTerminalApi must be used within TerminalProvider.");
	}

	return value;
}

export function useTerminalScreen(): TerminalScreen {
	const value = useContext(TerminalScreenContext);
	if (!value) {
		throw new Error("useTerminalScreen must be used within TerminalProvider.");
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
	const routeUrl = usePathname() || homeRoute;
	const graph = useGraph();
	const inputRef = useRef<HTMLInputElement>(null);
	const outputRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);
	const focusedEpochRef = useRef(0);
	const sidebarRef = useRef<SidebarControls | null>(null);
	const hintId = useId();
	const completionListId = useId();
	const [state, dispatch] = useReducer(
		terminalReducer,
		routeUrl,
		initialTerminalState
	);
	const [focusEpoch, setFocusEpoch] = useState(0);
	const [liveMessage, setLiveMessage] = useState("");
	const { location, surface } = state;
	const current = useMemo(
		() => currentPagesFromUrl(catalog, routeUrl),
		[catalog, routeUrl]
	);
	const parsed = useMemo(() => parseLine(surface.input), [surface.input]);
	const completions = useMemo(() => {
		if (!surface.completionsOpen) {
			return [];
		}

		return (
			state.cycle?.list ??
			completeLine({ catalog, current, cwd: location.cwd, graph, parsed })
		);
	}, [
		catalog,
		current,
		graph,
		location.cwd,
		parsed,
		state.cycle,
		surface.completionsOpen,
	]);

	useEffect(() => {
		dispatch({ entries: loadHistory(), type: "history-loaded" });
	}, []);

	const onRoute = useEffectEvent((url: string) => {
		if (url !== state.route && state.pendingNavigation !== url) {
			abortRef.current?.abort();
		}
		dispatch({ type: "route", url });
	});
	useEffect(() => onRoute(routeUrl), [routeUrl]);

	useEffect(() => () => abortRef.current?.abort(), []);

	useEffect(() => {
		if (
			surface.mode !== "output" &&
			surface.completionsOpen &&
			completions.length > 0
		) {
			setLiveMessage(plural(completions.length, "completion"));
		}
	}, [completions, surface.completionsOpen, surface.mode]);

	const publishOutput = useCallback((output: TerminalOutput, echo?: string) => {
		dispatch({ echo, output, type: "show" });
		setLiveMessage(announce(output));
	}, []);

	const clearInspectOutput = useCallback(() => {
		dispatch({ type: "clear-inspect" });
	}, []);

	const showTree = useCallback(() => {
		dispatch({ type: "show-tree" });
	}, []);

	const changeDirectory = useCallback((url: string) => {
		dispatch({ type: "change-directory", url });
	}, []);

	const setInput = useCallback((text: string) => {
		dispatch({ text, type: "input" });
	}, []);

	const bindSidebar = useCallback((controls: SidebarControls) => {
		sidebarRef.current = controls;
		return () => {
			if (sidebarRef.current === controls) {
				sidebarRef.current = null;
			}
		};
	}, []);

	const focusPrompt = useCallback((options?: { expand?: boolean }) => {
		dispatch({ type: "focus" });
		if (options?.expand !== false) {
			sidebarRef.current?.reveal();
			setFocusEpoch((epoch) => epoch + 1);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
		queueMicrotask(() => inputRef.current?.focus());
	}, []);

	const runLine = (raw?: string) =>
		runTerminalLine(raw ?? surface.input, {
			abortRef,
			announce: setLiveMessage,
			catalog,
			closeDrawer: () => {
				sidebarRef.current?.closeDrawer();
				inputRef.current?.blur();
			},
			current,
			cwd: location.cwd,
			dispatch,
			graph,
			historyEntries: state.history.entries,
			navigate: (url) => router.push(url),
			publishOutput,
		});

	const windowContext = () => ({
		dispatch,
		focusPrompt,
		inputRef,
		outputRoot: outputRef.current,
		state,
	});
	const onWindowKey = useEffectEvent((event: KeyboardEvent) =>
		handleWindowKey(event, windowContext())
	);
	const onWindowPaste = useEffectEvent((event: ClipboardEvent) =>
		handleWindowPaste(event, windowContext())
	);
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => onWindowKey(event);
		const onPaste = (event: ClipboardEvent) => onWindowPaste(event);
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("paste", onPaste);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("paste", onPaste);
		};
	}, []);

	const api = useMemo(
		(): TerminalApi => ({
			bindSidebar,
			catalog,
			changeDirectory,
			clearInspectOutput,
			focusPrompt,
			inputRef,
			outputRef,
			publishOutput,
			showTree,
		}),
		[
			bindSidebar,
			catalog,
			changeDirectory,
			clearInspectOutput,
			focusPrompt,
			publishOutput,
			showTree,
		]
	);

	const pane = paneTarget(surface);
	const screen = useMemo(
		(): TerminalScreen => ({
			cwd: location.cwd,
			echo: surface.echo,
			hadOutput: state.hadOutput,
			output: surface.output,
			pane,
			view: location.view,
		}),
		[location, pane, state.hadOutput, surface.echo, surface.output]
	);

	const view: TerminalViewValue = {
		completionListId,
		completions,
		focusEpoch,
		focusedEpochRef,
		hintId,
		onPromptKeyDown: (event) =>
			handlePromptKey(event, {
				completions,
				dispatch,
				inputRef,
				parsed,
				runLine,
				state,
			}),
		selectedCompletion: selectedCompletion(state),
		setInput,
		surface,
	};

	return (
		<TerminalApiContext.Provider value={api}>
			<TerminalScreenContext.Provider value={screen}>
				<TerminalViewContext.Provider value={view}>
					<div className="sr-only" id={hintId}>
						Type a command or search the notes. Tab cycles completions. Up and
						down recall history when blank. Escape dismisses, then leaves the
						prompt.
					</div>
					<div aria-live="polite" className="sr-only">
						{liveMessage}
					</div>
					<SearchHighlight
						query={
							location.view?.kind === "search" ? location.view.query : null
						}
						route={routeUrl}
					/>
					{children}
				</TerminalViewContext.Provider>
			</TerminalScreenContext.Provider>
		</TerminalApiContext.Provider>
	);
}
