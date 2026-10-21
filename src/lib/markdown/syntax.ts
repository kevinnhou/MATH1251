import type { ProcessorOptions } from "@mdx-js/mdx";
import type { Element, Root as HastRoot } from "hast";
import type { Options as FromMarkdownOptions } from "mdast-util-from-markdown";
import type { Options as ToMarkdownOptions } from "mdast-util-to-markdown";

export type MdxPlugins = NonNullable<ProcessorOptions["remarkPlugins"]>;

export interface MarkdownSyntax {
	atom?: {
		is: (node: Element) => boolean;
		matches: (text: string, terms: readonly string[]) => boolean;
	};
	fromMarkdown?: {
		mdast: NonNullable<FromMarkdownOptions["mdastExtensions"]>;
		micromark: NonNullable<FromMarkdownOptions["extensions"]>;
	};
	literals?: Record<
		string,
		{ length: (value: string) => number; plain: (value: string) => string }
	>;
	rehypePlugins?: MdxPlugins;
	remarkPlugins?: MdxPlugins;
	render?: (tree: HastRoot) => void;
	toMarkdown?: NonNullable<ToMarkdownOptions["extensions"]>;
}
