import type { MarkdownSyntax } from "@/lib/markdown/syntax";
import { mathMarkdown } from "./src/lib/packs/math/markdown";

export default [mathMarkdown] satisfies MarkdownSyntax[];
