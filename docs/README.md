# Course engine

A Next.js 16 and Fumadocs site that turns a folder of MDX notes into a linked,
searchable, installable course. Notes are written as typed **environments**
(definitions, theorems, proofs, examples, …) that cite each other by slug. The
engine indexes those citations into a graph and uses it everywhere:

- a **reading dock** that follows the passage being read and shows what it
  builds on and leads to;
- **threads** that follow one idea across the course;
- a keyboard-driven **terminal** in the sidebar;
- **offline reading** as an installable app;
- **Markdown and prompt exports** for language models, with "Ask AI" links to
  ChatGPT, Claude and Cursor.

Every course is a clone of this repo (the **baseline**) with its own course
files and the **domains** it lists. The engine (`src/`) and the domains
(`packages/domain-*`) are the same in every course.

## Where to start

| I want to… | Read |
|---|---|
| write or edit notes | [Writing notes](course/writing.md) |
| set up a new course, run it, or take engine updates | [Starting a course](course/start.md) |
| change a course's name, strands, theme, domains or schedule | [Configuring a course](course/config.md) |
| add components or notation for a subject | [Writing a domain](domains.md) |
| change the engine | [Architecture](engine/architecture.md), then the module's doc |
| know what the engine can't do, and why | [Limitations](limitations.md) |
| see what's still planned | [Roadmap](roadmap.md) |

## Terms

| Term | Means |
|---|---|
| **engine** | the subject-neutral app in `src/` |
| **baseline** | the repo every course is cloned from |
| **course** | one set of notes: the course files, the content and the domains it lists |
| **domain** | a workspace package in `packages/domain-*` that provides components and, optionally, notation |
| **component** | an MDX tag a domain provides (`<Theorem>`, `<Mermaid>`, `<Output>`) |
| **environment** | a component with a graph role; the code calls its type a **kind** (`theorem`) |
| **role** | what an environment's citations mean: `uses`, `derives` or `practises` |
| **engine element** | an MDX tag the engine itself provides (`<Recall>`, `<Statement>`, `<Thread>`, `<ThreadMap>`) |
| **strand** | a top-level content folder (`algebra`), shown as a sidebar tab |
| **chapter** | a folder inside a strand |
| **slug** | an environment's course-wide name (`rank-nullity`), used to cite it |
| **thread** | a named idea that environments across the course join |
| **kind view** | a generated page listing one kind from one page (`…/spans/definitions`) |
| **node ID** | a page's or environment's site path (`/algebra/x#theorem-1`); every export links by it |

## All docs

```
docs/
  README.md              this page
  course/
    start.md             create a course, run it, scripts, golden outputs, baseline updates
    config.md            the course files and every config field; strands, chapters, schedule
    writing.md           authoring: pages, environments, citations, recalls, threads, components
  domains.md             writing a domain: package layout, components, roles, wording,
                         renderers, export methods, notation
  engine/
    architecture.md      the three parts, the course binding, modules, layering, global
                         decisions and invariants, conventions, verifying changes
    compile.md           MDX on disk to prerendered output: metadata pass, loader, corpus, client data
    markdown.md          fragment rendering outside MDX, sanitising, TeX
    environments.md      the environment engine: the remark pass, indexes, registry, kind views, rendering
    export.md            the export graph, Markdown and JSON exports, prompts, the ask panel
    relations.md         the course outline, the reading dock, threads and the threads page
    terminal.md          the sidebar terminal: commands, directories, search, keys
    pwa.md               the service worker, caching, offline behaviour
    site.md              routes, layouts, the docs page, metadata and OG images, theming
  limitations.md         every intentional limit, plus known issues
  roadmap.md             what's left: cutting the baseline, open questions
```

## How these docs are written

- **One home per fact.** Each fact lives in one doc; others link to it. Course
  authors' material lives in `course/`, domain authors' in `domains.md`, and
  engine internals in `engine/`.
- **Engine docs share a shape:** what the module does and where it sits, its
  files, its concepts, then **Design decisions** (each with its reason and its
  cost), **Changing things** (recipes), **Performance** and **Invariants**
  (rules that keep it correct; breaking one usually doesn't fail loudly).
- **Limitations live in [limitations.md](limitations.md)**, grouped by area, so
  the full list of what the engine deliberately doesn't do is in one place.
- **Figures** (sizes, counts, timings) are measured on MATH1251's last
  production build, and say so. They are there for scale, not as contracts.
- British spelling. Code names in backticks, and only names that exist in the
  code; a sweep for backticked names missing from `src/` and `packages/` finds
  stale ones.
- Change the docs in the same commit as the code they describe.
