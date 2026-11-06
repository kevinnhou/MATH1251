import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BUILD = ".next/server/app";
const GOLDEN = "test/golden";

const args = process.argv.slice(2);
const update = args.includes("--update");
const added = args.includes("--add")
	? args.filter((arg) => !arg.startsWith("--"))
	: [];

function read(file: string): Promise<string | undefined> {
	return readFile(file, "utf8").catch(() => undefined);
}

async function tracked(): Promise<string[]> {
	const entries = await readdir(GOLDEN, {
		recursive: true,
		withFileTypes: true,
	}).catch(() => []);
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) =>
			path
				.relative(GOLDEN, path.join(entry.parentPath, entry.name))
				.split(path.sep)
				.join("/")
		)
		.toSorted();
}

async function compare(name: string, write: boolean): Promise<boolean> {
	const built = await read(path.join(BUILD, `${name}.body`));
	if (built === undefined) {
		throw new Error(
			`${name} is missing from ${BUILD}; run \`next build\` first.`
		);
	}

	const golden = path.join(GOLDEN, name);
	if (write) {
		await mkdir(path.dirname(golden), { recursive: true });
		await writeFile(golden, built);
		return true;
	}

	return (await read(golden)) === built;
}

const names = [...new Set([...(await tracked()), ...added])];
const results = await Promise.all(
	names.map((name) => compare(name, update || added.includes(name)))
);
const changed = names.filter((_, index) => !results[index]);

if (names.length === 0) {
	console.log(
		`No golden outputs in ${GOLDEN}. Track one with \`bun run golden --add llms.txt\` (a path under ${BUILD}, without .body).`
	);
} else if (update) {
	console.log(`Updated ${names.length} golden outputs in ${GOLDEN}.`);
} else if (changed.length > 0) {
	console.error(
		`Golden outputs changed:\n${changed.map((name) => `  ${name}`).join("\n")}\nInspect with \`git diff --no-index ${GOLDEN}/<file> ${BUILD}/<file>.body\`; if the change is intended, run \`bun run golden --update\`.`
	);
	process.exit(1);
} else {
	console.log(`${names.length} golden outputs match.`);
}
