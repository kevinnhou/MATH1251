---
id: /algebra/complex-numbers/complex-polynomials
type: page
title: Complex polynomials
course: "MATH1251 Mathematics 1B (UNSW Sydney)"
strand: algebra
strand_label: Algebra
markdown: /llms.mdx/docs/algebra/complex-numbers/complex-polynomials/content.md
tags:
  - algebra
ideas:
  - complex-polynomials
  - roots
  - factorisation
---

# Complex polynomials

Complex coefficients, roots, factorisation and real factors.

This page studies polynomials whose coefficients come from [complex arithmetic](/algebra/complex-numbers/complex-arithmetic). It asks which polynomials have roots in $\mathbb C$ and how those roots determine the factors. The central result is that every non-constant complex polynomial splits into linear factors.

## Polynomial language

### Recall: Definition. Complex number

Recalls [Definition. Complex number](/algebra/complex-numbers/complex-arithmetic#definition-1) (in [Complex arithmetic](/algebra/complex-numbers/complex-arithmetic)).

A *complex number* is a number of the form

$$
z=a+bi,\qquad a,b\in\mathbb R,\qquad i^2=-1.
$$

The expression $a+bi$ is the Cartesian form of $z$. Its real part is $\operatorname{Re}(z)=a$ and its imaginary part is $\operatorname{Im}(z)=b$.

### Definition. Complex polynomial

ID: `/algebra/complex-numbers/complex-polynomials#definition-1`

#### Statement

A *complex polynomial* is a function $p:\mathbb C\to\mathbb C$ of the form

$$
p(z)=a_0+a_1z+a_2z^2+\cdots+a_nz^n,
\qquad a_0,\ldots,a_n\in\mathbb C,
$$

for a non-negative integer $n$.

#### Notes

The coefficients may be real or non-real. The word *polynomial* restricts the
exponents of the variable to non-negative integers, not the kinds of numbers
allowed as coefficients.

- Uses: [Definition. Complex number](/algebra/complex-numbers/complex-arithmetic#definition-1)
- Used by: [Definition. Degree](/algebra/complex-numbers/complex-polynomials#definition-2), [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3), [Definition. Polynomial factor](/algebra/complex-numbers/complex-polynomials#definition-4), [Theorem. Uniqueness of polynomial coefficients](/algebra/complex-numbers/complex-polynomials#theorem-3), [Theorem. Fundamental theorem of algebra](/algebra/complex-numbers/complex-polynomials#theorem-4), [Proposition. Conjugate roots for real coefficients](/algebra/complex-numbers/complex-polynomials#proposition-1), [Method. Find discrete modes from a characteristic equation](/algebra/complex-numbers/stability-of-systems#method-1), [Method. Find continuous modes from a characteristic equation](/algebra/complex-numbers/stability-of-systems#method-2)
- Practised by: [Example. Classify and find degrees](/algebra/complex-numbers/complex-polynomials#example-1)
- Recalled by: [Stability of systems](/algebra/complex-numbers/stability-of-systems)

### Definition. Degree

ID: `/algebra/complex-numbers/complex-polynomials#definition-2`

#### Statement

For a non-zero polynomial

$$
p(z)=\sum_{k=0}^n a_kz^k,
$$

the *degree* of $p$ is the largest integer $k$ for which $a_k\ne0$. The zero polynomial has undefined degree.

- Uses: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1)
- Practised by: [Example. Classify and find degrees](/algebra/complex-numbers/complex-polynomials#example-1), [Example. Roots of a high-degree complex polynomial](/algebra/complex-numbers/seen#example-3)

### Example. Classify and find degrees

ID: `/algebra/complex-numbers/complex-polynomials#example-1` · Difficulty: routine

The expressions

$$
0,\quad z,\quad z^{999},\quad 1+35z^4,\quad
i+\sqrt2\,iz^4+\pi z
$$

are complex polynomials. The non-zero polynomials $z$, $z^{999}$, $1+35z^4$ and $i+\sqrt2\,iz^4+\pi z$ have degrees $1$, $999$, $4$ and $4$, respectively. The zero polynomial has undefined degree.

An expression containing a fractional power such as $z^{1/2}$ is not a
polynomial in $z$. By contrast, numbers such as $2+3i$ and $(1-7i)^{17}$
are allowed as coefficients: only the powers of the variable must be
non-negative integers.

- Practises: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1), [Definition. Degree](/algebra/complex-numbers/complex-polynomials#definition-2)

### Definition. Polynomial root

ID: `/algebra/complex-numbers/complex-polynomials#definition-3`

#### Statement

A number $\alpha\in\mathbb C$ is a *root* of $p$ if

$$
p(\alpha)=0.
$$

- Uses: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1)
- Used by: [Definition. Root multiplicity](/algebra/complex-numbers/complex-polynomials#definition-5), [Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#theorem-1), [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)
- Practised by: [Example. Find and use roots](/algebra/complex-numbers/complex-polynomials#example-2), [Example. A complex conjugate pair of roots](/algebra/complex-numbers/seen#example-1)

### Definition. Polynomial factor

ID: `/algebra/complex-numbers/complex-polynomials#definition-4`

#### Statement

A polynomial $p_1$ is a *factor* of $p$ if there is a polynomial $p_2$ such
that

$$
p(z)=p_1(z)p_2(z)
$$

for every $z\in\mathbb C$.

- Uses: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1)
- Used by: [Definition. Root multiplicity](/algebra/complex-numbers/complex-polynomials#definition-5), [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)
- Practised by: [Example. Find and use roots](/algebra/complex-numbers/complex-polynomials#example-2)

### Example. Find and use roots

ID: `/algebra/complex-numbers/complex-polynomials#example-2` · Difficulty: routine

For $p(z)=z^2+1$,

$$
p(i)=i^2+1=0,
$$

so $i$ is a root. Direct substitution also gives $p(-i)=0$. The
factor theorem below explains why these roots yield the factorisation

$$
z^2+1=(z-i)(z+i)
$$

into linear factors. The same polynomial has no real root: for real $x$,
$x^2+1>0$.

- Practises: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3), [Definition. Polynomial factor](/algebra/complex-numbers/complex-polynomials#definition-4)

### Definition. Root multiplicity

ID: `/algebra/complex-numbers/complex-polynomials#definition-5`

#### Statement

For a non-zero polynomial $p$, a root $\alpha$ has *multiplicity* $k\ge1$ if
$(z-\alpha)^k$ is a factor of $p$ but $(z-\alpha)^{k+1}$ is not.

- Uses: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3), [Definition. Polynomial factor](/algebra/complex-numbers/complex-polynomials#definition-4)
- Practised by: [Example. Multiplicity two](/algebra/complex-numbers/complex-polynomials#example-3)

### Example. Multiplicity two

ID: `/algebra/complex-numbers/complex-polynomials#example-3` · Difficulty: routine

For $p(z)=(z-1)^2$, the root $1$ has multiplicity two: $(z-1)^2$ is a factor of $p$ but $(z-1)^3$ is not.

Multiplicity records repetition in a factorisation. It is not the number of
different solutions: this polynomial has one distinct root, counted twice
when roots are counted with multiplicity.

- Practises: [Definition. Root multiplicity](/algebra/complex-numbers/complex-polynomials#definition-5)

## Roots and factors

### Theorem. Remainder theorem

ID: `/algebra/complex-numbers/complex-polynomials#theorem-1`

#### Statement

When $p(z)$ is divided by $z-\alpha$, the remainder is the complex number $p(\alpha)$.

- Uses: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3)
- Proved by: [Proof of Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#proof-1)
- Used by: [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)

### Proof of Theorem. Remainder theorem

ID: `/algebra/complex-numbers/complex-polynomials#proof-1`

#### Proof

Polynomial division gives

$$
p(z)=(z-\alpha)q(z)+r,
$$

with a constant remainder $r$. At $z=\alpha$, the first term vanishes, leaving $p(\alpha)=r$.

- Proves: [Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#theorem-1)

### Theorem. Factor theorem

ID: `/algebra/complex-numbers/complex-polynomials#theorem-2`

#### Statement

A number $\alpha\in\mathbb C$ is a root of $p$ if and only if $z-\alpha$ is a factor of $p(z)$.

- Uses: [Definition. Polynomial root](/algebra/complex-numbers/complex-polynomials#definition-3), [Definition. Polynomial factor](/algebra/complex-numbers/complex-polynomials#definition-4), [Theorem. Remainder theorem](/algebra/complex-numbers/complex-polynomials#theorem-1)
- Proved by: [Proof of Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#proof-2)
- Used by: [Theorem. Uniqueness of polynomial coefficients](/algebra/complex-numbers/complex-polynomials#theorem-3), [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5)
- Practised by: [Example. A complex conjugate pair of roots](/algebra/complex-numbers/seen#example-1)
- Recalled by: [Seen questions](/algebra/complex-numbers/seen)

### Proof of Theorem. Factor theorem

ID: `/algebra/complex-numbers/complex-polynomials#proof-2`

#### Proof

If $p(\alpha)=0$, polynomial division gives

$$
p(z)=(z-\alpha)q(z)+p(\alpha)=(z-\alpha)q(z),
$$

so $z-\alpha$ is a factor. Conversely, if $p(z)=(z-\alpha)q(z)$, then $p(\alpha)=0$.

- Proves: [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)

### Theorem. Uniqueness of polynomial coefficients

ID: `/algebra/complex-numbers/complex-polynomials#theorem-3`

#### Statement

Two complex polynomials agree for every $z\in\mathbb C$ if and only if their corresponding coefficients are equal. In particular, a complex polynomial is zero for every $z$ if and only if all its coefficients are zero.

#### Notes

This is why identities between polynomial functions can be checked
coefficient by coefficient.

To see why, subtract the two polynomials. If the result were a non-zero
polynomial of degree $d$, it could have at most $d$ distinct roots: each root
supplies a linear factor by the factor theorem. After dividing out
$z-\alpha$, any other root $\beta\ne\alpha$ remains a root of the quotient,
so we can repeat this step at most $d$ times. It therefore cannot vanish at
every complex number.

- Uses: [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1), [Theorem. Factor theorem](/algebra/complex-numbers/complex-polynomials#theorem-2)

### Theorem. Fundamental theorem of algebra

ID: `/algebra/complex-numbers/complex-polynomials#theorem-4`

#### Statement

Every complex polynomial of degree $n\ge1$ has at least one complex root.

#### Notes

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

## Factorisation over $\mathbb C$

### Theorem. Factorisation over the complex numbers

ID: `/algebra/complex-numbers/complex-polynomials#theorem-5`

#### Statement

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

### Proof of Theorem. Factorisation over the complex numbers

ID: `/algebra/complex-numbers/complex-polynomials#proof-3`

#### Proof

Proceed by induction on the degree. A degree-one polynomial already has the required form. Suppose the result holds for degree $m$. If $p$ has degree $m+1$, the fundamental theorem of algebra supplies a root $\alpha_1$. The factor theorem gives

$$
p(z)=(z-\alpha_1)q(z)
$$

for a polynomial $q$ of degree $m$. Apply the induction hypothesis to $q$ and multiply the factors.

- Proves: [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5)

### Corollary. Count roots with multiplicity

ID: `/algebra/complex-numbers/complex-polynomials#corollary-1`

#### Statement

A complex polynomial of degree $n\ge1$ has exactly $n$ complex roots counted
with multiplicity.

#### Notes

The factorisation theorem gives $n$ linear factors. Conversely, if
$p(\beta)=0$, then

$$
0=a(\beta-\alpha_1)\cdots(\beta-\alpha_n),
$$

so $\beta$ equals one of the $\alpha_j$. Thus the list has no missing roots,
and repeated factors record multiplicity.

“Exactly $n$ roots” does not mean $n$ distinct values: $(z-1)^2$ has two
roots counted with multiplicity, but only one distinct root.

- Uses: [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5)

### Example. Factorise a quadratic

ID: `/algebra/complex-numbers/complex-polynomials#example-4` · Difficulty: routine

For $p(z)=z^2+z+1$, the quadratic formula gives

$$
z=\frac{-1\pm\sqrt{-3}}2
= -\frac12\pm\frac{\sqrt3}{2}i.
$$

Therefore

$$
z^2+z+1
=\left(z+\frac12-\frac{\sqrt3}{2}i\right)
\left(z+\frac12+\frac{\sqrt3}{2}i\right).
$$

- Practises: [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5)

### Example. Factorise $z^8-1$

ID: `/algebra/complex-numbers/complex-polynomials#example-5` · Difficulty: exam

The roots satisfy $z^8=1$, so the eighth roots of unity give

$$
\alpha_k=e^{2\pi ik/8},\qquad k=0,1,\ldots,7.
$$

Hence

$$
z^8-1=\prod_{k=0}^{7}\left(z-e^{2\pi ik/8}\right)
$$

over $\mathbb C$.

- Practises: [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5), [Definition. An nth root of a complex number](/algebra/complex-numbers/polar-form#definition-3)

## Returning to real factors

A *real polynomial* is one whose coefficients all lie in $\mathbb R$, even
when the variable takes complex values. Its non-real roots occur in conjugate
pairs, so its complex factorisation can be regrouped into real factors.

### Proposition. Conjugate roots for real coefficients

ID: `/algebra/complex-numbers/complex-polynomials#proposition-1`

#### Statement

If $p$ has real coefficients and $\alpha$ is a root of multiplicity $k$,
then $\overline\alpha$ is also a root of multiplicity $k$.

#### Notes

The condition on the coefficients is essential: conjugation must leave every coefficient unchanged before it can pass through the polynomial.

- Uses: [Definition. Complex conjugate](/algebra/complex-numbers/complex-arithmetic#definition-3), [Definition. Complex polynomial](/algebra/complex-numbers/complex-polynomials#definition-1)
- Proved by: [Proof of Proposition. Conjugate roots for real coefficients](/algebra/complex-numbers/complex-polynomials#proof-4)
- Used by: [Proposition. Real linear and quadratic factors](/algebra/complex-numbers/complex-polynomials#proposition-2)
- Practised by: [Example. Roots of a real polynomial](/algebra/complex-numbers/seen#example-4)
- Recalled by: [Seen questions](/algebra/complex-numbers/seen)

### Proof of Proposition. Conjugate roots for real coefficients

ID: `/algebra/complex-numbers/complex-polynomials#proof-4`

#### Proof

Write $p(z)=\sum_{j=0}^n a_jz^j$ with $a_j\in\mathbb R$. If $p(\alpha)=0$, then

$$
p(\overline\alpha)
=\sum_{j=0}^n a_j\overline\alpha^{\,j}
=\sum_{j=0}^n\overline{a_j\alpha^j}
=\overline{p(\alpha)}
=0.
$$

For multiplicity, write $p(z)=(z-\alpha)^kq(z)$ with $q(\alpha)\ne0$.
Since $p$ has real coefficients, conjugating this factorisation gives
$p(z)=(z-\overline\alpha)^k\widetilde q(z)$, where
$\widetilde q(z)=\overline{q(\overline z)}$ and
$\widetilde q(\overline\alpha)=\overline{q(\alpha)}\ne0$. Thus the
conjugate root has exactly the same multiplicity.

- Proves: [Proposition. Conjugate roots for real coefficients](/algebra/complex-numbers/complex-polynomials#proposition-1)

### Proposition. Real linear and quadratic factors

ID: `/algebra/complex-numbers/complex-polynomials#proposition-2`

#### Statement

Every non-zero polynomial with real coefficients can be written as a non-zero
real constant times a product of real linear factors and real quadratic
factors.

#### Notes

Every non-real root occurs with its conjugate. Pairing the corresponding factors gives

$$
(z-\alpha)(z-\overline\alpha)
=z^2-2\operatorname{Re}(\alpha)z+|\alpha|^2,
$$

whose coefficients are real. Real roots already provide real linear factors.
The quadratic factors obtained from non-real roots have negative discriminant,
so they do not split further over $\mathbb R$.

- Uses: [Theorem. Factorisation over the complex numbers](/algebra/complex-numbers/complex-polynomials#theorem-5), [Proposition. Conjugate roots for real coefficients](/algebra/complex-numbers/complex-polynomials#proposition-1)
- Practised by: [Example. Factorise $x^8-1$ over the reals](/algebra/complex-numbers/complex-polynomials#example-6), [Example. Factorisation over the real and complex numbers](/algebra/complex-numbers/seen#example-2)
- Recalled by: [Seen questions](/algebra/complex-numbers/seen)

### Example. Factorise $x^8-1$ over the reals

ID: `/algebra/complex-numbers/complex-polynomials#example-6` · Difficulty: exam

The real roots are $1$ and $-1$. Pairing the remaining eighth roots with their conjugates gives

$$
\begin{aligned}
x^8-1
&=(x-1)(x+1)(x^2+1)\\
&\quad{}\times\left(x^2-\sqrt2\,x+1\right)
\left(x^2+\sqrt2\,x+1\right).
\end{aligned}
$$

The complex factorisation and the real factorisation describe the same polynomial; the latter groups conjugate roots into quadratic factors.

- Practises: [Proposition. Real linear and quadratic factors](/algebra/complex-numbers/complex-polynomials#proposition-2)

The characteristic equation of a linear recurrence or differential equation is a complex polynomial. [Stability of systems](/algebra/complex-numbers/stability-of-systems) reads growth, decay and oscillation from its roots; the continuous case is the [second-order constant-coefficient](/calculus/ordinary-differential-equations/second-order-constant-coefficient-equations) method from Calculus.

## Prerequisites

Transitive `uses`/`derives`/`practises` dependencies defined elsewhere, foundations first.

- [Definition. Complex number](/algebra/complex-numbers/complex-arithmetic#definition-1) (in [Complex arithmetic](/algebra/complex-numbers/complex-arithmetic))
- [Definition. Complex modulus](/algebra/complex-numbers/complex-arithmetic#definition-4) (in [Complex arithmetic](/algebra/complex-numbers/complex-arithmetic))
- [Definition. Argument](/algebra/complex-numbers/polar-form#definition-1) (in [Polar form](/algebra/complex-numbers/polar-form))
- [Definition. Polar form](/algebra/complex-numbers/polar-form#definition-2) (in [Polar form](/algebra/complex-numbers/polar-form))
- [Definition. An nth root of a complex number](/algebra/complex-numbers/polar-form#definition-3) (in [Polar form](/algebra/complex-numbers/polar-form))
- [Definition. Complex conjugate](/algebra/complex-numbers/complex-arithmetic#definition-3) (in [Complex arithmetic](/algebra/complex-numbers/complex-arithmetic))

## Relations

- Recalls: [Definition. Complex number](/algebra/complex-numbers/complex-arithmetic#definition-1)
- References: [Complex arithmetic](/algebra/complex-numbers/complex-arithmetic), [Stability of systems](/algebra/complex-numbers/stability-of-systems), [Second-order constant-coefficient equations](/calculus/ordinary-differential-equations/second-order-constant-coefficient-equations)
- Referenced by: [Complex numbers](/algebra/complex-numbers), [Polar form](/algebra/complex-numbers/polar-form), [Seen questions](/algebra/complex-numbers/seen), [Stability of systems](/algebra/complex-numbers/stability-of-systems), [Trigonometric and geometric applications](/algebra/complex-numbers/trigonometric-and-geometric-applications), [Eigenvalues and eigenvectors](/algebra/eigenvalues/eigenvalues-and-eigenvectors), [Rational functions](/calculus/integration-techniques/rational-functions)
