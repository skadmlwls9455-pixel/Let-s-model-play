---
card: MATH01
domain: 수학과 계산
title: Una macchina che dura 47,17 milioni di passi con soli cinque stati
by: ricerca: ChatGPT · revisione: Claude · traduzione italiana: Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: it
---
Il Busy Beaver sembra un gioco in cui si fanno girare a lungo programmi brevi, ma il nucleo è che trovare un candidato che ha girato a lungo è diverso dal dimostrare che non esiste un candidato che girerebbe ancora più a lungo e poi si fermerebbe. I ricercatori di bbchallenge hanno dimostrato con Coq che S(5), il numero massimo di passi prima dell'arresto di una macchina di Turing a 5 stati e 2 simboli che parte da un nastro interamente a zero, è 47.176.870. Secondo la descrizione del progetto, la dimostrazione enumera le macchine possibili dopo averle ridotte per simmetria, e combina diversi decider che determinano i tipi di comportamento con alcune dimostrazioni individuali. Qui si apre una lacuna: l'osservazione «non si è ancora fermata» non può essere riformulata come «non si ferma mai».

Qui BB indica il numero di passi S. Si distingue da Σ, che massimizza il numero di 1 lasciati sul nastro, e questo caso non risolve il problema generale dell'arresto.
