---
id: /core#thread-modes
type: thread
title: "Roots, modes and evolution"
course: "MATH1251 Mathematics 1B (UNSW Sydney)"
page: /core
slug: modes
markdown: /llms.mdx/docs/core/thread-modes.md
---

# Thread: Roots, modes and evolution

A linear evolution splits into modes $r^n$ or $e^{rt}$, and the roots $r$ decide growth, decay and oscillation.

Defined in [Core](/core). The same idea in 7 places, in reading order; each `##` section is one place, with its role in the thread and its statement.

## Definition. Polar form

Role: a root as a scaling and a rotation. From [Polar form](/algebra/complex-numbers/polar-form).

For $z\ne0$, the *polar form* of $z$ is

$$
z=r(\cos\theta+i\sin\theta)=re^{i\theta},
\qquad r=|z|>0,
$$

where $\theta$ is an argument of $z$. The expressions $a+bi$ and $re^{i\theta}$ are two writings of the same complex number.

## Theorem. Discrete stability from root moduli

Role: discrete time: $|r|$ decides. From [Stability of systems](/algebra/complex-numbers/stability-of-systems).

Write a characteristic root in polar form as

$$
r_j=\rho_j e^{i\theta_j}.
$$

Then

$$
|r_j^n|=\rho_j^n.
$$

Thus $\rho_j<1$ gives a decaying mode, $\rho_j>1$ gives an unbounded mode and
$\rho_j=1$ gives a non-decaying mode.

## Theorem. Continuous stability from real parts

Role: continuous time: $\operatorname{Re} r$ decides. From [Stability of systems](/algebra/complex-numbers/stability-of-systems).

For a characteristic root $r=\alpha+i\beta$,

$$
|e^{rt}|=e^{\alpha t}.
$$

Therefore $\alpha<0$ gives decay, $\alpha>0$ gives an unbounded mode and, for
a simple root, $\alpha=0$ gives a non-decaying oscillatory or constant mode.
A repeated root on the imaginary axis introduces a term $t e^{rt}$, whose
magnitude is unbounded.

## Theorem. Long-term behaviour of the modes

Role: matrix powers. From [Spectral applications](/algebra/eigenvalues/spectral-applications).

Suppose $A=PDP^{-1}$ is diagonalisable, so it has an eigenbasis. A mode
contribution $c\lambda^kv$ with $c\ne0$ decays to zero when $|\lambda|<1$,
has constant magnitude when $|\lambda|=1$ and grows when $|\lambda|>1$.
Without an eigenbasis, a Jordan block can produce additional factors such as
$k\lambda^{k-1}$, so the diagonalisation hypothesis is what makes this scalar
classification complete (especially at the unit circle).

## Theorem. Exponential modes

Role: coupled ODEs: eigenvectors as modes. From [Linear ODE systems](/algebra/eigenvalues/linear-ode-systems).

For a constant matrix $A$ and a non-zero vector $\mathbf u$, the function

$$
\mathbf{x}(t)=\mathbf{u}e^{\lambda t}
$$

is a solution of $\mathbf{x}'=A\mathbf{x}$ if and only if $\lambda$ is an
eigenvalue of $A$ and $\mathbf{u}$ is a corresponding eigenvector. The zero
solution is handled separately by taking $\mathbf u=\mathbf0$.

## Theorem. A sufficient condition for long-term Markov behaviour

Role: Markov systems. From [Markov systems](/algebra/eigenvalues/markov-systems).

Suppose that a transition matrix $A$ satisfies:

1. $1$ is an eigenvalue with algebraic multiplicity $1$;
2. every other eigenvalue $\lambda_j$ has $|\lambda_j|<1$;
3. there is a basis of eigenvectors for $\mathbb R^n$.

Then $\mathbf{x}(k+1)=A\mathbf{x}(k)$ has a limit $\mathbf{p}$ in the
eigenspace for $\lambda=1$. It is the unique vector in that eigenspace
whose component sum equals the component sum of $\mathbf{x}(0)$; it may
be zero when that sum is zero. If $\mathbf{x}(0)$ is a probability vector,
then $\mathbf{p}$ is the stationary distribution and does not depend on
the initial probabilities.

## Method. Read the characteristic roots

Role: scalar ODEs. From [Second-order constant-coefficient equations](/calculus/ordinary-differential-equations/second-order-constant-coefficient-equations).

Solve the characteristic equation and choose the real homogeneous modes according to the roots:

* If $r_1\neq r_2$ are distinct real roots, use
  $$
  y_h=Ae^{r_1x}+Be^{r_2x}.
  $$
* If $r$ is a repeated real root, use
  $$
  y_h=(A+Bx)e^{rx}.
  $$
* If the roots are $r=\alpha\pm i\beta$ with $\beta\neq0$, use
  $$
  y_h=e^{\alpha x}
  \bigl(A\cos(\beta x)+B\sin(\beta x)\bigr).
  $$
