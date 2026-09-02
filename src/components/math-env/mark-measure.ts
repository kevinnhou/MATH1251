type ResizeListener = () => void;

const intrinsicHeightCache = new Map<string, number>();
const environmentListeners = new Map<HTMLElement, Set<ResizeListener>>();
const fontReadyListeners = new Set<ResizeListener>();

let sharedResizeObserver: ResizeObserver | null = null;
let fontReadyPromise: Promise<void> | null = null;

export function observeEnvironment(
	environment: HTMLElement,
	listener: ResizeListener
) {
	if (typeof ResizeObserver === "undefined") {
		return () => {
			//
		};
	}

	let listeners = environmentListeners.get(environment);
	if (!listeners) {
		listeners = new Set();
		environmentListeners.set(environment, listeners);
	}
	listeners.add(listener);

	if (sharedResizeObserver === null) {
		sharedResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const entryListeners = environmentListeners.get(
					entry.target as HTMLElement
				);
				if (!entryListeners) {
					continue;
				}
				for (const callback of entryListeners) {
					callback();
				}
			}
		});
	}
	sharedResizeObserver.observe(environment);

	return () => {
		const currentListeners = environmentListeners.get(environment);
		currentListeners?.delete(listener);

		if (currentListeners?.size === 0) {
			environmentListeners.delete(environment);
			sharedResizeObserver?.unobserve(environment);
		}

		if (environmentListeners.size === 0) {
			sharedResizeObserver?.disconnect();
			sharedResizeObserver = null;
		}
	};
}

export function subscribeToFontReady(listener: ResizeListener) {
	if (typeof document === "undefined" || !("fonts" in document)) {
		return () => {
			//
		};
	}

	fontReadyListeners.add(listener);
	if (fontReadyPromise === null) {
		fontReadyPromise = document.fonts.ready.then(() => {
			intrinsicHeightCache.clear();
			for (const callback of fontReadyListeners) {
				callback();
			}
		});
	}

	return () => fontReadyListeners.delete(listener);
}

export function measureEnvWord({
	bracketClassName,
	cacheKey,
	labelClassName,
	word,
}: {
	bracketClassName: string;
	cacheKey: string;
	labelClassName: string;
	word: string;
}) {
	const cachedHeight = intrinsicHeightCache.get(cacheKey);
	if (cachedHeight !== undefined) {
		return cachedHeight;
	}

	const probe = document.createElement("span");
	probe.className = labelClassName;
	probe.style.pointerEvents = "none";
	probe.style.visibility = "hidden";

	for (const [className, text] of [
		[bracketClassName, "["],
		["italic", word],
		[bracketClassName, "]"],
	]) {
		const part = document.createElement("span");
		part.className = className;
		part.textContent = text;
		probe.append(part);
	}

	document.body.append(probe);
	const top = Number.parseFloat(getComputedStyle(probe).top);
	const height =
		probe.getBoundingClientRect().height + (Number.isNaN(top) ? 0 : top);
	probe.remove();

	intrinsicHeightCache.set(cacheKey, height);
	return height;
}
