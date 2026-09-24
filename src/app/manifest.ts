import type { MetadataRoute } from "next";
import {
	homeRoute,
	siteName,
	siteShortName,
	themeBackground,
} from "@/lib/site/config";
import { PWA_ICON_VARIANTS } from "./pwa-icon/variants";

export default function manifest(): MetadataRoute.Manifest {
	return {
		background_color: themeBackground.light,
		description: "Notes, definitions and results for MATH1251.",
		display: "standalone",
		icons: Object.entries(PWA_ICON_VARIANTS).map(
			([variant, { maskable, size }]) => ({
				purpose: maskable ? "maskable" : "any",
				sizes: `${size}x${size}`,
				src: `/pwa-icon/${variant}`,
				type: "image/png",
			})
		),
		id: homeRoute,
		name: siteName,
		scope: "/",
		short_name: siteShortName,
		start_url: homeRoute,
		theme_color: themeBackground.light,
	};
}
