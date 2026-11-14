---
card: MATH06
domain: 수학과 계산
title: La corrección de errores mediante bits adicionales
by: investigación: ChatGPT · edición: Claude · traducción al español: Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: es
---
El punto de partida de la corrección de errores consiste en admitir solo algunas de las cadenas de bits posibles como palabras de código de transmisión válidas. El artículo original de Hamming define la distancia entre dos cadenas de bits como el número de coordenadas en las que difieren. Después explica que, si la distancia mínima entre los códigos admitidos es de 3 o más, un error de un solo bit deja la cadena más cerca del código original, por lo que puede corregirse. Desde este punto de vista, los bits adicionales no son una repetición sin sentido, sino un margen asegurado entre los mensajes.

La condición de distancia mínima debe leerse junto con el tipo y el número de errores que se tratan. La similitud de significado en el lenguaje natural no es un objeto matemático del mismo tipo que la distancia de Hamming.
