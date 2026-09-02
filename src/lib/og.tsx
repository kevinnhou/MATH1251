import { Logomark } from "@/components/site/logomark";
import { markdownToPlain } from "@/lib/markdown";
import {
	getKindLabel,
	MATH_ENV_KINDS,
	type MathEnvKind,
} from "@/lib/math-env/kinds";
import type { PageEnvs } from "@/lib/math-env/page-envs";
import { type GraphModule, getStrand } from "@/lib/site/strands";

const ACCENT: Record<GraphModule, string> = {
	algebra: "#ffadad",
	calculus: "#a8c7e8",
	core: "#74828a",
};

const FALLBACK_ACCENT = ACCENT.core;
const MATH_ENV_KIND_ORDER = Object.keys(MATH_ENV_KINDS) as MathEnvKind[];

function BracketMark({ value }: { value: string }) {
	return (
		<div style={{ alignItems: "center", display: "flex" }}>
			<div style={{ display: "flex" }}>[</div>
			<div
				style={{
					display: "flex",
					position: "relative",
					transform: "skewX(-12deg)",
				}}
			>
				<div style={{ display: "flex" }}>{value}</div>
				<div
					style={{
						display: "flex",
						left: 1,
						position: "absolute",
						top: 0,
					}}
				>
					{value}
				</div>
			</div>
			<div style={{ display: "flex" }}>]</div>
		</div>
	);
}

export interface OgPageData {
	data: {
		description?: string;
		ideas?: string[];
		title: string;
	};
	slugs: string[];
}

export interface OgCensusItem {
	code: string;
	count: number;
}

export interface OgImageProps {
	accent: string;
	census: OgCensusItem[];
	chip?: string;
	description?: string;
	ideas: string[];
	title: string;
}

export function toOgImageProps(resolved: {
	chip?: string;
	envs: PageEnvs;
	page: OgPageData;
	viewKind?: MathEnvKind;
}): OgImageProps {
	const { page, viewKind } = resolved;
	const title = markdownToPlain(page.data.title).trim();
	const description = page.data.description
		? markdownToPlain(page.data.description).trim()
		: undefined;
	const strand = getStrand(page.slugs);
	const { entries } = resolved.envs;
	const kinds = viewKind === undefined ? MATH_ENV_KIND_ORDER : [viewKind];

	return {
		accent: strand === undefined ? FALLBACK_ACCENT : ACCENT[strand],
		census: kinds.flatMap((kind) => {
			const count = entries.filter((entry) => entry.kind === kind).length;
			if (count === 0) {
				return [];
			}

			return [{ code: MATH_ENV_KINDS[kind].code, count }];
		}),
		chip:
			resolved.chip ??
			(viewKind === undefined
				? strand?.toUpperCase()
				: getKindLabel(viewKind, true).toUpperCase()),
		description:
			description && description.toLowerCase() !== title.toLowerCase()
				? description
				: undefined,
		ideas:
			viewKind === undefined ? (page.data.ideas ?? []).filter(Boolean) : [],
		title,
	};
}

export function OgImage({
	accent,
	census,
	chip,
	description,
	ideas,
	title,
}: OgImageProps) {
	return (
		<div
			style={{
				backgroundColor: "#fafafa",
				color: "#111827",
				display: "flex",
				height: "100%",
				width: "100%",
			}}
		>
			<div
				style={{
					backgroundColor: accent,
					display: "flex",
					height: "100%",
					width: 8,
				}}
			/>
			<div
				style={{
					display: "flex",
					flex: 1,
					flexDirection: "column",
					height: "100%",
					padding: "48px 56px",
				}}
			>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							alignItems: "center",
							display: "flex",
							gap: 16,
						}}
					>
						<Logomark height={40} width={40} />
						<div style={{ alignItems: "center", display: "flex" }}>
							<div
								style={{
									display: "flex",
									fontSize: 28,
									fontWeight: 500,
									letterSpacing: "0.08em",
								}}
							>
								MATH
							</div>
							<div
								style={{
									alignItems: "center",
									display: "flex",
									gap: 2,
								}}
							>
								<div
									style={{
										display: "flex",
										fontSize: 28,
										fontWeight: 500,
										letterSpacing: "0.08em",
									}}
								>
									[
								</div>
								<div
									style={{
										color: "#737373",
										display: "flex",
										fontSize: 24,
										letterSpacing: "-0.02em",
										transform: "skewX(-12deg)",
									}}
								>
									1251
								</div>
								<div
									style={{
										display: "flex",
										fontSize: 28,
										fontWeight: 500,
										letterSpacing: "0.08em",
									}}
								>
									]
								</div>
							</div>
						</div>
					</div>
					{chip === undefined ? null : (
						<div
							style={{
								display: "flex",
								fontSize: 22,
								letterSpacing: "0.16em",
							}}
						>
							<BracketMark value={chip} />
						</div>
					)}
				</div>
				<div
					style={{
						backgroundColor: "#e5e5e5",
						display: "flex",
						height: 1,
						marginTop: 32,
						width: "100%",
					}}
				/>
				<div
					style={{
						display: "flex",
						flex: 1,
						flexDirection: "column",
						gap: 24,
						justifyContent: "center",
					}}
				>
					<div
						style={{
							display: "flex",
							fontSize: 64,
							fontWeight: 500,
							letterSpacing: "-0.03em",
							lineClamp: 2,
							lineHeight: 1.15,
							overflow: "hidden",
						}}
					>
						{title}
					</div>
					{description === undefined ? null : (
						<div
							style={{
								color: "#525252",
								display: "flex",
								fontSize: 28,
								lineClamp: 2,
								lineHeight: 1.35,
								overflow: "hidden",
							}}
						>
							{description}
						</div>
					)}
					{census.length === 0 ? null : (
						<div
							style={{
								display: "flex",
								fontSize: 24,
								gap: 28,
								letterSpacing: "0.12em",
							}}
						>
							{census.map((item) => (
								<div key={item.code} style={{ display: "flex", gap: 8 }}>
									<BracketMark value={item.code} />
									<div style={{ display: "flex" }}>{item.count}</div>
								</div>
							))}
						</div>
					)}
				</div>
				{ideas.length === 0 ? null : (
					<div style={{ display: "flex", flexDirection: "column" }}>
						<div
							style={{
								backgroundColor: "#e5e5e5",
								display: "flex",
								height: 1,
								width: "100%",
							}}
						/>
						<div
							style={{
								color: "#737373",
								display: "flex",
								fontSize: 20,
								letterSpacing: "0.04em",
								marginTop: 24,
							}}
						>
							{ideas.join(" · ")}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
