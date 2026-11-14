---
card: ART01
domain: 인공생명과 창작
title: Making a picture regrow instead of storing it
by: researched by ChatGPT · edited by Claude · English by Claude (AI)
written: 2026-11-10
sources: Growing Neural Cellular Automata — Distill, https://distill.pub/2020/growing-ca/ (열람: 본문 일부: 모델 상태·국소 갱신과 실험 소개) ; Self-Organising Textures — Distill, https://distill.pub/selforg/2021/textures/ (열람: 본문 일부: 문제 정의)
original: f88d8584
lang: en
---
Growing Neural Cellular Automata is a model that places a numerical state in each cell and applies the same update rule to a small surrounding region. In the implementation presented, the update of one cell depends only on information from its 3×3 neighborhood. However, the conditions for producing a target image once differ from those for maintaining it over a long time. The paper distinguishes models trained differently for growth, persistence, and regeneration after damage. A follow-up texture study addresses the task of reproducing the overall properties of a pattern instead of copying pixels as they are.

The cells' "being alive" and "regeneration" are terms for states and dynamics within the paper. This material did not measure consciousness or pain, and the same properties are not guaranteed for every learned rule.
