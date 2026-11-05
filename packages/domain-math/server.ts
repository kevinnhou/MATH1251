import type { DomainServer } from "engine";
import { mathSyntax } from "./tex/syntax";

export default {
	syntax: mathSyntax,
} satisfies DomainServer;
