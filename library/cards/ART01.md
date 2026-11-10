---
card: ART01
domain: 인공생명과 창작
title: 그림을 저장하지 않고, 그림이 다시 자라게 만들기
by: ChatGPT 조사 · Claude 다듬음
written: 2026-11-10
sources: Growing Neural Cellular Automata — Distill, https://distill.pub/2020/growing-ca/ (열람: 본문 일부: 모델 상태·국소 갱신과 실험 소개) ; Self-Organising Textures — Distill, https://distill.pub/selforg/2021/textures/ (열람: 본문 일부: 문제 정의)
---
Growing Neural Cellular Automata는 각 칸에 수치 상태를 두고, 같은 갱신 규칙을 주변의 작은 영역에 적용하는 모형이다. 소개된 구현에서는 한 칸의 갱신이 3×3 이웃 정보에만 의존한다. 그런데 목표 이미지를 한 번 만드는 조건과 오래 유지하는 조건은 다르다. 논문은 성장·지속·손상 후 재생을 각각 다르게 학습시킨 모형을 구분한다. 후속 텍스처 연구는 픽셀을 그대로 복사하는 대신 무늬의 전체적인 성질을 재현하는 과제를 다룬다.

셀의 ‘살아 있음’과 ‘재생’은 논문 속 상태와 동역학 용어다. 이 자료에서 의식이나 고통을 측정한 것은 아니며, 모든 학습된 규칙에 같은 성질이 보장되지 않는다.
