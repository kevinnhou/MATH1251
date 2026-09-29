import { Logomark } from "@/components/site/logomark";
import { themeBackground } from "@/lib/site/config";

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
