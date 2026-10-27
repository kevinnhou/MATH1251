import syntaxes from "course.markdown";
import type { Element, Root as HastRoot } from "hast";
import type { Literal } from "mdast";
import type { MarkdownSyntax, MdxPlugins } from "./syntax";

const SYNTAXES: readonly MarkdownSyntax[] = syntaxes;

export const MICROMARK_EXTENSIONS = SYNTAXES.flatMap(
	(syntax) => syntax.fromMarkdown?.micromark ?? []
);

export const MDAST_EXTENSIONS = SYNTAXES.flatMap(
	(syntax) => syntax.fromMarkdown?.mdast ?? []
);

export const TO_MARKDOWN_EXTENSIONS = SYNTAXES.flatMap(
	(syntax) => syntax.toMarkdown ?? []
);

export const REMARK_PLUGINS: MdxPlugins = SYNTAXES.flatMap(
	(syntax) => syntax.remarkPlugins ?? []
);

export const REHYPE_PLUGINS: MdxPlugins = SYNTAXES.flatMap(
	(syntax) => syntax.rehypePlugins ?? []
);

const LITERALS = new Map(
	SYNTAXES.flatMap((syntax) => Object.entries(syntax.literals ?? {}))
);

export function literalPlain(node: Literal): string | undefined {
	return LITERALS.get(node.type)?.plain(node.value);
}

export function literalLength(node: Literal): number | undefined {
	return LITERALS.get(node.type)?.length(node.value);
}

export function atomOf(node: Element): MarkdownSyntax["atom"] {
	return SYNTAXES.find((syntax) => syntax.atom?.is(node))?.atom;
}

export function isAtom(node: Element): boolean {
	return atomOf(node) !== undefined;
}

export function renderSyntaxes(tree: HastRoot): void {
	for (const syntax of SYNTAXES) {
		syntax.render?.(tree);
	}
}
