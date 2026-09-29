import type { TerminalMode, TerminalOutput, TerminalPane } from "./types";

export interface TerminalSurface {
	completionsOpen: boolean;
	echo: string;
	input: string;
	mode: TerminalMode;
	output: TerminalOutput | null;
}

export function draftSurface(input: string): TerminalSurface {
	const typing = input.trim() !== "";
	return {
		completionsOpen: typing,
		echo: "",
		input,
		mode: typing ? "edit" : "browse",
		output: null,
	};
}

export function emptySurface(): TerminalSurface {
	return draftSurface("");
}

export function paneTarget(surface: TerminalSurface): TerminalPane {
	return surface.mode === "output" ? "output" : "tree";
}

export function showOutput(output: TerminalOutput, echo = ""): TerminalSurface {
	return {
		completionsOpen: false,
		echo,
		input: "",
		mode: "output",
		output,
	};
}

export function leaveOutput(
	surface: TerminalSurface,
	seed = ""
): TerminalSurface {
	return surface.mode === "output" ? draftSurface(seed) : surface;
}

export function dismissLayer(surface: TerminalSurface): {
	blur: boolean;
	consumed: boolean;
	surface: TerminalSurface;
} {
	if (surface.completionsOpen) {
		return {
			blur: false,
			consumed: true,
			surface: { ...surface, completionsOpen: false },
		};
	}

	if (surface.mode === "output") {
		return { blur: false, consumed: true, surface: leaveOutput(surface) };
	}

	if (surface.mode === "edit") {
		return {
			blur: false,
			consumed: true,
			surface: {
				...surface,
				completionsOpen: false,
				mode: "browse",
			},
		};
	}

	return { blur: true, consumed: false, surface };
}
