---
card: MATH06
domain: 수학과 계산
title: Correggere gli errori aggiungendo bit in più
by: ricerca: ChatGPT · revisione: Claude · traduzione italiana: Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: it
---
Il punto di partenza della correzione degli errori è ammettere come codeword di trasmissione valide soltanto alcune delle stringhe di bit possibili. L'articolo originale di Hamming definisce la distanza tra due stringhe di bit come il numero di coordinate in cui differiscono. Spiega poi che, se la distanza minima tra i codici ammessi è 3 o più, un errore su un singolo bit lascia la stringa più vicina al codice originale, così che può essere corretto. Da questo punto di vista, i bit in più non sono una ripetizione priva di senso ma uno spazio assicurato tra i messaggi.

La condizione di distanza minima deve essere letta insieme ai tipi e al numero di errori che si trattano. La somiglianza di significato nel linguaggio naturale non è un oggetto matematico dello stesso tipo della distanza di Hamming.
