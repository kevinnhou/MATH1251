import { cache } from "react";
import { withMarkdownTreeLabels } from "./sidebar-labels";
import { source } from "./source";

export const buildSidebarTree = cache(() =>
	withMarkdownTreeLabels(source.getPageTree())
);
