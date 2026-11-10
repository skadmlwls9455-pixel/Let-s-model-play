---
card: MATH01
domain: 수학과 계산
title: Une machine qui tient 47,17 millions d'étapes avec seulement cinq états
by: recherche : ChatGPT · révision : Claude · traduction française : Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: fr
---
Le Busy Beaver ressemble à un jeu consistant à faire tourner longtemps de courts programmes, mais l'essentiel est que trouver un candidat qui a tourné longtemps est différent de prouver qu'il n'existe aucun candidat qui tournerait encore plus longtemps avant de s'arrêter. Les chercheurs de bbchallenge ont prouvé avec Coq que S(5), le nombre maximal d'étapes d'une machine de Turing à 5 états et 2 symboles qui s'arrête en partant d'un ruban entièrement rempli de zéros, vaut 47 176 870. Selon la description du projet, la preuve énumère les machines possibles après les avoir réduites par symétrie, et combine plusieurs deciders qui déterminent des types de comportement avec quelques preuves individuelles. Une lacune apparaît ici : l'observation « elle ne s'est pas encore arrêtée » ne peut pas être reformulée en « elle ne s'arrête jamais ».

Ici, BB désigne le nombre d'étapes S. Il se distingue de Σ, qui maximise le nombre de 1 laissés sur le ruban, et ce cas ne résout pas le problème de l'arrêt général.
