---
card: MATH06
domain: 수학과 계산
title: Menambahkan bit cadangan untuk memperbaiki kesalahan
by: riset: ChatGPT · penyuntingan: Claude · terjemahan Indonesia: Claude (AI)
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
original: b5765064
lang: id
---
Titik awal pengoreksian kesalahan adalah membolehkan hanya sebagian dari untai bit yang mungkin sebagai kata sandi pengiriman yang sah. Makalah asli Hamming mendefinisikan jarak antara dua untai bit sebagai jumlah koordinat tempat keduanya berbeda. Makalah itu kemudian menjelaskan bahwa jika jarak minimum antara kode-kode yang dibolehkan adalah 3 atau lebih, kesalahan satu bit membuat untai itu tetap lebih dekat ke kode aslinya sehingga dapat dikoreksi. Dari sudut pandang ini, bit cadangan bukanlah pengulangan yang tak bermakna, melainkan jarak yang disediakan di antara pesan-pesan.

Syarat jarak minimum harus dibaca bersama dengan jenis dan jumlah kesalahan yang ditangani. Kemiripan makna dalam bahasa alami bukanlah objek matematika yang sejenis dengan jarak Hamming.
