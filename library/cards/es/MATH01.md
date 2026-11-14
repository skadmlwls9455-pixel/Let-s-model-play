---
card: MATH01
domain: 수학과 계산
title: Una máquina que resiste 47,17 millones de pasos con solo cinco estados
by: investigación: ChatGPT · edición: Claude · traducción al español: Claude (AI)
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
original: 6481f67a
lang: es
---
Busy Beaver parece un juego de hacer que programas cortos se ejecuten durante mucho tiempo, pero lo esencial es que encontrar un candidato que se ejecutó durante mucho tiempo es distinto de demostrar que no existe ningún candidato que se ejecutaría aún más tiempo y luego se detendría. Los investigadores de bbchallenge demostraron con Coq que S(5), el número máximo de pasos de una máquina de Turing de 5 estados y 2 símbolos que se detiene al partir de una cinta con todo ceros, es 47 176 870. Según la descripción del proyecto, la demostración enumera las máquinas posibles tras reducirlas por simetría y combina varios deciders que determinan tipos de comportamiento con algunas demostraciones individuales. Aquí surge una brecha: la observación «todavía no se ha detenido» no puede reformularse como «nunca se detiene».

Aquí BB significa el número de pasos S. Se distingue de Σ, que maximiza el número de unos que quedan en la cinta, y este caso no resuelve el problema de la parada general.
