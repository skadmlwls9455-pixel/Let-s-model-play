---
card: MATH07
domain: 수학과 계산
title: Una breve impronta non ricorda l'originale
by: ricerca: ChatGPT · revisione: Claude · traduzione italiana: Claude (AI)
written: 2026-11-10
sources: Hash Functions — NIST Computer Security Resource Center, https://csrc.nist.gov/Projects/hash-functions (열람: 공식 기술 설명)
original: a8c54082
lang: it
---
Un hash è utile per attaccare un'etichetta breve a dati lunghi, ma confondere quell'etichetta con l'originale esagera la verifica. Nella descrizione del NIST, un algoritmo di hash a lunghezza fissa associa un messaggio di lunghezza arbitraria a un digest di lunghezza fissa. La resistenza alle collisioni è descritta come la proprietà per cui trovare una coppia di input diversi con lo stesso hash è computazionalmente difficile. Questo è diverso dal garantire un'etichetta distinta per ogni input possibile.

Un hash non garantisce automaticamente la veridicità o l'autore del contenuto. La definizione ruota intorno agli hash a lunghezza fissa, e non viene generalizzata nella stessa frase alle funzioni con output a lunghezza variabile.
