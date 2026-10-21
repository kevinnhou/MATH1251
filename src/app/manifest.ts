import type { MetadataRoute } from "next";
import { course, homeRoute } from "@/lib/course/config";
import { PWA_ICON_VARIANTS } from "./pwa-icon/variants";

export default function manifest(): MetadataRoute.Manifest {
	return {
		background_color: course.theme.light,
		description: course.description,
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
		name: course.name,
		scope: "/",
		short_name: course.code,
		start_url: homeRoute,
		theme_color: course.theme.light,
	};
}
