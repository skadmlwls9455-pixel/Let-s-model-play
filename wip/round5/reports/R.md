# 5차 R 갈래 보고 — 달리기 글 → 그림 · 달리기 글자 (branch `lane/r`, base d88ab74)

## 결론

두 항목(ui-polish.md 달리기 [must] 글자 · [should] 안내 글)을 주인 답 (a) 대로 마쳤다.
- 준비 · 쉬는 중에 들판에 뜨던 문장이 없다. 대신 점프 동그라미 테두리가 두 단계로 세 번 깜빡인 뒤 밝게 켜져 있고, 그 옆에 손 그림이 있다. 쉬는 중에는 가운데에 일시정지 그림이 뜬다.
- 위 HUD 의 '최고 N' 은 왕관 그림 + 수다.
- 결과 판은 '상자에 콩!' 한 줄, 발자국 그림 + 큰 점수, 왕관 + 최고, 조개 그림 + '+n' 이다. 따로 뜨던 조개 알림은 판 안으로 들어갔다.
- '다시' · '닫기' 는 글자 그대로다.
- 글자: 픽셀 글꼴이면 크기가 `--fs-*` 라 기기 px 정수 배로 또렷하고, 끄면 Noto Sans KR(부딪힌 줄은 Noto Serif KR 600)이다. 줄 높이는 1.5, 줄어든 글자는 없다.
- 시뮬 · `VERSION 'runner-2'` · 골든 값은 그대로다.
- 독립 점검: must 0 건, should 1 건 (고침).

## 바꾼 것

- `js/runner.js`
  - `PIX` · `pixSVG` · `pic` · `iconImg` (새): 12×12 픽셀 그림(손 · 왕관 · 일시정지)을 inline SVG 로 그린다. 게임 그림 `ctl/walk` · `souvenir/shell` 은 `UIART.iconSrc` 를 쓴다.
  - `buildDialog`:
    - `#rn-msg` 는 `sr-only` 이고 live 그대로다.
    - `#rn-hand` 는 `.rn-ctrls` 안, `#rn-pause` 는 `.rn-mid` 안에 있다.
    - HUD 최고는 왕관 + `#rn-best`(수만)이다.
    - 결과 판은 `#rn-final` + `#rn-final-sr`(읽어 주기, 예전 문장) + `.rn-final-row` 다. 이 줄에는 발자국 + `#rn-final-n`, 왕관 + `#rn-final-bn`, 조개 + `#rn-shell-n` 이 들어가고, 보이는 수는 aria-hidden 이다.
  - `fit`: `--rn-px` = round(2·dpr)/dpr, `--rn-px4` = round(4·dpr)/dpr 이다. 그림 한 점이 기기 px 정수 개가 된다.
  - `hint(kind)` (새): 손 · 일시정지 그림과 동그라미 `.hint` 를 켜고 끈다. 줄인 움직임이면 창에 `.rn-still` 이 붙는다 (캔버스와 같은 `reducedMotion()`).
  - `ready` · `start` · `pause` · `resume` · `over` 가 `hint` 를 부른다. 서버 시드를 기다리는 동안(탭을 안 받는 때)은 그림이 없다.
  - `saveRun`: `APP.earnFromPlay(r, { quiet: end === 'hit' })` 이 준 수를 `L.earned` 에 둔다.
  - `over`: 그림 + 수를 채운다. 새 최고면 왕관이 두 번 깜빡인다.
  - `hudUpdate`: 최고는 수만 쓴다.
- `css/runner.css`:
  - 머리 주석을 고쳤다.
  - 기본 규칙: Noto Sans KR 16/20/24px, `.rn-final` 은 Noto Serif KR 600, line-height 1.5.
  - 픽셀 규칙 (ui-polish 그대로 + 새 `.rn-final-shell` · `.rn-big`): `--f-meta`/`--fs-m16`, `--f-body`/`--fs-b20`, `--f-ui`/`--fs-u24`.
  - 그림 크기 · 자리 · 깜빡임(`rn-flash` · `rn-tap` · `rn-blink`, 모두 steps)을 넣었고, `.rn-still` 이면 움직임이 없다.
- `tools/test-runner.js`: 하네스에 `sb` · `frames` 를 열고 라이브 검사 10개를 더했다.
- `tools/smoke.js` R: 새 검사 6개를 더했고, 옛 '최고' 글자 검사는 왕관 + 수 검사로 바꿨다.

## 내 영역 밖 (outside my area)

- `js/app.js` `earnFromPlay(r, o)`: 머리 한 줄과 toast 줄 하나만 고쳤다. `o.quiet` 이면 알림을 건너뛴다. 준 수를 돌려주는 동작은 원래 있었다.

## 결정 (decisions)

1. quiet 는 결과 판이 뜨는 판(부딪혀 끝남)만 쓴다. 달리다 '닫기' 로 끝난 판은 판이 없으니 예전처럼 알림을 띄운다.
2. 이끼 수(' · 이끼 N')는 보이는 판에서 뺐다. 점수에 이미 들어 있고, 주인 답의 판 구성(한 줄 + 큰 점수 + 왕관 + 조개)에 없다. 읽어 주기 문장에는 남겼다.
3. '예전 게임 최고 N' 줄(옛 runner-1 기록이 있는 사람만)은 글자 그대로 뒀다. 왕관을 두 개 두면 헷갈린다.
4. 큰 점수 수는 Galmuri11 `--fs-u24` 다 (항목 2). 최고 · '+n' 은 항목 1 의 `--fs-b20` (Galmuri9) 이다.
5. 동그라미는 세 번 깜빡인 뒤 밝게 켜 둔다 (안내가 사라지지 않게). 손은 세 번 톡 하고 멈춘다.
6. `--fs-b20` 은 2.625 배율에서 19.05px 다. 기기 px 맞춤 규칙(index.html, 다른 화면과 같음)을 따른 결과라 그대로 뒀다.
7. 조개를 이미 받은 판(같은 id)이면 n = 0 이라 조개 줄을 숨긴다.

## 바뀐 플레이어 글 (before → after)

- 준비 '점프를 톡 누르면 출발해' (보임) → 같은 글, 읽어 주기만. 보이는 건 손 그림 + 동그라미 깜빡임.
- 쉬는 중 '잠깐 쉬는 중이야. 점프를 누르면 이어서 달려' (보임) → 같은 글, 읽어 주기만. 보이는 건 일시정지 그림 + 손.
- '판을 고르는 중이야…' (보임) → 읽어 주기만, 그림 없음.
- HUD '최고 N' → 왕관 그림 + 'N'.
- 결과 'N만큼 달렸어 · 이끼 M' → 발자국 그림 + 'N'.
- 결과 '새 최고야! 최고 N' / '최고 N' → 왕관 그림 + 'N' (새 최고면 두 번 깜빡).
- 알림 '조개 n개 · 이제 m개' (부딪혀 끝난 판) → 판 안 조개 그림 + '+n'.
- 읽어 주기 (새, `#rn-final-sr`): 'N만큼 달렸어[ · 이끼 M]. [새 최고야! ]최고 N[. 조개 n개]' — 모두 예전 문장 조각이다.
- 새 한국어 글자는 없다. `subset-fonts --check`: stale none.

## 더한 검사

- test-runner 라이브 (가짜 DOM):
  - 판을 고르는 중엔 손이 없다.
  - 준비 = 손 보임 · 일시정지 숨김 · 읽어 주기 글 그대로.
  - 달리는 중 = 그림 없음. HUD 최고는 수만 보인다.
  - 결과: 큰 점수 · 최고 수 · 조개 '+3'.
  - 부딪힌 판은 `quiet: true` 로 부른다. 읽어 주기는 예전 문장이다.
  - 결과 판에 손 · 일시정지 그림이 없다. 달리다 닫은 판은 quiet 가 아니다.
- 스모크 R (실제 브라우저 360×740 @2):
  - 준비: 보이는 문장 0, 손 그림.
  - 위: 왕관 + 수.
  - 쉬는 중: 보이는 문장 0, 일시정지 + 손.
  - 결과: 조개 그림 + '+n', 왕관. 조개 알림이 따로 뜨지 않는다. 읽어 주기 문장.
  - 게임 오버 최고 검사는 왕관 + 수로 바꿨다.

## 돌린 것

- `node tools/test-runner.js` 581 passed, 0 failed
- `SMOKE_ONLY=R node tools/smoke.js` 38 passed, 0 failed
- `SMOKE_ONLY=J,U node tools/smoke.js` 66 passed, 0 failed
- `npm test` exit 0 (572 · 26 · 581 · 235 · 192 · 235 · export 47, 모두 0 failed)
- `python3 tools/subset-fonts.py --check` stale none
- 폰 배율 탐침 (360×740 @2 · @3, 412×915 @2.625, 320×568 @2, 740×360 @2, 픽셀 글꼴 끔). 모든 픽셀 글자가 기기 px 정수 배다. @2.625 에서 Galmuri11 18.29px = 4, 22.86px = 5, Galmuri9 19.05px = 5 기기 px/글꼴 px.
- 독립 점검 (새 서브에이전트): must 0. should 1 건은 '판을 고르는 중(최대 2 초, http 만) 손 그림이 탭을 부르지만 탭이 무시됨' 이었고, 고친 뒤 검사를 더했다.

## 사진 (`wip/round5/shots/R/`, 360×740 @2)

ready · running · pause · result-new-best · result · landscape (740×360 @2) · result-system-font

## 남긴 것 · 확인 못 한 것

- 순위 칸(http(s) 에서만)은 브라우저로 보지 않았다. 글자 규칙만 바꿨고, 가짜 DOM 라이브 검사가 지난다.
- 실제 폰 기기와 실제 화면 낭독기로는 확인하지 않았다 (Chromium 배율 흉내와 DOM 확인만).
- 부엌(cook.css)은 범위 밖이다.
