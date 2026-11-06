# Configuring a course

A course edits only its course files. Everything else is engine and changes in
the baseline ([Starting a course](start.md#take-engine-updates)).

## The course files

| File | Holds | Reached through |
|---|---|---|
| `course.config.ts` | the course: name, strands, theme, repo, the domains it lists, tutor rules, summary, schedule | `course.config` alias |
| `course.server.ts` | each listed domain's `server.ts`: notation and export methods | `course.server` alias |
| `course.components.ts` | each listed domain's `components.tsx`: React renderers | `course.components` alias |
| `course.css` | each listed domain's `styles.css` | relative `@import` from `app/global.css` |
| `course/logomark.tsx` | the course's mark (SVG); the header, favicon, app icons, PWA icons and OG images are all drawn from it | `course/*` alias |
| `content/docs/` | the notes ([Writing notes](writing.md)) | the docs collection |
| `README.md` | the course's own readme | |
| `test/golden/` | the course's golden outputs ([Starting a course](start.md#golden-outputs)) | `bun run golden` |

The engine reaches these only through the aliases, never by relative path, and
the files import only domains and engine types (through the `engine` alias):

```ts
// course.config.ts
import diagrams from "@kevinnhou/domain-diagrams";
import math from "@kevinnhou/domain-math";
import type { CourseConfig } from "engine";

export default {
	code: "MATH1251",
	domains: [math, diagrams],
	// …
} as const satisfies CourseConfig;
```

The config is split from `course.server.ts` because client components read the
config (the header, the course routes provider, the terminal). A domain's
`index.ts` is plain data, safe in the browser; its `server.ts` (KaTeX, export
methods) must never reach a browser bundle.

## `course.config.ts`

The default export satisfies `CourseConfig` (`src/lib/course/types.ts`).

| Field | Used for |
|---|---|
| `code` | PWA short name; the wordmark (split at the first digit: `MATH` + `[1251]`); the terminal history key |
| `name` | site name in page titles, the manifest, the application name and the Apple web-app title |
| `title` | full course title: the heading of `llms.txt`, the `course` field of every export, and the tutor role in prompts ("You are a tutor for …") |
| `description` | web manifest description |
| `home` | the strand whose index is the home page: `/` redirects there, it is the PWA start URL and the terminal's default directory, and its pages are titled with `name` instead of a strand tag. Must be one of `strands` |
| `strands` | the top-level content folders in display order: `id` (folder name and URL segment), `label` (tags, OG chip, export headings), `accent` (OG image colour) |
| `repo` | `owner`, `name`, `branch`: the GitHub link in the layout and each page's "SOURCE" link in the ask panel |
| `theme` | `light` and `dark` background colours: the browser theme colour, the manifest and the app icons. Keep them equal to the Fumadocs neutral preset's backgrounds; nothing checks this |
| `domains` | each listed domain's default export from `index.ts` ([Domains](#domains)) |
| `tutor` | subject-specific rules appended to the role of every LLM prompt ("Write mathematics in LaTeX.") |
| `summary` | optional: the line under the `llms.txt` heading. When absent, one is generated from the environments' plurals |
| `schedule` | optional: `"parallel"` (default) or `"sequential"` ([Schedule](#schedule)) |

Two checks fail the build when the config and the content disagree:
`lib/course/config.ts` throws if `home` is not a strand, and `assertStrands`
throws unless `strands` matches the top-level folders listed in
`content/docs/meta.json`, in the same order.

## Strands and chapters

```
content/docs/
  meta.json                 { "pages": ["core", "algebra", "calculus"] }: the strands, in order
  algebra/
    meta.json               the strand's title, icon and page order
    index.mdx               the strand's intro page (chapter 0)
    complex-numbers/        chapter 1
      meta.json
      index.mdx
      complex-polynomials.mdx
    vector-spaces/          chapter 2
```

A strand's `meta.json` marks it as a root and orders its pages:

```json
{
  "title": "Algebra",
  "root": true,
  "icon": "Music4",
  "pages": ["index", "---[Chapter 1]---", "complex-numbers", "---[Chapter 2]---", "vector-spaces"]
}
```

- `icon` is a Lucide icon name, shown in the strand's tab (in brackets).
- `---Label---` entries are sidebar separators; a label written as `[NAME]`
  gets bold brackets. They're display only.
- **Chapters are numbered by folder**, not by separator: each strand's own
  pages form chapter 0, and each folder inside it is chapter 1, 2, … in
  `meta.json` order. Chapter numbers decide the columns of the threads page.

**Adding a strand:** add the folder with its `meta.json`, then list it in
`content/docs/meta.json` and in `strands`, in the same order. Routes, the
Markdown proxy, labels, OG accents and exports follow.

The home strand can hold course-wide pages. In MATH1251, `core` holds the
mathematical language page, the concept map and every `<Thread>` definition.

## Schedule

`schedule` says how the strands are taught, which decides the order of every
thread's route and the rows of the threads page.

| Value | Means | A chapter's term |
|---|---|---|
| `"parallel"` (default) | the strands are taught side by side: chapter *k* of every strand is taught at the same time | its chapter number |
| `"sequential"` | the strands are taught one after another | its position in the page tree |

A thread runs through its places in term order, so under `"parallel"`
MATH1251's `modes` thread reads Algebra 1, Calculus 2, Algebra 4. A schedule is
all one or the other; a mix (two strands side by side, a third after them)
can't be expressed.

## Domains

A course chooses its subject's components and notation by listing domains. The
baseline ships three:

| Domain | Provides |
|---|---|
| `domain-math` | maths environments (Definition, Theorem, Lemma, Proposition, Corollary, Method, Example, Proof) and TeX notation rendered with KaTeX |
| `domain-diagrams` | ` ```mermaid ` fences rendered as diagrams |
| `domain-code` | code environments (Concept, Pattern, Pitfall, Example, Exercise, Solution) and `<Output>` |

Each listed domain goes in four places, one per entry point:

```ts
// course.config.ts       components as data
import math from "@kevinnhou/domain-math";
// course.server.ts       notation and export methods
import math from "@kevinnhou/domain-math/server";
// course.components.ts   renderers
import math from "@kevinnhou/domain-math/components";
```

```css
/* course.css */
@import "@kevinnhou/domain-math/styles.css";
```

**Notation is chosen separately from environments.** A course can take TeX
without maths environments: list `domain-math`'s `server.ts` in
`course.server.ts` and its `styles.css` in `course.css`, but leave it out of
`domains`.

Two listed domains can't define the same tag, code, label or plural; the build
fails with a list of clashes. Writing a new domain: [Writing a domain](../domains.md).

## What a course can't change

The fonts, the `content/docs` path, the frontmatter schema (`ideas`, `tags`),
relation IDs, the tutor role's preamble, the thread prompts and the URL scheme
are the same in every course. Changing any of them is an engine change, made in
the baseline. The full list: [Limitations](../limitations.md#courses).
