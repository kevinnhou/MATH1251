import fs from "node:fs/promises";
import path from "node:path";
import { createProcessor, type ProcessorOptions } from "@mdx-js/mdx";
import { frontmatter as parseFrontmatter } from "fumadocs-core/content/md/frontmatter";
import type { StructuredData } from "fumadocs-core/mdx-plugins";
import type { Core } from "fumadocs-mdx";
import { applyMdxPreset, remarkInclude } from "fumadocs-mdx/config";
import type { Link, Root } from "mdast";
import { glob } from "tinyglobby";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";
import { parse as parseYaml } from "yaml";
import { parsePageEnvs } from "@/lib/math-env/page-envs";
import type {
	CorpusMeta,
	CorpusMetaFile,
	CorpusMetaPage,
	DocsFrontmatter,
	DocsMeta,
} from "./types";

type CollectionItem = ReturnType<Core["getCollections"]>[number];
export type DocsCollectionItem = Extract<CollectionItem, { type: "docs" }>;

interface Captured {
	envs: unknown;
	extractedReferences: { href: string }[];
	structuredData: unknown;
}

declare module "vfile" {
	interface DataMap {
		corpusMeta?: Captured;
	}
}

export function getDocsCollection(core: Core): DocsCollectionItem {
	const collections = core
		.getCollections()
		.filter((collection) => collection.type === "docs");
	if (collections.length !== 1) {
		throw new Error(
			`[corpus-meta] expected one docs collection in source.config.ts, found ${collections.length}`
		);
	}
	return collections[0];
}

export async function generateCorpusMeta(core: Core): Promise<CorpusMeta> {
	const collection = getDocsCollection(core);
	const options = await resolveMdxOptions(core, collection);
	const processors = new Map<string, ReturnType<typeof createProcessor>>();
	const processorFor = (format: "md" | "mdx") => {
		let processor = processors.get(format);
		if (!processor) {
			processor = createProcessor({
				...options,
				format,
				recmaPlugins: [],
				rehypePlugins: [],
				remarkPlugins: [
					remarkInclude,
					...(options.remarkPlugins ?? []),
					remarkCapture,
				],
			});
			processors.set(format, processor);
		}
		return processor;
	};

	const [pages, metas] = await Promise.all([
		listFiles(collection.docs).then((files) =>
			Promise.all(
				files.map((filePath) =>
					readPage(core, collection, filePath, processorFor)
				)
			)
		),
		listFiles(collection.meta).then((files) =>
			Promise.all(files.map((filePath) => readMeta(core, collection, filePath)))
		),
	]);

	return { metas, pages };
}

async function resolveMdxOptions(
	core: Core,
	collection: DocsCollectionItem
): Promise<ProcessorOptions> {
	const collectionOptions = collection.docs.mdxOptions;
	if (collectionOptions) {
		return typeof collectionOptions === "function"
			? await collectionOptions("bundler")
			: collectionOptions;
	}

	const globalOptions = core.getConfig().global.mdxOptions;
	return applyMdxPreset(
		typeof globalOptions === "function" ? await globalOptions() : globalOptions
	)("bundler");
}

async function listFiles(collection: {
	dir: string;
	patterns: string[];
}): Promise<string[]> {
	const files = await glob(collection.patterns, { cwd: collection.dir });
	return files.sort().map((file) => path.join(collection.dir, file));
}

async function readPage(
	core: Core,
	collection: DocsCollectionItem,
	filePath: string,
	processorFor: (format: "md" | "mdx") => ReturnType<typeof createProcessor>
): Promise<CorpusMetaPage> {
	const source = await fs.readFile(filePath, "utf8");
	const matter = parseFrontmatter(source);
	const frontmatter = (await core.transformFrontmatter(
		{ collection: collection.docs, filePath, source },
		matter.data as Record<string, unknown>
	)) as DocsFrontmatter;
	const file = new VFile({
		data: { frontmatter: matter.data },
		path: filePath,
		value: "\n".repeat(countLines(matter.matter)) + matter.content,
	});

	await processorFor(filePath.endsWith(".mdx") ? "mdx" : "md").process(file);

	const relativePath = toPosix(path.relative(collection.docs.dir, filePath));
	const captured = file.data.corpusMeta;
	if (!captured) {
		throw new Error(
			`[corpus-meta] ${relativePath}: remark pipeline did not run`
		);
	}

	const envs = parsePageEnvs(captured.envs);
	if (!envs) {
		throw new Error(`[corpus-meta] ${relativePath}: invalid envs`);
	}
	if (!isStructuredData(captured.structuredData)) {
		throw new Error(`[corpus-meta] ${relativePath}: invalid structuredData`);
	}

	return {
		envs,
		extractedReferences: captured.extractedReferences,
		frontmatter,
		path: relativePath,
		structuredData: captured.structuredData,
	};
}

async function readMeta(
	core: Core,
	collection: DocsCollectionItem,
	filePath: string
): Promise<CorpusMetaFile> {
	const source = await fs.readFile(filePath, "utf8");
	let raw: unknown;
	try {
		raw = filePath.endsWith(".yaml") ? parseYaml(source) : JSON.parse(source);
	} catch (error) {
		throw new Error(`invalid data in ${filePath}`, { cause: error });
	}

	return {
		data: (await core.transformMeta(
			{ collection: collection.meta, filePath, source },
			raw
		)) as DocsMeta,
		path: toPosix(path.relative(collection.meta.dir, filePath)),
	};
}

function remarkCapture() {
	return (tree: Root, file: VFile) => {
		const extractedReferences: { href: string }[] = [];
		visit(tree, "link", (node: Link) => {
			extractedReferences.push({ href: node.url });
			return "skip";
		});

		file.data.corpusMeta = {
			envs: file.data.envs,
			extractedReferences,
			structuredData: file.data.structuredData,
		};
	};
}

function isStructuredData(value: unknown): value is StructuredData {
	return (
		typeof value === "object" &&
		value !== null &&
		"headings" in value &&
		"contents" in value &&
		Array.isArray(value.headings) &&
		Array.isArray(value.contents)
	);
}

function toPosix(file: string): string {
	return file.split(path.sep).join("/");
}

function countLines(text: string): number {
	return text.split("\n").length - 1;
}
