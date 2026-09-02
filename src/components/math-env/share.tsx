"use client";

import { ContextMenu } from "@base-ui/react/context-menu";
import { Menu } from "@base-ui/react/menu";
import { Check, Copy } from "lucide-react";
import { type ReactElement, type ReactNode, useState } from "react";
import {
	ChatGptLogo,
	ClaudeLogo,
	CursorLogo,
} from "@/components/site/llm-logos";
import { copyText, openExternal } from "@/lib/client/actions";
import {
	type EnvExportInput,
	formatEnvMarkdown,
	formatEnvRelated,
	toAbsoluteUrl,
} from "@/lib/math-env/export-markdown";
import { getKindLabel } from "@/lib/math-env/kinds";
import { formatAskPrompt, type LlmProvider, llmUrls } from "@/lib/site/llm-ask";
import { isSafeExternalUrl } from "@/lib/site/url";

type EnvShareProps = Omit<EnvExportInput, "origin"> & {
	children: (rightClickHint: ReactElement) => ReactElement;
};
const ASK_PROVIDERS: {
	icon: ReactNode;
	provider: LlmProvider;
	title: string;
}[] = [
	{ icon: <ChatGptLogo />, provider: "chatgpt", title: "ChatGPT" },
	{ icon: <ClaudeLogo />, provider: "claude", title: "Claude" },
	{ icon: <CursorLogo />, provider: "cursor", title: "Cursor" },
];

export function EnvShare(props: EnvShareProps) {
	const [copied, setCopied] = useState(false);
	const [menuHandle] = useState(() => Menu.createHandle());
	const label = props.title ?? getKindLabel(props.kind);

	async function copyExcerpt() {
		const { origin } = window.location;
		const markdown = formatEnvMarkdown({
			...props,
			origin,
		});
		const ok = await copyText(markdown);
		if (ok) {
			setCopied(true);
			window.setTimeout(() => {
				setCopied(false);
			}, 1500);
		}
		return markdown;
	}

	async function openLlm(provider: LlmProvider) {
		const markdown = await copyExcerpt();
		const { origin } = window.location;
		const source = toAbsoluteUrl(`${props.pageUrl}#${props.id}`, origin);
		const href = llmUrls(
			formatAskPrompt({
				related: formatEnvRelated(
					{
						citedBy: props.citedBy,
						isRecall: props.isRecall,
						kind: props.kind,
						origin,
						originalHref: props.originalHref,
						relatedSee: props.relatedSee,
						relatedUses: props.relatedUses,
					},
					"full",
					8
				),
				source: {
					body: markdown,
					type: "excerpt",
					url: source,
				},
				task: "excerpt",
			})
		)[provider];
		if (isSafeExternalUrl(href)) {
			openExternal(href);
		}
	}

	function handleCopy() {
		copyExcerpt().catch(() => undefined);
	}

	function handleLlm(provider: LlmProvider) {
		openLlm(provider).catch(() => undefined);
	}

	return (
		<>
			<ContextMenu.Root orientation="horizontal">
				<ContextMenu.Trigger
					aria-label={copied ? `${label} Markdown copied` : `Export ${label}`}
					render={props.children(
						<Menu.Trigger
							aria-label={`Open export menu for ${label}`}
							className="pointer-events-none pointer-coarse:pointer-events-auto absolute right-0 bottom-0 flex h-5 items-center px-1 font-mono text-[10px] text-fd-muted-foreground leading-none opacity-0 pointer-coarse:opacity-40 outline-none transition-opacity duration-150 hover:text-fd-foreground focus-visible:outline-1 focus-visible:outline-fd-foreground group-focus-within/math-env:pointer-events-auto group-focus-within/math-env:opacity-100 group-hover/math-env:pointer-events-auto group-hover/math-env:opacity-100 motion-reduce:transition-none"
							handle={menuHandle}
						>
							[RIGHT CLICK]
						</Menu.Trigger>
					)}
				/>
				<ContextMenu.Portal>
					<ContextMenu.Positioner className="z-30 outline-hidden">
						<ContextMenu.Popup className="flex items-center border border-fd-border bg-fd-background p-1 text-fd-foreground outline-hidden">
							<ExportContextItems
								copied={copied}
								onCopy={handleCopy}
								onLlm={handleLlm}
							/>
						</ContextMenu.Popup>
					</ContextMenu.Positioner>
				</ContextMenu.Portal>
			</ContextMenu.Root>
			<Menu.Root handle={menuHandle} orientation="horizontal">
				<Menu.Portal>
					<Menu.Positioner
						align="end"
						className="z-30 outline-hidden"
						side="top"
						sideOffset={4}
					>
						<Menu.Popup className="flex items-center border border-fd-border bg-fd-background p-1 text-fd-foreground outline-hidden">
							<ExportMenuItems
								copied={copied}
								onCopy={handleCopy}
								onLlm={handleLlm}
							/>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</>
	);
}

function ExportContextItems({
	copied,
	onCopy,
	onLlm,
}: {
	copied: boolean;
	onCopy: () => void;
	onLlm: (provider: LlmProvider) => void;
}) {
	return (
		<>
			<ContextMenu.Item
				className="flex h-6 cursor-default select-none items-center gap-1.5 px-1.5 font-mono text-[0.6rem] text-fd-muted-foreground uppercase tracking-[0.08em] outline-hidden data-highlighted:bg-fd-foreground data-highlighted:text-fd-background"
				label={copied ? "Copied" : "Copy Markdown"}
				onClick={onCopy}
			>
				<ActionContent
					icon={copied ? <Check /> : <Copy />}
					text={copied ? "COPIED" : "COPY"}
				/>
			</ContextMenu.Item>
			<ContextMenu.Separator className="mx-0.5 h-5 border-fd-border border-s" />
			{ASK_PROVIDERS.map(({ icon, provider, title }) => (
				<ContextMenu.Item
					className="flex h-6 cursor-default select-none items-center gap-1.5 px-1.5 font-mono text-[0.6rem] text-fd-muted-foreground uppercase tracking-[0.08em] outline-hidden data-highlighted:bg-fd-foreground data-highlighted:text-fd-background"
					key={provider}
					label={`Open in ${title}`}
					onClick={() => {
						onLlm(provider);
					}}
				>
					<ActionContent icon={icon} text={title.toUpperCase()} />
				</ContextMenu.Item>
			))}
		</>
	);
}

function ExportMenuItems({
	copied,
	onCopy,
	onLlm,
}: {
	copied: boolean;
	onCopy: () => void;
	onLlm: (provider: LlmProvider) => void;
}) {
	return (
		<>
			<Menu.Item
				className="flex h-6 cursor-default select-none items-center gap-1.5 px-1.5 font-mono text-[0.6rem] text-fd-muted-foreground uppercase tracking-[0.08em] outline-hidden data-highlighted:bg-fd-foreground data-highlighted:text-fd-background"
				label={copied ? "Copied" : "Copy Markdown"}
				onClick={onCopy}
			>
				<ActionContent
					icon={copied ? <Check /> : <Copy />}
					text={copied ? "COPIED" : "COPY"}
				/>
			</Menu.Item>
			<Menu.Separator className="mx-0.5 h-5 border-fd-border border-s" />
			{ASK_PROVIDERS.map(({ icon, provider, title }) => (
				<Menu.Item
					className="flex h-6 cursor-default select-none items-center gap-1.5 px-1.5 font-mono text-[0.6rem] text-fd-muted-foreground uppercase tracking-[0.08em] outline-hidden data-highlighted:bg-fd-foreground data-highlighted:text-fd-background"
					key={provider}
					label={`Open in ${title}`}
					onClick={() => {
						onLlm(provider);
					}}
				>
					<ActionContent icon={icon} text={title.toUpperCase()} />
				</Menu.Item>
			))}
		</>
	);
}

function ActionContent({ icon, text }: { icon: ReactNode; text: string }) {
	return (
		<>
			<span className="size-3.5 shrink-0 [&_svg]:size-3.5">{icon}</span>
			{text}
		</>
	);
}
