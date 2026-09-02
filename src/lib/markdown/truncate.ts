import type { Root, RootContent } from "mdast";
import { cloneMarkdownTree } from "./parse";

export function truncateMarkdownTree(
	tree: Root,
	maxChars: number
): { tree: Root; truncated: boolean } {
	const clone = cloneMarkdownTree(tree);
	if (maxChars <= 0) {
		clone.children = [];
		appendEllipsis(clone);
		return { tree: clone, truncated: true };
	}

	const state = { truncated: false, used: 0 };
	truncateNodes(clone.children, maxChars, state);
	if (state.truncated) {
		appendEllipsis(clone);
	}

	return { tree: clone, truncated: state.truncated };
}

function truncateNodes(
	nodes: RootContent[],
	maxChars: number,
	state: { truncated: boolean; used: number }
) {
	for (let index = 0; index < nodes.length; index += 1) {
		const node = nodes[index];
		if (node === undefined) {
			return;
		}

		if (state.used >= maxChars && index > 0) {
			cutFrom(nodes, index, state);
			return;
		}

		if (!keepTruncatedNode(node, nodes, index, maxChars, state)) {
			return;
		}
	}
}

function keepTruncatedNode(
	node: RootContent,
	nodes: RootContent[],
	index: number,
	maxChars: number,
	state: { truncated: boolean; used: number }
): boolean {
	if (node.type === "text") {
		return keepTruncatedText(node, nodes, index, maxChars, state);
	}

	if (node.type === "inlineMath" || node.type === "math") {
		if (state.used >= maxChars && index > 0) {
			cutFrom(nodes, index, state);
			return false;
		}

		state.used += node.value.length + (node.type === "math" ? 4 : 2);
		return true;
	}

	if ("children" in node) {
		truncateNodes(node.children as RootContent[], maxChars, state);
		if (state.truncated) {
			cutFrom(nodes, index + 1, state);
			return false;
		}
	}

	return true;
}

function keepTruncatedText(
	node: Extract<RootContent, { type: "text" }>,
	nodes: RootContent[],
	index: number,
	maxChars: number,
	state: { truncated: boolean; used: number }
): boolean {
	if (state.used >= maxChars) {
		cutFrom(nodes, index, state);
		return false;
	}

	if (state.used + node.value.length <= maxChars) {
		state.used += node.value.length;
		return true;
	}

	node.value = node.value.slice(0, maxChars - state.used).trimEnd();
	state.used = maxChars;
	cutFrom(nodes, index + 1, state);
	return false;
}

function cutFrom(
	nodes: RootContent[],
	index: number,
	state: { truncated: boolean; used: number }
) {
	nodes.splice(index);
	state.truncated = true;
}

function appendEllipsis(tree: Root) {
	if (appendEllipsisTo(tree.children)) {
		return;
	}

	tree.children.push({
		children: [{ type: "text", value: "…" }],
		type: "paragraph",
	});
}

function appendEllipsisTo(nodes: RootContent[]): boolean {
	const last = nodes.at(-1);
	if (last === undefined) {
		return false;
	}

	if (last.type === "paragraph" || last.type === "heading") {
		last.children.push({ type: "text", value: "…" });
		return true;
	}

	if (last.type === "list" || last.type === "blockquote") {
		return appendEllipsisTo(last.children);
	}

	if (last.type !== "listItem") {
		return false;
	}

	if (appendEllipsisTo(last.children)) {
		return true;
	}

	last.children.push({
		children: [{ type: "text", value: "…" }],
		type: "paragraph",
	});
	return true;
}
