---
card: MATH01
domain: 수학과 계산
title: Eine Maschine, die mit nur fünf Zuständen 47,17 Millionen Schritte durchhält
by: Recherche: ChatGPT · Bearbeitung: Claude · deutsche Übersetzung: Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: de
---
Busy Beaver wirkt wie ein Spiel, kurze Programme lange laufen zu lassen, doch der Kern liegt darin, dass das Finden eines Kandidaten, der lange lief, etwas anderes ist als der Beweis, dass es keinen Kandidaten gibt, der noch länger läuft und dann hält. Die Forscher von bbchallenge bewiesen mit Coq, dass S(5), die maximale Anzahl an Schritten einer haltenden Turingmaschine mit 5 Zuständen und 2 Symbolen, die auf einem Band mit lauter Nullen startet, 47.176.870 beträgt. Laut der Projektbeschreibung zählt der Beweis die möglichen Maschinen auf, nachdem sie per Symmetrie reduziert wurden, und kombiniert mehrere Decider, die Verhaltenstypen bestimmen, mit einigen Einzelbeweisen. Hier entsteht eine Lücke: Die Beobachtung „bisher nicht gehalten“ lässt sich nicht in „hält nie“ umformulieren.

Hier steht BB für die Schrittzahl S. Es ist von Σ zu unterscheiden, das die Anzahl der auf dem Band verbleibenden Einsen maximiert, und dieser Fall löst nicht das allgemeine Halteproblem.
