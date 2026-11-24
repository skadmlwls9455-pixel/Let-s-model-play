/* js/vista.js — 다락 밖 먼 풍경 (11-21 주인: "지금 화면이 비는 느낌이 최대 문제점"). 전역 VISTA. DOM 없음 (node 에서도 돈다 · tools/test-vista.js).
 *
 * 다락은 바닷가 마을 위 높은 곳에 있다. 방 둘레의 빈 화면 (허공) 에 이 그림 한 장이 보인다 (js/scene3d.js 후처리 셰이더가 실내의 빈 픽셀에만 깐다).
 *   위: 그 시각의 하늘 (낮 · 노을 · 밤의 별과 달 · 새벽) 과 계단 구름 몇 점
 *   지평선 (그림 높이의 horizon 자리 — 방 뒤에 숨는다) 아래로, 먼 것부터: 바다 (느린 계단 물결) · 모래톱과 물거품 · 마을 지붕 (밤엔 불 켜진 창 두셋) · 가까운 나무 꼭대기
 * 방이 주인공이라 잔잔하고 대비가 낮다. 색은 전부 Apollo 46 칸 (장면 팔레트 스냅을 지나도 안 바뀐다).
 *
 *   VISTA.paint(w, h, { hour, weather, season, seed, t, horizon }) → { w, h, d: Uint8ClampedArray (RGBA, 윗줄부터) }
 *     hour 0–24 · weather 'clear' | 'drizzle' | 'rain' | 'snow' · season 'spring' | 'summer' | 'autumn' | 'winter' · seed 아무 값 (같은 값 = 같은 그림)
 *     t = 초 (물결 · 물거품만 움직인다: 1 초에 3 칸. 모션 줄이기면 부르는 쪽이 0 을 준다) · horizon = 지평선 자리 (위에서부터 0–1, 기본 0.5)
 *   VISTA.phase(hour) → 'night' | 'dawn' | 'day' | 'dusk' · VISTA.frame(t) → 물결 칸 번호 (같은 번호 = 같은 그림) · VISTA.PALETTE = 쓰는 색 목록
 * 결정적: 시계 · Math.random 을 안 쓴다.
 */
var VISTA = (function () {
  'use strict';
  var APOLLO = ['#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb', '#19332d', '#25562e', '#468232', '#75a743', '#a8ca58', '#d0da91', '#4d2b32', '#7a4841', '#ad7757', '#c09473', '#d7b594', '#e7d5b3',
    '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170', '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e', '#1e1d39', '#402751', '#7a367b', '#a23e8c', '#c65197', '#df84a5',
    '#090a14', '#10141f', '#151d28', '#202e37', '#394a50', '#577277', '#819796', '#a8b5b2', '#c7cfcc', '#ebede9'];
  function hash(s) { s = String(s); var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function mkRng(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  var A_RGB = APOLLO.map(rgb);
  function idx(hex) { var i = APOLLO.indexOf(hex); if (i < 0) throw new Error('VISTA: 팔레트에 없는 색 ' + hex); return i; }

  function phase(h) { h = ((+h || 0) % 24 + 24) % 24; return h < 5.5 ? 'night' : h < 9 ? 'dawn' : h < 17 ? 'day' : h < 20 ? 'dusk' : 'night'; }
  var FPS = 3;
  function frame(t) { return Math.floor(Math.max(0, +t || 0) * FPS); }

  /* 하늘: 위 → 지평선 네 띠. 구름: 그늘 · 몸 · 윗테 */
  var SKY = {
    day:   { clear: ['#3c5e8b', '#4f8fba', '#4f8fba', '#73bed3'], wet: ['#394a50', '#577277', '#577277', '#819796'], cloud: ['#a8b5b2', '#c7cfcc', '#ebede9'], cloudWet: ['#577277', '#819796', '#a8b5b2'] },
    dawn:  { clear: ['#253a5e', '#3c5e8b', '#7a367b', '#df84a5'], wet: ['#202e37', '#394a50', '#577277', '#819796'], cloud: ['#7a367b', '#df84a5', '#e7d5b3'], cloudWet: ['#394a50', '#577277', '#819796'] },
    dusk:  { clear: ['#1e1d39', '#402751', '#7a367b', '#da863e'], wet: ['#151d28', '#202e37', '#394a50', '#577277'], cloud: ['#402751', '#7a367b', '#c65197'], cloudWet: ['#202e37', '#394a50', '#577277'] },
    night: { clear: ['#090a14', '#10141f', '#151d28', '#172038'], wet: ['#090a14', '#10141f', '#151d28', '#202e37'], cloud: ['#10141f', '#151d28', '#202e37'], cloudWet: ['#10141f', '#151d28', '#202e37'] }
  };
  /* 땅 · 바다: 시각대마다 손으로 고른 색 (자동으로 어둡게 하면 팔레트 칸이 엉뚱한 색으로 튄다). tree = [그늘, 몸, 빛] · roofs = 지붕 네 가지 */
  var LAND = {
    day:   { seaFar: '#4f8fba', seaNear: '#3c5e8b', seaHi: '#73bed3', haze: '#a4dddb', foam: '#ebede9', sand: '#d7b594', sandLo: '#c09473', grass: '#468232', grassLo: '#25562e', tree: ['#19332d', '#25562e', '#468232'],
      roofs: ['#a53030', '#7a4841', '#3c5e8b', '#be772b'], wall: '#e7d5b3', wallLo: '#c09473', win: '#4d2b32', warm: ['#602c2c', '#a53030', '#cf573c'], gold: ['#884b2b', '#be772b', '#de9e41'], pink: ['#c65197', '#df84a5', '#e7d5b3'],
      snow: '#ebede9', snowLo: '#c7cfcc', snowTree: ['#19332d', '#25562e', '#c7cfcc'], wetSea: ['#577277', '#394a50', '#819796', '#a8b5b2'] },
    dawn:  { seaFar: '#4f8fba', seaNear: '#3c5e8b', seaHi: '#a4dddb', haze: '#e7d5b3', foam: '#ebede9', sand: '#d7b594', sandLo: '#c09473', grass: '#25562e', grassLo: '#19332d', tree: ['#151d28', '#19332d', '#25562e'],
      roofs: ['#752438', '#7a4841', '#253a5e', '#884b2b'], wall: '#d7b594', wallLo: '#ad7757', win: '#4d2b32', warm: ['#341c27', '#602c2c', '#a53030'], gold: ['#4d2b32', '#884b2b', '#be772b'], pink: ['#a23e8c', '#c65197', '#df84a5'],
      snow: '#c7cfcc', snowLo: '#a8b5b2', snowTree: ['#151d28', '#19332d', '#a8b5b2'], wetSea: ['#394a50', '#202e37', '#577277', '#819796'] },
    dusk:  { seaFar: '#402751', seaNear: '#1e1d39', seaHi: '#7a367b', haze: '#da863e', foam: '#df84a5', sand: '#ad7757', sandLo: '#7a4841', grass: '#25562e', grassLo: '#19332d', tree: ['#10141f', '#19332d', '#25562e'],
      roofs: ['#752438', '#4d2b32', '#253a5e', '#884b2b'], wall: '#c09473', wallLo: '#7a4841', win: '#341c27', warm: ['#241527', '#602c2c', '#a53030'], gold: ['#341c27', '#884b2b', '#be772b'], pink: ['#7a367b', '#a23e8c', '#c65197'],
      snow: '#a8b5b2', snowLo: '#819796', snowTree: ['#10141f', '#19332d', '#819796'], wetSea: ['#394a50', '#202e37', '#577277', '#577277'] },
    night: { seaFar: '#172038', seaNear: '#10141f', seaHi: '#253a5e', haze: '#253a5e', foam: '#3c5e8b', sand: '#202e37', sandLo: '#151d28', grass: '#151d28', grassLo: '#10141f', tree: ['#090a14', '#10141f', '#19332d'],
      roofs: ['#241527', '#1e1d39', '#172038', '#341c27'], wall: '#394a50', wallLo: '#202e37', win: '#090a14', warm: ['#090a14', '#241527', '#341c27'], gold: ['#090a14', '#241527', '#4d2b32'], pink: ['#10141f', '#1e1d39', '#402751'],
      snow: '#577277', snowLo: '#394a50', snowTree: ['#090a14', '#10141f', '#394a50'], wetSea: ['#172038', '#10141f', '#253a5e', '#202e37'] }
  };
  var LIT = '#e8c170';
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

  /* 바뀌지 않는 층 (하늘 · 땅 · 물결 없는 바다) 을 팔레트 번호로 그린다 → { ix: Uint8Array, sea: { y0, y1, shore: Int16Array, hi, foam, sand }, dashes } */
  function layer(w, h, o) {
    var ph = phase(o.hour), wet = o.weather === 'rain' || o.weather === 'drizzle', snowy = o.weather === 'snow', season = o.season || 'summer', winter = season === 'winter' || snowy;
    var rnd = mkRng(hash('vista|' + o.seed + '|' + w + 'x' + h)), rndS = mkRng(hash('stars|' + o.seed + '|' + w + 'x' + h)), rndC = mkRng(hash('clouds|' + o.seed + '|' + w + 'x' + h)), ix = new Uint8Array(w * h), x, y, i;   /* 별은 제 난수 줄 (밤에도 마을 · 구름 자리는 낮과 같다) */
    function put(px, py, c) { if (px >= 0 && px < w && py >= 0 && py < h) ix[py * w + px] = c; }
    var BASE = LAND[ph], land = idx;
    if (wet || snowy) BASE = Object.assign({}, wet && ph === 'day' ? LAND.dawn : BASE, { seaFar: BASE.wetSea[0], seaNear: BASE.wetSea[1], seaHi: BASE.wetSea[2], haze: BASE.wetSea[3] });   /* 비 오는 낮: 땅도 한 톤 가라앉힌다 (새벽 표) */
    if (winter) BASE = Object.assign({}, BASE, { grass: BASE.snow, grassLo: BASE.snowLo });
    var H0 = Math.max(8, Math.min(h - 24, Math.round(h * (o.horizon > 0 && o.horizon < 1 ? o.horizon : 0.5)))), low = h - H0;

    /* 하늘 네 띠 — 띠 사이 두 줄은 정렬 디더 */
    var sk = (SKY[ph][wet || snowy ? 'wet' : 'clear']).map(idx), cuts = [Math.round(H0 * 0.42), Math.round(H0 * 0.74), Math.round(H0 * 0.92)];
    for (y = 0; y < H0; y++) for (x = 0; x < w; x++) {
      var b = y < cuts[0] ? 0 : y < cuts[1] ? 1 : y < cuts[2] ? 2 : 3, nb = b < 3 ? cuts[b] - y : 99;
      ix[y * w + x] = nb <= 2 && bayer(x, y) < (nb === 1 ? 0.5 : 0.25) ? sk[b + 1] : sk[b];
    }
    /* 밤 (맑음): 별과 달 */
    if (ph === 'night' && !wet && !snowy) {
      var star = idx('#c7cfcc'), starLo = idx('#577277'), ns = Math.round(w * H0 / 260);
      for (i = 0; i < ns; i++) { x = Math.floor(rndS() * w); y = Math.floor(rndS() * H0 * 0.9); put(x, y, rndS() < 0.3 ? star : starLo); }
      var mx = Math.round(w * 0.2), my = Math.max(8, Math.round(H0 * 0.2)), moon = idx('#e7d5b3'), moonLo = idx('#c09473');
      for (y = -3; y <= 3; y++) for (x = -3; x <= 3; x++) if (x * x + y * y <= 10) put(mx + x, my + y, (x + 1) * (x + 1) + (y + 1) * (y + 1) <= 3 ? moonLo : moon);
    }
    /* 계단 구름: 밑이 평평한 몽글 덩어리 (윗테 · 몸 · 그늘 줄) */
    var cl = (SKY[ph][wet || snowy ? 'cloudWet' : 'cloud']).map(idx), nc = Math.max(2, Math.round(w / 70)) + (wet || snowy ? 2 : 0);
    for (i = 0; i < nc; i++) {
      var cx = Math.floor(rndC() * w), cy = Math.round(H0 * (0.12 + 0.6 * rndC())), n = 3 + Math.floor(rndC() * 3), lumps = [], lx = 0;
      for (var j = 0; j < n; j++) { var r = 4 + Math.floor(rndC() * 5); lumps.push([lx, r]); lx += r + 1 + Math.floor(rndC() * 3); }
      for (y = -9; y <= 0; y++) for (x = -9; x <= lx + 9; x++) {
        var inside = false, above = false;
        for (j = 0; j < n; j++) { var dx = x - lumps[j][0], rr = lumps[j][1] * lumps[j][1]; if (dx * dx + y * y * 2.2 <= rr) inside = true; if (dx * dx + (y - 1) * (y - 1) * 2.2 <= rr) above = true; }
        if (inside && cy + y < H0 - 2) put(cx + x - (lx >> 1), cy + y, y >= -1 ? cl[0] : above ? cl[1] : cl[2]);
      }
    }
    /* 바다: 지평선 한 줄 안개빛 · 먼 물 · 가까운 물 */
    var seaH = Math.max(6, Math.round(low * 0.3)), y1 = H0 + seaH, far = land(BASE.seaFar), near = land(BASE.seaNear), split = H0 + Math.round(seaH * 0.45);
    for (y = H0; y < Math.min(h, y1 + 4); y++) for (x = 0; x < w; x++) ix[y * w + x] = y === H0 ? land(BASE.haze) : y < split || (y < split + 2 && bayer(x, y) < 0.5) ? far : near;
    /* 물가 선 (계단 곡선) · 모래톱 · 풀밭 */
    var p1 = rnd() * 6.28, p2 = rnd() * 6.28, shore = new Int16Array(w), sandH = Math.max(3, Math.round(low * 0.07)), sand = land(BASE.sand), sandLo = land(BASE.sandLo), grass = land(BASE.grass), grassLo = land(BASE.grassLo);
    for (x = 0; x < w; x++) {
      shore[x] = y1 + Math.round(1.6 * Math.sin(x / 23 + p1) + 1.1 * Math.sin(x / 9.7 + p2));
      var sb = shore[x] + sandH + Math.round(1.4 * Math.sin(x / 31 + p2));
      for (y = shore[x]; y < h; y++) ix[y * w + x] = y < sb ? (y === sb - 1 || (hash(x + ',' + y) % 11 === 0) ? sandLo : sand) : (y < sb + Math.round(low * 0.22) ? grass : grassLo);
    }
    /* 마을 · 나무: 먼 것 (위) 부터 차례로 덮어 그린다 */
    var things = [], vy0 = y1 + sandH + 4, vy1 = y1 + Math.round(low * 0.42), ty1 = h + 6;
    var nh = Math.max(3, Math.round(w / 26));
    for (i = 0; i < nh; i++) things.push({ k: 'house', x: Math.round((i + 0.2 + 0.6 * rnd()) * w / nh), y: Math.round(vy0 + 4 + rnd() * Math.max(1, vy1 - vy0 - 4)), ww: 7 + Math.floor(rnd() * 4), wh: 4 + Math.floor(rnd() * 2), roof: Math.floor(rnd() * BASE.roofs.length), n: i });
    var nt = Math.round(w / 9);
    for (i = 0; i < nt; i++) things.push({ k: 'tree', x: Math.floor(rnd() * w), y: Math.round(vy0 + 2 + rnd() * (vy1 - vy0 + 4)), r: 3 + Math.floor(rnd() * 2), v: rnd() });
    for (y = vy1 + 2; y < ty1; ) {   /* 가까운 숲: 줄마다 촘촘히, 아래로 갈수록 크게 */
      var k = (y - vy1) / Math.max(1, h - vy1), tr = Math.round(4 + 5 * k), stepx = Math.max(4, Math.round(tr * 1.35));
      for (x = -tr + Math.floor(rnd() * stepx); x < w + tr; x += stepx + Math.floor(rnd() * 3) - 1) things.push({ k: 'tree', x: x, y: y + Math.floor(rnd() * 3), r: tr + (rnd() < 0.3 ? 1 : 0), v: rnd(), near: true, deep: k });
      y += Math.max(3, Math.round(tr * 0.8));
    }
    things.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lit = [], litN = 0;
    things.forEach(function (o2) {
      if (o2.k === 'tree') {
        var v = o2.v, tint = o2.near ? 0.14 : 0.34, rampT = winter ? BASE.snowTree : season === 'autumn' && v < tint ? (v < tint / 2 ? BASE.warm : BASE.gold) : season === 'spring' && v < 0.2 ? BASE.pink : BASE.tree;
        var c0 = land(rampT[0]), c1 = land(rampT[1]), c2 = land(o2.near && rampT !== BASE.tree && !winter ? rampT[1] : rampT[2]), r = o2.r,
          deep = o2.near ? o2.deep : 0, dark = land(BASE.tree[0]), cyT = o2.y - r, hk = o2.near ? 0.3 : 0.55;   /* 가까운 숲은 빛 점을 작게 (잔잔하게) */
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r + 1) continue;
          var hi = (dx + 1) * (dx + 1) + (dy + 1) * (dy + 1) <= (r - 1) * (r - 1) * hk && dy < 0, lo = dx + dy > r * 0.7 || dy > r * 0.55;
          put(o2.x + dx, cyT + dy, deep > 0.82 ? dark : hi && deep < 0.5 ? c2 : lo ? c0 : c1);   /* 화면 맨 아래 (단추 · 발자국 손잡이 자리) 로 갈수록 빛 점이 없어지고 끝은 어두운 한 덩이 — 잔잔하게 */
        }
      } else {
        var ww = o2.ww, wh = o2.wh, x0 = o2.x - (ww >> 1), yb = o2.y, rh = (ww >> 1) + 1, roof = land(winter ? BASE.snow : BASE.roofs[o2.roof]), wall = land(BASE.wall), wallLo = land(BASE.wallLo);
        for (var yy = 0; yy < wh; yy++) for (var xx = 0; xx < ww; xx++) put(x0 + xx, yb - 1 - yy, xx >= ww - 2 ? wallLo : wall);
        for (yy = 0; yy < rh; yy++) for (xx = -1 - 0 + yy; xx <= ww - yy; xx++) put(x0 + xx, yb - wh - 1 - yy, yy === 0 ? land(BASE.win) : roof);   /* 박공지붕: 처마 한 줄은 어두운 선 */
        var wx = x0 + 1 + (o2.n % 2) * Math.max(1, ww - 5), wy = yb - wh + 1;
        if (ph === 'night' || ph === 'dusk') lit.push({ x: wx, y: wy, n: o2.n });
        put(wx, wy, land(BASE.win)); put(wx + 1, wy, land(BASE.win)); if (wh > 4) { put(wx, wy + 1, land(BASE.win)); put(wx + 1, wy + 1, land(BASE.win)); }
      }
    });
    /* 불 켜진 창: 밤 셋 · 노을 둘 (집이 나무에 가려도 창 두 칸은 다시 찍는다 — 멀리서 보이는 불빛) */
    var want = ph === 'night' ? 3 : 2, litC = idx(LIT);
    lit.sort(function (a, b) { return (hash('lit' + o.seed + a.n) % 97) - (hash('lit' + o.seed + b.n) % 97); });
    for (i = 0; i < lit.length && litN < want; i++, litN++) { put(lit[i].x, lit[i].y, litC); put(lit[i].x + 1, lit[i].y, litC); }
    /* 물결 줄 자리 (그릴 때마다 칸 번호로 옮긴다) */
    var dashes = [], nd = Math.round(w * seaH / 70);
    for (i = 0; i < nd; i++) { y = H0 + 2 + Math.floor(rnd() * Math.max(1, seaH - 3)); dashes.push([Math.floor(rnd() * w), y, 2 + Math.floor(rnd() * (y > split ? 4 : 2)), Math.floor(rnd() * 12)]); }
    return { ix: ix, w: w, h: h, H0: H0, shore: shore, hi: land(BASE.seaHi), foam: land(BASE.foam), dashes: dashes };
  }
  var cache = { key: '', L: null };
  function paint(w, h, o) {
    o = o || {}; w = Math.max(8, w | 0); h = Math.max(40, h | 0);
    var key = [w, h, phase(o.hour), o.weather || 'clear', o.season || 'summer', o.seed, o.horizon || 0.5].join('|'), L = cache.key === key ? cache.L : null;
    if (!L) { L = layer(w, h, o); cache.key = key; cache.L = L; }
    var ix = L.ix.slice(), k = frame(o.t), i, x;
    /* 느린 계단 물결: 짧은 밝은 줄이 칸마다 한 px 씩 흔들리고 가끔 쉰다 · 물거품 선은 두 칸에 한 번 한 px 밀려왔다 간다 */
    for (i = 0; i < L.dashes.length; i++) {
      var d = L.dashes[i], ph2 = (k + d[3]) % 12; if (ph2 >= 9) continue;
      var sx = d[0] + (ph2 % 3) - 1;
      for (x = 0; x < d[2]; x++) { var px = sx + x, py = d[1]; if (px >= 0 && px < w && py < L.shore[px] - 1) ix[py * w + px] = L.hi; }
    }
    for (x = 0; x < w; x++) { var fy = L.shore[x] - 1 + (((k >> 1) + (x >> 3)) % 2); if (fy > L.H0 && fy < h && hash('f' + (x >> 1)) % 5 !== 0) ix[fy * w + x] = L.foam; }
    var out = new Uint8ClampedArray(w * h * 4);
    for (i = 0; i < w * h; i++) { var c = A_RGB[ix[i]], q = i * 4; out[q] = c[0]; out[q + 1] = c[1]; out[q + 2] = c[2]; out[q + 3] = 255; }
    return { w: w, h: h, d: out };
  }
  return { paint: paint, phase: phase, frame: frame, FPS: FPS, PALETTE: APOLLO.slice() };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VISTA;
