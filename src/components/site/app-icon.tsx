import { Logomark } from "@/components/site/logomark";
import { themeBackground } from "@/lib/site/config";

// Maskable icons may be cropped to a circle covering the central 80%,
// so the mark needs more padding than a regular icon.
export function AppIcon({
	maskable = false,
	size,
}: {
	maskable?: boolean;
	size: number;
}) {
	const mark = Math.round(size * (maskable ? 0.55 : 0.7));

	return (
		<div
			style={{
				alignItems: "center",
				backgroundColor: themeBackground.light,
				display: "flex",
				height: "100%",
				justifyContent: "center",
				width: "100%",
			}}
		>
			<Logomark height={mark} width={mark} />
		</div>
	);
}
