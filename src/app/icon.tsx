import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/site/app-icon";

export const contentType = "image/png";
export const size = { height: 32, width: 32 };

export default function Icon() {
	return new ImageResponse(<AppIcon size={size.width} />, size);
}
