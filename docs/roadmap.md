# Roadmap

The move to a baseline with domain packages is done up to cutting the baseline.
What's left, and the decisions still open. The design it implements is in
[Architecture](engine/architecture.md); its history is in git.

## Cut the baseline

- [ ] **Decide whether `Recall` stays.** Decide before cutting, or every course
      inherits it.
- [ ] **Create the baseline repo from this one.** Its first commit replaces the
      course files with a sample: a `course.config.ts`, a small `content/` (two
      strands, cross-citing environments, one thread), a placeholder logomark,
      and every domain.
- [ ] **Turn this repo into the MATH1251 course.** Add the `baseline` remote and
      run `git merge -s ours baseline/main` once, so the sample commit never
      replaces MATH1251's files. Later merges bring only engine changes.

## When a course needs it

- **Renaming a domain's components in the config.** Needed before one course
  can list two domains that clash, such as `domain-math` and `domain-code`
  (both define `Example` and the code `PF`).
- **Moving a domain to its own repo.** Move the folder and add a build step
  (`tsc` to `dist/`).

## Known issues to fix

The [known issues](limitations.md#known-issues): block components used inline,
mid-line components in lists, the `llms.txt` wording, and the unstyled
`data-dock-active` on thread sections.
