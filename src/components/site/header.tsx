import { Logomark } from "./logomark";

export function Header() {
	return (
		<div className="flex items-center gap-2">
			<Logomark className="size-6" />
			<div className="flex items-center">
				<div className="font-medium text-md tracking-wider">MATH</div>
				<div className="flex items-center gap-0.5">
					<span className="font-medium font-mono text-md tracking-wider">
						[
					</span>
					<span className="font-light font-mono text-muted-foreground/80 text-sm italic tracking-tight">
						1251
					</span>
					<span className="font-medium font-mono text-md tracking-wider">
						]
					</span>
				</div>
			</div>
		</div>
	);
}
