"use client";

import { usePathname } from "fumadocs-core/framework";
import { type RefObject, useEffect, useLayoutEffect } from "react";
import { TREE } from "./tree-keys";

const ACTIVE_CHILD =
	":scope > [data-active='true'], :scope > :has([data-active='true'])";

export function useRailMarks(listRef: RefObject<HTMLDivElement | null>) {
	const pathname = usePathname();

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-place when the route changes
	useLayoutEffect(() => {
		if (listRef.current) {
			placeRailMarks(listRef.current, true);
		}
	}, [listRef, pathname]);

	useEffect(() => {
		const list = listRef.current;
		if (!list) {
			return;
		}

		let height = -1;
		const observer = new ResizeObserver(([entry]) => {
			const next = entry?.contentRect.height;
			if (next !== undefined && next !== height) {
				height = next;
				placeRailMarks(list, false);
			}
		});
		observer.observe(list);
		return () => observer.disconnect();
	}, [listRef]);
}

function placeRailMarks(list: HTMLElement, slide: boolean) {
	const placements = [
		...list.querySelectorAll<HTMLElement>("[data-rail-mark]"),
	].map((mark) => {
		const rail = mark.parentElement;
		const child = rail?.querySelector<HTMLElement>(ACTIVE_CHILD);
		const row = child?.matches(TREE.row)
			? child
			: child?.querySelector<HTMLElement>(TREE.headerRow);
		if (!(rail && row)) {
			return { mark };
		}

		const railTop = rail.getBoundingClientRect().top;
		const box = row.getBoundingClientRect();
		return { height: box.height, mark, top: box.top - railTop };
	});

	const jumped: HTMLElement[] = [];
	for (const { height, mark, top } of placements) {
		if (top === undefined) {
			mark.style.opacity = "0";
			delete mark.dataset.placed;
			continue;
		}

		if (!(slide && mark.dataset.placed !== undefined)) {
			mark.style.transition = "none";
			jumped.push(mark);
		}
		mark.style.height = `${height}px`;
		mark.style.opacity = "1";
		mark.style.transform = `translateY(${top}px)`;
		mark.dataset.placed = "";
	}

	if (jumped.length > 0) {
		requestAnimationFrame(() => {
			for (const mark of jumped) {
				mark.style.transition = "";
			}
		});
	}
}
