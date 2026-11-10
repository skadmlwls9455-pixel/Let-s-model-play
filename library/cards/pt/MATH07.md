---
card: MATH07
domain: 수학과 계산
title: Uma impressão curta não guarda o texto original
by: pesquisa: ChatGPT · revisão: Claude · tradução para o português: Claude (AI)
written: 2026-11-10
sources: Hash Functions — NIST Computer Security Resource Center, https://csrc.nist.gov/Projects/hash-functions (열람: 공식 기술 설명)
original: a8c54082
lang: pt
---
O hash é útil para pôr uma etiqueta curta em dados longos, mas confundir essa etiqueta com o original exagera a verificação. Na descrição do NIST, um algoritmo de hash de comprimento fixo mapeia uma mensagem de comprimento arbitrário em um resumo (digest) de comprimento fixo. A resistência a colisões é descrita como a propriedade de que encontrar um par de entradas diferentes com o mesmo hash é computacionalmente difícil. Isso é diferente de garantir uma etiqueta distinta para toda entrada possível.

Um hash não garante automaticamente a veracidade nem a autoria do conteúdo. A definição se concentra nos hashes de comprimento fixo e não é generalizada, na mesma frase, a funções de saída de comprimento variável.
