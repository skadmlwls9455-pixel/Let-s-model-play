---
card: MATH05
domain: 수학과 계산
title: 짧게 말할 수 있다는 것과 빨리 계산한다는 것
by: ChatGPT 조사 · Claude 다듬음
written: 2026-11-10
sources: An Invitation to Algorithmic Information Theory — G. J. Chaitin / University of Auckland 보관, https://www.cs.auckland.ac.nz/~cristian/ait_invitation.html (열람: 저자 강연의 편집 기록 본문) ; Algorithmic Information Theory — University of Auckland CDMTCS, https://www.cs.auckland.ac.nz/research/groups/CDMTCS/docs/old/ait.php (열람: 연구그룹 공식 설명)
---
‘복잡하다’는 말은 길이, 계산 시간, 이해의 어려움을 한꺼번에 가리키곤 한다. 알고리즘 정보 이론의 기본 아이디어는 대상을 계산하는 가장 작은 프로그램의 비트 수로 복잡도를 재는 것이다. Chaitin은 자신의 강연에서 관심을 두는 프로그램 크기와 계산 시간을 분명하게 구분한다. 긴 표를 그대로 저장하는 방식과 짧은 규칙에서 표를 다시 만드는 방식은 저장량과 실행량을 서로 다르게 배분한다. 압축 프로그램 하나에서 잘 줄었다는 관찰은 그 프로그램이 찾은 구조에 관한 정보다. 그것만으로 모든 가능한 설명 가운데 절대적으로 가장 짧은 설명을 찾았다고 말할 수는 없다.

프로그램 크기 복잡도와 시간 복잡도는 다른 척도다. 특정 압축기의 출력 길이를 정확한 Kolmogorov 복잡도로 동일시하지 않는다.
