/* js/haptics.js — 진동 (전역 HAPTICS). 11-15 5차 주인: "진동 기본 켬, 설정에서 끄기".
   - 웹 진동 (navigator.vibrate) 이 되는 기기 (안드로이드 크롬 · 삼성 인터넷 등) 에서만 울린다. 아이폰 사파리는 웹 진동을 받지 않는다
     — 그때는 아무 일도 없다 (오류 없음).
   - 크롬은 사람이 화면을 한 번이라도 누른 뒤에만 진동을 허락한다 (사용자 활성화). 11-15 5차: 그 전에는 부르지도 않는다 (allowed()).
   - 설정은 본 게임 기록과 따로 'ppolppol_haptics' = { on: bool } (소리 'ppolppol_audio' 와 같은 식). 없으면 켬.
     본 게임 (index.html) 과 부엌 (cook.html, iframe) 이 같은 열쇠를 읽는다 — 설정 › 화면 › 진동 이 끄면 둘 다 조용하다.
   - 무늬는 아주 짧게 (8~40 ms). 이름으로 부른다: HAPTICS.buzz('jump') */
var HAPTICS = (function () {
  'use strict';
  var KEY = 'ppolppol_haptics';
  var P = {
    tick: 8,                 /* 고르기 · 가벼운 톡 */
    tap: 14,                 /* 요리 톡 (반죽 자국) · 불 켬 — 11-15 5차: 느껴지는 쪽으로 (12 → 14) */
    jump: 12,                /* 달리기 점프 */
    land: 8,                 /* 달리기 착지 */
    hit: [40, 30, 40],       /* 달리기 부딪힘 (판 끝) */
    flip: 24,                /* 요리 뒤집기 (팬에 떨어지는 칸) — 22 → 24 */
    cut: 16,                 /* 요리 썰기 한 줄 — 14 → 16 */
    done: [16, 80, 26],      /* 요리 완성 (접시가 놓이는 칸) — 11-15 5차: 사이 80 ms 로 두 번이 따로 느껴지게 */
    pick: 10,                /* 가구 집기 */
    drop: 16,                /* 가구 놓기 */
    nope: [10, 40, 10]       /* 못 놓는 곳 */
  };
  var mem = null;   /* 저장소가 없을 때 이 페이지 안에서만 */
  /* 11-15 5차 (가까이 보기 §7.1): '된다' 는 정직하게 — 함수가 있어도 파이어폭스는 울리지 않고 (true 를 돌려주기만),
     손가락 화면이 없는 컴퓨터엔 진동기가 없다. 그런 곳엔 설정 칸을 두지 않는다 (app.js 가 supported() 를 본다) */
  function supported() {
    try {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
      if (/Firefox\//.test(String(navigator.userAgent || ''))) return false;
      return typeof matchMedia === 'function' && !!matchMedia('(any-pointer: coarse)').matches;
    } catch (e) { return false; }
  }
  /* 크롬은 사람이 한 번도 안 누른 쪽 (새 iframe 의 첫 pointerdown 도 아직이다) 에서 vibrate() 를 막고 콘솔에 '오류' 를 남긴다 →
     부르기 전에 스스로 본다. 숨은 쪽 (다른 탭 · 화면 꺼짐) 에서도 울리지 않는다 */
  function allowed() {
    try {
      if (typeof document !== 'undefined' && document && document.visibilityState && document.visibilityState !== 'visible') return false;
      var ua = navigator.userActivation;
      if (ua && !ua.hasBeenActive) return false;
      return true;
    } catch (e) { return false; }
  }
  function on() {
    if (mem != null) return mem;
    try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); return !(o && o.on === false); } catch (e) { return true; }
  }
  function set(v) { mem = null; try { localStorage.setItem(KEY, JSON.stringify({ on: !!v })); } catch (e) { mem = !!v; } }
  var last = 0;
  function buzz(name) {   /* → 진짜로 울리라고 했는가. 어떤 경우에도 던지지 않는다 */
    try {
      var p = Object.prototype.hasOwnProperty.call(P, name) ? P[name] : null;
      if (p == null || !on() || !supported() || !allowed()) return false;
      var now = Date.now(); if (typeof p === 'number' && now - last < 30) return false;   /* 한 프레임에 겹친 톡은 하나로 */
      last = now;
      return navigator.vibrate(p) !== false;
    } catch (e) { return false; }
  }
  return { buzz: buzz, on: on, set: set, supported: supported, PATTERNS: P, KEY: KEY };
})();
