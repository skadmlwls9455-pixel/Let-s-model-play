---
card: MATH06
domain: 수학과 계산
title: Die Behebung von Fehlern durch zusätzliche Bits
by: Recherche: ChatGPT · Bearbeitung: Claude · deutsche Übersetzung: Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: de
---
Der Ausgangspunkt der Fehlerkorrektur besteht darin, von den möglichen Bitfolgen nur einige als gültige Übertragungscodewörter zuzulassen. Hammings Originalarbeit definiert den Abstand zwischen zwei Bitfolgen als die Anzahl der Koordinaten, in denen sie sich unterscheiden. Sie erläutert dann, dass bei einem Mindestabstand von 3 oder mehr zwischen den zugelassenen Codes ein Einzelbitfehler die Folge näher am ursprünglichen Code belässt und sich daher korrigieren lässt. Aus dieser Sicht sind die zusätzlichen Bits keine sinnlose Wiederholung, sondern ein Abstand, der zwischen den Nachrichten gesichert wurde.

Die Mindestabstandsbedingung muss zusammen mit der Art und Anzahl der behandelten Fehler gelesen werden. Die Ähnlichkeit von Bedeutungen in natürlicher Sprache ist kein mathematisches Objekt derselben Art wie der Hamming-Abstand.
