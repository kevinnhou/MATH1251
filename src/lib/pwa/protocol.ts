export const pwaCaches = {
	data: "data",
	pages: "pages",
	static: "static",
} as const;

export const pageRequestHeaders = { Accept: "text/html" };

export function isPageRequest(request: Request): boolean {
	return (
		request.mode === "navigate" ||
		request.headers.get("Accept") === pageRequestHeaders.Accept
	);
}

export const networkStatusMessage = "NETWORK_STATUS";

export interface NetworkStatus {
	reachable: boolean;
	type: typeof networkStatusMessage;
}

export const reachabilityProbeRoute = "/manifest.webmanifest";
