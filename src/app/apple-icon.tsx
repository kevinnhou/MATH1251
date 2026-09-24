import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/site/app-icon";

export const contentType = "image/png";
export const size = { height: 180, width: 180 };

export default function AppleIcon() {
	return new ImageResponse(<AppIcon size={size.width} />, size);
}
