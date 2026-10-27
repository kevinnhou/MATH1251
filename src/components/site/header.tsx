import { wordmark } from "@/lib/course/config";
import { Logomark } from "./logomark";

export function Header() {
	return (
		<div className="flex items-center gap-2">
			<Logomark className="size-6" />
			<div className="flex items-center">
				<div className="font-medium text-md tracking-wider">
					{wordmark.subject}
				</div>
				<div className="flex items-center gap-0.5">
					<span className="font-medium font-mono text-md tracking-wider">
						[
					</span>
					<span className="font-light font-mono text-muted-foreground/80 text-sm italic tracking-tight">
						{wordmark.number}
					</span>
					<span className="font-medium font-mono text-md tracking-wider">
						]
					</span>
				</div>
			</div>
		</div>
	);
}
