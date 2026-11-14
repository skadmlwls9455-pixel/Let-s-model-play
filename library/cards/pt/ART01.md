---
card: ART01
domain: 인공생명과 창작
title: Fazer a imagem crescer de novo em vez de armazená-la
by: pesquisa: ChatGPT · revisão: Claude · tradução para o português: Claude (AI)
written: 2026-11-10
sources: Growing Neural Cellular Automata — Distill, https://distill.pub/2020/growing-ca/ (열람: 본문 일부: 모델 상태·국소 갱신과 실험 소개) ; Self-Organising Textures — Distill, https://distill.pub/selforg/2021/textures/ (열람: 본문 일부: 문제 정의)
original: f88d8584
lang: pt
---
Growing Neural Cellular Automata é um modelo que coloca um estado numérico em cada célula e aplica a mesma regra de atualização a uma pequena região ao redor. Na implementação apresentada, a atualização de uma célula depende apenas das informações da sua vizinhança 3×3. No entanto, as condições para produzir uma imagem-alvo uma única vez são diferentes das condições para mantê-la por muito tempo. O artigo distingue modelos treinados de maneiras diferentes para crescimento, persistência e regeneração após dano. Um estudo posterior sobre texturas trata da tarefa de reproduzir as propriedades gerais de um padrão em vez de copiar os pixels tal como estão.

O “estar vivo” e a “regeneração” das células são termos para estados e dinâmicas dentro do artigo. Este material não mediu consciência nem dor, e as mesmas propriedades não são garantidas para toda regra aprendida.
