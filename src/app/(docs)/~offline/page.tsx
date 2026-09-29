import type { Metadata } from "next";
import { OfflineActions } from "@/components/pwa/offline";
import { Logomark } from "@/components/site/logomark";
import { siteName } from "@/lib/site/config";

export const dynamic = "force-static";

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: `${siteName} Offline`,
};

export default function OfflinePage() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
			<Logomark className="size-12" />
			<div className="flex max-w-sm flex-col gap-2">
				<h1 className="font-medium text-fd-foreground text-xl">
					You&apos;re offline
				</h1>
				<p className="text-fd-muted-foreground text-sm">
					This page hasn&apos;t been saved yet. Saved pages stay available in
					the sidebar until you reconnect.
				</p>
			</div>
			<OfflineActions />
		</main>
	);
}
