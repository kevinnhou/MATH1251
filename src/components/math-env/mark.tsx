"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { MathEnvKind, MathEnvStyle } from "@/lib/math-env/kinds";
import {
	measureEnvWord,
	observeEnvironment,
	subscribeToFontReady,
} from "./mark-measure";

interface EnvMarkProps {
	code: string;
	href?: string;
	kind: MathEnvKind;
	linkLabel?: string;
	qed?: boolean;
	style: MathEnvStyle;
	word: string;
}

const useIsomorphicLayoutEffect =
	typeof window === "undefined" ? useEffect : useLayoutEffect;

function getEnvBracketClass(inverted: boolean) {
	return cn(
		"font-bold text-[0.8rem] not-italic tracking-normal",
		inverted ? "text-fd-background/65" : "text-fd-muted-foreground"
	);
}

function EnvBracket({
	inverted,
	value,
}: {
	inverted: boolean;
	value: "[" | "]";
}) {
	return <span className={getEnvBracketClass(inverted)}>{value}</span>;
}

function EnvLabel({
	inverted,
	kind,
	value,
}: {
	inverted: boolean;
	kind: MathEnvKind;
	value: string;
}) {
	return (
		<>
			<EnvBracket inverted={inverted} value="[" />
			<span
				className={cn(
					"italic",
					kind === "definition" &&
						"underline decoration-2 underline-offset-[5px]",
					kind === "method" && "overline decoration-2"
				)}
			>
				{value}
			</span>
			<EnvBracket inverted={inverted} value="]" />
		</>
	);
}

export function EnvMark({
	code,
	href,
	kind,
	linkLabel,
	qed,
	style,
	word,
}: EnvMarkProps) {
	const inverted = style === "theory";
	const markRef = useRef<HTMLSpanElement>(null);
	const [isCompact, setIsCompact] = useState(false);
	const bracketClassName = getEnvBracketClass(inverted);
	const labelClassName = cn(
		"shrink-0 self-center whitespace-nowrap px-1 py-1 font-medium font-mono text-[0.7rem] uppercase leading-none tracking-[0.16em]",
		"rotate-180 [writing-mode:vertical-rl]",
		inverted ? "bg-fd-foreground/90 text-fd-background" : "text-fd-foreground",
		style === "proof" && "text-fd-muted-foreground"
	);
	const linked = href !== undefined && linkLabel !== undefined;

	useIsomorphicLayoutEffect(() => {
		const mark = markRef.current;

		if (mark === null) {
			return;
		}

		const environment = mark.closest<HTMLElement>(".math-env");
		if (!environment) {
			return;
		}

		const updateSize = () => {
			const wordHeight = measureEnvWord({
				bracketClassName,
				cacheKey: `${kind}:${style}:${word}`,
				labelClassName,
				word,
			});
			const nextIsCompact =
				wordHeight > environment.getBoundingClientRect().height + 1;

			setIsCompact((current) =>
				current === nextIsCompact ? current : nextIsCompact
			);
		};

		updateSize();
		const stopObserving = observeEnvironment(environment, updateSize);
		const stopFontSubscription = subscribeToFontReady(updateSize);

		return () => {
			stopObserving();
			stopFontSubscription();
		};
	}, [bracketClassName, kind, labelClassName, style, word]);

	return (
		<span
			aria-hidden={linked ? undefined : true}
			className="flex min-h-0 min-w-0 flex-1 select-none flex-col"
			ref={markRef}
		>
			{linked ? (
				<a
					aria-label={linkLabel}
					className={cn(labelClassName, "no-underline")}
					href={href}
				>
					<EnvLabel
						inverted={inverted}
						kind={kind}
						value={isCompact ? code : word}
					/>
				</a>
			) : (
				<span aria-hidden="true" className={labelClassName}>
					<EnvLabel
						inverted={inverted}
						kind={kind}
						value={isCompact ? code : word}
					/>
				</span>
			)}
			<span
				aria-hidden="true"
				className="min-h-0 min-w-0 flex-1 bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] bg-size-[10px_10px]"
			/>
			{qed ? (
				<span
					aria-hidden="true"
					className="mx-auto block size-[0.42rem] shrink-0 bg-fd-foreground"
				/>
			) : null}
		</span>
	);
}
