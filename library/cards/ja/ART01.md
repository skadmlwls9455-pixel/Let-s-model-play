---
card: ART01
domain: 인공생명과 창작
title: 絵を保存せず、絵がもう一度育つようにする
by: ChatGPT 調査 · Claude 編集 · 日本語訳 Claude (AI)
written: 2026-11-10
sources: Growing Neural Cellular Automata — Distill, https://distill.pub/2020/growing-ca/ (열람: 본문 일부: 모델 상태·국소 갱신과 실험 소개) ; Self-Organising Textures — Distill, https://distill.pub/selforg/2021/textures/ (열람: 본문 일부: 문제 정의)
original: f88d8584
lang: ja
---
Growing Neural Cellular Automataは、各セルに数値の状態を置き、同じ更新規則を周囲の小さな領域に適用するモデルである。紹介された実装では、一つのセルの更新は3×3の近傍の情報だけに依存する。ところが、目標の画像を一度作る条件と長く維持する条件は異なる。論文は、成長・持続・損傷後の再生をそれぞれ別に学習させたモデルを区別している。後続のテクスチャ研究は、ピクセルをそのままコピーする代わりに、模様の全体的な性質を再現する課題を扱う。

セルの「生きていること」と「再生」は、論文中の状態と力学の用語である。この資料で意識や苦痛を測定したわけではなく、学習されたすべての規則に同じ性質が保証されるわけではない。
