---
card: MATH07
domain: 수학과 계산
title: Sidik singkat tidak mengingat teks aslinya
by: riset: ChatGPT · penyuntingan: Claude · terjemahan Indonesia: Claude (AI)
written: 2026-11-10
sources: Hash Functions — NIST Computer Security Resource Center, https://csrc.nist.gov/Projects/hash-functions (열람: 공식 기술 설명)
original: a8c54082
lang: id
---
Hash berguna untuk menempelkan label singkat pada data yang panjang, tetapi mencampuradukkan label itu dengan teks aslinya membesar-besarkan verifikasi. Dalam uraian NIST, algoritma hash berpanjang tetap memetakan pesan berpanjang sembarang ke intisari berpanjang tetap. Ketahanan terhadap tabrakan dijelaskan sebagai sifat bahwa menemukan sepasang masukan berbeda yang memiliki hash yang sama sulit secara komputasi. Hal ini berbeda dari menjamin label yang berbeda untuk setiap masukan yang mungkin.

Hash tidak secara otomatis menjamin kebenaran isi atau penulisnya. Definisinya berpusat pada hash berpanjang tetap, dan tidak digeneralisasi dalam kalimat yang sama ke fungsi keluaran berpanjang variabel.
