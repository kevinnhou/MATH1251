# Math-env syntax

A notes page is an ordered stream of three things:

1. **Prose** — ordinary markdown at the document root. It says why the next object exists, and how it sits next to what came before.
2. **Environments** — named tenets (`Definition`, `Theorem`, `Method`, …). Each is one mathematical object the graph can point at.
3. **Recalls** — `<Recall of="slug" />`. Brings an already-defined tenet back when the reader needs it again.

Pick the kind by what the object *is*, then fill the anatomy below. Do not wrap anything in `<Prose>` or `<KindFilter>`: the remark plugin injects those.

## Page shell

```yaml
---
title: Span
description: The set of all linear combinations, and how to test membership.
tags: [linear-algebra]
ideas: [span, linear-combination]
---
```

`title` and `description` are required by the docs schema. `tags` and `ideas` default to `[]`. `ideas` are page-level themes for the graph, not tenet slugs.

Then: situating prose, then environments and recalls interleaved. Use `##` for page sections. Environment titles are a `###` heading *inside* the tag.

## Anatomy of an environment

```mdx
<Theorem slug="span-is-subspace" of="span" see="span-membership">

### The span is a subspace

<Statement>

If $S\subseteq V$, then $\operatorname{span}(S)$ is a subspace of $V$.

</Statement>

The zero vector is the empty combination. Closure is the same linear combination written once.

</Theorem>
```

| Slot | Role |
| --- | --- |
| Tag | The kind. Capitalised English: `Definition`, `Theorem`, `Lemma`, `Proposition`, `Corollary`, `Method`, `Example`, `Proof`. |
| Attributes | Static strings only. `slug="…"`, `of="a,b"`, `see="c,d"`, `difficulty="routine"`. Never `slug={expr}`. |
| First `###` heading | The title. Omitted on `Proof`. |
| `<Statement>` | The canonical claim. This is what the graph previews. |
| Everything else in the tag | Notes: why, a typical mistake, an equivalent view. Not a second statement of the claim. |

Environments and `Recall` must be **direct children of the document**. Do not nest them in lists, block quotes, or other environments. Do not set `id`: the plugin assigns `theorem-1`, `recall-span-1`, and so on.

## Which kind

| If the object is | Use | Graph |
| --- | --- | --- |
| A term you are naming | `Definition` | always (slug required) |
| A fact the course will cite | `Theorem` | always |
| A fact used only to reach a theorem | `Lemma` | always |
| A fact worth stating, thinner than a theorem | `Proposition` | always |
| A fact that follows in one step | `Corollary` | always |
| A decision procedure | `Method` | always |
| A worked instance | `Example` | if-cited (slug optional; add one if anything will `of`/`see`/`Recall` it) |
| The justification of a fact | `Proof` | if-cited (untitled; `of` the fact) |

A slide that says “theorem” is not automatically a `Theorem`. If it is a procedure, it is a `Method`. If it is a calculation, it is an `Example`.

## Slugs

Pattern: `^[a-z][a-z0-9-]*$`. No leading slash, no colon, no uppercase.

Unique **across the whole site**, not just the page. Grep existing slugs before inventing one.

Name the object, not the section: `span-is-subspace`, not `section-3-theorem-1`.

## `of`, `see`, and `Recall`

These are the graph. Keep them sparse.

| Attribute | Meaning | Typical |
| --- | --- | --- |
| `of` | This uses / is an instance of / proves | `Proof of="span-is-subspace"`; `Example of="span-membership"`; `Method of="span"` |
| `see` | Sibling, contrast, or the other formulation of the same idea | a membership test `see`s the subspace theorem |
| `Recall` | Resurface a defined tenet; does not create a slug | `<Recall of="span" />` |

`of` and `see` are comma-separated slug lists. No empty entries. Targets must already exist (this page or another). Do not `see` “everything later in the chapter”. Do not `of` a page path.

`<Recall of="span" />` is self-closing and root-level. Use it when a later method needs the definition in view. Do not copy the definition out by hand.

## Kind-specific rules

**Definition, Theorem, Lemma, Proposition, Corollary, Method.** `slug` required. Put the term, the fact, or the procedure in `<Statement>`. Notes outside it.

**Proof.** No title heading, no `slug` in ordinary use, no `<Statement>`. Requires `of` pointing at the fact being proved. Body is the argument.

```mdx
<Proof of="span-is-subspace">

The empty combination is $0$. If $u,w\in\operatorname{span}(S)$ then $u+w$ and $\lambda u$ are combinations of the same vectors, hence lie in the span.

</Proof>
```

**Example.** `difficulty` is allowed only here, and should be set: `routine`, `exam`, or `challenge`. `of` the method or theorem it illustrates. A slug is required only if something else will cite it. The worked calculation can be the whole body; a `<Statement>` is optional.

**Method.** The `<Statement>` is the procedure (the steps). Motivation and the usual dropped term sit outside it.

## What you never write

- `<Prose>`, `<KindFilter>`, or `id="…"`
- Nested `<Theorem>` / `<Recall>` / any env inside another env
- `difficulty` on anything but `Example`
- A `Proof` with a `###` title
- Learning-outcomes lists, a contents dump, or a “Connections” heading (the graph *is* the connections; one sentence after `</Statement>` can explain an edge)

## Specimen

A full legal page. Copy the shape, but not the topic.

```mdx
---
title: Span
description: Linear combinations as a set, then a test for membership.
tags: [linear-algebra]
ideas: [span, subspace]
---

A spanning set is a generating set: every vector in the space is a combination of those few. The definition is the name; the subspace theorem is why the name is worth having; the membership method is when you actually use it.

<Definition slug="span">

### Span

<Statement>

The *span* of $S\subseteq V$ is the set of all finite linear combinations of vectors in $S$.

</Statement>

</Definition>

<Theorem slug="span-is-subspace" of="span">

### The span is a subspace

<Statement>

If $S\subseteq V$, then $\operatorname{span}(S)$ is a subspace of $V$.

</Statement>

The same fact read as a test: a candidate $W$ fails to be a span the moment it misses $0$ or a sum of its own elements.

</Theorem>

<Proof of="span-is-subspace">

$0$ is the empty combination. If $u=\sum\alpha_i s_i$ and $w=\sum\beta_i s_i$, then $u+w$ and $\lambda u$ are combinations of the same $s_i$.

</Proof>

<Method slug="span-membership" of="span" see="span-is-subspace">

### Test membership in a span

<Statement>

To decide whether $v$ lies in $\operatorname{span}\{u_1,\ldots,u_k\}$, solve $\alpha_1 u_1+\cdots+\alpha_k u_k=v$. A solution exists if and only if $v$ is in the span.

</Statement>

This is the membership reading of the definition, not a different idea. Forgetting to allow the empty combination is how $0$ gets reported as “not in the span”.

</Method>

<Example slug="span-in-r2" of="span-membership" difficulty="routine">

### Is $(1,1)$ in $\operatorname{span}\{(1,0),(0,1)\}$?

Solve $\alpha(1,0)+\beta(0,1)=(1,1)$. Then $\alpha=1$, $\beta=1$, so yes.

</Example>

The same definition is the starting point for linear independence: a set is independent when the only combination that yields $0$ is the trivial one.

<Recall of="span" />
```

## Build fails when

- a required `slug` is missing or duplicated
- a slug does not match `^[a-z][a-z0-9-]*$`
- `of` / `see` / `Recall` name a slug that does not exist
- metadata is not a static string
- `difficulty` is set on a non-example, or is not `routine` | `exam` | `challenge`
- an environment or `Recall` is nested
