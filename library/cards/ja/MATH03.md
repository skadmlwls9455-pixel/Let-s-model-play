---
card: MATH03
domain: 수학과 계산
title: 自分自身を出力する文が知っていること
by: ChatGPT 調査 · Claude 編集 · 日本語訳 Claude (AI)
written: 2026-11-10
sources: Computation and Discrete Mathematics, Chapter 9 — Klaus Sutner / Carnegie Mellon University, https://www.cs.cmu.edu/~cdm/resources/main-fund.pdf (열람: 저자 강의교재 본문 9.1.1)
original: 8808f35c
lang: ja
---
自己参照は神秘的な自己意識の証拠として読まれやすいが、計算においてはまず正確な演算として扱える。Sutner の計算理論の教科書は、具体的なプログラミング言語で実行すると自分自身のプログラムテキストを出力するプログラムを quine として紹介している。同じ節にある再帰定理の不動点版は、すべてのプログラム指標で定義される計算可能なプログラム変換について、入出力の振る舞いが変換の前後で同じになるプログラム指標が存在するという内容を説明している。ここで「同じ」という言葉は、ソース文字列の同一性、計算過程の同一性、入出力関数の同一性のどれを指すかによって意味が変わる。

再帰定理の不動点は一般に振る舞いの同値性に関するものである。quine や自己言及の文だけで、意識、自己理解、正確な内省の報告を立証することはできない。
