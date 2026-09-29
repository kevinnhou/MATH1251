"use client";

import { ContextMenu } from "@base-ui/react/context-menu";
import { Menu } from "@base-ui/react/menu";
import { Check, Copy } from "lucide-react";
import {
	type ComponentType,
	type ReactElement,
	type ReactNode,
	useState,
} from "react";
import { LlmLogo } from "@/components/site/llm-logos";
import { copyText, openExternal } from "@/lib/client/actions";
import type { EnvView } from "@/lib/math-env/env-meta";
import {
	formatEnvMarkdown,
	formatEnvRelated,
} from "@/lib/math-env/export-markdown";
import { getKindLabel } from "@/lib/math-env/kinds";
import {
	formatAskPrompt,
	LLM_PROVIDER_LABELS,
	LLM_PROVIDERS,
	type LlmProvider,
	llmUrls,
} from "@/lib/site/llm-ask";
import { isSafeExternalUrl, toAbsoluteUrl } from "@/lib/site/url";

interface EnvShareProps {
	children: (rightClickHint: ReactElement) => ReactElement;
	env: EnvView & { id: string };
}
export function EnvShare({ children, env }: EnvShareProps) {
	const [copied, setCopied] = useState(false);
	const [menuHandle] = useState(() => Menu.createHandle());
	const label = env.title ?? getKindLabel(env.kind);

	async function copyExcerpt() {
		const markdown = formatEnvMarkdown(env, {
			origin: window.location.origin,
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
		const source = toAbsoluteUrl(`${env.pageUrl}#${env.id}`, origin);
		const href = llmUrls(
			formatAskPrompt({
				related: formatEnvRelated(env, { maxCitedBy: 8, origin }),
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
					render={children(
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
							<ExportItems
								copied={copied}
								Item={ContextMenu.Item}
								onCopy={handleCopy}
								onLlm={handleLlm}
								Separator={ContextMenu.Separator}
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
							<ExportItems
								copied={copied}
								Item={Menu.Item}
								onCopy={handleCopy}
								onLlm={handleLlm}
								Separator={Menu.Separator}
							/>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</>
	);
}

const ITEM_CLASS =
	"flex h-6 cursor-default select-none items-center gap-1.5 px-1.5 font-mono text-[0.6rem] text-fd-muted-foreground uppercase tracking-[0.08em] outline-hidden data-highlighted:bg-fd-foreground data-highlighted:text-fd-background";

interface ItemProps {
	children: ReactNode;
	className: string;
	label: string;
	onClick: () => void;
}

/** The copy and ask items, rendered with either menu's primitives. */
function ExportItems({
	copied,
	Item,
	onCopy,
	onLlm,
	Separator,
}: {
	copied: boolean;
	Item: ComponentType<ItemProps>;
	onCopy: () => void;
	onLlm: (provider: LlmProvider) => void;
	Separator: ComponentType<{ className: string }>;
}) {
	return (
		<>
			<Item
				className={ITEM_CLASS}
				label={copied ? "Copied" : "Copy Markdown"}
				onClick={onCopy}
			>
				<ActionContent
					icon={copied ? <Check /> : <Copy />}
					text={copied ? "COPIED" : "COPY"}
				/>
			</Item>
			<Separator className="mx-0.5 h-5 border-fd-border border-s" />
			{LLM_PROVIDERS.map((provider) => (
				<Item
					className={ITEM_CLASS}
					key={provider}
					label={`Open in ${LLM_PROVIDER_LABELS[provider]}`}
					onClick={() => {
						onLlm(provider);
					}}
				>
					<ActionContent
						icon={<LlmLogo provider={provider} />}
						text={LLM_PROVIDER_LABELS[provider].toUpperCase()}
					/>
				</Item>
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
