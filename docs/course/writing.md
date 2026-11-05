# Writing notes

Notes are MDX pages under `content/docs/`. Most of a page is ordinary Markdown;
the structure the engine works from comes from **environments**: typed blocks
such as `<Definition>`, `<Theorem>` and `<Proof>` that name themselves with a
slug and cite each other. Which environments exist depends on the domains the
course lists. The examples here use `domain-math`.

The build checks everything on this page. A typo in a slug, a nested
environment or an unknown component fails the build with an error naming the
problem (and, for problems within one page, the file and line), rather than
producing a dead link ([What fails the build](#what-fails-the-build)).

## Pages

Each `.mdx` file is a page, ordered by its folder's `meta.json`
([Strands and chapters](config.md#strands-and-chapters)). Frontmatter:

```yaml
---
title: Complex polynomials
description: Complex coefficients, roots, factorisation and real factors.
tags: [algebra]
ideas: [complex-polynomials, roots, factorisation]
---
```

| Field | Used for |
|---|---|
| `title` | the heading, `<title>`, the sidebar, search, exports and the OG image; Markdown and TeX allowed |
| `description` | the lede under the title, the meta description, the OG image, `llms.txt`; Markdown allowed |
| `icon` | a Lucide icon name for the sidebar |
| `full` | `true` for a full-width page without the table of contents |
| `ideas` | the "ideas" on the OG image and in exports |
| `tags` | export frontmatter |

**Links between pages** are ordinary Markdown links
(`[complex arithmetic](/algebra/complex-numbers/complex-arithmetic)`). A link
from one strand page to another becomes a `references` relation in the exports.
Links aren't checked; a link to nothing adds nothing. To depend on a result,
cite it with `of` instead, which is checked.

## Environments

```mdx
<Theorem slug="remainder-theorem" of="polynomial-root" thread="modes: the roots of p">

## Remainder theorem

<Statement>

When $p(z)$ is divided by $z-\alpha$, the remainder is the complex number $p(\alpha)$.

</Statement>

Notes, remarks, pictures…

</Theorem>

<Proof of="remainder-theorem">

Polynomial division gives …

</Proof>
```

Inside an environment:

- the **first heading** is its title (any level). Untitled kinds such as Proof
  have none and are labelled from what they prove: "Proof of Theorem. Remainder
  theorem". Every heading with an id goes into the table of contents.
- `<Statement>` marks its **statement**: the short form repeated in recalls,
  previews, the reading dock, thread stations and exports. Give every
  environment that states something a statement.
- everything else is its **body**.

The notes leave a blank line after each opening tag and before each closing tag.

### Attributes

| Attribute | Value | Rules |
|---|---|---|
| `slug` | one slug | `^[a-z][a-z0-9-]*$`, unique across the course; required unless the kind's slug is optional (maths: Example, Proof) |
| `of` | comma-separated slugs | what this environment cites; the meaning depends on its role (below); every slug must exist |
| `see` | comma-separated slugs | "see also": related, not needed; every slug must exist |
| `difficulty` | one of the kind's difficulties | only on practice kinds with a scale (maths' Example: `routine`, `exam`, `challenge`) |
| `thread` | `slug[: role]; slug[: role]` | joins threads, each once, with an optional role in inline Markdown ([Threads](#threads)) |

Attributes must be **static strings**: no `{expressions}`, no spread
attributes. The engine reads them without running the page. An authored `id`
is overwritten.

### Citing with `of`

What `of` means is set by the citing environment's **role**:

| Role | Maths kinds | `of` means | What readers get |
|---|---|---|---|
| `uses` | Definition, Theorem, Lemma, Proposition, Corollary, Method | "builds on" | prerequisites in exports; "builds on" / "leads to" in the dock |
| `derives` | Proof | "proves" | the proof is attached under each result it proves, in exports and prompts; the result offers "Walk the proof" |
| `practises` | Example | "practises" | "practised in" on what it practises; the practice prompts ("Quiz me" poses it as an exercise) |

Cite by slug, never by URL. Slugs are unique across the course, so moving a
theorem to another page changes no citation, and a cited slug that doesn't
exist fails the build.

### Ids and anchors

| Element | Anchor | Example |
|---|---|---|
| environment | `<kind>-<n>`, counted per kind per page | `theorem-3` |
| recall | `recall-<slug>-<n>`, counted per slug per page | `recall-span-1` |
| thread | `thread-<slug>` | `thread-modes` |

Anchors are generated, so many environments (examples, proofs) can go without
a slug. The cost: inserting a theorem above another shifts the later one's
anchor, and links to it from outside the site break. **Slugs are the stable
handle**; anchors are not.

### The maths environments

| Component | Code | Role | Look |
|---|---|---|---|
| Theorem, Proposition, Corollary, Lemma | TH, PR, CR, LM | uses | emphasised: inverted rail mark, bold title |
| Definition | DF | uses | underlined rail mark |
| Method | MT | uses | overlined rail mark |
| Example | EG | practises | slug optional; difficulty `routine`, `exam` or `challenge` |
| Proof | PF | derives | slug optional, untitled, QED box, muted; "Proves" / "Proved by" |

The code appears on the rail when the environment is too short for the word,
in thread stations and on OG images. `domain-code`'s environments are listed in
[Writing a domain](../domains.md#the-baselines-domains).

## Recall

```mdx
<Recall of="complex-number" />
```

Restates another environment (its title and statement) with a link back to the
original. Use it where a page leans on a result from elsewhere. A recall counts
as a citation: the original lists the pages that recall it, and a recall of an
environment on another page links the two pages in the dock and the exports.
`of` takes exactly one slug.

## Threads

A **thread** is a named idea that recurs across the course, such as "a basis
turns vectors into columns" or "every solution is a particular solution plus
the kernel". Dependencies are almost all local (about 95% stay within a
chapter), so they can't show the ideas that tie strands together. Threads do.

Define a thread once, where the notes explain the idea:

```mdx
<Thread slug="particular-plus-kernel" summary="Every solution of $T(x)=b$ is one particular solution plus an element of $\ker T$.">

### Kernels and solution sets

Prose about the idea…

</Thread>
```

`slug` and `summary` are required, and the section must start with a heading
(its title). Then tag each place the idea appears, anywhere in the course, with
how that place uses it:

```mdx
<Theorem slug="affine-solution-set" of="kernel" thread="particular-plus-kernel: linear differential equations">
```

- A role is optional inline Markdown after the colon; an environment can join
  several threads, separated by `;`.
- Only environments can join a thread, not prose.
- A thread is worth adding when its members span chapters or strands; within a
  page, `of` already says it.
- Each thread gets a section with a `[COMPARE]` spine of every place, a route
  in the reading dock, a page at `/threads/<slug>`, and its own exports and
  "Ask AI" menu.

`<ThreadMap />` renders the list of every thread, each linking to its page.
MATH1251 puts every thread definition and the map on `/core`.

## Other components

Anything else a listed domain provides can be used anywhere in prose,
environments, lists and quotes, except inside a table.

- **Diagrams** (`domain-diagrams`): a ` ```mermaid ` fence is drawn as a
  diagram, and written back as a fence in the exports.
- **Domain components**, such as `domain-code`'s
  `<Output command="ls">…</Output>`, render with the domain's renderer and
  export through its export method (or as their text content).

**Props must be literals** (`label="f"`, `domain={[-2, 2]}`, a bare `smooth`)
or name a literal `export const` on the same page (here for a domain that
provides a `Plot` component):

```mdx
export const range = { from: -2, to: 2 }

<Plot range={range} />
```

Computed props (`{x * 2}`) and spreads (`{...props}`) fail the build: exports
are built from the source without running the page. A prop that names a slug
(the component declares which ones) must name a defined slug.

Search, previews, the dock and thread stations see a component only as its
text content (its children).

## Placement rules

- **Environments, `Recall`, `Thread` and `ThreadMap` sit at the top level of the
  page**: not inside a list, a quote, a callout or another environment. Nested
  environments are a build error, not a silently unindexed block.
- **Components can't sit inside a table.**
- **Every JSX element must be known:** a listed domain's component, an engine
  element or a lower-case HTML tag. Fumadocs' `Callout`, `Tabs` and `Cards` are
  unknown until a domain wraps them.
- **A block component used mid-sentence** (one whose export is a code fence,
  such as `<Output>` or a diagram) gives invalid Markdown in the exports. Put
  it on its own line. Similarly, inside a list item a multi-line component is
  indented to fit only when it starts the line. ([Known issues](../limitations.md#known-issues))

## What readers get

Nothing beyond the source above is needed for any of this:

- **Kind views:** every page gets one generated page per kind it contains
  (`/algebra/vector-spaces/spans/definitions`), reached from each environment's
  rail mark and from the terminal.
- **Footnotes** under each environment: what it cites, its "see also", and the
  first few that cite it.
- **The reading dock:** what the environment being read builds on, leads to
  and is practised in, and its threads.
- **Exports:** a Markdown file and a prompt context for every page,
  environment, kind view and thread; `llms.txt`, `llms-full.txt` and
  `graph.json`; and "Ask AI" on every environment (right click), recall, thread
  and page.

## What fails the build

| Problem | Where |
|---|---|
| a slug defined twice, or a cited slug (`of`, `see`, `Recall`, a slug prop) that doesn't exist | anywhere in the course |
| an environment without a required slug, or with an invalid one | the environment |
| a `difficulty` not in the kind's scale, or on a kind without one | the environment |
| an attribute that isn't a static string | environments, recalls, threads |
| an environment, `Recall`, `Thread` or `ThreadMap` that isn't at the top level | the element |
| a `thread` tag naming an undefined thread, a thread slug defined twice, or a `<Thread>` without a heading | the tag or section |
| JSX that is no listed component, engine element or HTML tag | the element |
| a component inside a table, or with a computed or spread prop | the component |
| invalid frontmatter | the page |
| strands in `course.config.ts` that don't match `content/docs/meta.json` | the config |
