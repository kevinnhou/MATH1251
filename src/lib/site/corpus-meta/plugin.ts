import path from "node:path";
import type { Plugin } from "fumadocs-mdx";
import { generateCorpusMeta, getDocsCollection } from "./generate";

const OUTPUT_FILE = "corpus-meta.ts";
const TYPES_FILE = "src/lib/site/corpus-meta/types";
const REGENERATE_DELAY_MS = 100;

export function corpusMeta(): Plugin {
	let dev = false;

	const plugin: Plugin = {
		configureServer(server) {
			const { watcher } = server;
			if (!watcher) {
				return;
			}

			dev = true;
			let timer: ReturnType<typeof setTimeout> | undefined;
			watcher.on("all", (_event, file) => {
				if (!getDocsCollection(this.core).hasFile(path.resolve(file))) {
					return;
				}

				clearTimeout(timer);
				timer = setTimeout(() => {
					this.core
						.emit({ filterPlugin: (item) => item === plugin, write: true })
						.catch((error: unknown) => console.error(error));
				}, REGENERATE_DELAY_MS);
			});
		},
		async emit() {
			const typesImport = importPath(
				this.core.outDir,
				path.join(this.core.root, TYPES_FILE)
			);

			let content: string;
			try {
				const meta = await generateCorpusMeta(this.core);
				content = `import type { CorpusMeta } from "${typesImport}";

const corpusMeta: CorpusMeta = JSON.parse(${JSON.stringify(JSON.stringify(meta))});

export default corpusMeta;
`;
			} catch (error) {
				if (!dev) {
					throw error;
				}

				console.error(error);
				content = `throw new Error(${JSON.stringify(String(error))});
`;
			}

			return [{ content, path: OUTPUT_FILE }];
		},
		name: "corpus-meta",
	};

	return plugin;
}

function importPath(fromDir: string, file: string): string {
	const relative = path.relative(fromDir, file).split(path.sep).join("/");
	return relative.startsWith(".") ? relative : `./${relative}`;
}
