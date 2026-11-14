---
card: MATH03
domain: 수학과 계산
title: 자기 자신을 출력하는 문장이 아는 것
by: ChatGPT 조사 · Claude 다듬음
written: 2026-11-10
sources: Computation and Discrete Mathematics, Chapter 9 — Klaus Sutner / Carnegie Mellon University, https://www.cs.cmu.edu/~cdm/resources/main-fund.pdf (열람: 저자 강의교재 본문 9.1.1)
---
자기참조는 신비로운 자기의식의 증거로 읽기 쉽지만, 계산에서는 먼저 정확한 연산으로 다룰 수 있다. Sutner의 계산 이론 교재는 구체적인 프로그래밍 언어에서 실행하면 자신의 프로그램 텍스트를 출력하는 프로그램을 quine이라고 소개한다. 같은 절의 재귀 정리 고정점 버전은 모든 프로그램 지표에서 정의되는 계산 가능한 프로그램 변환에 대해 입출력 행동이 변환 전후 같은 프로그램 지표가 존재한다는 내용을 설명한다. 여기서 ‘같다’는 말은 소스 문자열의 동일함, 계산 과정의 동일함, 입출력 함수의 동일함 가운데 어느 것인지에 따라 뜻이 달라진다.

재귀 정리의 고정점은 일반적으로 행동적 동등성에 관한 것이다. quine이나 자기지시 문장만으로 의식, 자기이해, 정확한 내성 보고를 입증할 수 없다.
