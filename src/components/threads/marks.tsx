import type { ReactNode, SVGAttributes } from "react";
import { foregroundAt, THREAD_COLOR } from "@/components/relations/colors";
import type { DiagramMark } from "./layout";

export const STOP = 7;
export const LINE = foregroundAt(55);

type Stroke = Pick<
	SVGAttributes<SVGElement>,
	"strokeDasharray" | "strokeLinecap" | "strokeLinejoin" | "strokeWidth"
>;

export function solidStroke(lit: boolean): Stroke {
	return { strokeLinejoin: "miter", strokeWidth: lit ? 2.5 : 1.5 };
}

export function transitStroke(lit: boolean): Stroke {
	return {
		strokeDasharray: "1 4",
		strokeLinecap: "round",
		strokeWidth: lit ? 2 : 1.25,
	};
}

export function StopMarks({
	filled,
	ink,
	marks,
	x,
}: {
	filled: boolean;
	ink: (thread: string) => string;
	marks: readonly DiagramMark[];
	x: number;
}) {
	const ys = marks.map(({ y }) => y);

	return (
		<g>
			{marks.length > 1 ? (
				<line
					stroke="var(--color-fd-foreground)"
					strokeWidth={2}
					x1={x}
					x2={x}
					y1={Math.min(...ys)}
					y2={Math.max(...ys)}
				/>
			) : null}
			{marks.map(({ thread, y }) => (
				<rect
					fill={
						filled ? "var(--color-fd-foreground)" : "var(--color-fd-background)"
					}
					height={STOP}
					key={y}
					stroke={filled ? "var(--color-fd-foreground)" : ink(thread)}
					strokeWidth={1.5}
					width={STOP}
					x={x - STOP / 2}
					y={y - STOP / 2}
				/>
			))}
		</g>
	);
}

const lineInk = () => LINE;

function sample(stroke: Stroke, colour = LINE): ReactNode {
	return <line stroke={colour} x1={1} x2={23} y1={8} y2={8} {...stroke} />;
}

function stop(ys: readonly number[], filled = false): ReactNode {
	return (
		<StopMarks
			filled={filled}
			ink={lineInk}
			marks={ys.map((y) => ({ thread: "", y }))}
			x={12}
		/>
	);
}

const KEY: readonly [glyph: ReactNode, text: string][] = [
	[sample(solidStroke(false)), "Within a chapter"],
	[sample(transitStroke(false)), "Waiting between chapters"],
	[stop([8]), "A stop"],
	[stop([4, 12]), "One stop on two threads"],
	[stop([8], true), "Pinned"],
	[sample(solidStroke(true), THREAD_COLOR), "The thread in question"],
];

export function Marks() {
	return (
		<ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[11px] text-fd-muted-foreground">
			{KEY.map(([glyph, text]) => (
				<li className="flex items-center gap-2" key={text}>
					<svg aria-hidden="true" className="block" height={16} width={24}>
						{glyph}
					</svg>
					{text}
				</li>
			))}
		</ul>
	);
}
