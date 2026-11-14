/* js/haptics.js — 진동 (전역 HAPTICS). 11-15 5차 주인: "진동 기본 켬, 설정에서 끄기".
   - 웹 진동 (navigator.vibrate) 이 되는 기기 (안드로이드 크롬 · 삼성 인터넷 등) 에서만 울린다. 아이폰 사파리는 웹 진동을 받지 않는다
     — 그때는 아무 일도 없다 (오류 없음).
   - 크롬은 사람이 화면을 한 번이라도 누른 뒤에만 진동을 허락한다 (사용자 활성화). 놀이 중 진동은 늘 누른 뒤라 그대로 된다.
   - 설정은 본 게임 기록과 따로 'ppolppol_haptics' = { on: bool } (소리 'ppolppol_audio' 와 같은 식). 없으면 켬.
     본 게임 (index.html) 과 부엌 (cook.html, iframe) 이 같은 열쇠를 읽는다 — 설정 › 화면 › 진동 이 끄면 둘 다 조용하다.
   - 무늬는 아주 짧게 (8~40 ms). 이름으로 부른다: HAPTICS.buzz('jump') */
var HAPTICS = (function () {
  'use strict';
  var KEY = 'ppolppol_haptics';
  var P = {
    tick: 8,                 /* 고르기 · 가벼운 톡 */
    tap: 12,                 /* 요리 톡 (반죽 자국) */
    jump: 12,                /* 달리기 점프 */
    land: 8,                 /* 달리기 착지 */
    hit: [40, 30, 40],       /* 달리기 부딪힘 (판 끝) */
    flip: 22,                /* 요리 뒤집기 */
    cut: 14,                 /* 요리 썰기 한 줄 */
    done: [16, 60, 24],      /* 요리 완성 (접시) */
    pick: 10,                /* 가구 집기 */
    drop: 16,                /* 가구 놓기 */
    nope: [10, 40, 10]       /* 못 놓는 곳 */
  };
  var mem = null;   /* 저장소가 없을 때 이 페이지 안에서만 */
  function supported() { try { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; } catch (e) { return false; } }
  function on() {
    if (mem != null) return mem;
    try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); return !(o && o.on === false); } catch (e) { return true; }
  }
  function set(v) { mem = null; try { localStorage.setItem(KEY, JSON.stringify({ on: !!v })); } catch (e) { mem = !!v; } }
  var last = 0;
  function buzz(name) {   /* → 진짜로 울리라고 했는가 */
    var p = P[name];
    if (p == null || !on() || !supported()) return false;
    var now = Date.now(); if (typeof p === 'number' && now - last < 30) return false;   /* 한 프레임에 겹친 톡은 하나로 */
    last = now;
    try { return navigator.vibrate(p) !== false; } catch (e) { return false; }
  }
  return { buzz: buzz, on: on, set: set, supported: supported, PATTERNS: P, KEY: KEY };
})();
