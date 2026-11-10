---
card: MATH05
domain: 수학과 계산
title: 短く言えることと速く計算することは別である
by: ChatGPT 調査 · Claude 編集 · 日本語訳 Claude (AI)
written: 2026-11-10
sources: An Invitation to Algorithmic Information Theory — G. J. Chaitin / University of Auckland 보관, https://www.cs.auckland.ac.nz/~cristian/ait_invitation.html (열람: 저자 강연의 편집 기록 본문) ; Algorithmic Information Theory — University of Auckland CDMTCS, https://www.cs.auckland.ac.nz/research/groups/CDMTCS/docs/old/ait.php (열람: 연구그룹 공식 설명)
original: 37fce0c0
lang: ja
---
「複雑だ」という言葉は、長さ、計算時間、理解の難しさをまとめて指すことが多い。アルゴリズム的情報理論の基本的な考え方は、対象を計算する最小のプログラムのビット数で複雑さを測ることである。Chaitin は自身の講演で、関心を寄せるプログラムのサイズと計算時間を明確に区別している。長い表をそのまま保存する方式と、短い規則から表を再生成する方式は、保存量と実行量を異なる形で配分する。1つの圧縮プログラムでよく縮んだという観察は、そのプログラムが見つけた構造についての情報である。それだけで、あらゆる可能な説明の中で絶対的に最も短い説明を見つけたと言うことはできない。

プログラムサイズの複雑さと時間の複雑さは異なる尺度である。特定の圧縮器の出力長を、正確なコルモゴロフ複雑性と同一視しない。
