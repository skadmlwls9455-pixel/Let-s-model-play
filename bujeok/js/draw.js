/* 손그림 선을 만드는 작은 도구들 — 캐릭터 · 소품 · 틀이 같이 쓴다.
 * 모든 그림은 SVG 글자로 만든다 (화면 · 내보내기 · 썸네일이 같은 글자를 쓴다).
 * 선의 오돌토돌한 질감은 그리는 쪽이 아니라 카드의 필터(card.js)가 입힌다.
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};

  function r1(n) { return Math.round(n * 10) / 10; }

  /* 시드 난수 (mulberry32) — 같은 일주는 늘 같은 흔들림 */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 점들을 부드럽게 잇는 길 (캣멀-롬 → 3차 베지에). closed 면 닫힌 모양 */
  function curve(points, closed, tension) {
    var n = points.length, t = tension == null ? 1 : tension;
    if (n < 2) return '';
    function P(i) { return closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]; }
    var d = 'M' + r1(points[0][0]) + ' ' + r1(points[0][1]);
    var segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += 'C' + r1(p1[0] + (p2[0] - p0[0]) / 6 * t) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6 * t) + ' ' +
        r1(p2[0] - (p3[0] - p1[0]) / 6 * t) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6 * t) + ' ' +
        r1(p2[0]) + ' ' + r1(p2[1]);
    }
    return closed ? d + 'Z' : d;
  }

  /* 살짝 찌그러진 타원 (손으로 그린 동그라미) */
  function blob(cx, cy, rx, ry, R, jit, n, rot) {
    n = n || 9; jit = jit == null ? 0.035 : jit; rot = rot || 0;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = rot + i / n * Math.PI * 2, k = 1 + (R ? (R() - 0.5) * 2 * jit : 0);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return curve(pts, true);
  }

  /* 뭉게뭉게 테두리 (구름 · 나무 · 털): n 개의 혹, depth 만큼 바깥으로 */
  function scallop(cx, cy, rx, ry, n, depth, rot) {
    rot = rot || 0;
    var pts = [], d = '';
    for (var i = 0; i <= n; i++) {
      var a = rot + i / n * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
    for (i = 1; i < pts.length; i++) {
      var am = rot + (i - 0.5) / n * Math.PI * 2;
      var mx = cx + Math.cos(am) * (rx + depth * 1.6), my = cy + Math.sin(am) * (ry + depth * 1.6);
      d += 'Q' + r1(mx) + ' ' + r1(my) + ' ' + r1(pts[i][0]) + ' ' + r1(pts[i][1]);
    }
    return d + 'Z';
  }

  /* 점 목록을 조금씩 흔든다 */
  function wob(points, R, amt) {
    if (!R || !amt) return points;
    return points.map(function (p) { return [p[0] + (R() - 0.5) * 2 * amt, p[1] + (R() - 0.5) * 2 * amt]; });
  }

  function mirror(points) { return points.map(function (p) { return [-p[0], p[1]]; }).reverse(); }

  function attrs(o) {
    var s = '';
    for (var k in o) if (o[k] != null && o[k] !== false) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }

  /* 채우고 테두리 긋는 모양 */
  function shape(d, fill, line, sw, extra) {
    return '<path d="' + d + '"' + attrs({ fill: fill || 'none', stroke: line || 'none', 'stroke-width': line ? r1(sw) : null }) + (extra || '') + '/>';
  }
  /* 선만 */
  function line(d, color, sw, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + r1(sw) + '"' + (extra || '') + '/>';
  }
  /* 칠만 */
  function fillOnly(d, color, extra) { return '<path d="' + d + '" fill="' + color + '"' + (extra || '') + '/>'; }

  /* 소시지 모양 (팔 · 꼬리 · 뿔): 굵은 선 위에 조금 가는 선을 겹쳐 테두리가 생긴다 */
  function capsule(d, w, fill, lineColor, sw) {
    return '<path d="' + d + '" fill="none" stroke="' + lineColor + '" stroke-width="' + r1(w + sw * 2) + '"/>' +
      '<path d="' + d + '" fill="none" stroke="' + fill + '" stroke-width="' + r1(w) + '"/>';
  }

  function circle(cx, cy, r, fill, lineColor, sw) {
    return '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(r) + '"' +
      attrs({ fill: fill || 'none', stroke: lineColor || 'none', 'stroke-width': lineColor ? r1(sw) : null }) + '/>';
  }
  function ellipse(cx, cy, rx, ry, fill, lineColor, sw, rot) {
    return '<ellipse cx="' + r1(cx) + '" cy="' + r1(cy) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '"' +
      attrs({ fill: fill || 'none', stroke: lineColor || 'none', 'stroke-width': lineColor ? r1(sw) : null,
        transform: rot ? 'rotate(' + r1(rot) + ' ' + r1(cx) + ' ' + r1(cy) + ')' : null }) + '/>';
  }

  function g(inner, transform, extra) {
    return '<g' + (transform ? ' transform="' + transform + '"' : '') + (extra || '') + '>' + inner + '</g>';
  }

  /* 별 (둥근 끝) */
  function starPts(cx, cy, R1, R2, n, rot) {
    var pts = [];
    n = n || 5; rot = rot == null ? -Math.PI / 2 : rot;
    for (var i = 0; i < n * 2; i++) {
      var a = rot + i * Math.PI / n, r = i % 2 ? R2 : R1;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }
  function poly(pts, closed) {
    return 'M' + pts.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join('L') + (closed ? 'Z' : '');
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 문자열 → 32비트 시드 */
  function hash(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  BJ.draw = {
    r1: r1, rng: rng, curve: curve, blob: blob, wob: wob, mirror: mirror, attrs: attrs,
    scallop: scallop, shape: shape, line: line, fillOnly: fillOnly, capsule: capsule, circle: circle, ellipse: ellipse, g: g,
    starPts: starPts, poly: poly, esc: esc, hash: hash
  };
})();
