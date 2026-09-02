import { RootProvider } from "fumadocs-ui/provider/next";
import "katex/dist/katex.css";
import "./global.css";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html
			className={`${geistSans.className} ${geistMono.variable}`}
			lang="en"
			suppressHydrationWarning
		>
			<body className="flex min-h-svh flex-col">
				<RootProvider search={{ enabled: false }}>{children}</RootProvider>
			</body>
		</html>
	);
}
