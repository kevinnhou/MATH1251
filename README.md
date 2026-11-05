# MATH[1251]

Lecture notes for MATH1251 Mathematics 1B (UNSW Sydney): complex numbers,
linear algebra and eigenvalues alongside multivariable calculus, integration
techniques, Taylor series and differential equations. The notes are written as
typed environments (definitions, theorems, proofs, examples, …) that cite each
other, and the site turns those citations into a reading dock, threads across
the course, a sidebar terminal, offline reading and Markdown and prompt exports
for LLMs.

The course lists `domain-math` (maths environments and TeX) and
`domain-diagrams` (Mermaid) in `course.config.ts`. Its own files are the
`course.*` files, `course/`, `content/docs/` and this readme; everything else
is the engine, documented in [docs/](docs/README.md).

```
bun install
bun dev
```

## Limitations

The engine's limits, and the rules for changing anything outside the course
files, are in [docs/MIGRATION.md](docs/MIGRATION.md) (Limitations, Updating
courses from the baseline).
