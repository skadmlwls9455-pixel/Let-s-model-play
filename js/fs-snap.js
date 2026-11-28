/* 11-15 5차 (주인: "글자가 깨지는 느낌 … 가독성 좀 살려줘"): 픽셀 글꼴 크기를 기기 픽셀에 맞춘다. index.html · credits.html 의 head 에서 동기로 읽는다.
   Galmuri 는 점 하나가 기기 px 정수 개일 때만 고르게 보인다 (안드로이드 흔한 배율 2.625 · 2.75 에서 20px = 52.5 기기 px → 점 너비가 5 · 6 섞여 깨져 보였다).
   역할마다 [글꼴 눈금 (Galmuri7 8 · Galmuri9 10 · Galmuri11 12), 바라는 CSS px, 올림] → 눈금 × 정수 n / 배율 중 가장 가까운 것. css 의 var(--fs-*, 기본값) 이 받는다.
   11-15 (검증): 이번 차례 전보다 작아지면 안 되는 자리는 올림 (셋째 칸 1 = 바라는 크기 밑으로 안 내려감). 가장 가까운 것만 쓰니 배율 2 에서 소제목 18px · 2.625 에서 안내 19.06px 로 4차보다 작아졌다.
     올림: n16 숫자 · u12 '데모' 꼬리표 (12px 밑 금지) · h20 소제목 · b20f 안내 · 포스터 아래 글 · u24f 만든 것들 제목. m16 · b20 · u20 · u24 · 말풍선은 가장 가까운 것 그대로
   11-15 (UI 점검): 크기를 1/64 px 위로 올림 — 크롬은 글자 너비를 1/64 px 로 자른다. 예전 toFixed(4) 는 18.2857 처럼 살짝 모자라서 2.625 배율에서 네다섯 글자 뒤부터 점이 기기 px 밖으로 밀렸다.
   배율 1 · 2 · 3 의 값은 이미 1/64 의 정수 배라 그대로다. 배율이 바뀌면 (창 옮김 · 확대) 다시 맞춘다 */
(function () {
  var R = document.documentElement, S = { m16: [12, 16, 2], b20: [10, 20], u20: [12, 20], u24: [12, 24], n16: [8, 16, 1], u12: [12, 12, 1], h20: [12, 20, 1], b20f: [10, 20, 1], u24f: [12, 24, 1] }, BUB = [12, 17, 2], last = 0;
  /* 11-24 (점검: 배율 1 · 1.75 · 2.5 · 4 에서 m16 이 12 · 13.7 · 14.4 · 15 px — 보이는 글자는 늘 16 px 이상): 셋째 칸 2 = 바라는 크기 밑으로 안 내려가되,
     다음 눈금이 바라는 크기의 1.35 배를 넘으면 (배율 1 에서 16 → 24) 눈금 대신 바라는 크기 그대로 (그 배율에선 점이 조금 고르지 않아도 작지 않은 쪽) */
  function snap(g, want, d, up) {
    var x = want * d / g, n = Math.max(1, up ? Math.ceil(x - 1e-6) : Math.round(x)), v = Math.ceil(g * n / d * 64) / 64;
    if (up === 2 && v > want * 1.35) v = want;
    return v + 'px';
  }
  function apply() {
    var d = window.devicePixelRatio || 1;
    if (d === last) return;
    last = d;
    try { for (var k in S) R.style.setProperty('--fs-' + k, snap(S[k][0], S[k][1], d, S[k][2])); R.style.setProperty('--bub-fs', snap(BUB[0], BUB[1], d, BUB[2])); } catch (e) { /* 옛 브라우저: 기본값 */ }
    try { var mq = window.matchMedia('(resolution: ' + d + 'dppx)'); if (mq.addEventListener) mq.addEventListener('change', apply, { once: true }); else if (mq.addListener) mq.addListener(apply); } catch (e) { /* 배율이 안 바뀌는 곳 */ }
  }
  apply();
  /* 브라우저 확대는 matchMedia 가 놓칠 때가 있다 → resize 에서 배율이 바뀐 때만 */
  try { window.addEventListener('resize', function () { if ((window.devicePixelRatio || 1) !== last) apply(); }); } catch (e) {}
  window.PPOL_FS_SNAP = snap;
})();
