---
id: /calculus/integration-techniques/seen
type: page
title: Seen questions
course: "MATH1251 Mathematics 1B (UNSW Sydney)"
strand: calculus
strand_label: Calculus
markdown: /llms.mdx/docs/calculus/integration-techniques/seen/content.md
tags:
  - seen
  - calculus
  - integration-techniques
ideas:
  - revision
  - integration
  - trigonometric-integrals
  - reduction-formulae
  - partial-fractions
---

# Seen questions

Worked solutions on trigonometric integrals, average values, reduction formulae, substitutions and partial fractions.

These past exam questions combine product-to-sum identities, tangent-secant
integrals, reduction formulae, substitutions and partial fractions. The first
chooses a method for each branch of a piecewise integral; the second combines
a reduction formula with a substitution and partial fractions. In each
problem, identify the structure that makes the method apply before starting
the algebra and track interval and branch restrictions when changing
variables.

### Recall: Method. Product-to-sum

Recalls [Method. Product-to-sum](/calculus/integration-techniques/trigonometric-integrals#method-3) (in [Trigonometric integrals](/calculus/integration-techniques/trigonometric-integrals)).

Convert the product to a sum, then integrate term by term:

$$
\sin A\cos B=\tfrac12\bigl(\sin(A+B)+\sin(A-B)\bigr)
$$

$$
\cos A\cos B=\tfrac12\bigl(\cos(A+B)+\cos(A-B)\bigr)
$$

$$
\sin A\sin B=-\tfrac12\bigl(\cos(A+B)-\cos(A-B)\bigr)
$$

### Recall: Method. Powers of tangent and secant

Recalls [Method. Powers of tangent and secant](/calculus/integration-techniques/trigonometric-integrals#method-4) (in [Trigonometric integrals](/calculus/integration-techniques/trigonometric-integrals)).

To evaluate $\int \tan^m x \sec^n x \, dx$:

* If $n$ is a positive even integer, factor out $\sec^2 x$ and substitute $u=\tan x$. Convert remaining powers of $\sec$ by $1+\tan^2 x=\sec^2 x$.
* If $n=0$, use $\tan^2 x=\sec^2 x-1$ to lower the power of $\tan$ by two, with $\int dx$ and $\int\tan x\,dx$ as base cases.
* If $n$ is odd:
  * If $m$ is odd, factor out $\tan x\sec x$ and substitute $u=\sec x$. Convert remaining powers of $\tan$ by $\tan^2 x=\sec^2 x-1$.
  * If $m$ is even, write $\tan^m x=(\sec^2 x-1)^{m/2}$ and expand into powers of $\sec x$. Reduce odd secant powers by parts until only $\int\sec x\,dx$ remains.

### Example. Average value of a piecewise function

ID: `/calculus/integration-techniques/seen#example-1` · Difficulty: exam

The average value of a function $f$ on $[a,b]$ is

$$
\bar f=\frac{1}{b-a}\int_a^b f(x)\,dx.
$$

Compute the average $\bar f$ on
$\left[-\frac{\pi}{4},\frac{\pi}{4}\right]$ for

$$
f(x)=
\begin{cases}
\cos 3x\sin 2x,&-\frac{\pi}{4}\le x\le0,\\[2mm]
\tan^3x\sec^2x,&0<x\le\frac{\pi}{4}.
\end{cases}
$$

#### Solution

The interval is split at $x=0$, so the integral of $f$ is the sum of one integral from each branch. Parts (a) and (b) find the two antiderivatives, part (c) applies them on the appropriate intervals and part (d) asks whether $f$ attains its average.

#### (a) The product-to-sum integral

The product-to-sum identity

$$
\sin A\cos B=\frac12\bigl(\sin(A+B)+\sin(A-B)\bigr)
$$

applies after writing $\cos3x\sin2x$ as $\sin2x\cos3x$. Thus

$$
\begin{aligned}
I
&=\int \cos3x\sin2x\,dx\\
&=\frac12\int\bigl(\sin(2x+3x)+\sin(2x-3x)\bigr)\,dx\\
&=\frac12\int\bigl(\sin5x-\sin x\bigr)\,dx\\
&=-\frac{\cos5x}{10}+\frac{\cos x}{2}+C.
\end{aligned}
$$

The difference of arguments is $-x$ and $\sin(-x)=-\sin x$; this sign is easy to lose.

#### (b) The tangent-secant integral

Use the substitution

$$
u=\tan x,
\qquad
du=\sec^2x\,dx.
$$

Then

$$
J=\int\tan^3x\sec^2x\,dx
=\int u^3\,du
=\frac{u^4}{4}+C
=\frac{\tan^4x}{4}+C.
$$

For the definite integral on the second branch, the bounds transform as

$$
x=0\Longrightarrow u=\tan0=0,
\qquad
x=\frac{\pi}{4}\Longrightarrow u=\tan\frac{\pi}{4}=1.
$$

Therefore

$$
\int_0^{\pi/4}\tan^3x\sec^2x\,dx
=\int_0^1u^3\,du
=\left[\frac{u^4}{4}\right]_0^1
=\frac14.
$$

#### (c) Computing the average

For the first branch, use the antiderivative from (a):

$$
\begin{aligned}
\int_{-\pi/4}^{0}\cos3x\sin2x\,dx
&=\left[-\frac{\cos5x}{10}+\frac{\cos x}{2}\right]_{-\pi/4}^{0}\\
&=\frac25-\frac{3\sqrt2}{10}.
\end{aligned}
$$

The second branch contributes $\frac14$ by (b). Each formula for $f$ applies only on its own subinterval, so these two integrals give the total:

$$
\begin{aligned}
\int_{-\pi/4}^{\pi/4}f(x)\,dx
&=\int_{-\pi/4}^{0}\cos3x\sin2x\,dx
  +\int_{0}^{\pi/4}\tan^3x\sec^2x\,dx\\
&=\left(\frac25-\frac{3\sqrt2}{10}\right)+\frac14\\
&=\frac{13-6\sqrt2}{20}.
\end{aligned}
$$

The interval length is

$$
\frac{\pi}{4}-\left(-\frac{\pi}{4}\right)=\frac{\pi}{2}.
$$

Consequently,

$$
{
\bar f
=\frac{1}{\pi/2}\cdot\frac{13-6\sqrt2}{20}
=\frac{13-6\sqrt2}{10\pi}
}.
$$

#### (d) Existence of a point attaining the average

The first branch is continuous on $\left[-\frac{\pi}{4},0\right]$. At the endpoints of this subinterval,

$$
f\left(-\frac{\pi}{4}\right)
=\cos\left(-\frac{3\pi}{4}\right)\sin\left(-\frac{\pi}{2}\right)
=\frac{\sqrt2}{2},
\qquad
f(0)=0.
$$

Also,

$$
0<\frac{13-6\sqrt2}{10\pi}<\frac{\sqrt2}{2}.
$$

Thus $\bar f$ lies strictly between $f(0)$ and
$f\left(-\frac{\pi}{4}\right)$. The Intermediate Value Theorem applied to the first branch gives a point

$$
c\in\left(-\frac{\pi}{4},0\right)
\subset\left(-\frac{\pi}{4},\frac{\pi}{4}\right)
$$

such that $f(c)=\bar f$. Therefore the answer is **Yes**.

Which branch owns the single point $x=0$ does not affect the integral or the average. What matters is which formula is integrated on each side.

- Practises: [Method. Product-to-sum](/calculus/integration-techniques/trigonometric-integrals#method-3), [Method. Powers of tangent and secant](/calculus/integration-techniques/trigonometric-integrals#method-4)

### Recall: Definition. Reduction formula

Recalls [Definition. Reduction formula](/calculus/integration-techniques/reduction-formulae#definition-1) (in [Reduction formulae](/calculus/integration-techniques/reduction-formulae)).

A reduction formula expresses an integral $I_n$ in terms of $I_{n-k}$ for a
smaller index, typically by integration by parts.

### Recall: Theorem. Partial fractions decomposition

Recalls [Theorem. Partial fractions decomposition](/calculus/integration-techniques/rational-functions#theorem-1) (in [Rational functions](/calculus/integration-techniques/rational-functions)).

For a fixed denominator after cancellation and factorisation, every *proper* rational function $f$ has a unique partial-fraction expansion with terms of the form

$$
\frac{A}{(x-a)^k},\qquad \frac{Bx+C}{(x^2+bx+c)^k},
$$

where the quadratic $x^2+bx+c$ is irreducible over the real numbers (i.e. $b^2-4c<0$).

### Example. Reduction formulae and substitution of a hyperbolic function

ID: `/calculus/integration-techniques/seen#example-2` · Difficulty: exam

Consider

$$
I_n=\int_0^1(7+12x)^n e^{7x+6x^2}\,dx.
$$

It can be written as a reduction formula in the form

$$
I_n=a_n+b_nI_{n-2},\qquad n\ge2,
$$

where $a_n$ and $b_n$ depend on $n$. Find $a_n$ and $b_n$ in terms of $n$.

Next, consider

$$
J=\int\frac{\cosh(6x)}
{\sinh^4(6x)-343\sinh(6x)}\,dx.
$$

Suggest a substitution so that

$$
J=\frac16\int\frac{dt}{t^4-343t},
$$

and then write the rational integrand as

$$
 \frac{A(t)}{t}+\frac{B(t)}{t-7}
 +\frac{C(t)}{t^2+7t+49},
$$

where the degree of each numerator is less than the degree of its
denominator. Find $A(t)$, $B(t)$ and $C(t)$.

#### Solution

In the first integral, the factor $7+12x$ is the derivative of the exponent:

$$
\frac{d}{dx}(7x+6x^2)=7+12x.
$$

Differentiating a product with one lower power of $7+12x$ therefore produces
both an $I_n$ term and an $I_{n-2}$ term.

#### (a) Finding the reduction formula

For $n\ge2$, differentiate

$$
(7+12x)^{n-1}e^{7x+6x^2}.
$$

Using the product rule and the chain rule gives

$$
\begin{aligned}
\frac{d}{dx}\left((7+12x)^{n-1}e^{7x+6x^2}\right)
&=12(n-1)(7+12x)^{n-2}e^{7x+6x^2}\\
&\quad +(7+12x)^{n}e^{7x+6x^2}.
\end{aligned}
$$

Integrate from $0$ to $1$. The second term on the right is $I_n$, while the
first term is $12(n-1)I_{n-2}$, so

$$
\begin{aligned}
\left[(7+12x)^{n-1}e^{7x+6x^2}\right]_0^1
&=12(n-1)I_{n-2}+I_n,\\
I_n
&=\left[(7+12x)^{n-1}e^{7x+6x^2}\right]_0^1
-12(n-1)I_{n-2}.
\end{aligned}
$$

At the endpoints,

$$
7+12(1)=19,\qquad 7+12(0)=7,
$$

and

$$
7(1)+6(1)^2=13,\qquad 7(0)+6(0)^2=0.
$$

Therefore

$$
I_n
=\left(19^{n-1}e^{13}-7^{n-1}\right)-12(n-1)I_{n-2}.
$$

Comparing this with $I_n=a_n+b_nI_{n-2}$ gives

$$
{a_n=19^{n-1}e^{13}-7^{n-1}},
\qquad
{b_n=-12(n-1)}.
$$

#### (b) Substitution and partial fractions

The numerator $\cosh(6x)$ is the derivative of $\sinh(6x)$ up to a factor of
$6$, so this is an ordinary substitution, not a surd-clearing [hyperbolic
substitution](/calculus/integration-techniques/trigonometric-and-hyperbolic-substitutions).
Set

$$
t=\sinh(6x),
\qquad
dt=6\cosh(6x)\,dx.
$$

Thus $\cosh(6x)\,dx=\frac16\,dt$ and

$$
J
=\frac16\int\frac{dt}{t^4-343t}.
$$

Factor the denominator:

$$
t^4-343t
=t(t^3-343)
=t(t-7)(t^2+7t+49).
$$

The quadratic has discriminant

$$
7^2-4(49)=-147<0,
$$

so it is an irreducible real quadratic. The required partial-fraction form is

$$
\frac{1}{t(t-7)(t^2+7t+49)}
=\frac{A}{t}+\frac{B}{t-7}
+\frac{Ct+D}{t^2+7t+49}.
$$

The question writes the last numerator as $C(t)$; here
$C(t)=Ct+D$.

Multiplying through by the denominator gives the polynomial identity

$$
1=A(t-7)(t^2+7t+49)
+Bt(t^2+7t+49)
+(Ct+D)t(t-7).
$$

Since

$$
(t-7)(t^2+7t+49)=t^3-343,
$$

substitution of $t=0$ gives

$$
1=A(-7)(49)=-343A,
\qquad
A=-\frac1{343}.
$$

Substitution of $t=7$ gives

$$
1=B(7)(7^2+7\cdot7+49)
=B(7)(147)=1029B,
\qquad
B=\frac1{1029}.
$$

To find the quadratic numerator, expand the identity and compare the
coefficients of $t$ and $t^2$:

$$
1=A(t^3-343)+B(t^3+7t^2+49t)
+C t^3+(D-7C)t^2-7Dt.
$$

The coefficient of $t$ gives

$$
49B-7D=0
\quad\Longrightarrow\quad
D=7B=\frac7{1029}.
$$

The coefficient of $t^2$ then gives

$$
7B+D-7C=0
\quad\Longrightarrow\quad
C=\frac{7B+D}{7}
=\frac2{1029}.
$$

Hence the requested numerators are

$$
{A(t)=-\frac1{343}},
\qquad
{B(t)=\frac1{1029}},
\qquad
{C(t)=\frac{2t+7}{1029}}.
$$

As a check, the decomposition is

$$
\frac{1}{t^4-343t}
= -\frac{1}{343t}
+\frac{1}{1029(t-7)}
+\frac{2t+7}{1029(t^2+7t+49)}.
$$

Consequently, on any interval that does not contain a point where
$\sinh(6x)=0$ or $\sinh(6x)=7$, an antiderivative is

$$
J
=-\frac1{2058}\ln|t|
+\frac1{6174}\ln|t-7|
+\frac1{6174}\ln(t^2+7t+49)+C,
\qquad t=\sinh(6x).
$$

The first part is a [reduction
formula](/calculus/integration-techniques/reduction-formulae): differentiating
a product with one lower power gives a recurrence that drops the index by two.
The second is a substitution followed by [partial
fractions](/calculus/integration-techniques/rational-functions) for a proper
rational function.

- Practises: [Theorem. Partial fractions decomposition](/calculus/integration-techniques/rational-functions#theorem-1), [Definition. Reduction formula](/calculus/integration-techniques/reduction-formulae#definition-1)

## Prerequisites

Transitive `uses`/`derives`/`practises` dependencies defined elsewhere, foundations first.

- [Method. Product-to-sum](/calculus/integration-techniques/trigonometric-integrals#method-3) (in [Trigonometric integrals](/calculus/integration-techniques/trigonometric-integrals))
- [Definition. Tangent and secant](/calculus/integration-techniques/trigonometric-integrals#definition-1) (in [Trigonometric integrals](/calculus/integration-techniques/trigonometric-integrals))
- [Method. Powers of tangent and secant](/calculus/integration-techniques/trigonometric-integrals#method-4) (in [Trigonometric integrals](/calculus/integration-techniques/trigonometric-integrals))
- [Definition. Reduction formula](/calculus/integration-techniques/reduction-formulae#definition-1) (in [Reduction formulae](/calculus/integration-techniques/reduction-formulae))
- [Definition. Rational function](/calculus/integration-techniques/rational-functions#definition-1) (in [Rational functions](/calculus/integration-techniques/rational-functions))
- [Definition. Proper rational function](/calculus/integration-techniques/rational-functions#definition-2) (in [Rational functions](/calculus/integration-techniques/rational-functions))
- [Theorem. Partial fractions decomposition](/calculus/integration-techniques/rational-functions#theorem-1) (in [Rational functions](/calculus/integration-techniques/rational-functions))

## Relations

- Recalls: [Theorem. Partial fractions decomposition](/calculus/integration-techniques/rational-functions#theorem-1), [Definition. Reduction formula](/calculus/integration-techniques/reduction-formulae#definition-1), [Method. Product-to-sum](/calculus/integration-techniques/trigonometric-integrals#method-3), [Method. Powers of tangent and secant](/calculus/integration-techniques/trigonometric-integrals#method-4)
- References: [Rational functions](/calculus/integration-techniques/rational-functions), [Reduction formulae](/calculus/integration-techniques/reduction-formulae), [Trigonometric and hyperbolic substitutions](/calculus/integration-techniques/trigonometric-and-hyperbolic-substitutions)
- Referenced by: [Integration techniques](/calculus/integration-techniques)
