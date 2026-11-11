/* tools/ui-art/poster2/lib.js — 방 그림들이 같이 쓰는 부품 (구름 · 별 · 음표 · 물방울 · 문어 · 매개변수 곡면) */
'use strict';
var K = require('../sculpt.js'), sd = K.sd, bez = K.bez, mat = K.mat;

/* 별 꼭짓점 (바깥 R · 안 r · n 갈래 · rot 라디안) */
function starPts(cx, cy, R, r, n, rot) { var p = []; n = n || 5; rot = rot || 0; for (var i = 0; i < n * 2; i++) { var a = rot + i * Math.PI / n, q = i % 2 ? r : R; p.push([cx + Math.sin(a) * q, cy - Math.cos(a) * q]); } return p; }
function ngon(cx, cy, R, n, rot) { var p = []; rot = rot || 0; for (var i = 0; i < n; i++) { var a = rot + i * 2 * Math.PI / n; p.push([cx + Math.sin(a) * R, cy - Math.cos(a) * R]); } return p; }
/* 뭉게구름: 공 여럿 (서로 그림자를 드리우지 않는다). list = [[cx, cy, rx, ry], ...] */
function cloud(S, list, m) { list.forEach(function (b) { S.ball(b[0], b[1], b[2], b[3] == null ? b[2] : b[3], m || 'cloud', { shadow: false, flat: 0.25 }); }); return S; }
/* 음표: 머리(기울어진 알) + 기둥 + 꼬리. k = 재질 */
function note(S, x, y, m, size) {
  var z = size || 1;
  S.stroke([[x + 2.3 * z, y - 6.5 * z], [x + 2.3 * z, y]], Math.max(1, 0.9 * z), mat(m).ramp[3], { ol: mat(m).ol });
  S.solid(sd.path(bez([x + 2.3 * z, y - 6.5 * z], [x + 4.6 * z, y - 5.6 * z], [x + 5 * z, y - 3.2 * z], 5), 0.8 * z, 0.35 * z), 0.8 * z, m);
  S.rotate(x, y, -20, function () { S.ball(x, y, 2.5 * z, 1.9 * z, m); });
  return S;
}
/* 물방울 (위가 뾰족) */
function dropSdf(cx, cy, r) { return function (u, v) { var dy = v - cy, dx = Math.abs(u - cx); if (dy >= 0) return Math.hypot(dx, dy) - r; if (-dy > r * 1.9) return 1; var t = -dy / (r * 1.9); return dx - r * (1 - t) * (1 - 0.25 * t); }; }
function drop(S, cx, cy, r, m) { return S.solid(dropSdf(cx, cy, r), r, m || 'glass'); }
/* 하트 */
function heartSdf(cx, cy, s) { return function (u, v) { var x = (u - cx) / s, y = -(v - cy) / s + 0.25, a = x * x + y * y - 1; return (a * a * a - x * x * y * y * y) > 0 ? 1 : -Math.max(0.01, Math.min(1, -a)) * s * 0.5; }; }

/* 문어 (레퍼런스: 둥근 빨간 머리 · 흰 테 눈 · 주황 빨판). o: { x, y 이동, s 배율, eyes: 'open'|'closed'|'happy'|'none', mouth: 'smile'|'o'|'flat'|'none', m: 재질, legs: false, look: 눈동자 x 치우침, blush } */
function oct(S, o) {
  o = o || {}; var ox = o.x || 0, oy = o.y || 0, z = o.s || 1, m = o.m || 'red';
  function X(x) { return 16 + (x - 16) * z + ox; } function Y(y) { return 16 + (y - 16) * z + oy; }
  if (o.legs !== false) {
    [[[9, 22], [4.5, 23.5], [3.4, 27.2]], [[12.5, 23.5], [10, 27], [7.6, 29.2]], [[16, 24], [16, 27.5], [15.4, 30]], [[19.5, 23.5], [22, 27], [24.4, 29.2]], [[23, 22], [27.5, 23.5], [28.6, 27.2]]].forEach(function (l) {
      S.solid(sd.path(bez([X(l[0][0]), Y(l[0][1])], [X(l[1][0]), Y(l[1][1])], [X(l[2][0]), Y(l[2][1])], 7), 2.1 * z, 1.25 * z), 2.1 * z, m);
    });
    if (o.suckers !== false) [[3.9, 27.6], [8, 29.4], [15.5, 30.3], [24, 29.4], [28.1, 27.6]].forEach(function (p) { S.flat(sd.circle(X(p[0]), Y(p[1]), 0.75 * z), o.sucker || 'F'); });
  }
  S.ball(X(16), Y(15), 11 * z, 9.6 * z, m, o.headOpt);
  if (o.shine !== false) S.flat(sd.ellipse(X(9.6), Y(9.6), 2 * z, 1.3 * z), o.shineKey || 'F').flat(sd.circle(X(8.9), Y(9.2), 0.65 * z), 'Z');
  var e = o.eyes || 'open', lk = o.look || 0, ey = o.ey || 18.2;
  [11.6, 20.4].forEach(function (x) {
    if (e === 'open') { S.flat(sd.circle(X(x), Y(ey), 2.15 * z), 'Z').flat(sd.circle(X(x + lk), Y(ey + 0.2), 1.5 * z), '0').flat(sd.circle(X(x + lk - 0.5), Y(ey - 0.4), 0.5 * z), 'Z'); }
    else if (e === 'closed') S.stroke([[X(x - 1.8), Y(ey + 0.3)], [X(x + 1.8), Y(ey + 0.3)]], 0.9 * z, '0');
    else if (e === 'happy') S.stroke(bez([X(x - 1.9), Y(ey + 0.9)], [X(x), Y(ey - 1.7)], [X(x + 1.9), Y(ey + 0.9)], 5), 0.9 * z, '0');
  });
  if (o.blush !== false) S.flat(sd.ellipse(X(8.2), Y(21), 1.5 * z, 0.8 * z), 'R').flat(sd.ellipse(X(23.8), Y(21), 1.5 * z, 0.8 * z), 'R');
  var mo = o.mouth || 'smile';
  if (mo === 'smile') S.stroke(bez([X(14.6), Y(21.2)], [X(16), Y(22.6)], [X(17.4), Y(21.2)], 4), 0.9 * z, 'G');
  else if (mo === 'o') S.flat(sd.ellipse(X(16), Y(21.8), 1.1 * z, 1.2 * z), 'G');
  else if (mo === 'flat') S.stroke([[X(14.8), Y(21.8)], [X(17.2), Y(21.8)]], 0.9 * z, 'G');
  return S;
}

/* 매개변수 곡면 (뫼비우스 띠 · 매듭 관): fn(a, b) → [x, y, z] (z 가 클수록 앞). 미리 촘촘히 찍어 깊이 버퍼에 담고, hit 은 그 칸의 법선을 돌려준다 */
function surface(fn, na, nb, a1, b0, b1) {
  var G = 6, W = 32 * G, zb = new Float32Array(W * W).fill(-1e9), nx = new Float32Array(W * W), ny = new Float32Array(W * W), nz = new Float32Array(W * W), has = new Uint8Array(W * W);
  var da = a1 / na, db = (b1 - b0) / nb, e = 1e-3;
  for (var i = 0; i <= na; i++) for (var j = 0; j <= nb; j++) {
    var a = i * da, b = b0 + j * db, p = fn(a, b), pa = fn(a + e, b), pb = fn(a, b + e);
    var ax = pa[0] - p[0], ay = pa[1] - p[1], az = pa[2] - p[2], bx = pb[0] - p[0], by = pb[1] - p[1], bz = pb[2] - p[2];
    var cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx, l = Math.hypot(cx, cy, cz) || 1; cx /= l; cy /= l; cz /= l;
    if (cz < 0) { cx = -cx; cy = -cy; cz = -cz; }
    var gx = Math.round(p[0] * G), gy = Math.round(p[1] * G);
    for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
      var x = gx + ox, y = gy + oy; if (x < 0 || y < 0 || x >= W || y >= W) continue; var at = y * W + x;
      if (p[2] > zb[at]) { zb[at] = p[2]; nx[at] = cx; ny[at] = cy; nz[at] = cz; has[at] = 1; }
    }
  }
  return function (u, v) { var x = Math.floor(u * G), y = Math.floor(v * G); if (x < 0 || y < 0 || x >= W || y >= W) return null; var at = y * W + x; return has[at] ? [nx[at], ny[at], nz[at]] : null; };
}

/* 조각보 (담요): 4.4칸 조각이 세 색으로 번갈아, 이음매는 한 단계 어둡게 */
var PATCH = [mat('crimson'), mat('blue'), mat('gold', { spec: 0 })];
function patch(ox, oy) { return function (u, v) { return PATCH[(((Math.floor((u - ox) / 4.4) + Math.floor((v - oy) / 4.4)) % 3) + 3) % 3]; }; }
function seam(ox, oy) { return function (u, v, t) { var a = (((u - ox) % 4.4) + 4.4) % 4.4, b = (((v - oy) % 4.4) + 4.4) % 4.4; return a < 0.55 || b < 0.55 ? Math.min(4, t + 1) : t; }; }
/* 들꽃: 꽃잎 넷 + 가운데 + 줄기 */
function flower(S, x, y, key, stem) {
  S.stroke([[x, y + 1], [x, y + (stem || 3)]], 1, 'u', { ol: 'r' });
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) { S.flat(sd.box(x + d[0], y + d[1], 0.5, 0.5, 0), key, { ol: key === 'Z' ? 'X' : 'O' }); });
  S.flat(sd.box(x, y, 0.5, 0.5, 0), 'F');
  return S;
}
/* 작은 물방울 (단색): 덩어리로 그리면 32px 에서 검은 점이 된다 */
function dot(S, x, y, r, key, ol) { return S.flat(sd.circle(x, y, r || 0.9), key || '6', { ol: ol || '4' }); }

module.exports = { patch: patch, seam: seam, flower: flower, dot: dot, K: K, sd: sd, bez: bez, mat: mat, starPts: starPts, ngon: ngon, cloud: cloud, note: note, drop: drop, dropSdf: dropSdf, heartSdf: heartSdf, oct: oct, surface: surface };
