---
card: MATH06
domain: 수학과 계산
title: 여분의 비트를 넣어서 틀림을 고친다
by: ChatGPT 조사 · Claude 다듬음
written: 2026-11-10
sources: Error Detecting and Error Correcting Codes — R. W. Hamming / Bell System Technical Journal; Yale 보관, https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf (열람: 원논문 본문 §5 및 Table V)
---
오류 정정의 출발점은 가능한 비트열 중 일부만 올바른 전송 코드워드로 허용하는 데 있다. Hamming의 원논문은 두 비트열 사이 거리를 서로 다른 좌표의 개수로 정의한다. 그리고 허용된 코드들 사이의 최소 거리가 3 이상이면 단일 비트 오류가 나도 원래 코드에 더 가까운 상태로 남아 정정할 수 있다고 설명한다. 이 관점에서 여분의 비트는 무의미한 반복이 아니라 메시지들 사이에 확보해 둔 간격이다.

최소 거리 조건은 어떤 종류와 개수의 오류를 다루는지와 함께 읽어야 한다. 자연어 의미의 유사도는 Hamming 거리와 같은 수학적 대상이 아니다.
