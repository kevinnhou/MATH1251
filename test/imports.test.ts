import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");

const LAYERS: readonly (readonly string[])[] = [
	["client", "cn", "markdown", "pwa", "result", "url"],
	["mdx-env"],
	["course"],
	["compile", "export"],
	["relations"],
	["terminal"],
	["site"],
];

const SITE_READERS = new Set(["components/site", "components/sidebar"]);

const COURSE_FILES = [
	"course.config.ts",
	"course.server.ts",
	"course.components.ts",
];

const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const SOURCE_FILE = /\.(ts|tsx)$/;
const TEST_FILE = /\.test\.tsx?$/;
const IMPORT =
	/(?:^|[\s;}])(import|export)\s+(type\s+)?(?:[\w*{}\s,$]*?\sfrom\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const USE_CLIENT = /^\s*["']use client["']/;
const COURSE_SPECIFIER = /^course[./]/;
const DOMAIN_PACKAGE = /^@kevinnhou\/(domain-[a-z-]+)(?:\/(.+))?$/;
const MODULE_PATH = /^src\/(lib|components)\/([^/.]+)/;
const DOMAIN_PATH = /^packages\/(domain-[a-z-]+)\//;
const DOMAIN_INDEX = /^packages\/domain-[a-z-]+\/index\.ts$/;
const DOMAIN_SERVER = /^packages\/domain-[a-z-]+\/server\.ts$/;

interface Import {
	resolved?: string;
	specifier: string;
	typeOnly: boolean;
}

interface SourceFile {
	client: boolean;
	imports: Import[];
	path: string;
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}

	return readdirSync(dir).flatMap((name) => {
		if (name === "node_modules") {
			return [];
		}

		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) {
			return walk(full);
		}

		return SOURCE_FILE.test(name) && !TEST_FILE.test(name) ? [full] : [];
	});
}

function rel(file: string): string {
	return path.relative(ROOT, file).split(path.sep).join("/");
}

function resolveFile(base: string): string | undefined {
	if (SOURCE_FILE.test(base) && existsSync(base)) {
		return base;
	}

	for (const extension of EXTENSIONS) {
		if (existsSync(`${base}${extension}`)) {
			return `${base}${extension}`;
		}
	}
}

function resolveSpecifier(specifier: string, from: string): string | undefined {
	let base: string | undefined;
	if (specifier.startsWith(".")) {
		base = path.resolve(path.dirname(from), specifier);
	} else if (specifier.startsWith("@/")) {
		base = path.join(ROOT, "src", specifier.slice(2));
	} else if (specifier === "engine") {
		base = path.join(ROOT, "src/engine");
	} else if (COURSE_SPECIFIER.test(specifier)) {
		base = path.join(ROOT, specifier);
	} else {
		const domain = DOMAIN_PACKAGE.exec(specifier);
		if (domain) {
			base = path.join(ROOT, "packages", domain[1] ?? "", domain[2] ?? "index");
		}
	}

	if (base === undefined) {
		return;
	}

	const resolved = resolveFile(base);
	return resolved && rel(resolved);
}

function parse(file: string): SourceFile {
	const source = readFileSync(file, "utf8");
	const imports: Import[] = [];
	for (const match of source.matchAll(IMPORT)) {
		const specifier = match[3] ?? "";
		imports.push({
			resolved: resolveSpecifier(specifier, file),
			specifier,
			typeOnly: match[2] !== undefined,
		});
	}
	for (const match of source.matchAll(DYNAMIC_IMPORT)) {
		const specifier = match[1] ?? "";
		imports.push({
			resolved: resolveSpecifier(specifier, file),
			specifier,
			typeOnly: false,
		});
	}

	return { client: USE_CLIENT.test(source), imports, path: rel(file) };
}

const files = [
	...walk(path.join(ROOT, "src")),
	...walk(path.join(ROOT, "packages")),
	...walk(path.join(ROOT, "course")),
	...COURSE_FILES.map((file) => path.join(ROOT, file)).filter(existsSync),
].map(parse);

const byPath = new Map(files.map((file) => [file.path, file]));

function moduleOf(file: string): string | undefined {
	const match = MODULE_PATH.exec(file);
	if (match) {
		return `${match[1]}/${match[2]}`;
	}

	return file.startsWith("src/app/") ? "app" : undefined;
}

function layerOf(module: string): number {
	const name = module.replace("lib/", "");
	return LAYERS.findIndex((layer) => layer.includes(name));
}

function edges(
	predicate: (from: SourceFile, to: string) => string | undefined
) {
	return files.flatMap((file) =>
		file.imports.flatMap((item) => {
			if (item.resolved === undefined) {
				return [];
			}

			const problem = predicate(file, item.resolved);
			return problem ? [`${file.path} → ${item.resolved}: ${problem}`] : [];
		})
	);
}

describe("layering", () => {
	test("every lib module has a layer", () => {
		const modules = new Set(
			files.flatMap((file) => {
				const module = moduleOf(file.path);
				return module?.startsWith("lib/") ? [module] : [];
			})
		);
		expect([...modules].filter((module) => layerOf(module) === -1)).toEqual([]);
	});

	test("lib modules import only from lower layers", () => {
		const problems = edges((from, to) => {
			const source = moduleOf(from.path);
			const target = moduleOf(to);
			if (!(source?.startsWith("lib/") && target?.startsWith("lib/"))) {
				return;
			}

			return source !== target && layerOf(target) >= layerOf(source)
				? "imports a module in the same or a higher layer"
				: undefined;
		});
		expect(problems).toEqual([]);
	});

	test("lib never imports components or app; components never import app", () => {
		const problems = edges((from, to) => {
			const source = moduleOf(from.path);
			const target = moduleOf(to);
			if (source?.startsWith("lib/") && !target?.startsWith("lib/") && target) {
				return "lib imports UI or routes";
			}

			return source?.startsWith("components/") && target === "app"
				? "a component imports a route"
				: undefined;
		});
		expect(problems).toEqual([]);
	});

	test("only the shell reads lib/site", () => {
		const problems = edges((from, to) => {
			const source = moduleOf(from.path);
			return source?.startsWith("components/") &&
				moduleOf(to) === "lib/site" &&
				!SITE_READERS.has(source)
				? "feature UI reads lib/site"
				: undefined;
		});
		expect(problems).toEqual([]);
	});

	test("component modules have no import cycles", () => {
		const graph = new Map<string, Set<string>>();
		for (const file of files) {
			const source = moduleOf(file.path);
			if (!source?.startsWith("components/")) {
				continue;
			}

			for (const { resolved } of file.imports) {
				const target = resolved && moduleOf(resolved);
				if (target?.startsWith("components/") && target !== source) {
					graph.set(source, (graph.get(source) ?? new Set()).add(target));
				}
			}
		}

		const cycles: string[] = [];
		const state = new Map<string, "done" | "open">();
		const visit = (node: string, trail: string[]) => {
			state.set(node, "open");
			for (const next of graph.get(node) ?? []) {
				if (state.get(next) === "open") {
					cycles.push([...trail, node, next].join(" → "));
				} else if (state.get(next) === undefined) {
					visit(next, [...trail, node]);
				}
			}
			state.set(node, "done");
		};
		for (const node of graph.keys()) {
			if (state.get(node) === undefined) {
				visit(node, []);
			}
		}
		expect(cycles).toEqual([]);
	});
});

const domainOf = (file: string) => DOMAIN_PATH.exec(file)?.[1];

describe("domains and course", () => {
	test("domains import only engine types, their own files and npm packages", () => {
		const problems = files.flatMap((file) => {
			const domain = domainOf(file.path);
			if (domain === undefined) {
				return [];
			}

			return file.imports.flatMap((item) => {
				const where = `${file.path} → ${item.specifier}`;
				if (item.specifier === "engine") {
					return item.typeOnly
						? []
						: [`${where}: engine must be imported as types`];
				}

				if (item.resolved === undefined) {
					return [];
				}

				return domainOf(item.resolved) === domain
					? []
					: [`${where}: a domain reaches outside its package`];
			});
		});
		expect(problems).toEqual([]);
	});

	test("a domain's index.ts is plain data", () => {
		const problems = files.flatMap((file) =>
			DOMAIN_INDEX.test(file.path)
				? file.imports
						.filter((item) => !item.typeOnly)
						.map((item) => `${file.path} → ${item.specifier}`)
				: []
		);
		expect(problems).toEqual([]);
	});

	test("the engine reaches courses only through aliases and never imports packages/", () => {
		const problems = files.flatMap((file) => {
			if (!file.path.startsWith("src/")) {
				return [];
			}

			return file.imports.flatMap((item) => {
				const where = `${file.path} → ${item.specifier}`;
				if (DOMAIN_PACKAGE.test(item.specifier)) {
					return [`${where}: the engine names a domain`];
				}

				const to = item.resolved;
				if (to?.startsWith("packages/")) {
					return [`${where}: the engine imports packages/`];
				}

				const course =
					to !== undefined &&
					(COURSE_FILES.includes(to) || to.startsWith("course/"));
				return course && item.specifier.startsWith(".")
					? [`${where}: course files are reached through their alias`]
					: [];
			});
		});
		expect(problems).toEqual([]);
	});

	test("course files import only domains and engine types", () => {
		const problems = files.flatMap((file) => {
			if (!COURSE_FILES.includes(file.path)) {
				return [];
			}

			return file.imports.flatMap((item) => {
				if (item.specifier === "engine" && item.typeOnly) {
					return [];
				}

				return DOMAIN_PACKAGE.test(item.specifier)
					? []
					: [`${file.path} → ${item.specifier}`];
			});
		});
		expect(problems).toEqual([]);
	});

	test("server-only domain code never reaches a client module", () => {
		const forbidden = (file: string) =>
			file === "course.server.ts" || DOMAIN_SERVER.test(file);
		const problems: string[] = [];

		for (const file of files.filter((item) => item.client)) {
			const seen = new Set<string>();
			const stack: string[][] = [[file.path]];
			while (stack.length > 0) {
				const trail = stack.pop() ?? [];
				const current = trail.at(-1) ?? "";
				if (forbidden(current)) {
					problems.push(trail.join(" → "));
					continue;
				}

				for (const item of byPath.get(current)?.imports ?? []) {
					if (!item.typeOnly && item.resolved && !seen.has(item.resolved)) {
						seen.add(item.resolved);
						stack.push([...trail, item.resolved]);
					}
				}
			}
		}

		expect(problems).toEqual([]);
	});
});
