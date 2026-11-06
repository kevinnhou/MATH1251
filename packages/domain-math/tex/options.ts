import type { Options as RehypeKatexOptions } from "rehype-katex";

export const REMARK_MATH_OPTIONS = {
	singleDollarTextMath: true,
} as const;

export const KATEX_OPTIONS: RehypeKatexOptions = {
	strict: "ignore",
};
