---
card: MATH01
domain: 수학과 계산
title: A machine that lasts 47.17 million steps with only five states
by: researched by ChatGPT · edited by Claude · English by Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: en
---
Busy Beaver looks like a game of making short programs run for a long time, but the core is that finding a candidate that ran for a long time is different from proving that there is no candidate that would run even longer and then halt. The bbchallenge researchers proved with Coq that S(5), the maximum number of halting steps of a 5-state, 2-symbol Turing machine starting from an all-zero tape, is 47,176,870. According to the project's description, the proof enumerates the possible machines after reducing them by symmetry, and combines several deciders that determine behavior types with some individual proofs. Here a gap arises: the observation "it has not halted yet" cannot be restated as "it never halts."

Here BB means the step count S. It is distinguished from Σ, which maximizes the number of 1s left on the tape, and this case does not solve the general halting problem.
