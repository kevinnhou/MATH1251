import { SerwistProvider } from "@serwist/turbopack/react";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import "katex/dist/katex.css";
import "./global.css";
import { Geist, Geist_Mono } from "next/font/google";
import { siteName, themeBackground } from "@/lib/site/config";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export const metadata: Metadata = {
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: siteName,
	},
	applicationName: siteName,
};

export const viewport: Viewport = {
	themeColor: [
		{ color: themeBackground.light, media: "(prefers-color-scheme: light)" },
		{ color: themeBackground.dark, media: "(prefers-color-scheme: dark)" },
	],
};

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html
			className={`${geistSans.className} ${geistMono.variable}`}
			lang="en"
			suppressHydrationWarning
		>
			<body className="flex min-h-svh flex-col">
				<SerwistProvider
					disable={process.env.NODE_ENV === "development"}
					swUrl="/serwist/sw.js"
				>
					<RootProvider search={{ enabled: false }}>{children}</RootProvider>
				</SerwistProvider>
			</body>
		</html>
	);
}
