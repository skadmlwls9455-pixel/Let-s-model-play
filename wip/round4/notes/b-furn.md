# 갈래 B (furn) 노트

## 계획
- scene3d: FM 상태 (on · sel · open 스냅샷 · drag). furnMode(on) · furnSelect · furnRotate/furnScale(dir) (겹치면 거절 → false) · furnNudge · furnSave · furnCancel.
  손가락: 모드 중 한 손가락 누름이 가구 위면 그 가구 끌기 (0.25 m 칸 + 벽에 딱 붙기), 못 놓는 곳은 빨간 테 · 떼면 끌기 전 자리로. 꾹 누르기 없앰.
  모드 중 문어 · 캐릭터 · 데칼 숨김 (매 프레임 강제), 닫으면 되돌림. 카메라: yawDrag 0 · 1× · 밀기 0.
  양초 = 상자 행렬 복사 (위치 · 회전 · 크기) + 빛 높이 + 글로우 쿼터니언 보정. 상자 데칼은 옮기면 다시.
  문어 자리: 상자 옆 · 담요 잠자리 따라가기, 모든 다락 앵커가 가구 발자국 안이면 가장 가까운 빈 자리로 (가구는 안 옮김). 문어 길: 다락에서 가구를 돌아가는 꺾인 길 (walkPoint · cerWalk).
  의식(출발 · 귀가) 시작 = 저장하고 닫기.
- app: furnOpen → 모드, 위 줄 '취소' · '가구 옮기기' · '저장하기', 고른 가구 밑 단추 줄 '돌리기' '작게' '크게', 가구 줄(톡 = 고르기) 남김, 첫 안내 한 줄. 키보드. 저장 = S.room.layout 같은 모양 (바뀐 것만).
- 망치 아이콘 (12×12, 색).

## 진행
- 장면 · 앱 · html · css · 망치 다 씀. 1× 에선 다락 바닥(463 px)이 360 에 안 들어가 → 모드만 1× 아래 정수 N 으로 맞춤 (furnFit).
- smoke Z-6 새로 (17 ok), Q-12 · Z-4 고침. 다음: npm test · Y · Q · Z 전부 · 폰트 · perf · 사진 · 독립 점검.
- Y-3f 고침 (위층에선 망치가 모드를 안 연다). 방향키: 위아래 / 좌우가 서로 다른 바닥 축.
- 돌리는 중: smoke Y,Q,Z (로그 scratchpad smoke-yqz.log) · test-scene-perf · 독립 점검 subagent.
