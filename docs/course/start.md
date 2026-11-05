# Starting a course

A course is a clone of the baseline. It edits only its **course files** (the
config, the content, the logomark, its readme and its golden outputs) and
takes every engine change by merging the baseline. This page covers creating a
course, running it, checking it and updating it. What each course file holds
is in [Configuring a course](config.md).

> **Status:** the baseline hasn't been cut yet. This repo is still both the
> baseline and MATH1251 ([Roadmap](../roadmap.md)). Until then, "the baseline"
> below means this repo.

## Create a course

1. Clone the baseline into a new repo, then add it as a remote:

   ```
   git clone <baseline-url> my-course && cd my-course
   git remote set-url origin <new-repo-url>
   git remote add baseline <baseline-url>
   ```

2. Edit the course files ([Configuring a course](config.md)): the config, the
   content under `content/docs/`, `course/logomark.tsx`, `README.md`.
3. List the domains the course uses in `course.config.ts`, `course.server.ts`,
   `course.components.ts` and `course.css`, and delete the rest from
   `packages/` (`git rm -r packages/domain-<name>`).
4. Run a real `bun install`. Deleting a domain changes `bun.lock`, because Bun
   drops its workspace entry. A symlinked `node_modules` won't work: Turbopack
   doesn't follow it.
5. Pick the golden outputs to track (below), then build and check:

   ```
   bun run build && bun run golden --update && bun run types:check
   ```

Strands in `course.config.ts` must match the top-level folders in
`content/docs/meta.json`, in the same order, or the build fails.

## Run it

```
bun install
bun dev
```

| Script | What it does |
|---|---|
| `bun dev` | development server; the service worker is off |
| `bun run build` | production build: every page and export is prerendered |
| `bun start` | serve the production build (use this to test offline behaviour) |
| `bun run types:check` | route typegen, then `tsc` for the app and for the service worker (`tsconfig.sw.json`) |
| `bun run check` / `bun run fix` | Ultracite (Biome) lint and format |
| `bun test` | the import rules (`test/imports.test.ts`) and the component pass (`test/components.test.ts`) |
| `bun run golden` | after a build, compares every file in `test/golden/` with the build output |

- A Husky pre-commit hook runs `ultracite fix` and re-stages the files that
  were staged.
- CI (`.github/workflows/ci.yml`) runs on pull requests and pushes to `main`:
  install with a frozen lockfile, lint, tests, build, the golden check and
  `types:check`.
- In dev, a content error (a bad slug, an unknown component) becomes a module
  that throws when imported, so the server stays up and shows the error on the
  next request; save a fix and it recovers. In a production build the same
  error fails the build.

## Golden outputs

`scripts/golden.ts` compares chosen export files in `.next/server/app/` with
committed copies in `test/golden/`, so a change that alters an export shows up
as a diff. Each course chooses its own set; MATH1251 tracks 17 files:
`graph.json`, `llms.txt`, `llms-full.txt` and a sample of page, environment,
kind-view, thread and context documents.

| Command | Does |
|---|---|
| `bun run golden` | compare (after `bun run build`); fails on any difference |
| `bun run golden --update` | rewrite every tracked file from the build |
| `bun run golden --add <path>` | start tracking one more output: a path under `.next/server/app/` without `.body` (`llms.txt`) |

When a check fails, it prints the changed files; inspect one with
`git diff --no-index test/golden/<file> .next/server/app/<file>.body`, and run
`--update` if the change is intended. `test/golden/` is excluded from Biome,
which would reformat the JSON. Don't track anything carrying the build
revision (`sw.js`): it changes on every build.

The golden set is a sample. It never checks prompt text (built in the browser
from context JSON) or most documents, so a refactor needs more than a passing
golden check ([Verifying changes](../engine/architecture.md#verifying-changes)).

## Take engine updates

```
git fetch baseline && git merge baseline/main
git checkout baseline/main -- bun.lock && bun install
bun run types:check && bun run build
```

Rules that keep merges clean:

- **A course never edits engine files.** Fix the engine in the baseline, then
  merge. A course that edits engine files will hit conflicts.
- **The baseline never edits course files** after it is cut, and new config
  fields get defaults, so an old config keeps building.
- **A deleted domain stays deleted.** If the baseline changed a domain the
  course removed, keep the deletion: `git rm -r packages/domain-<name>`.
- **Optional:** add `.gitattributes` entries
  `course.* course/** content/** test/golden/** README.md merge=ours` and run
  `git config merge.ours.driver true` once, so merges always keep the course's
  side of its own files.

Courses share the baseline's `package.json` and lockfile (every domain ships in
the baseline), which is why the lockfile can be taken from the baseline
wholesale.
