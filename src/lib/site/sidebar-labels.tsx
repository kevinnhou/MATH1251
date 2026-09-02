import type {
	Folder,
	Item,
	Node,
	Root,
	Separator,
} from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { markdownLabelNode } from "@/components/markdown/label";

export function withMarkdownTreeLabels(tree: Root): Root {
	return {
		...tree,
		children: tree.children.map(withMarkdownNodeLabels),
		description: markdownLabelNode(tree.description),
		fallback: tree.fallback ? withMarkdownTreeLabels(tree.fallback) : undefined,
		name: markdownLabelNode(tree.name),
	};
}

function withMarkdownNodeLabels(node: Node): Node {
	if (node.type === "separator") {
		return withSeparatorLabel(node);
	}

	if (node.type === "page") {
		return withPageLabel(node);
	}

	return withFolderLabel(node);
}

function withSeparatorLabel(node: Separator): Separator {
	return {
		...node,
		...labelId(node.$id, node.name, "sep"),
		name: markdownLabelNode(node.name),
	};
}

function withPageLabel(node: Item): Item {
	return {
		...node,
		description: markdownLabelNode(node.description),
		name: markdownLabelNode(node.name),
	};
}

function withFolderLabel(node: Folder): Folder {
	return {
		...node,
		...labelId(node.$id, node.name, "folder"),
		children: node.children.map(withMarkdownNodeLabels),
		description: markdownLabelNode(node.description),
		index: node.index ? withPageLabel(node.index) : undefined,
		name: markdownLabelNode(node.name),
	};
}

function labelId(
	id: string | undefined,
	name: ReactNode | undefined,
	kind: string
): { $id?: string } {
	if (id !== undefined || typeof name !== "string") {
		return {};
	}

	return { $id: `${kind}:${name}` };
}
