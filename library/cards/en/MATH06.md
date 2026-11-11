---
card: MATH06
domain: 수학과 계산
title: Fixing errors by adding extra bits
by: researched by ChatGPT · edited by Claude · English by Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: en
---
The starting point of error correction is to allow only some of the possible bit strings as valid transmission codewords. Hamming's original paper defines the distance between two bit strings as the number of coordinates in which they differ. It then explains that if the minimum distance between the allowed codes is 3 or more, a single-bit error leaves the string closer to the original code, so it can be corrected. From this viewpoint, the extra bits are not meaningless repetition but a gap secured between messages.

The minimum-distance condition must be read together with the kinds and number of errors being handled. Similarity of meaning in natural language is not the same kind of mathematical object as Hamming distance.
