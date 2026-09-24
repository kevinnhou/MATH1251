import type { Metadata } from "next";
import Link from "next/link";
import { Logomark } from "@/components/site/logomark";
import { homeRoute, siteName } from "@/lib/site/config";

export const dynamic = "force-static";

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: `${siteName} Offline`,
};

export default function OfflinePage() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
			<Logomark className="size-12" />
			<div className="flex max-w-sm flex-col gap-2">
				<h1 className="font-medium text-fd-foreground text-xl">
					You&apos;re offline
				</h1>
				<p className="text-fd-muted-foreground text-sm">
					This page hasn&apos;t been saved yet. Pages you&apos;ve already
					visited are still available until you reconnect.
				</p>
			</div>
			<Link
				className="rounded-md border border-fd-border px-3 py-1.5 text-fd-foreground text-sm transition-colors hover:bg-fd-accent"
				href={homeRoute}
			>
				Go to core
			</Link>
		</main>
	);
}
