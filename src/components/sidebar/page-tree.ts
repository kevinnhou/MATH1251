import { cache } from "react";
import { source } from "@/lib/compile/source";
import { withMarkdownTreeLabels } from "./labels";

export const buildSidebarTree = cache(() =>
	withMarkdownTreeLabels(source.getPageTree())
);
