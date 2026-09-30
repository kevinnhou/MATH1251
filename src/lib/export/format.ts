import { type ExportNode, RELATION_LABELS, type Relation } from "./model";

const FRONTMATTER_KEYS = [
	"id",
	"type",
	"kind",
	"title",
	"course",
	"strand",
	"strand_label",
	"page",
	"slug",
	"difficulty",
	"markdown",
	"tags",
	"ideas",
] as const;

export type Frontmatter = Partial<
	Record<(typeof FRONTMATTER_KEYS)[number], string | readonly string[]>
>;

export function frontmatter(fields: Frontmatter): string {
	const lines = ["---"];
	for (const key of FRONTMATTER_KEYS) {
		const value = fields[key];
		if (value === undefined || value === "") {
			continue;
		}

		if (typeof value === "string") {
			lines.push(`${key}: ${yamlString(value)}`);
		} else if (value.length > 0) {
			lines.push(`${key}:`, ...value.map((item) => `  - ${yamlString(item)}`));
		}
	}

	lines.push("---");
	return lines.join("\n");
}

export function nodeLink(node: ExportNode): string {
	return markdownLink(node.label, node.id);
}

export function markdownLink(text: string, href: string): string {
	return `[${text.replaceAll("[", "\\[").replaceAll("]", "\\]")}](${href})`;
}

export function relationLines(
	relations: readonly Relation[],
	limit = Number.POSITIVE_INFINITY
): string[] {
	const groups = Map.groupBy(relations, (relation) => relation.name);
	return [...groups].map(([name, items]) => {
		const links = items.slice(0, limit).map((item) => nodeLink(item.node));
		const more = items.length > limit ? `, +${items.length - limit} more` : "";
		return `- ${RELATION_LABELS[name]}: ${links.join(", ")}${more}`;
	});
}

export function joinBlocks(blocks: readonly string[]): string {
	return blocks
		.map((block) => block.trim())
		.filter(Boolean)
		.join("\n\n");
}

const YAML_PLAIN = /^[\w/#. -]+$/;
const YAML_AMBIGUOUS = /^[\d.-]|: | $/;

function yamlString(value: string): string {
	return YAML_PLAIN.test(value) && !YAML_AMBIGUOUS.test(value)
		? value
		: JSON.stringify(value);
}
