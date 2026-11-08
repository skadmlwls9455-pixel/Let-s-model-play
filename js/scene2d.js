/* ============================================================
   뽈뽈 문어 — js/scene2d.js (전역 SCENE2D)
   2D 폴백 장면: 인라인 SVG 레이어 320×240 + DOM 문어 (#oct).
   SCENE3D 와 같은 API (DESIGN.md §13.1). THREE/WebGL 이 없을 때 APP 이 이걸 쓴다.
   1차 구현(app.js 의 scene/octopus 섹션)을 그대로 옮긴 것. 로직은 바꾸지 않았다.
   ============================================================ */
var SCENE2D = (function () {
  'use strict';

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(s) { s = String(s); var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  /* 꾸밈용 시드 난수 (mulberry32, [0,1)): 같은 키 → 같은 수열. 결정적인 화면, 전역 난수 없음 */
  function seeded(key) { var a = hash(key); return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shade(hex, k) { /* k<0 어둡게 */
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var f = function (v) { v = Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return ('0' + clamp(v, 0, 255).toString(16)).slice(-2); };
    return '#' + f(r) + f(g) + f(b);
  }

  /* ───────── 플레이스홀더 SVG (320×240 좌표계) ───────── */
  function svgWrap(w, hgt, body) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + hgt + '" shape-rendering="crispEdges">' + body + '</svg>'; }
  var PH = {
    'bg.room': function () {
      var s = '<rect width="320" height="240" fill="#7a5a3a"/>';
      s += '<rect width="320" height="168" fill="#8c6a48"/>';
      for (var y = 0; y < 168; y += 12) s += '<rect y="' + y + '" width="320" height="1" fill="#7e5f40"/>';
      s += '<polygon points="0,0 320,0 320,26 0,58" fill="#4a3320"/>';
      for (var x = 0; x < 320; x += 24) s += '<rect x="' + x + '" y="168" width="1" height="72" fill="#5a3c1e"/>';
      for (var yy = 168; yy < 240; yy += 10) s += '<rect y="' + yy + '" width="320" height="1" fill="#654425"/>';
      s += '<rect x="286" y="104" width="34" height="100" fill="#2a1a10"/><rect x="284" y="102" width="4" height="102" fill="#4a3320"/><rect x="284" y="102" width="36" height="4" fill="#4a3320"/>';
      s += '<rect x="304" y="150" width="3" height="3" fill="#c9a257"/>';
      s += '<rect x="44" y="40" width="72" height="4" fill="#4a3320"/><rect x="44" y="116" width="72" height="6" fill="#5c4028"/>';
      return svgWrap(320, 240, s);
    },
    window: function (mode) {
      var s = '<rect width="72" height="84" fill="' + (mode === 'stars' ? '#1a2440' : mode === 'drizzle' ? '#5a6a84' : '#4b5a72') + '"/>';
      s += '<rect x="0" y="0" width="72" height="84" fill="none" stroke="#4a3320" stroke-width="4"/>';
      s += '<rect x="34" y="0" width="4" height="84" fill="#4a3320"/><rect x="0" y="40" width="72" height="4" fill="#4a3320"/>';
      if (mode === 'stars') [[12, 14], [26, 8], [52, 18], [60, 30], [18, 58], [48, 66], [40, 24]].forEach(function (p) { s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="2" height="2" fill="#f7f1d8"/>'; });
      return svgWrap(72, 84, s);
    },
    lantern: function (n) {
      var on = n > 0, a = on ? Math.min(1, .35 + n * .08) : 0;
      var s = '<rect x="13" y="0" width="2" height="8" fill="#5c4028"/><rect x="8" y="8" width="12" height="3" fill="#3a2a18"/>';
      s += '<rect x="7" y="11" width="14" height="22" rx="2" fill="' + (on ? '#f0a040' : '#5a4a3a') + '"/>';
      s += '<rect x="10" y="14" width="8" height="14" fill="' + (on ? '#ffd27a' : '#6a5a4a') + '"/>';
      if (on) s += '<ellipse class="glow" cx="14" cy="22" rx="22" ry="20" fill="#f0a040" opacity="' + (a * .5).toFixed(2) + '"/>';
      s += '<rect x="9" y="33" width="10" height="3" fill="#3a2a18"/>';
      return svgWrap(28, 44, s);
    },
    /* 등불 0칸의 불씨 (40×44, 등불 상자 (36,12) 를 (8,4) 에 품는다): 심지 위 2×2 불씨 + 유리 안 옅은 호박빛 + 계단 모양 작은 빛무리.
       Apollo 호박 램프(#be772b · #de9e41 · #e8c170)만, 정수 좌표 → 픽셀 격자 그대로. 빛무리만 .glow (느린 숨, 동작 줄이기면 멈춤). 3D 쪽 불씨와 같은 뜻 */
    ember: function () {
      var s = '<g class="glow">';
      s += '<g fill="#be772b" opacity=".16"><rect x="8" y="14" width="24" height="16"/><rect x="12" y="10" width="16" height="24"/><rect x="10" y="12" width="20" height="20"/></g>';
      s += '<g fill="#de9e41" opacity=".22"><rect x="14" y="16" width="12" height="12"/><rect x="13" y="18" width="14" height="8"/><rect x="16" y="15" width="8" height="14"/></g>';
      s += '</g>';
      s += '<rect x="19" y="21" width="2" height="2" fill="#de9e41"/><rect x="19" y="20" width="1" height="1" fill="#e8c170"/><rect x="19" y="23" width="2" height="1" fill="#be772b"/>';
      return svgWrap(40, 44, s);
    },
    light: function (n) {
      if (!(n > 0)) return svgWrap(320, 240, '');
      var a = Math.min(0.5, 0.18 + n * 0.04);
      return svgWrap(320, 240, '<defs><radialGradient id="phglow" cx="48" cy="40" r="' + (90 + n * 12) + '" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f0a040" stop-opacity="' + a.toFixed(2) + '"/><stop offset="1" stop-color="#cc8030" stop-opacity="0"/></radialGradient></defs><rect width="320" height="240" fill="url(#phglow)"/>');
    },
    'item.moss': function () { return svgWrap(20, 18, '<rect x="4" y="9" width="12" height="9" fill="#b0623a"/><rect x="3" y="8" width="14" height="2" fill="#c47a4c"/><rect x="5" y="4" width="10" height="5" fill="#4f8a3e"/><rect x="7" y="2" width="6" height="3" fill="#6aa552"/><rect x="2" y="6" width="4" height="4" fill="#4f8a3e"/>'); },
    'item.crate': function () { return svgWrap(44, 36, '<rect width="44" height="36" fill="#9a6a3c"/><rect x="2" y="2" width="40" height="32" fill="#b07c48"/><rect x="2" y="16" width="40" height="2" fill="#8a5a30"/><rect x="21" y="2" width="2" height="32" fill="#8a5a30"/><rect x="4" y="30" width="36" height="2" fill="#8a5a30"/>'); },
    'item.candle': function () { return svgWrap(14, 22, '<rect x="2" y="18" width="10" height="4" fill="#6a4a2a"/><rect x="4" y="8" width="6" height="10" fill="#f3e6c8"/><rect x="6" y="6" width="2" height="2" fill="#3a2a18"/><g class="flame"><rect x="5" y="2" width="4" height="5" fill="#f0a040"/><rect x="6" y="0" width="2" height="3" fill="#ffd27a"/></g>'); },
    'item.blanket': function () { return svgWrap(56, 20, '<rect x="0" y="6" width="56" height="14" rx="3" fill="#8a4a52"/><rect x="4" y="4" width="48" height="6" rx="2" fill="#a85c64"/><rect x="8" y="10" width="40" height="2" fill="#9a5058"/><rect x="0" y="18" width="56" height="2" fill="#6a3a40"/>'); },
    'item.board': function () { return svgWrap(72, 56, '<rect width="72" height="56" fill="#5c4028"/><rect x="3" y="3" width="66" height="50" fill="#c49a66"/><rect x="5" y="5" width="62" height="46" fill="#b78c5a" opacity=".6"/>'); },
    'item.shelf': function () { return svgWrap(56, 14, '<rect x="0" y="8" width="56" height="4" fill="#5c4028"/><rect x="0" y="12" width="56" height="2" fill="#3a2a18"/><rect x="6" y="12" width="2" height="2" fill="#3a2a18"/><rect x="48" y="12" width="2" height="2" fill="#3a2a18"/>'); },
    'item.curtain': function () { return svgWrap(80, 20, '<rect x="0" y="0" width="80" height="3" fill="#3a2a18"/><rect x="2" y="3" width="76" height="17" fill="#9a5058"/><rect x="10" y="3" width="2" height="17" fill="#7a4048"/><rect x="24" y="3" width="2" height="17" fill="#7a4048"/><rect x="40" y="3" width="2" height="17" fill="#7a4048"/><rect x="56" y="3" width="2" height="17" fill="#7a4048"/><rect x="70" y="3" width="2" height="17" fill="#7a4048"/>'); },
    /* 8물결 · 놀이방 문 (36×104 상자, 다락 그림의 오른쪽 벽 면에 맞춰 기울임 skewY −26.565° = 벽 기울기 1:2). 칠은 3D 다락 문과 같다:
       크림 문틀 · 초록 문짝 + 판 · 둥근 창(문 너머 불 켜진 방, 호박) · 호박 손잡이 · 문턱. Apollo 색만 */
    'door.play': function () { return svgWrap(36, 104, '<g transform="translate(0 18) skewY(-26.565)">' + doorSVG() + '</g>'); },
    /* 8물결 · 놀이방 (2D 폴백, 320×240): 다락 그림(assets/bg/room.svg)과 같은 아이소 상자 — 왼쪽 벽 · 오른쪽(뒤) 벽 · 바닥 널.
       왼쪽 벽: 창 · 문어 방으로 가는 문(같은 문) · 벽등. 뒷벽: '다락방 달리기' 오락기 · 부엌 자리(병 선반 · 조리대 · 냄비 · 팬) · 벽등. 가운데 바닥은 비워 둔다 (나중 꾸미기 자리). Apollo 색만 */
    'bg.play': function () {
      var s = '<defs><clipPath id="play2d-floor"><polygon points="0,120 160,200 320,120 320,240 0,240"/></clipPath></defs><rect width="320" height="240" fill="#151d28"/>', y;
      function lamp(x, yy) { return '<rect x="' + (x - 14) + '" y="' + (yy - 6) + '" width="36" height="28" fill="#e8c170" opacity=".18"/><rect x="' + (x + 2) + '" y="' + yy + '" width="4" height="10" fill="#394a50"/><rect x="' + (x - 2) + '" y="' + (yy + 2) + '" width="12" height="7" fill="#de9e41"/><rect x="' + x + '" y="' + (yy + 9) + '" width="8" height="2" fill="#e8c170"/>'; }
      /* 왼쪽 벽 (벽 좌표: x 0–160 · y −30–120, 아래 끝 120) */
      s += '<g transform="skewY(26.565)"><rect x="0" y="-30" width="160" height="150" fill="#a8b5b2"/>';
      for (y = -18; y < 120; y += 12) s += '<rect x="0" y="' + y + '" width="160" height="1" fill="#819796"/>';
      s += '<rect x="20" y="14" width="46" height="50" fill="#e7d5b3"/><rect x="24" y="18" width="38" height="42" fill="#73bed3"/><rect x="24" y="18" width="38" height="8" fill="#a4dddb"/><rect x="42" y="18" width="2" height="42" fill="#e7d5b3"/><rect x="24" y="38" width="38" height="2" fill="#e7d5b3"/><rect x="18" y="64" width="50" height="4" fill="#c09473"/>';
      s += '<g transform="translate(100 34)">' + doorSVG() + '</g>' + lamp(78, 22) + '</g>';
      /* 뒷벽 (벽 좌표: x 0–160 · y 50–200, 아래 끝 200) */
      s += '<g transform="translate(160 0) skewY(-26.565)"><rect x="0" y="50" width="160" height="150" fill="#819796"/>';
      for (y = 62; y < 200; y += 12) s += '<rect x="0" y="' + y + '" width="160" height="1" fill="#577277"/>';
      s += lamp(66, 92);
      /* 오락기 (x 14–58 · y 100–200): 몸통 · 호박 머리판 · 화면(남색 · 초록 땅 · 장미색 달리는 칸) · 조작판(막대 · 단추 둘) · 아래 몸통 · 옆 줄무늬 */
      s += '<rect x="14" y="100" width="44" height="100" fill="#172038"/><rect x="16" y="102" width="40" height="98" fill="#253a5e"/>';
      s += '<rect x="16" y="102" width="40" height="10" fill="#de9e41"/><rect x="18" y="104" width="36" height="2" fill="#e8c170"/><rect x="22" y="108" width="28" height="2" fill="#be772b"/>';
      s += '<rect x="19" y="115" width="34" height="28" fill="#090a14"/><rect x="21" y="117" width="30" height="24" fill="#1e1d39"/><rect x="21" y="135" width="30" height="2" fill="#75a743"/>';
      s += '<rect x="28" y="128" width="5" height="7" fill="#cf573c"/><rect x="29" y="129" width="2" height="1" fill="#e7d5b3"/><rect x="42" y="131" width="3" height="4" fill="#a8ca58"/>';
      s += '<rect x="14" y="146" width="44" height="10" fill="#3c5e8b"/><rect x="14" y="146" width="44" height="2" fill="#4f8fba"/><rect x="23" y="142" width="2" height="6" fill="#394a50"/><rect x="22" y="140" width="4" height="3" fill="#a53030"/><rect x="40" y="149" width="4" height="3" fill="#e8c170"/><rect x="47" y="149" width="4" height="3" fill="#cf573c"/>';
      s += '<rect x="20" y="162" width="32" height="30" fill="#172038"/><rect x="22" y="164" width="28" height="2" fill="#3c5e8b"/><rect x="32" y="176" width="8" height="6" fill="#090a14"/>';
      s += '<rect x="14" y="100" width="2" height="100" fill="#a53030"/><rect x="56" y="100" width="2" height="100" fill="#a53030"/>';
      /* 부엌 자리 (x 80–154): 병 선반 · 냄비 · 팬 · 조리대 */
      s += '<rect x="84" y="128" width="68" height="4" fill="#7a4841"/><rect x="88" y="132" width="2" height="4" fill="#4d2b32"/><rect x="146" y="132" width="2" height="4" fill="#4d2b32"/>';
      [[90, '#4f8fba'], [110, '#a8ca58'], [130, '#df84a5']].forEach(function (j) { s += '<rect x="' + j[0] + '" y="116" width="10" height="12" fill="' + j[1] + '"/><rect x="' + (j[0] + 1) + '" y="114" width="8" height="3" fill="#c09473"/><rect x="' + (j[0] + 2) + '" y="119" width="2" height="6" fill="#ebede9" opacity=".6"/>'; });
      s += '<rect x="80" y="160" width="74" height="40" fill="#ad7757"/><rect x="80" y="156" width="74" height="6" fill="#e7d5b3"/><rect x="80" y="161" width="74" height="1" fill="#c09473"/>';
      s += '<rect x="116" y="164" width="2" height="32" fill="#7a4841"/><rect x="84" y="166" width="30" height="28" fill="#c09473"/><rect x="120" y="166" width="30" height="28" fill="#c09473"/><rect x="110" y="178" width="3" height="4" fill="#e8c170"/><rect x="123" y="178" width="3" height="4" fill="#e8c170"/><rect x="80" y="196" width="74" height="4" fill="#4d2b32"/>';
      s += '<rect x="88" y="142" width="22" height="14" fill="#394a50"/><rect x="86" y="140" width="26" height="3" fill="#577277"/><rect x="96" y="137" width="6" height="3" fill="#819796"/><rect x="90" y="146" width="2" height="8" fill="#577277"/>';
      s += '<rect x="126" y="152" width="18" height="4" fill="#202e37"/><rect x="144" y="153" width="10" height="2" fill="#4d2b32"/></g>';
      s += '<rect x="158" y="50" width="4" height="150" fill="#394a50"/>';
      /* 바닥 (다락 그림과 같은 기울기의 널 줄) · 문 앞 깔개 */
      s += '<polygon points="0,120 160,200 320,120 320,240 0,240" fill="#884b2b"/><g clip-path="url(#play2d-floor)">';
      for (var k = -6; k < 12; k++) s += '<polyline points="' + (-192 + 32 * k) + ',' + (-24 + 16 * k) + ' ' + (128 + 32 * k) + ',' + (136 + 16 * k) + '" fill="none" stroke="#602c2c" stroke-width="1" stroke-opacity=".6"/>';
      s += '</g><polygon points="100,170 136,188 150,181 114,163" fill="#3c5e8b"/><polygon points="104,170 132,184 140,180 112,166" fill="#4f8fba" opacity=".5"/>';
      return svgWrap(320, 240, s);
    }
  };
  function doorSVG() {
    var s = '<rect width="36" height="86" fill="#e7d5b3"/><rect x="34" width="2" height="86" fill="#c09473"/><rect width="36" height="2" fill="#ebede9"/>';
    s += '<rect x="4" y="4" width="28" height="80" fill="#25562e"/><rect x="5" y="5" width="26" height="79" fill="#468232"/>';
    s += '<rect x="8" y="34" width="20" height="20" fill="#25562e"/><rect x="9" y="35" width="18" height="18" fill="#468232"/><rect x="8" y="58" width="20" height="22" fill="#25562e"/><rect x="9" y="59" width="18" height="20" fill="#468232"/>';
    s += '<rect x="5" y="5" width="1" height="79" fill="#75a743"/>';
    s += '<rect x="14" y="12" width="8" height="12" fill="#e7d5b3"/><rect x="12" y="14" width="12" height="8" fill="#e7d5b3"/><rect x="15" y="13" width="6" height="10" fill="#de9e41"/><rect x="13" y="15" width="10" height="6" fill="#de9e41"/><rect x="16" y="15" width="3" height="3" fill="#e8c170"/>';
    s += '<rect x="25" y="46" width="3" height="4" fill="#be772b"/><rect x="25" y="46" width="2" height="2" fill="#e8c170"/>';
    s += '<rect x="0" y="83" width="36" height="3" fill="#7a4841"/><rect x="0" y="83" width="36" height="1" fill="#ad7757"/>';
    return s;
  }
  /* 320×240 기준 상자. item = 이 소품이 items 에 있을 때만 보임 */
  var LAYERS = [
    { key: 'bg.room', x: 0, y: 0, w: 320, h: 240 },
    { key: 'window', x: 40, y: 22, w: 72, h: 96 },
    { key: 'item.curtain', x: 36, y: 18, w: 80, h: 20, item: 'curtain', cls: 'curtain' },
    { key: 'lantern', x: 36, y: 12, w: 24, h: 36, cls: 'lantern' },
    { key: 'ember', x: 28, y: 8, w: 40, h: 44, cls: 'ember' },   /* 등불 0칸일 때만 (아래 renderLayers): 꺼진 등불 그림 위에 작은 불씨 */
    { key: 'light', x: 0, y: 0, w: 320, h: 240, cls: 'light' },
    { key: 'item.board', x: 212, y: 56, w: 72, h: 56, item: 'board' },
    { key: 'item.shelf', x: 140, y: 60, w: 56, h: 14, item: 'shelf' },
    { key: 'item.moss', x: 56, y: 100, w: 20, h: 18, item: 'moss' },
    { key: 'item.crate', x: 222, y: 116, w: 44, h: 36, item: 'crate' },
    { key: 'item.candle', x: 236, y: 96, w: 14, h: 22, item: 'candle', cls: 'candle' },
    { key: 'item.blanket', x: 92, y: 176, w: 56, h: 20, item: 'blanket' },
    { key: 'door.play', x: 166, y: 93, w: 36, h: 104 }   /* 8물결: 오른쪽 벽, 모서리와 포스터 판 사이 — 놀이방 문 (#btn-door 가 이 위에) */
  ];
  /* 8물결 · 문 · 오락기 누르는 곳 (320×240 무대 칸, [x, y, w, h, 보이는 장소]) — 3D 의 hotspots 와 같은 계약 (앱이 넘긴 진짜 <button> 을 맞추고 hidden 을 쥔다) */
  var SPOT_BOX = { atticPlay: [166, 93, 36, 104, 'attic'], playAttic: [100, 84, 36, 104, 'play'], machine: [174, 71, 44, 122, 'play'] };
  var DOOR_ANCHORS = { atticPlayDoor: [190, 200], playAtticDoor: [126, 192] };   /* 문 앞 자리 (나중의 내 캐릭터) — 2D 무대 발끝 좌표 */
  /* §7.1 표 (발끝 좌표). window 는 창턱 '앞'으로 내렸다 */
  var ANCHORS = { door: [296, 196], window: [90, 138], crate: [214, 150], board: [244, 112], blanket: [120, 186], center: [160, 180] };

  function supported() { return true; }

  function init(container, opts) {
    opts = opts || {};
    var on = opts.on || {};
    var st = { lantern: opts.lantern | 0, items: (opts.items || []).slice(), weather: opts.weather || 'rain', color: opts.color || '#e8463c',
      posters: [], souvenirs: [], reduced: !!opts.reducedMotion, speed: opts.speed > 0 ? opts.speed : 1, octState: 'idle', paused: false, ready: false };
    var assetPath = typeof opts.assetPath === 'function' ? opts.assetPath : function () { return null; };
    var stage = container.querySelector('#stage'), layersEl = container.querySelector('#layers'), fx = container.querySelector('#window-fx');
    var souvRow = container.querySelector('#souvenir-row'), wall = container.querySelector('#wall-posts');
    var octEl = opts.octEl || container.querySelector('#oct'), inner = octEl.querySelector('#oct-inner'), bub = octEl.querySelector('#oct-bubble');
    var oct = { x: 160, y: 180, flip: false, walking: null, anchor: 'window' };
    var layerEls = {}, bubbleTimer = null, unbind = [];
    container.classList.add('mode-2d');

    /* 몸 색: 인라인 SVG 의 빨강/어두운 빨강 채움을 태그해 두고 바꾼다 */
    octEl.querySelectorAll('[fill="#e8463c"]').forEach(function (e) { e.setAttribute('data-c', 'body'); });
    octEl.querySelectorAll('[fill="#d93d33"]').forEach(function (e) { e.setAttribute('data-c', 'dark'); });
    octEl.querySelectorAll('[stroke="#e8463c"]').forEach(function (e) { e.setAttribute('data-c', 'lid'); });
    function setColor(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
      st.color = hex; var dark = shade(hex, -0.12);
      octEl.querySelectorAll('[data-c="body"]').forEach(function (e) { e.setAttribute('fill', hex); });
      octEl.querySelectorAll('[data-c="dark"]').forEach(function (e) { e.setAttribute('fill', dark); });
      octEl.querySelectorAll('[data-c="lid"]').forEach(function (e) { e.setAttribute('stroke', hex); });
    }

    /* ───────── 레이어 ───────── */
    function windowMode() { return st.weather === 'clear' || st.weather === 'snow' ? 'stars' : st.weather === 'drizzle' ? 'drizzle' : 'rain'; }
    function layerAssetKey(L) {
      if (L.key === 'window') return 'window.' + windowMode();
      if (L.key === 'lantern') return st.lantern > 0 ? 'lantern.on' : 'lantern.off';
      if (L.key === 'light') return 'light.lantern' + st.lantern;
      return L.key;
    }
    function layerPlaceholder(L) {
      if (L.key === 'window') return PH.window(windowMode());
      if (L.key === 'lantern') return PH.lantern(st.lantern);
      if (L.key === 'light') return PH.light(st.lantern);
      return PH[L.key] ? PH[L.key]() : svgWrap(L.w, L.h, '');
    }
    function buildLayer(L, animate) {
      var el = h('div', { class: 'layer' + (L.cls ? ' ' + L.cls : '') + (animate ? ' enter' : ''), 'data-key': L.key });
      el.style.cssText = 'left:' + L.x + 'px;top:' + L.y + 'px;width:' + L.w + 'px;height:' + L.h + 'px;z-index:' + (L.key === 'bg.room' ? 0 : L.key === 'light' ? 3 : 2);
      el.innerHTML = layerPlaceholder(L);
      var path = assetPath(layerAssetKey(L));
      if (path) {
        var img = new Image(); img.alt = ''; img.decoding = 'async';
        img.onload = function () { el.classList.add('has-img'); };
        img.onerror = function () { img.remove(); el.classList.remove('has-img'); };
        img.src = path; el.appendChild(img);
      }
      return el;
    }
    function renderLayers(force) {
      if (!layersEl) return;
      var lightOn = st.lantern >= 1;
      LAYERS.forEach(function (L) {
        var want = L.item ? st.items.indexOf(L.item) >= 0 : (L.key === 'light' ? lightOn : L.key === 'ember' ? !lightOn : true), cur = layerEls[L.key];
        var sig = want ? layerAssetKey(L) : null;
        if (!want) { if (cur) { cur.remove(); delete layerEls[L.key]; } return; }
        if (cur && cur.dataset.sig === sig && !force) return;
        var el = buildLayer(L, st.ready && !cur);
        el.dataset.sig = sig;
        if (cur) cur.replaceWith(el); else layersEl.appendChild(el);
        layerEls[L.key] = el;
      });
      renderWindowFx();
      container.dataset.items = st.items.join(' ');
    }
    function renderWindowFx() {
      if (!fx) return;
      var mode = st.weather;
      if (fx.dataset.mode === mode) return;
      fx.dataset.mode = mode; fx.innerHTML = '';
      var r = seeded('fx|' + mode);   /* 꾸밈 자리도 시드로 (날씨마다 같은 빗줄기 · 별 자리) */
      var n = mode === 'rain' ? 14 : mode === 'drizzle' ? 6 : mode === 'snow' ? 8 : 0;
      for (var i = 0; i < n; i++) {
        var d = h('div', { class: 'rdrop' + (mode === 'drizzle' ? ' light' : mode === 'snow' ? ' snow' : '') });
        d.style.cssText = 'left:' + Math.floor(r() * 64) + 'px;animation-duration:' + ((mode === 'snow' ? 2.2 : 0.7) + r() * 0.6).toFixed(2) + 's;animation-delay:' + (r() * 2).toFixed(2) + 's';
        fx.appendChild(d);
      }
      if (windowMode() === 'stars') for (var k = 0; k < 7; k++) {
        var s2 = h('div', { class: 'star' });
        s2.style.cssText = 'left:' + Math.floor(r() * 60 + 2) + 'px;top:' + Math.floor(r() * 30 + 2) + 'px;animation-delay:' + (r() * 3).toFixed(2) + 's';
        fx.appendChild(s2);
      }
    }
    function fit() {
      var wdt = container.clientWidth || 320;
      var px = wdt >= 320 ? Math.max(1, Math.floor(wdt / 320)) : wdt / 320;
      if (wdt >= 320 && px * 240 > window.innerHeight * 0.62) px = Math.max(1, Math.floor(window.innerHeight * 0.62 / 240));
      container.style.setProperty('--px', String(px));
    }

    /* ───────── 포스터 벽 · 기념품 ───────── */
    /* 새 포스터가 붙을 칸 (벽은 최근 5장만, 새 것이 맨 끝). 걸기 연출 중엔 APP 이 날아간 *뒤에* setPosters 를 부르므로 보통은 아직 목록에 없다 → 다음 칸.
       id 를 알고 이미 목록에 있으면(건너뛰기·모션 감소로 먼저 붙었을 때) 그 칸 */
    function wallSlotPos(id) {
      var all = st.posters, first = Math.max(0, all.length - 5), n = Math.min(all.length, 4);
      if (id) for (var i = 0; i < all.length; i++) if (all[i].id === id) n = Math.max(0, i - first);
      return [216 + (n % 4) * 16, 62 + Math.floor(n / 4) * 21];
    }
    function renderWall() {
      if (!wall) return;
      var all = st.posters, show = all.slice(-5), prev = wall.dataset.n | 0;
      wall.innerHTML = '';
      show.forEach(function (p, i) {
        var b = h('button', { type: 'button', class: 'wall-mini' + (i === show.length - 1 && all.length > prev ? ' landed' : ''), 'aria-label': (p.title || '포스터') + ' 열기', html: p.svg || '' });
        if (p.titleRaw) b.setAttribute('data-raw-attr', 'aria-label');   /* 제목이 위키 문서 제목 · 모델이 준 이름이면 그대로 (APP 이 알려 준다) */
        b.style.transform = 'rotate(' + (((hash(p.id) % 7) - 3) * 1.2).toFixed(1) + 'deg)';
        b.addEventListener('click', function () { if (on.posterTap) on.posterTap(p.id); });
        wall.appendChild(b);
      });
      if (all.length > 5) wall.appendChild(h('button', { type: 'button', class: 'wall-more', text: '+' + (all.length - 5), 'aria-label': '추억 앨범 열기', onclick: function () { if (on.albumTap) on.albumTap(); } }));
      wall.dataset.n = all.length;
      container.dataset.posters = String(all.length);
    }
    function renderSouvenirs() {
      if (!souvRow) return;
      souvRow.innerHTML = '';
      var shelf = st.items.indexOf('shelf') >= 0;
      st.souvenirs.forEach(function (sv, i) {
        var x = shelf ? 146 + (i % 6) * 9 : 82 + (i % 3) * 10, y = shelf ? 68 - Math.floor(i / 6) * 10 : 116;
        var b = h('button', { type: 'button', class: 'souv', title: sv.name || sv.id, 'aria-label': (sv.name || sv.id) + ' 기념품' });
        /* 그림: 선반 그림(souvenir.<id>) → 안 오면 16×16 기념품 픽셀 아이콘(sv.icon) → 그것도 안 오면 비워 둔다 (이모지 · 기호 글자는 쓰지 않는다 — 이름은 aria-label · title) */
        var src = sv.img || sv.icon;
        if (src) { var img = new Image(); img.alt = ''; img.src = src; img.onerror = function () { if (sv.icon && img.getAttribute('src') !== sv.icon) { img.classList.add('souv-ico'); img.src = sv.icon; } else img.remove(); }; if (src === sv.icon) img.classList.add('souv-ico'); b.appendChild(img); }
        b.style.left = x + 'px'; b.style.top = y + 'px';
        b.addEventListener('click', function () { if (on.souvenirTap) on.souvenirTap(sv); });
        souvRow.appendChild(b);
      });
    }

    /* ───────── 문어 ───────── */
    function octPlace(x, y) { oct.x = Math.round(x); oct.y = Math.round(y); octEl.style.transform = 'translate(' + (oct.x - 24) + 'px,' + (oct.y - 48) + 'px)'; }
    function octFlip(f) { oct.flip = !!f; octEl.classList.toggle('flip', oct.flip); }
    function setCarry(onOff) {
      var c = inner.querySelector('.carry-poster');
      if (onOff && !c) inner.appendChild(h('div', { class: 'carry-poster' }));
      if (!onOff && c) c.remove();
    }
    function setOctState(s, extra) {
      st.octState = s;
      /* 들고 오는 포스터 그림: APP 이 octState('carry', { svg, id }) 로 넘긴다 (3D 와 같은 계약). 걸기(hang) 때 이 그림이 벽으로 날아간다.
         들고 있지 않은 상태로 바뀌면 비운다 — 다음 산책에서 지난 포스터가 날아가지 않게.
         id 가 없으면: 직전 상태 변경 뒤에 벽에 새로 붙은 포스터(st.wallNew — 건너뛰기·데모 재생은 carry 바로 앞에서 벽을 먼저 그린다)가 이 그림이다.
         같은 그림으로 carry 를 다시 부르면(걸어간 뒤) 정해 둔 칸을 그대로 둔다 */
      var wallNew = st.wallNew; st.wallNew = null;
      if (s === 'carry') { if (extra && extra.svg) { st.carryId = extra.id || wallNew || (extra.svg === st.carrySvg ? st.carryId : null); st.carrySvg = extra.svg; } }
      else if (s !== 'hang') { st.carrySvg = ''; st.carryId = null; }
      /* 토큰 단위로 바꾼다: 문자열로 ' flip' 을 덧붙이면 상태가 바뀔 때마다 flip 이 쌓였다 */
      Array.prototype.slice.call(octEl.classList).forEach(function (c) { if (/^st-[a-z]+$/.test(c)) octEl.classList.remove(c); });
      octEl.classList.add('st-' + s);
      octEl.classList.toggle('flip', !!oct.flip);
      if (s === 'carry') setCarry(true);
      else if (s === 'hang') { setCarry(false); flyPoster(); }
      else setCarry(false);
      setExpression({ happy: 'happy', pet: 'pet', sleep: 'sleep', anticipate: 'calm' }[s] || 'idle');
    }
    /* ── 표정·초상 폴백 (DESIGN §15.2, 3D 와 같은 API): 표정은 `ex-<name>` 클래스로만 남기고, 초상은 **인라인 SVG 얼굴 8종**(64×64, 머리 원 + 눈·눈꺼풀·입·홍조)을 같은 도형 목록에서
       portraitSVG(expr) → <svg> 문자열, portrait(expr, { bg }) → Path2D 로 2D 캔버스에 바로 그린 64×64 캔버스(동기 — <img> 디코딩을 기다리지 않는다). 색은 문어 몸색 + 잉크 #1b1f2e + 종이흰 #fff6ee (2D 문어 SVG 와 같은 팔레트) */
    var EXPRESSIONS = ['idle', 'blink', 'happy', 'pet', 'sleep', 'curious', 'calm', 'sleepy'];
    st.expr = 'idle';
    function setExpression(name) {
      name = EXPRESSIONS.indexOf(name) >= 0 ? name : 'idle'; st.expr = name;
      Array.prototype.slice.call(octEl.classList).forEach(function (c) { if (/^ex-[a-z]+$/.test(c)) octEl.classList.remove(c); });
      octEl.classList.add('ex-' + name);
    }
    var INK = '#1b1f2e', PAPER = '#fff6ee', NAVY = '#172038';
    function f2(v) { return (Math.round(v * 100) / 100).toString(); }
    function circ(cx, cy, r) { return 'M' + f2(cx - r) + ' ' + f2(cy) + 'a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(2 * r) + ' 0a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(-2 * r) + ' 0z'; }
    function ell(cx, cy, rx, ry) { return 'M' + f2(cx - rx) + ' ' + f2(cy) + 'a' + f2(rx) + ' ' + f2(ry) + ' 0 1 0 ' + f2(2 * rx) + ' 0a' + f2(rx) + ' ' + f2(ry) + ' 0 1 0 ' + f2(-2 * rx) + ' 0z'; }
    function rect(x, y, w, hh) { return 'M' + f2(x) + ' ' + f2(y) + 'h' + f2(w) + 'v' + f2(hh) + 'h' + f2(-w) + 'z'; }
    function arc(cx, cy, r, up) { return 'M' + f2(cx - r) + ' ' + f2(cy) + 'a' + f2(r) + ' ' + f2(r) + ' 0 0 ' + (up ? 1 : 0) + ' ' + f2(2 * r) + ' 0'; }   /* up = ^ (위로 볼록), 아니면 u */
    /* 표정별 도형 목록 [{ d, fill | stroke, w }] — 정지 자세: pet 눌림·sleep 납작·sleepy 살짝 납작·curious 8° 기울임 (SCENE.md 표) */
    function faceShapes(expr) {
      var body = expr === 'pet' ? shade(st.color, 0.12) : expr === 'sleep' ? shade(st.color, 0.04) : st.color, dark = shade(st.color, -0.35);
      var big = expr === 'curious' ? 1.3 : 1, closed = expr === 'blink' || expr === 'sleep', arcs = expr === 'happy' || expr === 'pet';
      var out = [{ d: circ(32, 36, 28), fill: INK }, { d: circ(32, 36, 26), fill: body }, { d: ell(22, 20, 6, 3), fill: shade(body, 0.14) }];
      [22, 42].forEach(function (ex) {
        if (expr === 'sleep') { out.push({ d: 'M' + (ex - 6) + ' 40l12 ' + (ex < 32 ? '-1' : '1'), stroke: INK, w: 2 }); return; }   /* `— —` 바깥 끝 처짐 */
        if (expr === 'blink') { out.push({ d: rect(ex - 4, 40, 8, 2), fill: INK }); return; }
        if (arcs) { out.push({ d: arc(ex, 44, 5, true), stroke: INK, w: 2 }); return; }                                          /* `^ ^` */
        out.push({ d: circ(ex, 40, 7 * big), fill: PAPER });
        out.push({ d: circ(ex, 41 + (expr === 'sleepy' ? 1 : 0), 4 * big), fill: INK });
        out.push({ d: rect(ex - 2, 38, 2, 2), fill: PAPER });                                                                      /* 반짝 */
        if (expr === 'calm') out.push({ d: rect(ex - 10, 30, 20, 10), fill: body });                                               /* 반눈: 위 50 % */
        if (expr === 'sleepy') out.push({ d: rect(ex - 10, 30, 20, 13), fill: body });                                             /* 65 % */
      });
      if (expr === 'pet') [12, 52].forEach(function (bx) { out.push({ d: ell(bx, 46, 4, 3), fill: shade(st.color, 0.3) }); });  /* 홍조 원판 2 */
      out.push({ d: rect(28, 51, 8, 2), fill: dark });                                                                              /* `_` 입 */
      if (arcs) out.push({ d: arc(32, 48, 4, false), stroke: dark, w: 2 });                                                        /* `u` 웃는 입 */
      return out;
    }
    function faceXform(expr) { return expr === 'curious' ? { rot: 8, sx: 1, sy: 1 } : expr === 'pet' ? { rot: 0, sx: 1.06, sy: 0.9 } : expr === 'sleep' ? { rot: 0, sx: 1.02, sy: 0.94 } : expr === 'sleepy' ? { rot: 0, sx: 1, sy: 0.96 } : { rot: 0, sx: 1, sy: 1 }; }
    function portraitBg(o) { var b = o && o.bg; if (!b || b === 'transparent') return null; if (b === 'navy') return NAVY; return /^#[0-9a-f]{6}$/i.test(b) ? b : null; }
    function portraitSVG(expr, o) {
      expr = EXPRESSIONS.indexOf(expr) >= 0 ? expr : 'idle';
      var x = faceXform(expr), bg = portraitBg(o);
      var s = bg ? '<rect width="64" height="64" fill="' + bg + '"/>' : '';
      s += '<g transform="translate(32 36) rotate(' + x.rot + ') scale(' + x.sx + ' ' + x.sy + ') translate(-32 -36)">';
      faceShapes(expr).forEach(function (sh) { s += '<path d="' + sh.d + '"' + (sh.fill ? ' fill="' + sh.fill + '"' : ' fill="none" stroke="' + sh.stroke + '" stroke-width="' + sh.w + '"') + '/>'; });
      return svgWrap(64, 64, s + '</g>');
    }
    function portrait(expr, o) {
      expr = EXPRESSIONS.indexOf(expr) >= 0 ? expr : 'idle';
      var cv = document.createElement('canvas'); cv.width = cv.height = 64; var x = cv.getContext('2d'), bg = portraitBg(o), xf = faceXform(expr);
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, 64, 64); }
      x.save(); x.translate(32, 36); x.rotate(xf.rot * Math.PI / 180); x.scale(xf.sx, xf.sy); x.translate(-32, -36);
      x.lineCap = 'round';
      faceShapes(expr).forEach(function (sh) {
        var p = (typeof Path2D === 'function') ? new Path2D(sh.d) : null;
        if (!p) return;
        if (sh.fill) { x.fillStyle = sh.fill; x.fill(p); } else { x.strokeStyle = sh.stroke; x.lineWidth = sh.w; x.stroke(p); }
      });
      x.restore();
      return cv;
    }
    function portraitURL(expr, o) { return portrait(expr, o).toDataURL('image/png'); }
    function flyPoster() {
      if (!stage || st.reduced || !st.carrySvg) return;   /* 들고 온 그림이 없으면 빈 상자를 날리지 않는다 */
      var fly = h('div', { class: 'fly', html: st.carrySvg });
      var target = wallSlotPos(st.carryId);
      st.carrySvg = ''; st.carryId = null;   /* 한 번 걸면 끝 */
      fly.style.transform = 'translate(' + (oct.x + 6) + 'px,' + (oct.y - 40) + 'px)';
      stage.appendChild(fly);
      requestAnimationFrame(function () { requestAnimationFrame(function () { fly.style.transform = 'translate(' + target[0] + 'px,' + target[1] + 'px)'; }); });
      setTimeout(function () { fly.remove(); }, 520 * st.speed);
    }
    function anchorPos(name) { return ANCHORS[name] || ANCHORS.center; }
    function jumpTo(anchor) { var p = anchorPos(anchor); if (oct.walking) { oct.walking.cancel(); oct.walking = null; } oct.anchor = anchor; octPlace(p[0], p[1]); }
    function moveTo(anchor) {
      var to = anchorPos(anchor), from = [oct.x, oct.y];
      oct.anchor = anchor;
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      var dx = to[0] - from[0], dy = to[1] - from[1], dist = Math.sqrt(dx * dx + dy * dy);
      if (dx !== 0) octFlip(dx < 0);
      function done() { if (on.anchorReached) on.anchorReached(anchor); }
      if (st.reduced || dist < 1) { octPlace(to[0], to[1]); done(); return Promise.resolve(anchor); }
      var dur = dist / 40 * 1000 * st.speed, start = null, raf = 0, cancelled = false;
      return new Promise(function (resolve) {
        var w = oct.walking = {
          cancel: function () { cancelled = true; cancelAnimationFrame(raf); },
          /* 건너뛰기: 남은 걸음을 건너뛰고 바로 도착 (Promise 도 지금 풀린다 — 3D 의 walking.finish 와 같은 몫) */
          finish: function () { if (cancelled) return; cancelled = true; cancelAnimationFrame(raf); octPlace(to[0], to[1]); if (oct.walking === w) oct.walking = null; done(); resolve(anchor); }
        };
        function step(ts) {
          if (cancelled) return;
          if (start == null) start = ts;
          var k = Math.min(1, (ts - start) / dur);
          octPlace(from[0] + dx * k, from[1] + dy * k);
          if (k < 1) raf = requestAnimationFrame(step); else { cancelled = true; if (oct.walking === w) oct.walking = null; done(); resolve(anchor); }
        }
        raf = requestAnimationFrame(step);
      });
    }
    function pupilsTowards(clientX, clientY) {
      var r = octEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = clamp((clientX - cx) / 200, -1, 1), dy = clamp((clientY - cy) / 200, -1, 1);
      octEl.querySelectorAll('.pupil').forEach(function (p) { p.style.transform = 'translate(' + (dx * 0.8).toFixed(2) + 'px,' + (dy * 0.8).toFixed(2) + 'px)'; });
    }
    function bubble(text, ms) {
      if (!bub) return;
      clearTimeout(bubbleTimer);
      if (!text) { bub.hidden = true; return; }
      bub.textContent = text; bub.hidden = false;
      bubbleTimer = setTimeout(function () { bub.hidden = true; }, ms || 2600);
    }
    function octScreenPos() { if (R.view === 'play') return null; var r = octEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; }   /* 놀이방이 보이는 동안 문어는 화면에 없다 */

    /* ───────── 8물결 · 장소 셋 (3D 와 같은 말): place() 이야기 장소(다락 · 바깥 — 2D 는 바깥을 그리지 않는다) · view() 보이는 장소(다락 · 놀이방) · room() 플레이어가 있는 방 ─────────
       goRoom('play' | 'attic') → Promise: 문 앞까지 걷기(walkFirst — 지금은 캐릭터가 없어 바로) → on.door open → 0.15 s → 컷(놀이방 그림 ↔ 다락 그림, 미끄럼 없음) → on.door close → 풀림.
       놀이방 그림(#play2d)은 처음 들어갈 때 만든다. 놀이방에 있는 동안 setPlace 는 값만 바꾼다 (원래도 그렇다) */
    var R = { room: null, view: 'attic', busy: false }, SPOTS = {}, spotLast = {}, play2d = null;
    function emit(name) { var f = on[name]; if (typeof f !== 'function') return; try { f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.error('[scene2d] on.' + name, e); } }
    function setView(v) {
      var prev = R.view; R.view = v;
      if (v === 'play' && !play2d && stage) { play2d = h('div', { id: 'play2d', 'aria-hidden': 'true' }); play2d.innerHTML = PH['bg.play'](); stage.appendChild(play2d); }
      if (play2d) play2d.hidden = v !== 'play';
      container.dataset.view = v;
      updateSpots();
      if (v !== prev) emit('view', v, prev);
    }
    function scenePx() { return parseFloat(container.style.getPropertyValue('--px')) || 1; }
    function spotInfo(id) {
      var b = SPOT_BOX[id]; if (!b || R.busy) return null;
      if (b[4] === 'play' ? R.view !== 'play' : R.view === 'play') return null;
      var W = container.clientWidth, H = container.clientHeight, px = scenePx(), ox = W / 2 - 160 * px;
      var l = ox + b[0] * px, t = b[1] * px, w0 = b[2] * px, h0 = b[3] * px;
      var w = Math.min(W, Math.round(Math.max(44, w0))), hh = Math.min(H, Math.round(Math.max(44, h0)));
      var x = Math.round(clamp(l + w0 / 2 - w / 2, 0, Math.max(0, W - w))), y = Math.round(clamp(t + h0 / 2 - hh / 2, 0, Math.max(0, H - hh)));
      return { id: id, mode: 'over', x: x, y: y, w: w, h: hh, art: { l: Math.round(l), t: Math.round(t), r: Math.round(l + w0), b: Math.round(t + h0) } };
    }
    function updateSpots() {
      Object.keys(SPOTS).forEach(function (id) {
        var el = SPOTS[id], s = spotInfo(id), key = s ? s.x + ',' + s.y + ',' + s.w + ',' + s.h : 'off';
        if (spotLast[id] === key) return;
        spotLast[id] = key;
        if (!s) { el.hidden = true; return; }
        var es = el.style; el.dataset.spot = 'over';
        es.left = s.x + 'px'; es.top = s.y + 'px'; es.width = s.w + 'px'; es.height = s.h + 'px'; es.right = 'auto'; es.bottom = 'auto';
        el.hidden = false;
      });
    }
    function spotAt(cx, cy) {   /* 클라이언트 px → 그 자리를 덮는 보이는 단추 칸 id | null */
      var r = container.getBoundingClientRect(), x = cx - r.left - container.clientLeft, y = cy - r.top - container.clientTop, best = null;
      Object.keys(SPOTS).forEach(function (id) { var s = spotInfo(id); if (s && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h && !best) best = id; });
      return best;
    }
    function clearSpots() { Object.keys(SPOTS).forEach(function (k) { var el = SPOTS[k], es = el.style; es.left = es.top = es.width = es.height = es.right = es.bottom = ''; delete el.dataset.spot; }); SPOTS = {}; spotLast = {}; }
    function setHotspots(map) {
      clearSpots(); map = map || {};
      Object.keys(SPOT_BOX).forEach(function (k) { if (map[k] && map[k].nodeType === 1) SPOTS[k] = map[k]; });
      updateSpots();
      return Object.keys(SPOTS);
    }
    function playerWalkTo(anchor) { return Promise.resolve({ ok: true, walked: false, anchor: anchor, at: (DOOR_ANCHORS[anchor] || [0, 0]).slice() }); }
    var roomTimer = 0, roomFin = null;
    function goRoom(room, o) {
      o = o || {};
      var enter = room === 'play';
      function res(ok, why) { var r = { ok: ok, view: R.view, room: R.room, place: st.place || 'attic' }; if (why) r.reason = why; return r; }
      if (R.busy) return Promise.resolve(res(false, 'busy'));
      if (enter ? R.room === 'play' : !R.room) return Promise.resolve(res(false, 'here'));
      var anchor = enter ? 'atticPlayDoor' : 'playAtticDoor', walk = typeof o.walkFirst === 'function' ? o.walkFirst : o.walkFirst ? playerWalkTo : null;
      R.busy = true; updateSpots();
      return Promise.resolve(walk ? walk(anchor, (DOOR_ANCHORS[anchor] || [0, 0]).slice()) : true).then(function (w) {
        if (w === false || (w && w.ok === false)) { R.busy = false; updateSpots(); return res(false, 'walk'); }
        var from = R.view;
        function door(act, rm, id) { var ev = { act: act, room: rm, door: id, from: from }; emit('door', ev); if (typeof o.onDoor === 'function') { try { o.onDoor(ev); } catch (e) { console.error('[scene2d] onDoor', e); } } }
        if (enter) R.room = 'play';
        door('open', enter ? 'play' : (st.place || 'attic'), enter ? 'atticPlay' : 'playAttic');
        return new Promise(function (resolve) {
          roomFin = function () {
            clearTimeout(roomTimer); roomFin = null;
            if (!enter) R.room = null;
            setView(enter ? 'play' : 'attic');
            door('close', enter ? 'play' : (st.place || 'attic'), enter ? 'playAttic' : 'atticPlay');
            R.busy = false; updateSpots();
            resolve(res(true));
          };
          roomTimer = setTimeout(roomFin, o.instant ? 0 : 150);
        });
      }, function () { R.busy = false; updateSpots(); return res(false, 'walk'); });
    }

    /* ───────── 입력 ───────── */
    var pressT = null, moved = false;
    function listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); unbind.push(function () { el.removeEventListener(ev, fn, o); }); }
    listen(octEl, 'pointerdown', function (e) { moved = false; clearTimeout(pressT); pressT = setTimeout(function () { if (on.pet) on.pet(); }, 350); e.preventDefault(); });
    listen(octEl, 'pointermove', function () { moved = true; });
    listen(octEl, 'pointerup', function () { clearTimeout(pressT); if (!moved && st.octState !== 'pet' && on.tap) on.tap(); });
    listen(octEl, 'pointercancel', function () { clearTimeout(pressT); });
    listen(container, 'click', function (e) {
      var t = e.target.closest ? e.target.closest('.layer[data-key="window"]') : null;
      if (t && on.windowTap) on.windowTap();
      /* 8물결: 문 · 오락기 단추는 그림 위에서 pointer-events: none (css) — 톡은 그린 순서대로 (문어가 문 앞에 서 있으면 문어가 받는다: #oct 는 #stage 안 6층).
         그림(무대 · 놀이방 그림)을 누른 자리가 단추 칸이면 그 단추를 누른다. 키보드 · 화면 낭독기는 단추를 그대로 쓴다 */
      if (!t && e.target.closest && e.target.closest('#stage') && !e.target.closest('#oct, button, .souv, .wall-mini')) { var id = spotAt(e.clientX, e.clientY); if (id) { var b = SPOTS[id]; if (b && !b.hidden) b.click(); } }
    });
    listen(document, 'pointermove', function (e) { if (e.pointerType !== 'touch' && st.octState !== 'sleep') pupilsTowards(e.clientX, e.clientY); }, { passive: true });
    listen(window, 'resize', function () { fit(); updateSpots(); });
    listen(document, 'visibilitychange', function () { if (!document.hidden) { fit(); updateSpots(); } });

    /* ───────── 초기 렌더 ───────── */
    fit(); setColor(st.color); renderLayers(true); renderWall(); renderSouvenirs();
    st.place = 'attic'; (function () { var m = new Date().getMonth() + 1, h = null; try { h = window.__ppolLook && window.__ppolLook.season; } catch (e) { /* noop */ } st.seasonMode = ['spring', 'summer', 'autumn', 'winter'].indexOf(opts.season || h) >= 0 ? (opts.season || h) : 'auto'; st.season = st.seasonMode !== 'auto' ? st.seasonMode : m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; })();
    st.ready = true;
    container.dataset.view = 'attic';   /* 8물결: 늘 다락에서 연다 */

    return {
      kind: '2d',
      setLantern: function (n) { st.lantern = n | 0; renderLayers(false); },
      setItems: function (items) { st.items = (items || []).slice(); renderLayers(false); renderSouvenirs(); },
      setWeather: function (w) { st.weather = w || 'rain'; renderLayers(false); },
      setTime: function () { /* 2D 는 시각 조명 없음 */ },
      setColor: setColor,
      setOctState: setOctState,
      setExpression: setExpression, expression: function () { return st.expr; }, EXPRESSIONS: EXPRESSIONS.slice(), portrait: portrait, portraitURL: portraitURL, portraitSVG: portraitSVG,
      setCarry: function (svg, id) { st.carrySvg = svg || ''; st.carryId = id || null; },
      moveTo: moveTo, jumpTo: jumpTo,
      finishWalk: function () { if (oct.walking && oct.walking.finish) oct.walking.finish(); },   /* 건너뛰기: 걷던 길을 끝까지 감고 moveTo 의 Promise 를 지금 푼다 */
      /* 바깥·계절·전환 (DESIGN §15.3) — 2D 폴백은 같은 API 의 무동작 판: 장소·계절은 값만 기억하고(그림은 다락 그대로), 의식은 다음 틱에 onDone */
      setPlace: function (p, o) { if (p === 'play') { goRoom('play', o); return; } st.place = p === 'exterior' ? 'exterior' : 'attic'; }, place: function () { return st.place || 'attic'; },
      /* 8물결 · 방 (3D 와 같은 계약, docs/SCENE.md): view · room · goRoom → Promise · hotspots · spotRect · playerWalkTo (지금은 바로) · finishRoom */
      PLACES: ['attic', 'exterior', 'play'], view: function () { return R.view; }, room: function () { return R.room; },
      goRoom: goRoom, playerWalkTo: playerWalkTo, doorAnchors: DOOR_ANCHORS, finishRoom: function () { if (roomFin) roomFin(); },
      hotspots: setHotspots, spotRect: function (id) { var s = spotInfo(id); if (!s) return null; var r = container.getBoundingClientRect(); s.client = { x: r.left + container.clientLeft + s.x, y: r.top + container.clientTop + s.y, w: s.w, h: s.h }; return s; },
      setSeason: function (s) { st.seasonMode = ['spring', 'summer', 'autumn', 'winter'].indexOf(s) >= 0 ? s : 'auto'; var m = new Date().getMonth() + 1; st.season = st.seasonMode !== 'auto' ? st.seasonMode : m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; },
      season: function () { return st.season; }, seasonMode: function () { return st.seasonMode || 'auto'; },
      departCeremony: function (onDone) { st.place = 'exterior'; return new Promise(function (r) { setTimeout(function () { if (onDone) onDone(); r(); }, 0); }); },
      returnCeremony: function (onDone) { st.place = 'attic'; return new Promise(function (r) { setTimeout(function () { if (onDone) onDone(); r(); }, 0); }); },
      ceremony: function () { return ''; },
      /* 바깥 기웃 (docs/SCENE.md) — 2D 는 무동작 판: 자리는 이름만, 기웃·퇴장은 다음 틱 onDone (말풍선은 APP 이 octScreenPos 로 — 2D 에선 다락 문어 머리 위) */
      extSpot: function (k) { var key = typeof k === 'string' ? k : (k && (k.roomId || k.corner)) || 'wild'; return { key: key, x: 0, y: 0, z: 0, face: 0, prop: '', act: '' }; },
      peekOutside: function (o, onDone) { return new Promise(function (r) { setTimeout(function () { if (onDone) onDone(); r(); }, 0); }); },
      leaveOutside: function (onDone) { return new Promise(function (r) { setTimeout(function () { if (onDone) onDone(); r(); }, 0); }); },
      peek: function () { return { on: false, key: '', hold: false }; }, EXT_SPOTS: ['sea', 'sky', 'sounds', 'hands', 'signs', 'numbers', 'home', 'mind', 'wild', 'slow_room', 'letter_room', 'door_out'],
      setPosters: function (list) {
        var had = {}; st.posters.forEach(function (p) { had[p.id] = 1; });
        st.posters = (list || []).slice();
        var last = st.posters[st.posters.length - 1];
        if (last && last.id && !had[last.id]) st.wallNew = last.id;   /* 맨 끝에 새로 붙은 것 — 다음 setOctState 가 한 번 읽고 지운다 */
        renderWall();
      },
      setSouvenirs: function (list) { st.souvenirs = (list || []).slice(); renderSouvenirs(); },
      bubble: bubble, lookAt: pupilsTowards, octScreenPos: octScreenPos,
      setReducedMotion: function (r) { st.reduced = !!r; },
      setLook: function () { /* 3D 전용 */ }, setPalette: function () { /* 3D 전용 */ }, paletteName: function () { return 'ramps'; }, palette: function () { return []; }, stats: function () { return { calls: 0 }; },
      refresh: function () { renderLayers(true); renderSouvenirs(); },
      pause: function () { st.paused = true; }, resume: function () { st.paused = false; },
      destroy: function () { if (roomFin) roomFin(); clearSpots(); if (play2d) { play2d.remove(); play2d = null; } delete container.dataset.view; unbind.forEach(function (f) { f(); }); unbind = []; if (oct.walking) oct.walking.cancel(); container.classList.remove('mode-2d'); },
      anchors: ANCHORS, placeholders: PH
    };
  }

  return { supported: supported, init: init, PH: PH, ANCHORS: ANCHORS };
})();
