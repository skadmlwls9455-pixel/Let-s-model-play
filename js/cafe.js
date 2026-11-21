/* ============================================================
   뽈뽈 문어 — js/cafe.js (전역 CAFE) · 카페 규칙 (11-21, 7차 갈래 C)
   DOM 없음 · 시계 · 난수 없음 (날짜는 받아서 쓴다) → node 에서 그대로 검사한다 (tools/test-cafe.js). js/meal.js 와 같은 만듦새.
   - 메뉴 셋: 커피 2 · 딸기 케이크 5 · 과일 꼬치 4 (조개). 케이크 · 꼬치는 세 번 톡으로 먹는다 (그림이 삼분의 일씩 줄어든다).
   - 같은 메뉴를 세 번 다 먹으면 카페 지킴이가 그 레시피를 준다 (레시피 상태는 갈래 T 의 APP.recipeEat 이 주인 — 없을 때만 여기 규칙).
   - 기록 S.user.cafe = { v, eaten: { 메뉴 id: 다 먹은 수 }, tray: { id, left, day } | null, gifts: { 레시피 id: 날짜 }, lp: { 곡 id: 튼 수 } }
     모르는 칸 · 모르는 메뉴 id 는 그대로 둔다 (나중 빌드가 알 수도 있다).
   - 그림: COOK_SPR (갈래 A) 가 있으면 그것, 없으면 여기 수수한 그림 (art). 레코드 재킷 여덟 장은 글자 없는 도형 (sleeve).
   ============================================================ */
var CAFE = (function () {
  'use strict';
  var GIFT_AT = 3, BITES = 3;
  var MENU = [
    { id: 'coffee', name: '커피', price: 2, spr: 'cafe.coffee', recipe: null, bites: 0 },
    { id: 'cake', name: '딸기 케이크', price: 5, spr: 'dish.cake', recipe: 'cake', bites: BITES },
    { id: 'kkochi', name: '과일 꼬치', price: 4, spr: 'dish.kkochi', recipe: 'kkochi2', bites: BITES }
  ];
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function cnt(x) { return typeof x === 'number' && isFinite(x) && x > 0 ? Math.floor(x) : 0; }
  function item(id) { for (var i = 0; i < MENU.length; i++) if (MENU[i].id === id) return MENU[i]; return null; }
  function isDay(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  /* 기록 고치기: 없는 칸은 안전한 빈 값, 모르는 칸은 그대로 */
  function normalize(c) {
    if (!isObj(c)) c = {};
    if (typeof c.v !== 'number') c.v = 1;
    if (!isObj(c.eaten)) c.eaten = {};
    if (!isObj(c.gifts)) c.gifts = {};
    if (!isObj(c.lp)) c.lp = {};
    Object.keys(c.eaten).forEach(function (k) { c.eaten[k] = cnt(c.eaten[k]); });
    Object.keys(c.lp).forEach(function (k) { c.lp[k] = cnt(c.lp[k]); });
    var t = c.tray;
    if (!(isObj(t) && typeof t.id === 'string' && t.id)) c.tray = null;
    else { var it = item(t.id); t.left = it ? Math.max(0, Math.min(it.bites, cnt(t.left))) : cnt(t.left); if (!isDay(t.day)) t.day = null; }
    return c;
  }
  /* 주문: 값이 모자라면 아무것도 바꾸지 않는다. 쟁반에 먹던 것이 있으면 새로 시키지 않는다 (busy) */
  function order(c, id, shells, day) {
    c = normalize(c); var it = item(id);
    if (!it) return { ok: false, why: 'unknown' };
    if (pending(c)) return { ok: false, why: 'busy' };
    if (cnt(shells) < it.price) return { ok: false, why: 'short', miss: it.price - cnt(shells) };
    if (c.tray && !item(c.tray.id)) { if (!Array.isArray(c.held)) c.held = []; c.held.push(c.tray); }   /* 이 빌드가 모르는 메뉴가 쟁반에 있었다 (나중 빌드의 것): 지우지 않고 옆에 둔다 */
    c.tray = { id: it.id, left: it.bites, day: isDay(day) ? day : null };
    return { ok: true, cost: it.price, item: it };
  }
  function pending(c) { var t = c && c.tray; return !!(t && item(t.id) && item(t.id).bites > 0 && t.left > 0); }   /* 먹다 만 음식이 쟁반에 있는가 */
  /* 한 입: 마지막 한 입이면 '다 먹은 수' 가 하나 오른다 (done). 커피는 먹는 것이 아니다 */
  function bite(c) {
    c = normalize(c); var t = c.tray, it = t && item(t.id);
    if (!it || !it.bites || t.left <= 0) return { ok: false };
    t.left -= 1;
    if (t.left > 0) return { ok: true, done: false, left: t.left, item: it };
    c.eaten[it.id] = cnt(c.eaten[it.id]) + 1;
    return { ok: true, done: true, left: 0, item: it, n: c.eaten[it.id] };
  }
  /* 레시피 선물 (갈래 T 가 없을 때의 규칙 — 있으면 APP.recipeEat 의 gift 를 따른다): 세 번째에 꼭 한 번 */
  function giftDue(c, id) { c = normalize(c); var it = item(id); return !!(it && it.recipe && cnt(c.eaten[id]) >= GIFT_AT && !c.gifts[it.recipe]); }
  function giftMark(c, id, day) { c = normalize(c); var it = item(id); if (!it || !it.recipe || c.gifts[it.recipe]) return false; c.gifts[it.recipe] = isDay(day) ? day : true; return true; }
  function dots(c, id) { c = normalize(c); var it = item(id); if (!it || !it.recipe) return -1; return c.gifts[it.recipe] ? GIFT_AT : Math.min(GIFT_AT, cnt(c.eaten[id])); }   /* 메뉴 칸의 점 셋 (-1 = 점 없음) */
  /* 자리에서 일어남: 커피 · 다 먹은 접시는 치운다. 먹다 만 음식은 남겨 둔다 (다음에 카운터에서 다시 내준다 — 낸 조개가 사라지지 않게) */
  function leave(c) { c = normalize(c); if (c.tray && item(c.tray.id) && !pending(c)) c.tray = null; return c; }   /* 모르는 메뉴의 쟁반은 그대로 둔다 */
  function played(c, tune) { c = normalize(c); if (typeof tune === 'string' && tune) c.lp[tune] = cnt(c.lp[tune]) + 1; return c; }
  /* 두 기록 합치기 (다른 탭 · 불러오기): 센 것은 큰 쪽, 받은 선물은 합집합, 쟁반은 a 것 (없으면 b 것) */
  function merge(a, b) {
    a = normalize(a); if (!isObj(b)) return a; b = normalize(b);
    ['eaten', 'lp'].forEach(function (f) { Object.keys(b[f]).forEach(function (k) { a[f][k] = Math.max(cnt(a[f][k]), b[f][k]); }); });
    Object.keys(b.gifts).forEach(function (k) { var x = a.gifts[k], y = b.gifts[k]; a.gifts[k] = !x ? y : (isDay(x) && isDay(y) ? (x < y ? x : y) : x); });
    if (!a.tray && b.tray) a.tray = { id: b.tray.id, left: b.tray.left, day: b.tray.day };
    Object.keys(b).forEach(function (k) { if (!(k in a)) a[k] = b[k]; });
    return a;
  }

  /* 다른 탭의 기록 (remote) 을 받을 때: 센 것 · 선물은 이 탭 것과 합치고, 쟁반은 받은 쪽 것 그대로 (그쪽이 더 새 저장 — 이 탭의 옛 쟁반을 되살리면 한 접시를 두 번 먹는다).
     받은 쪽에 카페 기록이 아예 없으면 (옛 빌드 탭) 이 탭 쟁반을 지킨다. 새 객체를 돌려준다 */
  function adopt(mine, remote) {
    var had = isObj(remote), r = normalize(had ? JSON.parse(JSON.stringify(remote)) : {}), tray = r.tray;
    if (!isObj(mine)) return r;
    var m = merge(r, JSON.parse(JSON.stringify(mine)));
    if (had) m.tray = tray;
    return m;
  }

  /* ───────── 그림 (RGBA) ───────── */
  var PAL = { k: [59, 42, 38], c: [244, 234, 216], b: [107, 64, 40], w: [232, 224, 212], s: [217, 201, 176], r: [214, 69, 80], y: [244, 208, 132], p: [232, 222, 206],
    o: [240, 150, 60], g: [120, 180, 90], t: [150, 110, 70], n: [250, 246, 236], l: [176, 160, 140], d: [40, 34, 44], e: [96, 90, 104] };
  var ART = {
    coffee: ['....w...w.......', '...w...w........', '....w...w.......', '................', '.kkkkkkkkkkk....', '.kbbbbbbbbbkkk..', '.kcccccccccck.k.', '.kccccccccck..k.',
      '.kcccccccccck.k.', '.kccccccccckkk..', '..kccccccckk....', '...kkkkkkk......', '.kssssssssssk...', '..kkkkkkkkkk....'],
    cake: ['.......rr.......', '......rrrr......', '......rrrr......', '..kkkkkrrkkkkk..', '.knnnnnnnnnnnnk.', '.knnnnnnnnnnnnk.', '.kyyyyyyyyyyyyk.', '.kyyyyyyyyyyyyk.',
      '.knnrnnrnnrnnnk.', '.kyyyyyyyyyyyyk.', '.kyyyyyyyyyyyyk.', '.kkkkkkkkkkkkkk.', 'kppppppppppppppk', '.kkkkkkkkkkkkkk.'],
    kkochi: ['................', '................', '................', '................', '...kk...kk...kk.', '..krrk.kook.kggk', '.krrrrkooookgggg', 'ttrrrrtooootgggk',
      '.krrrrkooookgggg', '..krrk.kook.kggk', '...kk...kk...kk.', '................', '.kppppppppppppk.', '..kkkkkkkkkkkk..'],
    card: ['.kkkkkkkkkk.', 'knnnnnnnnnnk', 'knrrnnnnnnnk', 'knrrnllllnnk', 'knnnnnnnnnnk', 'knllllllllnk', 'knnnnnnnnnnk', 'knllllllnnnk', 'knnnnnnnnnnk', 'knllllllllnk', 'knnnnnnnnnnk', 'knllllnnnnnk', 'knnnnnnnnnnk', '.kkkkkkkkkk.'],
    speaker: ['........k.......', '.......kk...k...', '......knk....k..', '.kkkkknnk..k..k.', '.knnnnnnk...k.k.', '.knnnnnnk...k.k.', '.knnnnnnk...k.k.', '.kkkkknnk..k..k.', '......knk....k..', '.......kk...k...', '........k.......'],
    mute: ['........k.......', '.......kk.......', '......knk.......', '.kkkkknnk.k...k.', '.knnnnnnk..k.k..', '.knnnnnnk...k...', '.knnnnnnk..k.k..', '.kkkkknnk.k...k.', '......knk.......', '.......kk.......', '........k.......']
  };
  function grid(rows) {
    var hh = rows.length, ww = rows[0].length, d = new Uint8ClampedArray(ww * hh * 4);
    for (var y = 0; y < hh; y++) for (var x = 0; x < ww; x++) { var p = PAL[rows[y].charAt(x)], i = (y * ww + x) * 4; if (p) { d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255; } }
    return { w: ww, h: hh, d: d };
  }
  function art(id) { return ART[id] ? grid(ART[id]) : null; }
  /* 레코드 재킷: 20×20, 바탕색 + 도형 하나 (글자 없음). 곡 순서대로 여덟 장 */
  var SLEEVES = [
    { bg: [52, 64, 110], fg: [246, 232, 170], kind: 'moon' },      /* 자장가 */
    { bg: [38, 46, 84], fg: [214, 226, 246], kind: 'disc' },       /* 달빛 */
    { bg: [232, 190, 170], fg: [250, 244, 232], kind: 'cloud' },   /* 꿈 */
    { bg: [236, 226, 200], fg: [150, 110, 70], kind: 'bars' },     /* 전주곡 */
    { bg: [196, 70, 62], fg: [246, 214, 120], kind: 'diamond' },   /* 래그 */
    { bg: [120, 156, 130], fg: [250, 244, 232], kind: 'ring' },    /* 엘리제 */
    { bg: [96, 150, 180], fg: [240, 248, 250], kind: 'wave' },     /* 아라베스크 */
    { bg: [86, 84, 100], fg: [200, 206, 222], kind: 'rain' }       /* 쇼팽 */
  ];
  function sleeve(i) {
    var s = SLEEVES[((i % SLEEVES.length) + SLEEVES.length) % SLEEVES.length], n = 20, d = new Uint8ClampedArray(n * n * 4);
    function put(x, y, c) { if (x < 0 || y < 0 || x >= n || y >= n) return; var k = (y * n + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
    var x, y, dx, dy;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) put(x, y, (x === 0 || y === 0 || x === n - 1 || y === n - 1) ? PAL.k : s.bg);
    for (y = 2; y < n - 2; y++) for (x = 2; x < n - 2; x++) {
      dx = x - 9.5; dy = y - 9.5; var r2 = dx * dx + dy * dy, hit = false;
      if (s.kind === 'disc') hit = r2 <= 30;
      else if (s.kind === 'moon') hit = r2 <= 36 && (dx - 3) * (dx - 3) + (dy + 2) * (dy + 2) > 30;
      else if (s.kind === 'ring') hit = r2 <= 42 && r2 >= 20;
      else if (s.kind === 'diamond') hit = Math.abs(dx) + Math.abs(dy) <= 6;
      else if (s.kind === 'bars') hit = (x % 4 === 0 || x % 4 === 1) && y >= 4 + ((x >> 2) * 5) % 7 && y <= 15;
      else if (s.kind === 'wave') hit = (y === 7 + ((x + 1) >> 1) % 3 || y === 12 + (x >> 1) % 3);
      else if (s.kind === 'rain') hit = x % 4 === 3 && ((y + x) % 6 < 3);
      else if (s.kind === 'cloud') hit = (dy >= 0 && dy <= 3 && Math.abs(dx) <= 6) || ((dx + 2) * (dx + 2) + dy * dy <= 12) || ((dx - 3) * (dx - 3) + (dy - 0.5) * (dy - 0.5) <= 7);
      if (hit) put(x, y, s.fg);
    }
    return { w: n, h: n, d: d };
  }
  return { MENU: MENU, GIFT_AT: GIFT_AT, BITES: BITES, item: item, normalize: normalize, order: order, pending: pending, bite: bite,
    giftDue: giftDue, giftMark: giftMark, dots: dots, leave: leave, played: played, merge: merge, adopt: adopt, art: art, sleeve: sleeve, SLEEVE_N: SLEEVES.length };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CAFE;
