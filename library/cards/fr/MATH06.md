---
card: MATH06
domain: 수학과 계산
title: La correction des erreurs par l'ajout de bits supplémentaires
by: recherche : ChatGPT · révision : Claude · traduction française : Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: fr
---
Le point de départ de la correction d'erreurs consiste à n'admettre, parmi les chaînes de bits possibles, que certaines comme mots de code de transmission valides. L'article original de Hamming définit la distance entre deux chaînes de bits comme le nombre de coordonnées par lesquelles elles diffèrent. Il explique ensuite que, si la distance minimale entre les codes admis est de 3 ou plus, une erreur sur un seul bit laisse la chaîne plus proche du code d'origine, de sorte qu'elle peut être corrigée. De ce point de vue, les bits supplémentaires ne sont pas une répétition dépourvue de sens, mais un écart ménagé entre les messages.

La condition de distance minimale doit être lue avec le type et le nombre des erreurs traitées. La similarité de sens en langue naturelle n'est pas un objet mathématique de même nature que la distance de Hamming.
