import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/site/app-icon";
import { isPwaIconVariant, PWA_ICON_VARIANTS } from "../variants";

export const dynamicParams = false;
export const revalidate = false;

export async function GET(
	_req: Request,
	{ params }: RouteContext<"/pwa-icon/[variant]">
) {
	const { variant } = await params;
	if (!isPwaIconVariant(variant)) {
		notFound();
	}

	const icon = PWA_ICON_VARIANTS[variant];
	return new ImageResponse(<AppIcon {...icon} />, {
		height: icon.size,
		width: icon.size,
	});
}

export function generateStaticParams() {
	return Object.keys(PWA_ICON_VARIANTS).map((variant) => ({ variant }));
}
