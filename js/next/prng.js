/* js/next/prng.js — 6차 갈래가 같이 쓰는 시드 난수 (전역 NEXT_PRNG · node 에서도 require).
   결정 · 결과 코드에 Math.random 을 쓰지 않는다: 같은 날 + 같은 입력이면 같은 결과.
   hashSeed('pick', '2026-11-18', 'beach') → uint32 · mulberry32(seed) → () => [0, 1) · dateKey(d) = 로컬 날짜 (toISOString 은 한국 오전 9시에 날이 바뀐다).
   (.claude/skills/cozy-web-game/scripts/prng.js 와 같은 알고리즘 — FNV-1a + mulberry32) */
(function (root) {
  'use strict';
  function fnv1a(str) { var h = 0x811c9dc5; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function hashSeed() { return fnv1a(Array.prototype.map.call(arguments, String).join('|')); }
  function mulberry32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rng() { return mulberry32(hashSeed.apply(null, arguments)); }   /* rng('pick', day, zone) */
  function dateKey(d) { d = d || new Date(); function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function pickWeighted(items, r, weightOf) { var w = weightOf || function (x) { return x.w == null ? 1 : x.w; }, total = 0, i; for (i = 0; i < items.length; i++) total += w(items[i]); var t = r() * total; for (i = 0; i < items.length; i++) { t -= w(items[i]); if (t <= 0) return items[i]; } return items[items.length - 1]; }
  function shuffle(list, r) { var a = list.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var API = { fnv1a: fnv1a, hashSeed: hashSeed, mulberry32: mulberry32, rng: rng, dateKey: dateKey, pickWeighted: pickWeighted, shuffle: shuffle };
  root.NEXT_PRNG = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
