# Notes register

Lecture notes, generated from slides. Australian spelling (`recognise`, `catalogue`, `neighbour`).

## What the page must make answerable

Not a heading list. The reader should be able to recover these from the prose and the graph, without a Why / When / Connections template:

- why this object is introduced here
- what it uses, and what later uses it (`of` / `see` / `Recall`)
- when it is the right tool
- which other formulation is the same underlying fact

**Condense** = drop a condition, case split, dependence, or reason for introducing something; replace a proof with a vibe; collapse two perspectives into one slogan.

**Concise** = no restatement, no “in this section we will”, no recap of a theorem just stated. Full derivations, without commentary that does not change the next step.

Expand without inventing: connective tissue is allowed; theorems, names, exam weightings, and course policy that are not in the slides or existing notes are not.

## Voice

- Lecture notes, not a blog. Mathematics in `we`, imperative, or controlled passive (`$f$ is defined by`). Keep `hence`, `thus`, `let`, “it follows that”.
- Second person only for the reader’s job or a typical mistake.
- Open a chapter with a few paragraphs that say what it is *for* and what it assumes. No learning-outcomes list, no contents dump.
- Intuition never replaces a `<Proof>`. Conditions stay on the theorem.
- One concrete mistake sentence beats a “Common pitfalls” heading.
- A connection is a sentence after `</Statement>`, not an H2.
- Headings in sentence case.
- Equations are nouns in sentences. Do not start a sentence with a symbol.
- Repeat the right word. Do not rotate `map` / `function` / `transformation` unless the distinction is real.
- `only`, `almost`, `never` stay when they are logic. Empty `just` / `simply` / `actually` do not.

## Cut these shapes

A sentence that could sit unchanged on any other course’s notes page is filler. Cut it or replace it with a fact from the slides.

- Throat-clearing and announced insight: “the key point is”, “this matters because”, “it is important to note”.
- Recap endings and “in conclusion”.
- Binary theatre: “This is not X. It is Y.” State the comparison in one sentence when both sides are real.
- Synonym cycling and rule-of-three padding.
- Chatbot residue, sales language, invented importance.

Do not ban em dashes, triads, or sentence-initial Why / How. Do not force a human subject onto a definition. Do not invent a persona to make plain notes feel “alive”.

## Specimens

**Situate, then name.**

```mdx
A spanning set is a generating set: every vector in the space is a combination of those few. The definition is the name; the subspace theorem is why the name is worth having.

<Definition slug="span">

### Span

<Statement>

The *span* of $S\subseteq V$ is the set of all finite linear combinations of vectors in $S$.

</Statement>

</Definition>
```

Not: “In this section we will define span. You will learn how to…” followed by a contents list.

**Claim in `Statement`; relation and mistake outside.**

```mdx
<Method slug="span-membership" of="span" see="span-is-subspace">

### Test membership in a span

<Statement>

To decide whether $v$ lies in $\operatorname{span}\{u_1,\ldots,u_k\}$, solve $\alpha_1 u_1+\cdots+\alpha_k u_k=v$. A solution exists if and only if $v$ is in the span.

</Statement>

This is the membership reading of the definition, not a different idea. Forgetting to allow the empty combination is how $0$ gets reported as “not in the span”.

</Method>
```

Not: a “Key insight” heading, a “Connections” heading, or “Common pitfalls: always remember the zero vector.”

**Proof is the argument.**

```mdx
<Proof of="span-is-subspace">

$0$ is the empty combination. If $u=\sum\alpha_i s_i$ and $w=\sum\beta_i s_i$, then $u+w$ and $\lambda u$ are combinations of the same $s_i$.

</Proof>
```

Not: “Intuitively, combining vectors stays inside the set, which is why the span is a subspace.”
