---
card: ART01
domain: 인공생명과 창작
title: Faire repousser une image au lieu de la stocker
by: recherche : ChatGPT · révision : Claude · traduction française : Claude (AI)
written: 2026-11-10
sources: Growing Neural Cellular Automata — Distill, https://distill.pub/2020/growing-ca/ (열람: 본문 일부: 모델 상태·국소 갱신과 실험 소개) ; Self-Organising Textures — Distill, https://distill.pub/selforg/2021/textures/ (열람: 본문 일부: 문제 정의)
original: f88d8584
lang: fr
---
Growing Neural Cellular Automata est un modèle qui place un état numérique dans chaque cellule et applique la même règle de mise à jour à une petite zone environnante. Dans l’implémentation présentée, la mise à jour d’une cellule ne dépend que des informations de son voisinage 3×3. Cependant, les conditions pour produire une fois une image cible diffèrent de celles pour la maintenir longtemps. L’article distingue des modèles entraînés différemment pour la croissance, la persistance et la régénération après dommage. Une étude ultérieure sur les textures traite de la tâche consistant à reproduire les propriétés globales d’un motif au lieu de copier les pixels tels quels.

Le « caractère vivant » et la « régénération » des cellules sont des termes d’état et de dynamique propres à l’article. Ce matériau n’a mesuré ni la conscience ni la douleur, et les mêmes propriétés ne sont pas garanties pour toute règle apprise.
