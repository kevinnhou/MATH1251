import { createSerwistRoute } from "@serwist/turbopack";
import { offlineRoute } from "@/lib/site/config";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		additionalPrecacheEntries: [
			{ revision: process.env.BUILD_REVISION, url: offlineRoute },
		],
		globPatterns: [".next/static/**/*.{js,css,woff2}"],
		swSrc: "src/app/sw.ts",
		useNativeEsbuild: true,
	});
