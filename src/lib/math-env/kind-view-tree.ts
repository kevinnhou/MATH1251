import type { Folder, Item, Node, Root } from "fumadocs-core/page-tree";
import type { KindView } from "./kind-view";
import { getKindLabel } from "./kinds";

const trailingSlashes = /\/+$/;

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

	const items = views
		.filter((view) => view.parentUrl === active.parentUrl)
		.map(createKindViewItem);
	const next = insertKindViewPages(tree, active.parentUrl, items);
	if (next === tree) {
		return tree;
	}

	return {
		...next,
		$id: `${tree.$id ?? "docs-root"}:kind-view:${active.parentUrl}`,
	};
}

function insertKindViewPages(
	root: Root,
	parentUrl: string,
	items: Item[]
): Root {
	const children = insertNodes(root.children, parentUrl, items);
	const fallback = root.fallback
		? insertKindViewPages(root.fallback, parentUrl, items)
		: undefined;
	if (children === root.children && fallback === root.fallback) {
		return root;
	}

	return fallback ? { ...root, children, fallback } : { ...root, children };
}

function insertNodes(nodes: Node[], parentUrl: string, items: Item[]): Node[] {
	const next = nodes.map((node) => insertNode(node, parentUrl, items));
	return next.every((node, index) => node === nodes[index]) ? nodes : next;
}

function insertNode(node: Node, parentUrl: string, items: Item[]): Node {
	if (node.type === "separator") {
		return node;
	}

	if (node.type === "page") {
		return node.url === parentUrl
			? createKindViewFolder(node, parentUrl, items)
			: node;
	}

	const children = insertNodes(node.children, parentUrl, items);
	const folder = children === node.children ? node : { ...node, children };
	return node.index?.url === parentUrl
		? addKindViewItems(folder, parentUrl, items)
		: folder;
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
