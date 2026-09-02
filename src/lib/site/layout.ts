import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { gitConfig } from "./config";

export const baseOptions: BaseLayoutProps = {
	githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
	nav: {
		transparentMode: "always",
	},
};
