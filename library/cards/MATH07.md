---
card: MATH07
domain: 수학과 계산
title: 짧은 지문은 원문을 기억하지 않는다
by: ChatGPT 조사 · Claude 다듬음
written: 2026-11-10
sources: Hash Functions — NIST Computer Security Resource Center, https://csrc.nist.gov/Projects/hash-functions (열람: 공식 기술 설명)
---
해시는 긴 자료에 짧은 이름표를 붙이는 데 유용하지만, 그 이름표를 원문과 혼동하면 검증이 과장된다. NIST 설명에서 고정 길이 해시 알고리즘은 임의 길이 메시지를 고정 길이 다이제스트로 사상한다. 충돌 저항성은 서로 다른 입력이 같은 해시를 갖는 쌍을 찾아내기 계산상 어렵다는 성질로 설명된다. 이는 모든 가능한 입력에 서로 다른 이름표를 보장한다는 뜻과 다르다.

해시는 내용의 진실성이나 저자를 자동으로 보증하지 않는다. 정의는 고정 길이 해시를 중심으로 하며, 가변 길이 출력 함수까지 같은 문장으로 일반화하지 않는다.
