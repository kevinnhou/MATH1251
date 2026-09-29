"use client";

import { usePathname } from "fumadocs-core/framework";
import type { Item, Node } from "fumadocs-core/page-tree";
import { useTreeContext } from "fumadocs-ui/contexts/tree";
import { Fragment, type ReactNode, useMemo } from "react";
import { cn } from "@/lib/cn";
import type { SearchResult } from "@/lib/terminal/types";
import { TreeRow, TreeSeparator } from "./rows";

type Guide = "blank" | "elbow" | "pipe" | "tee";

interface SearchBranch {
	children: SearchBranch[];
	item?: Item;
	label: ReactNode[];
}

interface SearchLine {
	folder: boolean;
	guides: Guide[];
	item?: Item;
	key: string;
	label: ReactNode[];
}

export function SidebarSearchTree({
	query,
	results,
}: {
	query: string;
	results: SearchResult[];
}) {
	const pathname = usePathname();
	const { full } = useTreeContext();
	const groups = useMemo(
		() =>
			searchGroups(full.children, new Set(results.map((result) => result.url))),
		[full, results]
	);

	return (
		<>
			<TreeSeparator>{`${results.length} / ${query}`}</TreeSeparator>
			{groups.map((lines, groupIndex) => (
				<div
					className="mt-2 flex flex-col first-of-type:mt-0"
					data-tree-group=""
					key={lines[0]?.key ?? groupIndex}
				>
					{lines.map((line) => (
						<SearchLineRow
							active={pathname === line.item?.url}
							key={line.key}
							line={line}
						/>
					))}
				</div>
			))}
		</>
	);
}

function SearchLineRow({
	active,
	line,
}: {
	active: boolean;
	line: SearchLine;
}) {
	const content = (
		<>
			{line.guides.length > 0 ? (
				<span
					aria-hidden="true"
					className="-my-1.5 flex shrink-0 self-stretch text-fd-foreground/25"
				>
					{line.guides.map((guide, index) => (
						<GuideMark guide={guide} key={index} />
					))}
				</span>
			) : null}
			<span className="min-w-0">
				{line.label.map((name, index) =>
					index < line.label.length - 1 ? (
						<span
							className="font-normal text-fd-muted-foreground/70"
							key={index}
						>
							{name}
							{" / "}
						</span>
					) : (
						<Fragment key={index}>{name}</Fragment>
					)
				)}
			</span>
		</>
	);

	if (!line.item) {
		return (
			<TreeRow as="label" header>
				{content}
			</TreeRow>
		);
	}

	return (
		<TreeRow
			active={active}
			className="data-[active=true]:before:content-none"
			data-hit-url={line.item.url}
			external={line.item.external}
			header={line.folder}
			href={line.item.url}
		>
			{content}
		</TreeRow>
	);
}

function GuideMark({ guide }: { guide: Guide }) {
	return (
		<span
			className={cn(
				"relative w-3 shrink-0 before:absolute before:start-[5px] before:w-px before:bg-current after:absolute after:start-[5px] after:-end-1 after:top-4 after:h-px after:bg-current",
				guide === "blank" && "before:hidden after:hidden",
				guide === "elbow" && "before:top-0 before:h-4",
				guide === "pipe" && "before:inset-y-0 after:hidden",
				guide === "tee" && "before:inset-y-0"
			)}
		/>
	);
}

function searchGroups(
	nodes: Node[],
	hits: ReadonlySet<string>
): SearchLine[][] {
	const groups: SearchLine[][] = [];
	const loose: SearchLine[] = [];
	for (const node of nodes) {
		const branch = searchBranch(node, hits);
		if (!branch) {
			continue;
		}

		const lines = flattenBranch(branch, [], String(groups.length + 1));
		if (node.type === "folder") {
			groups.push(lines);
		} else {
			loose.push(...lines);
		}
	}

	return loose.length > 0 ? [loose, ...groups] : groups;
}

function searchBranch(
	node: Node,
	hits: ReadonlySet<string>
): SearchBranch | null {
	if (node.type === "separator") {
		return null;
	}

	if (node.type === "page") {
		return hits.has(node.url)
			? { children: [], item: node, label: [node.name] }
			: null;
	}

	const children = node.children.flatMap((child) => {
		const branch = searchBranch(child, hits);
		return branch ? [branch] : [];
	});
	const item = node.index && hits.has(node.index.url) ? node.index : undefined;
	const [only] = children;
	if (!item && children.length === 1 && only) {
		return { ...only, label: [node.name, ...only.label] };
	}

	return item || children.length > 0
		? { children, item, label: [node.name] }
		: null;
}

function flattenBranch(
	branch: SearchBranch,
	guides: Guide[],
	key: string
): SearchLine[] {
	const lines: SearchLine[] = [
		{
			folder: branch.children.length > 0,
			guides,
			item: branch.item,
			key: branch.item?.url ?? key,
			label: branch.label,
		},
	];
	const carried = guides.map(
		(guide): Guide => (guide === "tee" || guide === "pipe" ? "pipe" : "blank")
	);
	branch.children.forEach((child, index) => {
		const last = index === branch.children.length - 1;
		lines.push(
			...flattenBranch(
				child,
				[...carried, last ? "elbow" : "tee"],
				`${key}.${index}`
			)
		);
	});

	return lines;
}
