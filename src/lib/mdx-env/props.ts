import type {
	Expression,
	Node,
	Program,
	Property,
	SpreadElement,
} from "estree";
import type { ParseResult } from "@/lib/result";
import type { PropValue } from "./page-envs";

export type Constants = ReadonlyMap<string, PropValue>;

const NOT_LITERAL = "is not a literal";

export function literalConstants(programs: readonly Program[]): Constants {
	const constants = new Map<string, PropValue>();
	const declarators = programs.flatMap((program) =>
		program.body.flatMap((statement) => {
			const declaration =
				statement.type === "ExportNamedDeclaration"
					? statement.declaration
					: undefined;
			return declaration?.type === "VariableDeclaration" &&
				declaration.kind === "const"
				? declaration.declarations
				: [];
		})
	);

	for (const { id, init } of declarators) {
		const value = init ? literalValue(init, constants) : undefined;
		if (id.type === "Identifier" && value?.ok) {
			constants.set(id.name, value.value);
		}
	}

	return constants;
}

export function expressionValue(
	program: Program | undefined,
	constants: Constants
): ParseResult<PropValue> {
	const [statement] = program?.body ?? [];
	return statement?.type === "ExpressionStatement"
		? literalValue(statement.expression, constants)
		: { error: NOT_LITERAL, ok: false };
}

function literalValue(
	node: Node,
	constants: Constants
): ParseResult<PropValue> {
	switch (node.type) {
		case "Literal":
			return "regex" in node || "bigint" in node
				? { error: NOT_LITERAL, ok: false }
				: { ok: true, value: node.value as PropValue };
		case "Identifier": {
			const value = constants.get(node.name);
			return value === undefined
				? {
						error: `names "${node.name}", which is not a literal \`export const\` on this page`,
						ok: false,
					}
				: { ok: true, value };
		}
		case "UnaryExpression": {
			const argument = literalValue(node.argument, constants);
			if (
				argument.ok &&
				typeof argument.value === "number" &&
				(node.operator === "-" || node.operator === "+")
			) {
				return {
					ok: true,
					value: node.operator === "-" ? -argument.value : argument.value,
				};
			}

			return { error: NOT_LITERAL, ok: false };
		}
		case "TemplateLiteral":
			return node.expressions.length === 0
				? {
						ok: true,
						value: node.quasis.map((quasi) => quasi.value.cooked).join(""),
					}
				: { error: NOT_LITERAL, ok: false };
		case "ArrayExpression":
			return listValue(node.elements, constants);
		case "ObjectExpression":
			return objectValue(node.properties, constants);
		default:
			return { error: NOT_LITERAL, ok: false };
	}
}

function propertyKey(property: Property): string | undefined {
	if (property.key.type === "Identifier") {
		return property.key.name;
	}

	return property.key.type === "Literal"
		? String(property.key.value)
		: undefined;
}

function listValue(
	elements: readonly (Expression | SpreadElement | null)[],
	constants: Constants
): ParseResult<PropValue> {
	const values: PropValue[] = [];
	for (const element of elements) {
		if (element === null || element.type === "SpreadElement") {
			return { error: NOT_LITERAL, ok: false };
		}

		const value = literalValue(element, constants);
		if (!value.ok) {
			return value;
		}
		values.push(value.value);
	}

	return { ok: true, value: values };
}

function objectValue(
	properties: readonly (Property | SpreadElement)[],
	constants: Constants
): ParseResult<PropValue> {
	const value: Record<string, PropValue> = {};
	for (const property of properties) {
		if (
			property.type !== "Property" ||
			property.computed ||
			property.kind !== "init"
		) {
			return { error: NOT_LITERAL, ok: false };
		}

		const key = propertyKey(property);
		const item = literalValue(property.value, constants);
		if (key === undefined || !item.ok) {
			return item.ok ? { error: NOT_LITERAL, ok: false } : item;
		}
		value[key] = item.value;
	}

	return { ok: true, value };
}
