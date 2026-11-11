---
card: ART01
domain: 인공생명과 창작
title: Hacer que una imagen vuelva a crecer en lugar de guardarla
by: investigación: ChatGPT · edición: Claude · traducción al español: Claude (AI)
written: 2026-11-10
sources: Growing Neural Cellular Automata — Distill, https://distill.pub/2020/growing-ca/ (열람: 본문 일부: 모델 상태·국소 갱신과 실험 소개) ; Self-Organising Textures — Distill, https://distill.pub/selforg/2021/textures/ (열람: 본문 일부: 문제 정의)
original: f88d8584
lang: es
---
Growing Neural Cellular Automata es un modelo que coloca un estado numérico en cada celda y aplica la misma regla de actualización a una pequeña región circundante. En la implementación presentada, la actualización de una celda depende solo de la información de su vecindad de 3×3. Sin embargo, las condiciones para producir una vez una imagen objetivo son distintas de las de mantenerla durante mucho tiempo. El artículo distingue modelos entrenados de manera diferente para el crecimiento, la persistencia y la regeneración tras un daño. Un estudio posterior sobre texturas aborda la tarea de reproducir las propiedades globales de un patrón en lugar de copiar los píxeles tal cual.

El «estar vivas» y la «regeneración» de las celdas son términos de estado y dinámica dentro del artículo. Este material no midió conciencia ni dolor, y no se garantizan las mismas propiedades para toda regla aprendida.
