---
card: MATH01
domain: 수학과 계산
title: 단 다섯 상태로 4,717만 단계를 버티는 기계
by: ChatGPT 조사 · Claude 다듬음
written: 2026-11-10
sources: Determination of the fifth Busy Beaver value — bbchallenge Collaboration / arXiv, https://arxiv.org/abs/2509.12337 (열람: 초록) ; [July 2nd 2024] We have proved "BB(5) = 47,176,870" — The Busy Beaver Challenge, https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 (열람: 프로젝트 공식 발표 본문)
---
Busy Beaver는 짧은 프로그램을 오래 실행시키는 놀이처럼 보이지만, 핵심은 오래 달린 후보를 찾는 일과 그보다 더 오래 달리고 멈출 후보가 없음을 증명하는 일이 다르다는 데 있다. bbchallenge 연구진은 전부 0인 테이프에서 시작하는 5상태·2기호 튜링 기계의 최대 정지 단계 수 S(5)가 47,176,870이라고 Coq를 이용해 증명했다. 프로젝트 설명에 따르면 증명은 가능한 기계들을 대칭으로 줄여 열거하고, 행동 유형을 판정하는 여러 decider와 일부 개별 증명을 결합한다. 여기서 ‘아직 안 멈췄다’는 관찰을 ‘영원히 안 멈춘다’로 바꿔 말할 수 없다는 틈이 생긴다.

여기서 BB는 단계 수 S를 뜻한다. 테이프에 남기는 1의 수를 최대화하는 Σ와 구별하며, 이 사례가 일반 정지 문제를 해결하지는 않는다.
