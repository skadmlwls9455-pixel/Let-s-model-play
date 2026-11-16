/* 11-15 5차 (주인: "글자가 깨지는 느낌 … 가독성 좀 살려줘"): 픽셀 글꼴 크기를 기기 픽셀에 맞춘다. index.html · credits.html 의 head 에서 동기로 읽는다.
   Galmuri 는 점 하나가 기기 px 정수 개일 때만 고르게 보인다 (안드로이드 흔한 배율 2.625 · 2.75 에서 20px = 52.5 기기 px → 점 너비가 5 · 6 섞여 깨져 보였다).
   역할마다 [글꼴 눈금 (Galmuri7 8 · Galmuri9 10 · Galmuri11 12), 바라는 CSS px] → 눈금 × 정수 n / 배율 중 가장 가까운 것. css 의 var(--fs-*, 기본값) 이 받는다.
   11-15 (UI 점검): 크기를 1/64 px 위로 올림 — 크롬은 글자 너비를 1/64 px 로 자른다. 예전 toFixed(4) 는 18.2857 처럼 살짝 모자라서 2.625 배율에서 네다섯 글자 뒤부터 점이 기기 px 밖으로 밀렸다.
   배율 1 · 2 · 3 의 값은 이미 1/64 의 정수 배라 그대로다. 배율이 바뀌면 (창 옮김 · 확대) 다시 맞춘다 */
(function () {
  var R = document.documentElement, S = { m16: [12, 16], b20: [10, 20], u20: [12, 20], u24: [12, 24], n16: [8, 16], u12: [12, 12] }, BUB = [12, 17], last = 0;
  function snap(g, want, d) { var n = Math.max(1, Math.round(want * d / g)); return (Math.ceil(g * n / d * 64) / 64) + 'px'; }
  function apply() {
    var d = window.devicePixelRatio || 1;
    if (d === last) return;
    last = d;
    try { for (var k in S) R.style.setProperty('--fs-' + k, snap(S[k][0], S[k][1], d)); R.style.setProperty('--bub-fs', snap(BUB[0], BUB[1], d)); } catch (e) { /* 옛 브라우저: 기본값 */ }
    try { var mq = window.matchMedia('(resolution: ' + d + 'dppx)'); if (mq.addEventListener) mq.addEventListener('change', apply, { once: true }); else if (mq.addListener) mq.addListener(apply); } catch (e) { /* 배율이 안 바뀌는 곳 */ }
  }
  apply();
  /* 브라우저 확대는 matchMedia 가 놓칠 때가 있다 → resize 에서 배율이 바뀐 때만 */
  try { window.addEventListener('resize', function () { if ((window.devicePixelRatio || 1) !== last) apply(); }); } catch (e) {}
  window.PPOL_FS_SNAP = snap;
})();
