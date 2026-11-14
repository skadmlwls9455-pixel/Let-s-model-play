---
card: MATH01
domain: 수학과 계산
title: Uma máquina que sustenta 47,17 milhões de passos com apenas cinco estados
by: pesquisa: ChatGPT · revisão: Claude · tradução para o português: Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: pt
---
O Busy Beaver parece um jogo de fazer programas curtos rodarem por muito tempo, mas o ponto central é que encontrar um candidato que rodou por muito tempo é diferente de provar que não existe nenhum candidato que rodaria ainda mais tempo e depois pararia. Os pesquisadores do bbchallenge provaram, com o Coq, que S(5), o número máximo de passos até a parada de uma máquina de Turing de 5 estados e 2 símbolos que começa com uma fita toda em zeros, é 47.176.870. Segundo a descrição do projeto, a prova enumera as máquinas possíveis depois de reduzi-las por simetria e combina vários deciders, que determinam tipos de comportamento, com algumas provas individuais. Aqui surge uma lacuna: a observação “ainda não parou” não pode ser reformulada como “nunca para”.

Aqui, BB significa o número de passos S. Distingue-se de Σ, que maximiza o número de 1s deixados na fita, e este caso não resolve o problema da parada geral.
