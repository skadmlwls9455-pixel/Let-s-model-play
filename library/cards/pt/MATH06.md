---
card: MATH06
domain: 수학과 계산
title: Acrescentar bits extras para corrigir o erro
by: pesquisa: ChatGPT · revisão: Claude · tradução para o português: Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: pt
---
O ponto de partida da correção de erros é admitir apenas parte das cadeias de bits possíveis como palavras de código de transmissão válidas. O artigo original de Hamming define a distância entre duas cadeias de bits como o número de coordenadas em que elas diferem. Explica em seguida que, se a distância mínima entre os códigos permitidos é 3 ou mais, um erro de um único bit deixa a cadeia mais próxima do código original, de modo que pode ser corrigido. Sob esse ponto de vista, os bits extras não são repetição sem sentido, e sim um intervalo assegurado entre as mensagens.

A condição de distância mínima deve ser lida junto com os tipos e o número de erros tratados. A semelhança de significado na linguagem natural não é o mesmo tipo de objeto matemático que a distância de Hamming.
