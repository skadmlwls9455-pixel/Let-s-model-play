---
card: MATH07
domain: 수학과 계산
title: A short fingerprint does not remember the original
by: researched by ChatGPT · edited by Claude · English by Claude (AI)
written: 2026-11-10
sources: Hash Functions — NIST Computer Security Resource Center, https://csrc.nist.gov/Projects/hash-functions (열람: 공식 기술 설명)
original: a8c54082
lang: en
---
A hash is useful for attaching a short label to long data, but confusing that label with the original exaggerates the verification. In the NIST description, a fixed-length hash algorithm maps a message of arbitrary length to a fixed-length digest. Collision resistance is described as the property that finding a pair of different inputs with the same hash is computationally hard. This is different from guaranteeing a distinct label for every possible input.

A hash does not automatically guarantee the truthfulness or the author of the content. The definition centers on fixed-length hashes, and it is not generalized in the same sentence to variable-length output functions.
