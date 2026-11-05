# Writing a domain

A **domain** gives the engine a subject's vocabulary: its **components** (MDX
tags), how they look and how prompts talk about them, how they export, and
optionally a **notation** (a Markdown syntax such as TeX). The engine is
subject-neutral and never names a component; everything subject-specific is
in a domain. Domains are workspace packages in `packages/domain-*`, and every
domain ships in the baseline so all courses share one lockfile.

A course lists the domains it uses ([Configuring a course](course/config.md#domains)).
Make domain changes in the baseline so every course gets them.

## Package layout

```
packages/domain-code/
  package.json      name, exports, its own dependencies
  index.ts          components as plain data: safe in the browser
  server.ts         export methods and notation: server only
  components.tsx    React renderers
  styles.css        its CSS
```

```json
{
  "name": "@kevinnhou/domain-code",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.ts",
    "./server": "./server.ts",
    "./components": "./components.tsx",
    "./styles.css": "./styles.css"
  },
  "peerDependencies": { "react": "*" }
}
```

**The entry points are split by where the code runs.**

| Entry | Reaches | So it must |
|---|---|---|
| `index.ts` | browser bundles: `course.config.ts` is read by client components | be plain data, with no runtime imports |
| `server.ts` | the build and server only | hold anything heavy or server-side (KaTeX, export methods); never be imported by a client module |
| `components.tsx` | the MDX renderer | hold React components; the config pass can't load React |
| `styles.css` | `app/global.css`, through `course.css` | include `@source "./"` so Tailwind scans the domain's classes |

**Domains import nothing from the engine at runtime.** Types come from the
`engine` alias (`src/engine.ts`, a barrel of engine types). Use `import type`
and `satisfies`:

```ts
import type { Domain } from "engine";

export default {
	components: { /* … */ },
} as const satisfies Domain;
```

A domain that needs a helper the engine has copies it (`domain-math/tex/element.ts`
copies three hast helpers) rather than importing engine code.

**How packages resolve.** Domains are imported by name
(`@kevinnhou/domain-math`), and one wildcard tsconfig `paths` entry
(`@kevinnhou/domain-*`) maps every name to its folder, so the Fumadocs config pass (esbuild), Turbopack and `tsc` all use the
TypeScript source with no build step. Bun `workspaces` installs each domain's
dependencies, and `bunfig.toml` sets `linker = "hoisted"` so they land in the
root `node_modules`, where the config pass and Tailwind find them. Two things
follow:

- **Overrides go in the root `package.json`.** Bun applies `overrides` only
  from the root, so `domain-math`'s `katex` is pinned there too (`^0.18.4`);
  without it `rehype-katex` would pull an older KaTeX than the CSS expects.
- **A domain used outside a baseline clone needs a build step** (`tsc` to
  `dist/`), since nothing else compiles it.

## Components

`index.ts` default-exports a `Domain`: `{ components }`, keyed by MDX tag
(PascalCase). A component with a `role` is an **environment**; one without is
a plain component.

```ts
export default {
	components: {
		Theorem: { ask: RESULT, code: "TH", plural: "Theorems", role: "uses", style: "emphasis" },
		Proof: {
			code: "PF",
			endMark: true,
			optionalSlug: true,
			plural: "Proofs",
			relation: { inverse: "Proved by", label: "Proves" },
			role: "derives",
			style: "subdued",
			untitled: true,
			/* ask: { derive: { label: "Walk the proof", … } } */
		},
		Mermaid: {},
	},
} as const satisfies Domain;
```

The **kind** is the tag in kebab case (`Theorem` → `theorem`, `WorkedExample`
→ `worked-example`). It prefixes anchors (`theorem-1`) and appears in exports.

### Environments (`EnvironmentSpec`)

Anything left out falls back to the engine default.

| Field | Meaning | Default |
|---|---|---|
| `role` (required) | `uses`, `derives` or `practises` ([Roles](#roles)) | |
| `code` (required) | two-letter mark: on the rail when the environment is too short for the word, in thread stations, on OG images (`TH`) | |
| `plural` (required) | plural label; lower-cased, it is the kind-view URL segment (`theorems`) | |
| `style` (required) | `plain`, `emphasis` (inverted mark, bold title) or `subdued` (muted mark, tighter spacing) | |
| `label` | singular label | the tag |
| `decoration` | `underline` or `overline` on the rail word | none |
| `endMark` | a square end mark under the rail (a QED box) | none |
| `optionalSlug` | the environment may omit `slug` | slug required |
| `untitled` | written without a heading; rendered as a `div` labelled by `label` | a `section` with a title |
| `untitledTitle` | label of an untitled derivation, a template with `{label}` and `{targets}` | `{label} of {targets}` |
| `relation` | `{ label, inverse }`: how readers see its role's relation in documents, the dock and prompts ("Proves" / "Proved by") | the engine's neutral labels ("Derives" / "Derived by") |
| `ask` | prompt wording ([Wording](#wording)) | the engine's wording for its role |
| `difficulties` | the scale a practice environment's `difficulty` is checked against | none: no difficulty |

### Plain components (`ComponentSpec`)

A plain component has one optional field, `slugProps`: the props that name a
slug. The build checks they name defined slugs; they create no relation.

### Roles

Roles, never tag names, carry behaviour. A domain assigns one to each
environment and can't add another; a new role is an engine change.

| Role | Is | The engine |
|---|---|---|
| `uses` | a dependency (definitions, results, methods) | lists prerequisites; feeds "builds on" / "leads to" and page links |
| `derives` | a derivation (Proof, Solution) | attaches it under its targets in exports and prompt context; offers the `derive` prompt, worded by this component; labels untitled ones with `untitledTitle` |
| `practises` | practice (Example, Exercise) | checks `difficulty` against its own scale; gives "practised in" and the practice prompt wording |

Relation IDs in exports are neutral and engine-wide (`uses`/`used_by`,
`derives`/`derived_by`, `practises`/`practised_by`); a component changes only
the labels readers see.

### Validation

The registry merges every listed domain's components when it is first imported
and fails the build with a list of problems. It rejects:

- tags that aren't PascalCase, or that the engine defines (`KindFilter`,
  `Prose`, `Recall`, `Statement`, `Thread`, `ThreadMap`);
- a tag, kind, code, label or plural used twice across all listed domains
  (plurals compared lower-cased), and plurals that aren't letters and hyphens
  (they name URLs);
- kinds the engine uses itself (`page`, `recall`, `thread`);
- unknown roles or styles;
- difficulties on a component that isn't practice, or that are blank, padded
  or repeated.

## Wording

| Text | Comes from |
|---|---|
| course title, name, description, tutor rules, strand labels | `course.config.ts` |
| the `llms.txt` summary | `course.config.ts` (`summary`), else generated from the components' plurals |
| environment labels, codes, relation labels, untitled-derivation titles | the component |
| ask labels, openers and tasks; difficulties | the component, else the engine's default for its role |
| the tutor role's preamble, thread prompts, document shape, frontmatter keys, relation IDs, URL scheme | the engine |

`ask` holds wording per prompt **intent** (`explain`, `derive`, `quiz`,
`check`), each with an optional `label` (the menu entry), `phrase` (the opener
in the ask panel, "Walk the proof of") and `task` (the instruction in the
prompt). `derive` also takes `selfPhrase` ("Walk through"), used when the target
is the derivation itself. `subject` names the target in the engine's default
quiz task ("this result").

```ts
const RESULT = {
	check: { task: "The student will send their own attempt. …" },
	explain: { task: "Explain this result: what it says, why it is true, …" },
	subject: "this result",
} as const satisfies AskSpec;
```

- **Prompts use the wording of the component asked about**, except `derive`:
  a result's "Walk the proof" comes from its derivation's component. A theorem
  proved by a Proof says "Walk the proof"; an exercise with a Solution says
  "Walk the solution".
- **The engine's defaults are neutral.** `domain-math` writes MATH1251's
  wording onto its components; a new domain should write its own.
- Which intents a target offers, and the engine's fallback texts:
  [Intents](engine/export.md#intents).

## Renderers (`components.tsx`)

`components.tsx` default-exports React components keyed by tag
(`satisfies DomainComponents`).

- **A plain component's renderer** is registered as it is, and receives its
  literal props and children.
- **An environment's renderer draws only the body**, inside the engine's frame.
  The frame (the rail mark, footnotes, the ask menu, the dock's active mark) is
  the same for every environment and can't be replaced. Environments without a
  renderer get the engine's default body.

## Export methods (`server.ts`)

`server.ts` default-exports a `DomainServer`: `{ components?, syntax? }`.
`components` holds export methods by tag:

```ts
import type { ComponentInput, DomainServer } from "engine";

function outputFence({ children, props }: ComponentInput): string {
	const command = typeof props.command === "string" ? props.command : "";
	const lines = [command === "" ? "" : `$ ${command}`, children].filter(Boolean);
	return `\`\`\`console\n${lines.join("\n")}\n\`\`\``;
}

export default {
	components: { Output: { markdown: outputFence } },
} satisfies DomainServer;
```

| Method | Used for | Default |
|---|---|---|
| `markdown(input)` | Markdown documents and `llms-full.txt` | the component's text content |
| `context(input)` | LLM prompt context; may return `{ text, blocks }` to add blocks | `markdown`, else text content |

Every method gets a `ComponentInput`:

| Field | Contents |
|---|---|
| `tag`, `props`, `children` | the occurrence: its literal props and its children as Markdown text |
| `surface` | `page`, `env`, `kind-view`, `thread`, `llms-full` or `context` |
| `page`, `env` | the page node and, when it sits in one, the enclosing environment node |
| `segments`, `segment` | the page's segments and this occurrence's index, for its neighbours |
| `graph` | a read-only `GraphReader`: `node`, `nodes`, `relations`, `prerequisites`, `derivations`, `threads` |
| `resolve(slug)`, `link(id)` | a slug's node, and a node's Markdown link |

Rules:

- **Methods read the graph and never write it.** Only environments create
  nodes and relations, so anything that must be cited, numbered or listed is an
  environment. One graph keeps the dock, threads and terminal (which never run
  export methods) in agreement with the documents.
- **Deterministic:** no network, clock or randomness.
- **Link only through `link(id)`**, so every link in an export is a node ID.
- **A thrown error fails the build** and names the component and page.
- Extra `context` blocks carry a tier and are packed with every other block
  ([Context tiers](engine/export.md#context-tiers)). Blank blocks are dropped.
- Multi-line output inside a list item or a quote is indented to fit, when the
  component starts its line.
- `graph.json` keeps a component's text content, not its method output.
- A method's tag must be a component that a listed domain's `index.ts`
  defines, or the build fails.

Search, previews, dock titles and thread stations always use the text content:
they are built before the graph exists, and a search method wasn't worth a
second code path.

## Notation (`syntax`)

A domain whose subject needs syntax beyond GFM adds a `MarkdownSyntax` as its
`server.ts`'s `syntax`. The engine renders Markdown in two pipelines (MDX pages,
and short fragments such as titles and statements, [Markdown](engine/markdown.md)),
and a syntax must hook every stage it affects, or it leaks: a formula must
parse, read as words in plain text, count as one unit when truncated, stay
whole when a title is flattened, match as a unit in search, be written back
when bodies are serialised, and render.

| Field | Stage | Read by |
|---|---|---|
| `fromMarkdown` | parsing fragments: micromark and mdast extensions | `markdown/parse.ts` |
| `toMarkdown` | serialising environment bodies back to Markdown | `mdx-env/remark.ts` |
| `literals` | plain-text reading and truncation length of the leaf nodes the syntax adds | `markdown/plain.ts`, `markdown/truncate.ts` |
| `atom` | elements kept whole when flattened, matched as one unit by search | `markdown/hast.ts`, `markdown/highlight.ts` |
| `render` | rewriting a sanitised fragment (runs last) | `markdown/render.ts` |
| `remarkPlugins`, `rehypePlugins` | MDX pages, ahead of the engine's own plugins (the metadata pass reuses the remark plugins only) | `source.config.ts` |

Syntaxes are merged stage by stage in the order `course.server.ts` lists the
domains. If the syntax renders text that is visually hidden (as KaTeX's MathML
is), set `data-search-skip` on it so the terminal's in-page highlight skips it.

`domain-math`'s `mathSyntax` (`tex/syntax.ts`) fills every field: parsing with
`micromark-extension-math` and `mdast-util-math` (`$x$` and `$$x$$`); literals
read with `simplifyTex` (`\mathrm{rank}(A)` reads as `rank(A)`) and counted as
the formula plus its dollar signs; KaTeX elements as atoms, matched by a word of
the simplified formula or a command name (`det` matches `\det`); `applyKatex` as
the renderer; and `remark-math`, `rehype-katex` and two KaTeX rehype plugins
for pages. `domain-diagrams` has only a remark plugin (`remarkMdxMermaid`, which
turns ` ```mermaid ` fences into `<Mermaid chart>`).

## The baseline's domains

**`domain-math`**: environments and TeX.

| Component | Code | Role | Style | Extras |
|---|---|---|---|---|
| Theorem, Proposition, Corollary, Lemma | TH, PR, CR, LM | uses | emphasis | |
| Definition | DF | uses | plain | underline |
| Method | MT | uses | plain | overline |
| Example | EG | practises | plain | optional slug; `challenge`, `exam`, `routine` |
| Proof | PF | derives | subdued | optional slug, untitled, end mark; "Proves" / "Proved by"; "Walk the proof" |

**`domain-code`**: environments and `Output`. Its course was proved out in a
scratch copy with no maths anywhere in the output.

| Component | Code | Role | Style | Extras |
|---|---|---|---|---|
| Concept | CN | uses | plain | underline |
| Pattern | PT | uses | emphasis | |
| Pitfall | PF | uses | plain | overline |
| Example | EG | practises | plain | optional slug |
| Exercise | EX | practises | plain | `warm-up`, `core`, `stretch` |
| Solution | SL | derives | subdued | optional slug, untitled; "Solves" / "Solved by"; "Walk the solution"; titled "Solution to …" |
| Output | | | | a command and its output; exports as a ` ```console ` block |

**`domain-diagrams`**: `Mermaid`, drawn as box-drawing text on the server and
exported as a ` ```mermaid ` fence.

## Recipes

**A new domain:** add `packages/domain-<name>` with the layout above, importing
only `engine` types, and run `bun install` (the `paths` wildcard already
covers it). Courses list it in their four course files.

**A new component:** add its spec to `index.ts`, its renderer to
`components.tsx`, and, if its export should differ from its text content, a
`markdown` (and, if prompts should differ, `context`) method to `server.ts`.
Export code never changes.

**A new environment:** a component with a `role`. Its MDX tag, kind view, rail
mark, OG census code, exports, dock entries and prompts follow with no other
change.

**A new notation:** a `syntax` in the domain's `server.ts`, filling every
stage it affects; list the domain's `server.ts` and `styles.css` in the course.

## Invariants

- Domains import nothing from the engine but `engine` types.
- `index.ts` is plain data; `server.ts` and its imports never reach a browser
  bundle (the import test checks this).
- Export methods are deterministic, read the graph only through their
  `GraphReader` and link only through `link(id)`.
- Tags, kinds, codes, labels and plurals are unique across the domains a course
  lists.
