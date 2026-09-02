import type { CommandDescriptor } from "./types";

export interface CommandRegistry {
	entries: Map<string, CommandDescriptor>;
	fallback?: CommandDescriptor;
}

export function createRegistry(
	descriptors: readonly CommandDescriptor[] = []
): CommandRegistry {
	const registry: CommandRegistry = { entries: new Map() };
	for (const descriptor of descriptors) {
		registerCommand(registry, descriptor);
	}
	return registry;
}

export function registerCommand(
	registry: CommandRegistry,
	command: CommandDescriptor
): () => void {
	for (const name of command.names) {
		const existing = findRegistered(registry, name);
		if (existing && existing.id !== command.id) {
			throw new Error(`Command name already registered: ${name}`);
		}
	}

	registry.entries.set(command.id, command);
	if (command.names.length === 0) {
		registry.fallback = command;
	}
	return () => {
		const current = registry.entries.get(command.id);
		if (current === command) {
			registry.entries.delete(command.id);
		}
	};
}

export function registeredNames(registry: CommandRegistry): string[] {
	const names: string[] = [];
	for (const command of registry.entries.values()) {
		names.push(...command.names);
	}

	return names;
}

export function advertisedNames(registry: CommandRegistry): string[] {
	const names: string[] = [];
	for (const command of registry.entries.values()) {
		if (!command.advertised) {
			continue;
		}

		const [canonical] = command.names;
		if (canonical) {
			names.push(canonical);
		}
	}

	return names;
}

export function findRegistered(
	registry: CommandRegistry,
	name: string
): CommandDescriptor | undefined {
	const needle = name.toLowerCase();
	for (const command of registry.entries.values()) {
		if (command.names.some((entry) => entry.toLowerCase() === needle)) {
			return command;
		}
	}
}
