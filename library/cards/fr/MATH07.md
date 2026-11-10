---
card: MATH07
domain: 수학과 계산
title: Une courte empreinte ne garde pas la mémoire de l'original
by: recherche : ChatGPT · révision : Claude · traduction française : Claude (AI)
written: 2026-11-10
sources: Hash Functions — NIST Computer Security Resource Center, https://csrc.nist.gov/Projects/hash-functions (열람: 공식 기술 설명)
original: a8c54082
lang: fr
---
Un hachage est utile pour attacher une courte étiquette à de longues données, mais confondre cette étiquette avec l'original exagère la vérification. Dans la description du NIST, un algorithme de hachage à longueur fixe fait correspondre un message de longueur arbitraire à un condensat de longueur fixe. La résistance aux collisions est décrite comme la propriété selon laquelle trouver une paire d'entrées différentes ayant le même hachage est difficile sur le plan du calcul. Cela diffère de la garantie d'une étiquette distincte pour chaque entrée possible.

Un hachage ne garantit pas automatiquement la véracité du contenu ni son auteur. La définition est centrée sur les hachages à longueur fixe et n'est pas généralisée, dans la même phrase, aux fonctions à sortie de longueur variable.
