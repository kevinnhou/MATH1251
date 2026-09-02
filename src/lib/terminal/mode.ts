import type { TerminalMode, TerminalOutput, TerminalPane } from "./types";

export interface TerminalSurface {
	completionsOpen: boolean;
	echo: string;
	input: string;
	mode: TerminalMode;
	output: TerminalOutput | null;
}

export function emptySurface(): TerminalSurface {
	return {
		completionsOpen: false,
		echo: "",
		input: "",
		mode: "browse",
		output: null,
	};
}

export function paneTarget(surface: TerminalSurface): TerminalPane {
	return surface.mode === "output" ? "output" : "tree";
}

export function showOutput(
	_surface: TerminalSurface,
	output: TerminalOutput,
	echo = ""
): TerminalSurface {
	return {
		completionsOpen: false,
		echo,
		input: "",
		mode: "output",
		output,
	};
}

export function leaveOutput(
	_surface: TerminalSurface,
	seed = ""
): TerminalSurface {
	return {
		completionsOpen: seed.trim() !== "",
		echo: "",
		input: seed,
		mode: seed.trim() === "" ? "browse" : "edit",
		output: null,
	};
}

export function setDraft(
	surface: TerminalSurface,
	input: string
): TerminalSurface {
	if (surface.mode === "output") {
		return leaveOutput(surface, input);
	}

	return {
		...surface,
		completionsOpen: input.trim() !== "",
		input,
		mode: input.trim() === "" ? "browse" : "edit",
	};
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
