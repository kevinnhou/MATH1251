"use client";

import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { pageRequestHeaders } from "@/lib/pwa/protocol";
import { isOffline } from "./network";

export function PwaProvider({ children }: { children: ReactNode }) {
	return (
		<SerwistProvider
			cacheOnNavigation={false}
			disable={process.env.NODE_ENV === "development"}
			reloadOnOnline={false}
			swUrl="/serwist/sw.js"
		>
			<PageCache />
			{children}
		</SerwistProvider>
	);
}

function PageCache() {
	const { serwist } = useSerwist();
	const pathname = usePathname();
	const initial = useRef(true);

	useEffect(() => {
		const servedByWorker =
			initial.current && navigator.serviceWorker?.controller;
		initial.current = false;
		if (!serwist || servedByWorker || isOffline()) {
			return;
		}

		serwist.messageSW({
			payload: {
				urlsToCache: [[pathname, { headers: pageRequestHeaders }]],
			},
			type: "CACHE_URLS",
		});
	}, [pathname, serwist]);

	return null;
}
