---
id: /algebra/complex-numbers/complex-polynomials/theorems
type: kind-view
kind: theorem
title: "Theorems: Complex polynomials"
course: "MATH1251 Mathematics 1B (UNSW Sydney)"
strand: algebra
page: /algebra/complex-numbers/complex-polynomials
markdown: /llms.mdx/docs/algebra/complex-numbers/complex-polynomials/theorems/content.md
---

# Theorems: Complex polynomials

Theorems from [Complex polynomials](/algebra/complex-numbers/complex-polynomials), without the surrounding lecture prose.

## Theorem. Remainder theorem

ID: `/algebra/complex-numbers/complex-polynomials#theorem-1`

### Statement

When $p(z)$ is divided by $z-\alpha$, the remainder is the complex number $p(\alpha)$.

- Uses: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3)
- Proved by: [Proof of Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#proof-1)
- Used by: [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)

## Theorem. Factor theorem

ID: `/algebra/complex-numbers/complex-polynomials#theorem-2`

### Statement

A number $\alpha\in\mathbb C$ is a root of $p$ if and only if $z-\alpha$ is a factor of $p(z)$.

- Uses: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3), [Definition. Polynomial factor](/algebra/complex-numbers/complex-polynomials#definition-4), [Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#theorem-1)
- Proved by: [Proof of Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#proof-2)
- Used by: [Theorem. Uniqueness of polynomial coefficients](/algebra/complex-numbers/complex-polynomials#theorem-3), [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5)
- Practised by: [Example. A complex conjugate pair of roots](/algebra/complex-numbers/seen#example-1)
- Recalled by: [Seen questions](/algebra/complex-numbers/seen)

## Theorem. Uniqueness of polynomial coefficients

ID: `/algebra/complex-numbers/complex-polynomials#theorem-3`

### Statement

Two complex polynomials agree for every $z\in\mathbb C$ if and only if their corresponding coefficients are equal. In particular, a complex polynomial is zero for every $z$ if and only if all its coefficients are zero.

### Notes

This is why identities between polynomial functions can be checked
coefficient by coefficient.

To see why, subtract the two polynomials. If the result were a non-zero
polynomial of degree $d$, it could have at most $d$ distinct roots: each root
supplies a linear factor by the factor theorem. After dividing out
$z-\alpha$, any other root $\beta\ne\alpha$ remains a root of the quotient,
so we can repeat this step at most $d$ times. It therefore cannot vanish at
every complex number.

- Uses: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1), [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)

## Theorem. Fundamental theorem of algebra

ID: `/algebra/complex-numbers/complex-polynomials#theorem-4`

### Statement

Every complex polynomial of degree $n\ge1$ has at least one complex root.

### Notes

The theorem is stated without proof. It guarantees that a root exists, not a
formula for finding it.

Applying the factor theorem to that root and then repeating with the
quotient, gives the full factorisation below. This is what is special about
$\mathbb C$: over $\mathbb R$, a polynomial such as $z^2+1$ cannot be
factored into real linear factors.

- Uses: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1)
- See also: [Theorem. Counting eigenvalues](/algebra/eigenvalues/eigenvalues-and-eigenvectors#theorem-2)
- Used by: [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5)
- Practised by: [Example. Roots of a real polynomial](/algebra/complex-numbers/seen#example-4)
- Recalled by: [Seen questions](/algebra/complex-numbers/seen)

## Theorem. Factorisation over the complex numbers

ID: `/algebra/complex-numbers/complex-polynomials#theorem-5`

### Statement

Every complex polynomial of degree $n\ge1$ can be written

$$
p(z)=a(z-\alpha_1)(z-\alpha_2)\cdots(z-\alpha_n),
$$

where $a$ is the coefficient of $z^n$ and the $\alpha_j\in\mathbb C$ are roots, counted with multiplicity.

- Uses: [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2), [Theorem. Fundamental theorem of algebra](/algebra/complex-numbers/complex-polynomials#theorem-4)
- Proved by: [Proof of Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#proof-3)
- Used by: [Corollary. Count roots with multiplicity](/algebra/complex-numbers/complex-polynomials#corollary-1), [Proposition. Real linear and quadratic factors](/algebra/complex-numbers/complex-polynomials#proposition-2)
- Practised by: [Example. Factorise a quadratic](/algebra/complex-numbers/complex-polynomials#example-4), [Example. Factorise $z^8-1$](/algebra/complex-numbers/complex-polynomials#example-5), [Example. Factorisation over the real and complex numbers](/algebra/complex-numbers/seen#example-2), [Example. Roots of a high-degree complex polynomial](/algebra/complex-numbers/seen#example-3), [Example. Roots of a real polynomial](/algebra/complex-numbers/seen#example-4)
- Recalled by: [Seen questions](/algebra/complex-numbers/seen)
