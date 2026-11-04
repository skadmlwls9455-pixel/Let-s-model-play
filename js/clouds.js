/* js/clouds.js — 몽글몽글 픽셀 구름 (입장 하늘, docs/UI_ART.md "구름"). 전역 CLOUDS. 의존성 없음 (2D 캔버스만).
 *
 * 그리는 법 (레퍼런스: 구름은 "큰 3D 덩어리"로 보고 그림자부터 · 덩어리마다 구 음영 · 단계 사이는 디더로):
 *  1) 모양: 종류 4가지(솟은 적운 · 길쭉한 띠 · 작은 몽글 · 기본) = 아랫줄 덩어리 + 윗줄 덩어리. 덩어리(원)들은 부드러운 합집합(smooth union,
 *     부호 거리의 log-sum-exp, 폭 3.2px)으로 녹여 붙여 사이 골이 메워지고, 밑면은 부드럽게 평평히 자른다.
 *  2) 음영 (일러스트식): 덩어리마다 빛 쪽 테두리 초승달 = 밝음, 가운데 = 몸, 반대쪽 테두리 초승달 = 그늘 (밀린 원 두 개로 판정). 아랫줄 덩어리가 윗줄을 가린다(앞).
 *     밑면은 그늘 띠(5줄) + 맨 밑 2줄. 띠 경계 1줄만 체크 디더 → 부드럽지만 면은 깨끗하다 (전면 디더는 거칠어 보였다).
 *  3) 윗면 가장자리 1px 은 은빛/금빛 테(림 라이트).
 *  4) 가장자리: 밑 가장자리와 그늘진 오른쪽 가장자리 1px 은 체크 디더로 반쯤 비워 솜털처럼 (알파 테스트라 반투명 대신 디더).
 *  5) 색: 날씨 × 시각대 램프 5색 (전부 Apollo 칸 — 장면 팔레트 스냅을 지나도 색이 안 바뀐다). 먼 층은 한 단 어둡고 대비가 낮다.
 * 결정적: 모양은 hash 시드, Math.random 없음.
 *   CLOUDS.atlas({ weather, phase, far, w, h, n }) → 캔버스 (n 칸 가로 아틀라스, 칸 = w×h 기본 112×56, 1텍셀 = 아트 1px)
 *   CLOUDS.ramp(weather, phase, far) → 5색 (어두움 → 밝음) + rim
 */
var CLOUDS = (function () {
  'use strict';
  function hash(s) { s = String(s); var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

  /* 램프: [가장 어두운 밑면, 그늘, 중간, 밝은 면, 하이라이트] + rim(윗테). 전부 Apollo 46 */
  var RAMPS = {
    day: {
      clear:   { t: ['#577277', '#819796', '#a8b5b2', '#c7cfcc', '#ebede9'], rim: '#ebede9' },   /* 흰 뭉게구름, 그늘은 푸른 회색 */
      drizzle: { t: ['#394a50', '#577277', '#819796', '#a8b5b2', '#c7cfcc'], rim: '#ebede9' },
      rain:    { t: ['#202e37', '#394a50', '#577277', '#819796', '#a8b5b2'], rim: '#c7cfcc' },   /* 무거운 비구름, 밑이 짙다 */
      snow:    { t: ['#819796', '#a8b5b2', '#a8b5b2', '#c7cfcc', '#ebede9'], rim: '#ebede9' }    /* 눈구름: 우윳빛 몸 · 흰 테, 대비가 낮다 */
    },
    dusk: {
      clear:   { t: ['#402751', '#7a367b', '#c65197', '#df84a5', '#e8c170'], rim: '#e8c170' },   /* 노을: 보라 밑면 · 분홍 몸 · 금빛 윗면 */
      drizzle: { t: ['#4d2b32', '#7a4841', '#ad7757', '#c09473', '#e8c170'], rim: '#e8c170' },
      rain:    { t: ['#341c27', '#4d2b32', '#7a4841', '#ad7757', '#c09473'], rim: '#d7b594' },
      snow:    { t: ['#402751', '#7a367b', '#a23e8c', '#df84a5', '#ebede9'], rim: '#ebede9' }   /* 노을 눈구름: 보라 → 분홍 → 흰 윗면 */
    },
    night: {
      clear:   { t: ['#10141f', '#151d28', '#172038', '#253a5e', '#3c5e8b'], rim: '#819796' },   /* 달빛: 남색 몸 · 은빛 테 */
      drizzle: { t: ['#10141f', '#202e37', '#394a50', '#577277', '#819796'], rim: '#a8b5b2' },
      rain:    { t: ['#090a14', '#151d28', '#202e37', '#394a50', '#577277'], rim: '#819796' },   /* 밤 비구름: 거의 하늘색에 묻힌다, 테만 희미하게 */
      snow:    { t: ['#172038', '#253a5e', '#394a50', '#819796', '#c7cfcc'], rim: '#ebede9' }    /* 눈은 빛을 되비춰 밤에도 밝다 */
    }
  };
  function ramp(weather, phase, far) {
    var p = phase === 'dawn' || phase === 'dusk' ? 'dusk' : phase === 'night' ? 'night' : 'day';
    var w = RAMPS[p][weather] ? weather : 'clear', r = RAMPS[p][w];
    if (!far) return { t: r.t.slice(), rim: r.rim };
    return { t: [r.t[0], r.t[0], r.t[1], r.t[2], r.t[3]], rim: r.t[3] };   /* 먼 층: 한 단 어둡게, 테는 몸색 (대비 낮춤 = 공기 원근) */
  }

  /* 한 칸 모양: 덩어리 목록 [cx, cy, r] (캔버스 좌표, y 아래로). 종류 4: 0 솟은 적운 · 1 길쭉한 띠구름 · 2 작은 몽글 · 3 기본 */
  function lobes(v, w, h) {
    var kind = v % 4, L = [], bottom = h - 5, i, q, t, r, nb, nt, x0, x1;
    if (kind === 2) { x0 = w * 0.22; x1 = w * 0.78; } else if (kind === 1) { x0 = 8; x1 = w - 8; } else { x0 = 12; x1 = w - 12; }
    nb = kind === 1 ? 6 : kind === 2 ? 3 : 4 + (hash('cb' + v) % 2);
    for (i = 0; i < nb; i++) {   /* 아랫줄: 가운데가 크다 */
      q = hash('cl' + v + '_' + i); t = (i + 0.5) / nb;
      r = (kind === 1 ? 6 : 8) + Math.round((kind === 1 ? 3 : 5) * Math.sin(Math.PI * t)) + (q % 3);
      L.push([x0 + t * (x1 - x0) + ((q >>> 4) % 5) - 2, bottom - r * 0.7, r]);
    }
    nt = kind === 1 ? 2 : kind === 2 ? 1 : 2 + (hash('ct' + v) % 2);
    for (i = 0; i < nt; i++) {   /* 윗줄: 가운데 쪽, 더 크고 높게 (솟은 적운은 더 높이) */
      q = hash('ct' + v + '_' + i); t = (i + 0.5) / nt;
      r = (kind === 0 ? 13 : kind === 1 ? 8 : 10) + ((q >>> 3) % 5);
      var lift = kind === 0 ? 18 : kind === 1 ? 6 : 10;
      L.push([x0 + (x1 - x0) * (0.32 + 0.36 * t) + ((q >>> 8) % 7) - 3, bottom - lift - r * 0.8 - ((q >>> 12) % 3), r]);
    }
    if (kind === 0) { q = hash('cx' + v); L.push([w * 0.5 + (q % 9) - 4, bottom - 34 - ((q >>> 5) % 4), 9 + (q >>> 9) % 3]); }   /* 꼭대기 몽우리 */
    L.forEach(function (l) { if (l[1] - l[2] < 2) l[1] = l[2] + 2; });   /* 위로 안 잘리게 */
    return { L: L, bottom: bottom };
  }

  var K = 3.2;   /* 덩어리 녹여 붙이기 폭 (smooth union, px) — 밑면 사이 골이 메워져 한 덩어리처럼 */
  var LX = -0.6, LY = -0.8;   /* 2D 빛 방향 (캔버스 좌표, 왼쪽 위에서) */

  /* 일러스트식 픽셀 구름 음영: 덩어리마다 초승달 띠 (왼쪽 위 = 밝음, 오른쪽 아래 = 중간), 밑면 띠 2단, 띠 경계 1줄만 체크 디더 */
  function drawShape(ctx, ox, v, w, h, R) {
    var S = lobes(v, w, h), L = S.L, bottom = S.bottom, x, y, i;
    var SD = new Float32Array(w * h), OWN = new Int16Array(w * h);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var sum = 0, own = -1, best = -1e9;
      for (i = 0; i < L.length; i++) {
        var dx = x + 0.5 - L[i][0], dy = y + 0.5 - L[i][1], d = Math.sqrt(dx * dx + dy * dy), sd = L[i][2] - d;
        sum += Math.exp(sd / K);
        /* 주인 덩어리: 안에 드는 것 중 아래(앞)에 있는 것 — 아랫줄이 윗줄을 가린다 */
        var pri = sd > -1 ? L[i][1] + L[i][2] * 0.25 + Math.min(sd, 2) : -1e9;
        if (pri > best) { best = pri; own = i; }
      }
      var u = K * Math.log(sum), base = bottom + 0.5 - (y + 0.5);
      SD[y * w + x] = -K * Math.log(Math.exp(-u / K) + Math.exp(-base / K));   /* 부드러운 합집합 ∩ 평평한 밑면 */
      OWN[y * w + x] = own;
    }
    function inside(xx, yy) { return xx >= 0 && yy >= 0 && xx < w && yy < h && SD[yy * w + xx] > 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      var o = OWN[y * w + x], lb = o >= 0 ? L[o] : [x, y, 8];
      /* 초승달 둘: 빛 반대쪽으로 밀린 원의 바깥 = 빛 쪽 테두리 밝음, 빛 쪽으로 밀린 원의 바깥 = 반대쪽 테두리 그늘 → 띠가 덩어리 둘레를 따라 휜다 */
      var px = x + 0.5, py = y + 0.5, r0 = lb[2];
      var dAw = Math.hypot(px - (lb[0] - LX * r0 * 0.3), py - (lb[1] - LY * r0 * 0.3)) / r0;
      var dBo = Math.hypot(px - (lb[0] + LX * r0 * 0.22), py - (lb[1] + LY * r0 * 0.22)) / r0;
      var fromBase = bottom - y, dz = bayer(x, y) < 0.5;
      var lv = dBo >= 0.95 ? 2 : dAw > 0.98 ? 4 : 3;                      /* 그늘 · 밝음 · 몸 */
      if (lv === 4 && dAw < 1.05 && dz) lv = 3;                          /* 띠 경계 1줄: 체크로 반씩 */
      if (lv === 3 && dBo > 0.88 && dz) lv = 2;
      if (fromBase < 5) lv = Math.min(lv, 1); else if (fromBase < 7 && dz) lv = Math.min(lv, 1);   /* 밑면 그늘 띠 (위 2줄은 체크) */
      if (fromBase < 2) lv = 0;                                           /* 맨 밑 2줄 */
      var up = inside(x, y - 1), dn = inside(x, y + 1), rt = inside(x + 1, y), col;
      if (up && !dn && ((x + y) & 1)) continue;                           /* 밑 가장자리 1px 체크 = 솜털 */
      if (up && !rt && lv <= 2 && ((x + y) & 1)) continue;                /* 그늘진 오른쪽 가장자리도 */
      col = (!up && lv >= 3) ? R.rim : R.t[lv];                           /* 윗면 테 (림 라이트) */
      ctx.fillStyle = col; ctx.fillRect(ox + x, y, 1, 1);
    }
  }

  function atlas(o) {
    o = o || {}; var w = o.w || 112, h = o.h || 56, n = o.n || 4;
    var cv = document.createElement('canvas'); cv.width = w * n; cv.height = h;
    var ctx = cv.getContext('2d'), R = ramp(o.weather || 'clear', o.phase || 'day', !!o.far);
    for (var v = 0; v < n; v++) drawShape(ctx, v * w, v + (o.far ? 7 : 0), w, h, R);
    return cv;
  }
  return { atlas: atlas, ramp: ramp, RAMPS: RAMPS };
})();
if (typeof module !== 'undefined') module.exports = CLOUDS;
