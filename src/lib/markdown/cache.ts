export const CACHE_LIMIT = 512;

export function remember<T>(
	cache: Map<string, T>,
	key: readonly unknown[],
	compute: () => T
): T {
	const encoded = JSON.stringify(key);
	const hit = cache.get(encoded);
	if (hit !== undefined) {
		cache.delete(encoded);
		cache.set(encoded, hit);
		return hit;
	}

	const value = compute();
	cache.set(encoded, value);
	if (cache.size > CACHE_LIMIT) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) {
			cache.delete(oldest);
		}
	}

	return value;
}
