---
card: MATH01
domain: 수학과 계산
title: わずか5状態で4,717万ステップを持ちこたえる機械
by: ChatGPT 調査 · Claude 編集 · 日本語訳 Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: ja
---
Busy Beaver は短いプログラムを長く実行させる遊びのように見えるが、核心は、長く走った候補を見つけることと、それよりさらに長く走って停止する候補がないことを証明することが別だという点にある。bbchallenge の研究者たちは、すべて0のテープから始まる5状態・2記号のチューリング機械の最大停止ステップ数 S(5) が 47,176,870 であることを Coq を用いて証明した。プロジェクトの説明によれば、証明は可能な機械を対称性で減らして列挙し、振る舞いの型を判定する複数の decider といくつかの個別の証明を組み合わせる。ここで、「まだ停止していない」という観察を「永遠に停止しない」と言い換えることはできないという隙間が生じる。

ここで BB はステップ数 S を意味する。テープに残す1の数を最大化する Σ とは区別され、この事例が一般の停止問題を解決するわけではない。
