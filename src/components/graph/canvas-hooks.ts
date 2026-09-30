import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { type GraphTheme, readGraphTheme } from "./canvas-paint";
import { FIT_PADDING, type ForceGraph } from "./canvas-sim";

interface Size {
	height: number;
	width: number;
}

export function isSizeAnimating(element: HTMLElement): boolean {
	return element
		.getAnimations()
		.some((animation) => animation.playState === "running");
}

export function useCanvasSize(
	containerRef: RefObject<HTMLDivElement | null>
): Size {
	const [size, setSize] = useState<Size>({ height: 0, width: 0 });

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const commitSize = () => {
			const height = container.clientHeight;
			const width = container.clientWidth;
			setSize((current) =>
				current.height === height && current.width === width
					? current
					: { height, width }
			);
		};

		const onResize = () => {
			if (!isSizeAnimating(container)) {
				commitSize();
				return;
			}

			const width = container.clientWidth;
			setSize((current) =>
				current.width === width ? current : { height: current.height, width }
			);
		};

		const onTransitionEnd = (event: TransitionEvent) => {
			if (
				event.target === container &&
				(event.propertyName === "height" || event.propertyName === "width")
			) {
				commitSize();
			}
		};

		commitSize();
		const observer = new ResizeObserver(onResize);
		observer.observe(container);
		container.addEventListener("transitionend", onTransitionEnd);
		return () => {
			observer.disconnect();
			container.removeEventListener("transitionend", onTransitionEnd);
		};
	}, [containerRef]);

	return size;
}

export function useGraphTheme(
	containerRef: RefObject<HTMLDivElement | null>
): GraphTheme | null {
	const [theme, setTheme] = useState<GraphTheme | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const update = () => setTheme(readGraphTheme(container));
		update();
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributeFilter: ["class"],
			attributes: true,
		});
		return () => observer.disconnect();
	}, [containerRef]);

	return theme;
}

interface Transform {
	k: number;
	x: number;
	y: number;
}

export function useAutoFit(
	graphRef: RefObject<ForceGraph | undefined>,
	containerRef: RefObject<HTMLDivElement | null>,
	fitKey: string,
	size: Size
) {
	const pendingRef = useRef(true);
	const skipRef = useRef(false);
	const programmaticRef = useRef(false);
	const pointerDownRef = useRef(false);
	const lastCameraRef = useRef<Transform | null>(null);

	const tryFit = useCallback(() => {
		const graph = graphRef.current;
		const container = containerRef.current;
		if (!(graph && pendingRef.current)) {
			return;
		}
		if (container && isSizeAnimating(container)) {
			return;
		}
		if (skipRef.current) {
			skipRef.current = false;
			pendingRef.current = false;
			return;
		}

		programmaticRef.current = true;
		graph.zoomToFit(400, FIT_PADDING);
		pendingRef.current = false;
	}, [containerRef, graphRef]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: a new fitKey is the trigger.
	useEffect(() => {
		pendingRef.current = true;
	}, [fitKey]);

	useEffect(() => {
		if (size.width !== 0 && size.height !== 0) {
			tryFit();
		}
	}, [size, tryFit]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const onPointerDown = ({ target }: PointerEvent) => {
			pointerDownRef.current =
				target instanceof HTMLCanvasElement ||
				(target instanceof HTMLElement &&
					target.closest("[data-graph-label]") !== null);
		};

		container.addEventListener("pointerdown", onPointerDown);
		return () => container.removeEventListener("pointerdown", onPointerDown);
	}, [containerRef]);

	const onNodeDragEnd = useCallback(() => {
		skipRef.current = true;
	}, []);

	const onZoom = useCallback((transform: Transform) => {
		if (programmaticRef.current) {
			lastCameraRef.current = transform;
		}
	}, []);

	const onZoomEnd = useCallback((transform: Transform) => {
		if (programmaticRef.current) {
			programmaticRef.current = false;
			lastCameraRef.current = transform;
			return;
		}

		const previous = lastCameraRef.current;
		lastCameraRef.current = transform;
		if (previous === null) {
			return;
		}

		const moved =
			Math.abs(previous.k - transform.k) > 0.001 ||
			Math.abs(previous.x - transform.x) > 1 ||
			Math.abs(previous.y - transform.y) > 1;
		if (moved && pointerDownRef.current) {
			pointerDownRef.current = false;
			skipRef.current = true;
		}
	}, []);

	return { onNodeDragEnd, onZoom, onZoomEnd, tryFit };
}
