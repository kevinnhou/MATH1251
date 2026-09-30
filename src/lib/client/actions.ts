export function isEditableTarget(target: EventTarget | null): boolean {
	if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
		return false;
	}

	if (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT" ||
		target.isContentEditable
	) {
		return true;
	}

	const role = target.getAttribute("role");
	if (role === "textbox" || role === "searchbox" || role === "combobox") {
		return true;
	}

	return target.closest("[contenteditable='true']") !== null;
}

export function isModifiedKey(event: KeyboardEvent): boolean {
	return event.metaKey || event.ctrlKey || event.altKey;
}

export function isPrintableKey(event: KeyboardEvent): boolean {
	return (
		event.key.length === 1 &&
		!isModifiedKey(event) &&
		!event.isComposing &&
		event.key !== "Process"
	);
}

export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export async function copyPendingText(text: Promise<string>): Promise<boolean> {
	if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					"text/plain": text.then(
						(value) => new Blob([value], { type: "text/plain" })
					),
				}),
			]);
			return true;
		} catch {
			//
		}
	}

	try {
		return await copyText(await text);
	} catch {
		return false;
	}
}

export async function fetchText(
	url: string,
	signal?: AbortSignal
): Promise<string> {
	const response = await fetch(url, { signal });
	if (!response.ok) {
		throw new Error("Unable to fetch text.");
	}

	return response.text();
}
