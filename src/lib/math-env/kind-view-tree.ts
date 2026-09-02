import {
	type Folder,
	findPath,
	type Item,
	type Node,
	type Root,
} from "fumadocs-core/page-tree";
import type { KindView } from "./kind-view";
import { getKindLabel } from "./kinds";

const trailingSlashes = /\/+$/;

interface TransformResult<T> {
	changed: boolean;
	node: T;
}

export function withActiveKindViewPages(
	tree: Root,
	views: readonly KindView[],
	pathname: string
): Root {
	const active = views.find(
		(view) => normalisePathname(view.url) === normalisePathname(pathname)
	);
	if (active === undefined) {
		return tree;
	}

	const next = withAllKindViewPages(
		tree,
		views.filter((view) => view.parentUrl === active.parentUrl)
	);
	if (next === tree) {
		return tree;
	}

	return {
		...next,
		$id: `${tree.$id ?? "docs-root"}:kind-view:${active.parentUrl}`,
	};
}

export function withAllKindViewPages(
	tree: Root,
	views: readonly KindView[]
): Root {
	const itemsByUrl = new Map<string, Item[]>();
	for (const view of views) {
		const items = itemsByUrl.get(view.parentUrl) ?? [];
		if (items.some((item) => item.url === view.url)) {
			continue;
		}

		items.push(createKindViewItem(view));
		itemsByUrl.set(view.parentUrl, items);
	}

	if (itemsByUrl.size === 0) {
		return tree;
	}

	const children = transformNodes(tree.children, itemsByUrl);
	const fallback = tree.fallback
		? transformRoot(tree.fallback, itemsByUrl)
		: undefined;
	if (!(children.changed || fallback?.changed)) {
		return tree;
	}

	return {
		...tree,
		children: children.changed ? children.node : tree.children,
		fallback: fallback?.changed ? fallback.node : tree.fallback,
	};
}

function transformRoot(
	root: Root,
	itemsByUrl: Map<string, Item[]>
): TransformResult<Root> {
	const children = transformNodes(root.children, itemsByUrl);
	if (!children.changed) {
		return { changed: false, node: root };
	}

	return {
		changed: true,
		node: {
			...root,
			children: children.node,
		},
	};
}

function transformNodes(
	nodes: Node[],
	itemsByUrl: Map<string, Item[]>
): TransformResult<Node[]> {
	let changed = false;
	const nextNodes = nodes.map((node) => {
		const result = transformNode(node, itemsByUrl);
		changed ||= result.changed;
		return result.node;
	});

	return {
		changed,
		node: changed ? nextNodes : nodes,
	};
}

function transformNode(
	node: Node,
	itemsByUrl: Map<string, Item[]>
): TransformResult<Node> {
	if (node.type === "separator") {
		return { changed: false, node };
	}

	if (node.type === "page") {
		const kindViewItems = itemsByUrl.get(node.url);
		return kindViewItems
			? {
					changed: true,
					node: createKindViewFolder(node, node.url, kindViewItems),
				}
			: { changed: false, node };
	}

	const indexUrl = node.index?.url;
	const kindViewItems = indexUrl ? itemsByUrl.get(indexUrl) : undefined;
	const withItems = kindViewItems
		? addKindViewItems(node, indexUrl ?? "", kindViewItems)
		: node;
	const children = transformNodes(withItems.children, itemsByUrl);
	const changed = withItems !== node || children.changed;
	if (!changed) {
		return { changed: false, node };
	}

	return {
		changed: true,
		node: children.changed
			? { ...withItems, children: children.node }
			: withItems,
	};
}

function createKindViewFolder(
	index: Item,
	parentUrl: string,
	kindViewItems: Item[]
): Folder {
	return {
		$id: getKindViewFolderId(parentUrl),
		children: kindViewItems,
		defaultOpen: true,
		description: index.description,
		icon: index.icon,
		index,
		name: index.name,
		type: "folder",
	};
}

function addKindViewItems(
	folder: Folder,
	parentUrl: string,
	kindViewItems: Item[]
): Folder {
	const existingUrls = new Set(
		folder.children.flatMap((child) =>
			child.type === "page" ? [child.url] : []
		)
	);
	const newItems = kindViewItems.filter((item) => !existingUrls.has(item.url));
	if (newItems.length === 0 && folder.$id === getKindViewFolderId(parentUrl)) {
		return folder;
	}

	return {
		...folder,
		$id: getKindViewFolderId(parentUrl),
		children:
			newItems.length > 0 ? [...folder.children, ...newItems] : folder.children,
		defaultOpen: true,
	};
}

function createKindViewItem(view: KindView): Item {
	return {
		$id: `kind-view:${view.parentUrl}:${view.kind}`,
		name: getKindLabel(view.kind, true),
		type: "page",
		url: view.url,
	};
}

function getKindViewFolderId(parentUrl: string): string {
	return `kind-view-folder:${parentUrl}`;
}

function normalisePathname(pathname: string): string {
	return pathname.replace(trailingSlashes, "") || "/";
}

export function findKindViewFolder(
	tree: Root,
	parentUrl: string
): Folder | undefined {
	const isTarget = (node: Node) =>
		node.type === "folder" &&
		(node.$id === getKindViewFolderId(parentUrl) ||
			node.index?.url === parentUrl);
	const targetPath =
		findPath(tree.children, isTarget) ??
		(tree.fallback ? findPath(tree.fallback.children, isTarget) : null);
	const last = targetPath?.at(-1);
	return last?.type === "folder" ? last : undefined;
}
