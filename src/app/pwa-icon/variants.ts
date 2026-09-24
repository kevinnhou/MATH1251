export const PWA_ICON_VARIANTS = {
	"192": { maskable: false, size: 192 },
	"512": { maskable: false, size: 512 },
	maskable: { maskable: true, size: 512 },
} as const;

export type PwaIconVariant = keyof typeof PWA_ICON_VARIANTS;

export function isPwaIconVariant(value: string): value is PwaIconVariant {
	return Object.hasOwn(PWA_ICON_VARIANTS, value);
}
