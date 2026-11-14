---
card: MATH06
domain: 수학과 계산
title: 余分なビットを入れて誤りを直す
by: ChatGPT 調査 · Claude 編集 · 日本語訳 Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: ja
---
誤り訂正の出発点は、可能なビット列のうち一部だけを正しい伝送コードワードとして許すことにある。Hamming の原論文は、2つのビット列の間の距離を、異なる座標の個数として定義している。そして、許されたコードの間の最小距離が3以上であれば、1ビットの誤りが起きても元のコードにより近い状態にとどまるので訂正できると説明している。この観点では、余分なビットは無意味な繰り返しではなく、メッセージの間に確保しておいた間隔である。

最小距離の条件は、どの種類と個数の誤りを扱うかとあわせて読む必要がある。自然言語の意味の類似度は、Hamming 距離と同じ数学的対象ではない。
