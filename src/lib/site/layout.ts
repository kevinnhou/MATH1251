import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { repoUrl } from "@/lib/course/config";

export const baseOptions: BaseLayoutProps = {
	githubUrl: repoUrl,
	nav: {
		transparentMode: "always",
	},
};
