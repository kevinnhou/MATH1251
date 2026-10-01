import { docsContentRoute, docsContextRoute } from "@/lib/site/config";
import { envId } from "./model";

const EXPORT_FORMATS = {
	context: { ext: ".json", route: docsContextRoute },
	markdown: { ext: ".md", route: docsContentRoute },
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;

const PAGE_FILE = "content";

const ID_SEPARATORS = /[/#]/;

export function nodeMarkdownUrl(id: string): string {
	return nodeFileUrl(id, "markdown");
}

export function nodeContextUrl(id: string): string {
	return nodeFileUrl(id, "context");
}

function nodeFileUrl(id: string, format: ExportFormat): string {
	const segments = nodeFileSegments(id, format);
	return `${EXPORT_FORMATS[format].route}/${segments.join("/")}`;
}

export function nodeFileSegments(id: string, format: ExportFormat): string[] {
	const [path = "", anchor] = id.split("#", 2);
	if (anchor === PAGE_FILE) {
		throw new Error(
			`Anchor "${PAGE_FILE}" in "${id}" collides with its page's file.`
		);
	}

	return [
		...path.split("/").filter(Boolean),
		`${anchor || PAGE_FILE}${EXPORT_FORMATS[format].ext}`,
	];
}

export function parseNodeFile(
	segments: readonly string[],
	format: ExportFormat
): string | undefined {
	const { ext } = EXPORT_FORMATS[format];
	const file = segments.at(-1);
	if (file === undefined || !file.endsWith(ext) || file === ext) {
		return;
	}

	const name = file.slice(0, -ext.length);
	const page = `/${segments.slice(0, -1).join("/")}`;
	return name === PAGE_FILE ? page : envId(page, name);
}

export function nodeFileName(id: string, format: ExportFormat): string {
	const name = id.split(ID_SEPARATORS).filter(Boolean).join("-");
	return `${name}${EXPORT_FORMATS[format].ext}`;
}
