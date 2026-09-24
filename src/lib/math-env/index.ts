export type { ParseResult } from "@/lib/result";
export {
	COURSE,
	type EnvExportInput,
	type EnvHeadingLevel,
	type EnvMarkdownOptions,
	type EnvProvenance,
	type EnvRelatedInput,
	type EnvRelatedMode,
	formatEnvMarkdown,
	formatEnvRelated,
	formatRefLink,
	type RelatedLink,
	toAbsoluteUrl,
} from "./export-markdown";
export {
	generatedKindsForPage,
	getKindViewToc,
	getKindViewUrl,
	type KindRoute,
	type KindView,
	type KindViewCopy,
	type KindViewRenderOptions,
	kindsOnPage,
	kindViewFor,
	kindViewRecord,
	kindViewsFromPages,
	parseKindView,
} from "./kind-view";
export {
	withActiveKindViewPages,
	withAllKindViewPages,
} from "./kind-view-tree";
export {
	EXAMPLE_DIFFICULTIES,
	type ExampleDifficulty,
	type GraphMaterialisation,
	getKindLabel,
	getKindViewSlug,
	getMathEnvConfig,
	graphMaterialisation,
	isExampleDifficulty,
	isMathEnvKind,
	isSlugRequired,
	MATH_ENV_KINDS,
	MATH_ENV_STYLES,
	type MathEnvKind,
	type MathEnvKindConfig,
	type MathEnvStyle,
	mathEnvKindFromTag,
	mathEnvTag,
	parseDifficulty,
	parseKindViewSlug,
} from "./kinds";
export {
	type EnvHeading,
	type EnvOccurrence,
	isPageEnvs,
	type PageEnvs,
	type PageSegment,
	parsePageEnvs,
	type RecallOccurrence,
} from "./page-envs";
export { parseTenetSlug, parseTenetSlugList, TENET_SLUG_PATTERN } from "./slug";
export {
	compileStatement,
	previewStatementHtml,
	type StatementView,
} from "./statement-html";
export {
	assertTenetIndex,
	createTenetIndex,
	getTenetHref,
	type ResolvedRef,
	resolveSlugs,
	type Tenet,
	type TenetIndex,
	type TenetSourcePage,
	toResolvedRef,
} from "./tenet";
