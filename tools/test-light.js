#!/usr/bin/env node
/* tools/test-light.js — 저녁·밤 밝기 · 계단 표시 회귀 테스트 (11-15, 주인 11-14 "저녁이라 해도 너무 어두워서 조금 더 밝게" · "계단이 어두울 때는 잘 안 보이는데 눈에 띄게")
 *   node tools/test-light.js      → "N passed, M failed", 실패 있으면 exit 1   (Playwright 전역: NODE_PATH=$(npm root -g))
 *   L1 노을 → 밤 섞기: SCENE3D.duskBlend 가 19:00 0 → 15분마다 1/8 → 21:00 1 (8칸, 단조, 19시 전 0 = 툭 바뀌지 않음) · 조명 열쇠도 8번 바뀐다
 *   L2 22시 장면: 밤 등불 세기 1.5 · 닿는 거리 7.5 · 달빛 바닥 0.48 (등불 0칸이면 헤미가 그 값)
 *   L3 20시 · 등불 3 · 맑음: 다락 방 띠 평균 루마 ≥ 바닥값 (예전 0.117 · 지금 0.147 — 재어 둔 값에서 여유를 뺀 것)
 *   L9 (11-18 검증) 마당 어디서 집 문을 톡해도 계단 발치를 거쳐 문 앞에 선다 (왼쪽 절반 · 집 뒤 포함 — 길 찾기가 상자 여럿 · 나무를 돌아간다)
 *   L8 (11-18 시험판) 넓은 바깥 (?wide=1): 끄면 마당은 예전 그대로 · 켜면 땅이 화면을 채우고 · 울타리는 앞 모서리의 문으로만 나가고 · 문 밖 띠 안에서만 걷고 · 화면이 따라오고 ·
 *      돌려 봐도 캐릭터가 그 자리 (돌린 뒤 빈 땅 톡 · 키우기 · 손 떼기에도 · 천천히 돌려도) · 드로우콜 · 셰이더 프로그램 그대로 · 문 밖에서 집 문을 톡하면 울타리 문을 거쳐 들어온다
 *   L7 (11-18) 톡 격자: 다락 계단 그림 위 톡은 계단으로 · 뒷벽 문간 위 톡은 마당으로 (계단이 문 옆이던 때는 계단 톡이 마당 문으로 갔다) · 가장자리 단추가 뜬 동안에도 보이는 계단은 눌린다
 *   L6 (11-18 검증) 쥔 채로 들어온 문으로 되튀지 않는다 (마당 → 다락, 60 fps 걸음)
 *   L5 (11-18) 다락 계단 단추 (가장자리) · 걸음 따라오기 · 내려오면 계단이 보임 · 방을 옮겨도 방향키가 이어짐
 *   L4 계단 표시: 다락 · 위층 모두 밤엔 켜짐 · 낮엔 꺼짐 · 20시 등불 0 에서 계단 칸의 루마 대비 ≥ 바닥값 · 위층 다녀와도 셰이더 프로그램 그대로
 *   L8 덧붙임 (11-19 검증) 울타리 밖에서 집 문으로: 울타리 문 바로 밖 (s 6.5) 에서만 문을 거쳐 걸어 들어오고 · 멀리서 (길 끝) 는 걷지 않고 바로 넘어간다 (앱의 goRoom 2 s 안 — 예전 11 s)
 * 시간에 기대지 않는다: 저장을 심고(__ppolLook · __ppolTest), setTime(h, true) 로 바로 바꾸고, 상태를 기다린다.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ok   ' + msg); } else { fails++; console.error('  FAIL ' + msg); } }

/* 재어 둔 값 (11-15, 360×740 · swiftshader): 예전 → 지금. 바닥값은 지금 값에서 여유를 뺐다 */
var ROOM_BAND = [0, 90, 360, 520];   /* 360×740 에서 방이 그려지는 띠 (위 막대·아래 말풍선·단추 빼고) */
/* 예전 → 지금 (등불 0 · 20시 · 맑음/비 같음): 다락 계단 칸 p95−p50 0.032 → 0.726 (초롱) · 위층 구멍 칸 루마 > 0.6 인 화소 0 → 136 (띠 · 초롱; 22시 184) · 다락 20시 등불 3 띠 평균 0.117 → 0.147 */
/* 11-18 계단을 왼벽 앞쪽 구석으로 옮긴 뒤: 기본 구도에선 계단이 왼쪽 가장자리 밖이라 (단추는 가장자리의 계단 그림 단추) 계단이 온전히 보이는 90° 에서 계단 상자 전체 (57×145) 를 잰다.
   상자가 커져 초롱은 5% 가 안 된다 → p95 는 띠 색 (0.426), p50 은 어두운 나무 (0.133): 0.293. 띠가 없던 예전엔 0.03 대 */
var FLOOR = { roomL20: 0.135, stairSpread: 0.22, loftBright: 60 };

function rec(lv) {
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z';
  return { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: lv, days: ['2026-11-06', '2026-11-07', '2026-11-08'].slice(0, Math.max(1, Math.min(3, lv))), affinity: {}, visits: {}, state: 'idle', color: RED,
    colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: lv, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
    settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
}
async function open(browser, lv, look, vp, q) {   /* vp = [폭, 높이] (기본 360×740) · q = 주소 뒤에 붙일 것 ('&wide=1') */
  var ctx = await browser.newContext({ viewport: { width: vp ? vp[0] : 360, height: vp ? vp[1] : 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { ok(false, 'pageerror: ' + e.message); });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 0; if (!localStorage.getItem("__seed")) { localStorage.setItem("__seed", "1"); localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(rec(lv))) + '); }' +
    'window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = ' + JSON.stringify(look) + ';' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0' + (q || ''));
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.waitForFunction(function () { return window.APP && APP.scene && !APP.goResting; }, null, { timeout: 30000 });
  return { ctx: ctx, page: page };
}
async function at(page, h) { await page.evaluate(function (h) { APP.scene.setTime(h, true); }, h); await page.waitForTimeout(400); }
async function shot(page) { var f = path.join(os.tmpdir(), 'ppol-light-' + process.pid + '.png'); await page.screenshot({ path: f, timeout: 120000 }); var img = LM.decodePNG(f); fs.unlinkSync(f); return img; }
function region(img, r) {   /* r = [l, t, r, b] → { mean, std, p50, p95 } 루마 (0..1) · bright = 루마 > 0.6 화소 수 */
  var s = 0, s2 = 0, n = 0, all = [], hi = 0;
  for (var y = Math.max(0, r[1] | 0); y < Math.min(img.h, r[3] | 0); y++) for (var x = Math.max(0, r[0] | 0); x < Math.min(img.w, r[2] | 0); x++) {
    var i = (y * img.w + x) * img.bpp, l = (0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]) / 255; s += l; s2 += l * l; n++; all.push(l); if (l > 0.6) hi++;
  }
  all.sort(function (a, b) { return a - b; });
  var m = n ? s / n : 0; return { mean: m, std: n ? Math.sqrt(Math.max(0, s2 / n - m * m)) : 0, p50: n ? all[(n * 0.5) | 0] : 0, p95: n ? all[(n * 0.95) | 0] : 0, bright: hi };
}
function rectOf(page, sel) { return page.evaluate(function (sel) { var e = document.querySelector(sel); if (!e || e.hidden) return null; var q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; }, sel); }

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    /* ── L1 · L2 ── */
    var o = await open(browser, 0, { hour: 22, weather: 'clear' }), page = o.page;
    var L1 = await page.evaluate(function () {
      var hs = [], ks = [], keys = [];
      for (var m = 18 * 60 + 45; m <= 21 * 60 + 15; m += 5) { var h = m / 60; hs.push(h); ks.push(SCENE3D.duskBlend(h)); keys.push(SCENE3D.lightKey(h)); }
      var q = []; for (var i = 0; i <= 8; i++) q.push(SCENE3D.duskBlend(19 + i / 4));
      return { hs: hs, ks: ks, keys: keys, q: q, pre: SCENE3D.duskBlend(18.99), mid: SCENE3D.duskBlend(19.24), late: SCENE3D.duskBlend(23), early: SCENE3D.duskBlend(3), day: SCENE3D.duskBlend(12) };
    });
    ok(L1.q.every(function (v, i) { return Math.abs(v - i / 8) < 1e-9; }), 'L1 노을→밤 섞기: 19:00 · 19:15 … 21:00 = 0, 1/8 … 1 (' + L1.q.join(', ') + ')');
    ok(L1.pre === 0 && L1.mid === 0 && L1.late === 1 && L1.early === 1 && L1.day === 0, 'L1 19시 전 0 (툭 바뀌지 않음) · 19:14 는 아직 첫 칸 · 23시 · 3시 1 · 낮 0');
    ok(L1.ks.every(function (v, i) { return !i || v >= L1.ks[i - 1]; }), 'L1 18:45 → 21:15 단조 증가');
    var distinct = L1.keys.filter(function (k, i) { return !i || k !== L1.keys[i - 1]; });
    ok(distinct.length === 10, 'L1 조명 열쇠: 노을 → 8칸 (dn0 … dn7) → 밤 = 10 묶음 (' + distinct.join(' ') + ')');
    var dn0 = await page.evaluate(function () { APP.scene.setTime(18.9, true); var a = APP.scene.stats(); APP.scene.setTime(19.0, true); var b = APP.scene.stats(); return { a: a.em, b: b.em, ka: a.lightKey, kb: b.lightKey }; });
    ok(dn0.a === dn0.b && dn0.ka === 'dusk' && dn0.kb === 'dn0', 'L1 18:54 → 19:00 장면 em 그대로 (' + dn0.a + ' → ' + dn0.b + ') — 19시에 밤으로 툭 넘어가지 않는다');
    var emb = [];
    for (var eh of [19.25, 19.5, 20, 20.5]) { await at(page, eh); emb.push(await page.evaluate(function () { return APP.scene.stats().lampI; })); }   /* applyLamp 은 다음 프레임에 (lampDirty) */
    ok(emb.every(function (v, i) { return v > 0 && (!i || v >= emb[i - 1]); }), 'L2 등불 0칸 불씨: 19:15 부터 켜지고 섞기 따라 커진다 (' + emb.join(', ') + ')');
    await at(page, 22);
    var s22 = await page.evaluate(function () { return APP.scene.stats(); });
    ok(s22.lampBase === 1.5 && s22.lampD === 7.5, 'L2 22시 밤 등불 세기 1.5 · 거리 7.5 (장면 ' + s22.lampBase + ' · ' + s22.lampD + ')');
    ok(s22.moonHemi === 0.48 && Math.abs(s22.hemiNow - 0.48) < 0.005, 'L2 달빛 바닥 0.48 · 등불 0칸 22시 헤미 = ' + s22.hemiNow);
    /* L4 계단 표시 켜짐/꺼짐 (다락) */
    ok(s22.cueAttic === true && s22.cueK === 1, 'L4 22시 다락 계단 표시 켜짐');
    await at(page, 12);
    var s12 = await page.evaluate(function () { return APP.scene.stats(); });
    ok(s12.cueAttic === false && s12.cueK === 0, 'L4 12시 다락 계단 표시 꺼짐 (낮 모습 그대로)');
    await at(page, 7);
    ok((await page.evaluate(function () { return APP.scene.stats().cueAttic; })) === false, 'L4 7시 (새벽) 계단 표시 꺼짐');
    /* L4 계단 칸 대비 20시 · 등불 0 · 맑음 */
    await at(page, 20);
    await page.evaluate(function () { APP.scene.setYaw(90, true); }); await page.waitForTimeout(500);   /* 11-18: 계단이 왼벽 앞쪽 구석으로 옮겨 가 기본 구도에선 왼쪽 가장자리 밖이다 → 계단이 온전히 보이는 각 (90°) 에서 잰다 */
    var srMode = await page.evaluate(function () { return document.getElementById('btn-stair').dataset.spot; });
    var sr = srMode === 'over' ? await rectOf(page, '#btn-stair') : null, img = await shot(page), st = sr && region(img, sr);   /* 그림 위 단추 (over) 일 때만 잰다 */
    await page.evaluate(function () { APP.scene.setYaw(0, true); }); await page.waitForTimeout(300);
    ok(!!st && st.p95 - st.p50 >= FLOOR.stairSpread, 'L4 20시 등불 0 다락 계단 칸 루마 대비 p95−p50 ' + (st ? (st.p95 - st.p50).toFixed(3) : '없음') + ' ≥ ' + FLOOR.stairSpread + ' (예전 0.032)');
    /* 위층: 표시 켜짐/꺼짐 · 대비 · 셰이더 그대로 */
    var prog0 = (await page.evaluate(function () { return APP.scene.stats(); })).programs;
    var gr = await page.evaluate(function () { return APP.goRoom('loft'); });
    await page.waitForFunction(function () { return APP.room === 'loft' && APP.scene.stats().view === 'loft'; }, null, { timeout: 30000 });
    await at(page, 20);
    var ls = await page.evaluate(function () { return APP.scene.stats(); });
    ok(gr.ok && ls.cueLoft === true, 'L4 20시 위층 계단 구멍 표시 켜짐');
    var lr = await rectOf(page, '#btn-loft-stair'), limg = await shot(page), lst = lr && region(limg, lr);
    ok(!!lst && lst.bright >= FLOOR.loftBright, 'L4 20시 등불 0 위층 계단 구멍 칸 밝은 화소 ' + (lst ? lst.bright : '없음') + ' ≥ ' + FLOOR.loftBright + ' (예전 0)');
    await at(page, 12);
    ok((await page.evaluate(function () { return APP.scene.stats().cueLoft; })) === false, 'L4 12시 위층 계단 구멍 표시 꺼짐');
    await page.evaluate(function () { return APP.goRoom('attic'); });
    await page.waitForFunction(function () { return APP.scene.stats().view === 'attic'; }, null, { timeout: 30000 });
    await at(page, 22);
    var prog1 = (await page.evaluate(function () { return APP.scene.stats(); })).programs;
    ok(prog1 === prog0, 'L4 위층을 다녀와도 셰이더 프로그램 그대로 (' + prog0 + ' → ' + prog1 + ')');
    await o.ctx.close();

    /* ── L3 20시 · 등불 3 · 맑음: 다락 평균 루마 ── */
    o = await open(browser, 3, { hour: 20, weather: 'clear' }); page = o.page;
    await at(page, 20);
    var rimg = await shot(page), rl = region(rimg, ROOM_BAND);
    ok(rl.mean >= FLOOR.roomL20, 'L3 20시 등불 3 맑음 다락 평균 루마 ' + rl.mean.toFixed(4) + ' ≥ ' + FLOOR.roomL20 + ' (예전 0.117)');
    await o.ctx.close();

    /* ── L5 (11-18) 다락 계단 단추 · 톡해서 걸어갈 때 화면이 따라옴 · 내려오면 계단이 보임 · 방을 옮겨도 방향키가 이어짐 ── */
    o = await open(browser, 8, { hour: 13, weather: 'clear' }); page = o.page;
    var e5 = await page.evaluate(function () {
      var b = document.getElementById('btn-stair'), r = b.getBoundingClientRect(), st = document.getElementById('stick').getBoundingClientRect(), sf = document.getElementById('btn-sofa'), sr = sf && !sf.hidden ? sf.getBoundingClientRect() : null, bx = { width: b.querySelectorAll('*').length }, k = APP.scene.pickAt(r.left + r.width / 2, r.top + r.height / 2);
      function hit(a, c) { return !!c && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom; }
      return { hidden: b.hidden, spot: b.dataset.spot, side: b.dataset.side, w: r.width, h: r.height, left: r.left, top: r.top, box: bx.width, ico: !!b.querySelector('svg'), stick: hit(r, st), sofa: hit(r, sr), label: b.getAttribute('aria-label'), pe: getComputedStyle(b).pointerEvents, bg: getComputedStyle(b).backgroundColor, pick: k ? k.id : '', sw: document.documentElement.scrollWidth, iw: innerWidth };
    });
    /* 11-21 (주인: "문 근처에 가면 계단 버튼이 떠서 어색해"): 가장자리의 계단 그림 단추는 없다. 계단이 화면 밖인 동안 단추는 왼쪽 가장자리의 안 보이는 칸 (data-spot="key") —
       키보드 · 낭독기만 닿는다 (그림 · 바탕 없음 · 손가락은 못 누른다: 그 자리를 톡 해도 계단이 아니다). 손가락은 화면을 밀어 보이는 계단 그림을 누른다 */
    ok(!e5.hidden && e5.spot === 'key' && e5.w >= 44 && e5.h >= 44 && e5.left >= 0 && e5.left <= 4 && e5.box === 0 && !e5.ico && e5.pe === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(e5.bg) && e5.pick !== 'atticStair' && !e5.stick && e5.label === '위층으로' && e5.sw <= e5.iw,
      'L5 360px 기본 구도: 계단이 화면 밖이면 계단 단추는 안 보이는 키보드 칸 (그림 없음 · 손가락은 못 누름 · 스틱과 안 겹침 · 가로 스크롤 없음) ' + JSON.stringify({ spot: e5.spot, at: [e5.left, e5.top], w: e5.w, pe: e5.pe, pick: e5.pick }));
    await page.touchscreen.tap(e5.left + e5.w / 2, e5.top + e5.h / 2); await page.waitForTimeout(900);
    var k5 = await page.evaluate(function () { var m = APP.scene.motion(); return { room: APP.room || '', dq: m.dq, trans: !!m.trans }; });
    ok(!k5.room && k5.dq === '' && !k5.trans, 'L5 안 보이는 칸 자리를 톡 해도 위층으로 가지 않는다 ' + JSON.stringify(k5));
    /* 화면을 오른쪽으로 밀면 (한 손가락) 계단이 보이고 그림 위 단추 (over) 가 된다 → 보이는 디딤판을 톡 */
    await page.waitForTimeout(1200);
    var cdp5 = await page.context().newCDPSession(page);
    await cdp5.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 330, id: 0 }] });
    for (var s5 = 1; s5 <= 12; s5++) { await cdp5.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 + 15 * s5, y: 330, id: 0 }] }); await page.waitForTimeout(16); }
    await cdp5.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp5.detach(); await page.waitForTimeout(800);
    var v5 = await page.evaluate(function () {
      var b = document.getElementById('btn-stair'), q = b.getBoundingClientRect(), pt = null, n = 0;
      for (var y = q.top + 2; y < q.bottom; y += 4) for (var x = q.left + 2; x < q.right; x += 4) { var k = APP.scene.pickAt(x, y); if (k && k.id === 'atticStair') { n++; if (!pt || x > pt.x) pt = { x: x, y: y }; } }
      return { spot: b.hidden ? 'hidden' : b.dataset.spot, w: q.width, n: n, pt: pt };
    });
    ok(v5.spot === 'over' && v5.w >= 44 && v5.n > 20 && !!v5.pt, 'L5 화면을 밀면 계단이 보이고 (그림 위 단추 · 폭 ' + Math.round(v5.w) + ' px) 디딤판이 눌린다 (' + v5.n + ' 점)');
    await page.touchscreen.tap(v5.pt ? v5.pt.x : 80, v5.pt ? v5.pt.y : 300);
    var w5 = { minX: 1e9, n: 0, up: false };
    for (var i5 = 0; i5 < 150 && !w5.up; i5++) {
      await page.waitForTimeout(80);
      var q5 = await page.evaluate(function () { var p = APP.scene.player(), m = APP.scene.motion(), s = APP.scene.screenOf(p.at[0], 0.6, p.at[2]); return { x: s ? s.x : null, room: APP.room, trans: !!m.trans, dq: m.dq, walking: p.walking }; });
      if (!q5.room && !q5.trans && q5.walking && q5.x !== null) { w5.n++; if (q5.x < w5.minX) w5.minX = q5.x; }
      if (q5.room === 'loft' && !q5.trans && q5.dq === '') w5.up = true;
    }
    ok(w5.up && w5.n > 3 && w5.minX >= 20, 'L5 보이는 계단 톡 → 걸어가 오른다 · 걷는 동안 화면이 따라와 캐릭터가 화면 안 (가장 왼쪽 ' + Math.round(w5.minX) + ' px ≥ 20 · ' + w5.n + ' 프레임)');
    await page.waitForTimeout(700);
    await page.evaluate(function () { return APP.goRoom('attic'); });
    await page.waitForFunction(function () { var m = APP.scene.motion(); return !APP.room && !m.trans && m.dq === ''; }, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    var d5 = await page.evaluate(function () { var b = document.getElementById('btn-stair'), p = APP.scene.player(), s = APP.scene.screenOf(p.at[0], 0.6, p.at[2]), a = APP.scene.doorAnchors.atticStair; return { spot: b.hidden ? 'hidden' : b.dataset.spot, x: s.x, at: p.at, a: a }; });
    ok(d5.spot === 'over' && d5.x >= 20 && Math.abs(d5.at[0] - d5.a[0]) < 0.05 && Math.abs(d5.at[2] - d5.a[2]) < 0.05, 'L5 위층에서 내려오면 계단 발치에 서고 계단이 화면에 보인다 (단추는 계단 그림 위 · 캐릭터 ' + Math.round(d5.x) + ' px) ' + JSON.stringify({ spot: d5.spot, at: d5.at }));
    /* 방향키를 쥔 채 놀이방 문을 지나면 도착해서 그대로 걷는다 (놓았다 다시 누르지 않아도) */
    await page.evaluate(function () { var a = APP.scene.doorAnchors.atticPlayDoor; APP.scene.debugPlayerAt(a[0] - 0.9, a[2]); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    await page.waitForTimeout(200);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowDown');   /* 화면 오른쪽 + 아래 = 월드 +x (문 쪽) */
    var kp5 = await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'play' && !m.trans && m.dq === '' && APP.scene.playerInputAllowed(); }, null, { timeout: 20000 }).then(function () { return true; }, function () { return false; });
    await page.waitForTimeout(400);
    var k5 = await page.evaluate(function () { var p = APP.scene.player(); return { room: APP.room, input: p.input, walking: p.walking, keys: APP.stick.keys.length }; });
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(200);
    var k6 = await page.evaluate(function () { return { input: APP.scene.player().input, keys: APP.stick.keys.length }; });
    ok(kp5 && k5.room === 'play' && !!k5.input && k5.walking && k5.keys === 2 && k6.input === null && k6.keys === 0, 'L5 방향키를 쥔 채 놀이방 문을 지나면 도착해서 그대로 걷는다 · 놓으면 멈춘다 ' + JSON.stringify({ arrive: k5, off: k6 }));
    await o.ctx.close();

    /* ── L6 (11-18 검증) 쥔 채로 들어온 문으로 되튀지 않는다 — 60 fps 걸음으로 (느린 프레임에선 안 드러난다): 마당 현관에서 위쪽 (−x−z) 만 쥐고 집에 들어가면
          이어 걷는 방향이 다락 쪽 마당 문 조건 (−z) 에도 맞아, 예전엔 0.2 s 뒤 다시 마당으로 나갔다 ── */
    o = await open(browser, 8, { hour: 13, weather: 'clear' }); page = o.page;
    await page.evaluate(function () { return APP.goRoom('yard'); });
    await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
    await page.waitForTimeout(500);
    await page.evaluate(function () { APP.scene.debugPlayerAt(0.95, -1.1); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); APP.scene.debugStep(1 / 60); APP.scene.debugStep(1 / 60); });
    await page.keyboard.down('ArrowUp');
    var seq6 = [], last6 = null;
    for (var i6 = 1; i6 <= 420; i6++) {
      var v6 = await page.evaluate(function () { APP.scene.debugStep(1 / 60); return APP.scene.view(); });
      if (v6 !== last6) { seq6.push([v6, i6]); last6 = v6; }
      if (seq6.length >= 3 || (seq6.length === 2 && i6 - seq6[1][1] > 200)) break;
    }
    await page.keyboard.up('ArrowUp');
    ok(seq6.length === 2 && seq6[0][0] === 'yard' && seq6[1][0] === 'attic', 'L6 마당에서 위쪽을 쥔 채 집에 들어가면 다락에 머문다 (다시 마당으로 되튀지 않음 · 60 fps) ' + JSON.stringify(seq6));
    await o.ctx.close();

    /* ── L7 (11-18) 톡 격자 — 계단 디딤판 위 7×5 점 · 뒷벽 문간 (x 1.5~2.4) 위 7×7 점을 화면에 내려 그 자리를 장면에 묻는다 (pickAt: 누르지는 않는다).
          계단이 마당 문 옆 (뒷벽 오른쪽 구석) 이던 때는 계단을 눌러도 마당 문으로 갔다 (다른 세션 점검 J3) → 계단을 왼벽 앞쪽 구석으로 옮긴 뒤 둘이 화면에서 겹치지 않는다.
          뒤에서 보면 (180°) 계단 맨 아래 칸은 소파 등받이에 가려 있다 — 그 두 점은 소파 몫이라 계단 비율의 바닥값은 0.85 ── */
    var grid7 = function () {
      var sc = APP.scene, cv = document.querySelector('canvas'), cr = cv.getBoundingClientRect(), co = cv.parentElement.getBoundingClientRect(), a = sc.doorAnchors.atticStair;
      var X1 = a[0] - 0.32, X0 = X1 - 0.82, Z0 = a[2] - 0.33, Z1 = a[2] + 0.33, TOP = 2.5, sp = [], dp = [], i, j;
      for (i = 0; i < 7; i++) for (j = 0; j < 5; j++) sp.push([X1 - (i + 0.5) * (X1 - X0) / 7, (i + 1) * TOP / 7, Z0 + (j + 0.5) * (Z1 - Z0) / 5]);
      for (i = 0; i < 7; i++) for (j = 0; j < 7; j++) dp.push([1.55 + i * 0.8 / 6, 0.15 + j * 1.2 / 6, -2.5]);
      function tally(pts) { var t = { n: 0, stair: 0, yard: 0, none: 0 }; pts.forEach(function (p) { var s = sc.screenOf(p[0], p[1], p[2]), x = co.left + s.x, y = co.top + s.y; if (x < cr.left + 2 || x > cr.right - 2 || y < cr.top + 2 || y > cr.bottom - 2) return; var k = sc.pickAt(x, y), id = k ? k.id : ''; t.n++; if (id === 'atticStair') t.stair++; else if (id === 'atticYard') t.yard++; else if (!id) t.none++; }); return t; }
      return { stair: tally(sp), door: tally(dp), spot: document.getElementById('btn-stair').dataset.spot || '' };
    };
    o = await open(browser, 8, { hour: 13, weather: 'clear' }); page = o.page;
    var g7 = {};
    for (var y7 of [0, 90, 180]) { await page.evaluate(function (y) { APP.scene.setYaw(y, true); }, y7); await page.waitForTimeout(500); g7[y7] = await page.evaluate(grid7); }
    await o.ctx.close();
    o = await open(browser, 8, { hour: 13, weather: 'clear' }, [412, 915]); page = o.page;
    await page.waitForTimeout(400); var g7w = await page.evaluate(grid7);
    await o.ctx.close();
    var all7 = [g7[0], g7[90], g7[180], g7w];
    ok(all7.every(function (g) { return g.stair.yard === 0 && g.door.stair === 0; }), 'L7 계단 위 톡이 마당 문으로 가는 것 0 · 문간 위 톡이 계단으로 가는 것 0 (360 폭 0° · 90° · 180° · 412 폭 0°) ' + JSON.stringify(all7.map(function (g) { return [g.stair.yard, g.door.stair]; })));
    ok(all7.every(function (g) { return g.door.n > 0 && g.door.yard >= g.door.n * 0.95; }), 'L7 뒷벽 문간 위 톡 → 마당 문 ≥ 95% ' + JSON.stringify(all7.map(function (g) { return g.door.yard + '/' + g.door.n; })));
    ok(g7[90].spot === 'over' && g7[90].stair.n === 35 && g7[90].stair.stair >= 34, 'L7 계단이 온전히 보일 때 (90°) 계단 위 톡 → 계단 ' + g7[90].stair.stair + '/' + g7[90].stair.n + ' (≥ 95%)');
    ok(g7[180].spot === 'key' && g7[180].stair.n >= 10 && g7[180].stair.stair >= g7[180].stair.n * 0.85, 'L7 계단이 가장자리에 걸친 동안 (360 폭 180° · 단추는 안 보이는 키보드 칸) 에도 보이는 계단 위 톡 → 계단 ' + g7[180].stair.stair + '/' + g7[180].stair.n + ' (≥ 85% · 맨 아래 칸은 소파 뒤 — 예전 0)');
    ok(g7w.spot === 'key' && g7w.stair.n >= 5 && g7w.stair.stair === g7w.stair.n, 'L7 412 폭 기본 구도: 왼쪽 가장자리에 걸친 계단 위 톡 → 계단 ' + g7w.stair.stair + '/' + g7w.stair.n + ' (예전 0)');

    /* ── L8 (11-18 시험판) 넓은 바깥 — 주소에 ?wide=1 이 있을 때만. 스틱 값은 화면 축 (오른쪽 +x · 위 +y): 아래 (0, −1) = 월드 (+x, +z) = 앞 모서리 쪽 · (0.707, −0.707) = 월드 +x.
          대각 좌표 s = (x + z)/√2 (화면 아래) · t = (x − z)/√2 (화면 오른쪽). 프레임은 0.1 s 씩 손으로 민다 (소프트웨어 렌더가 밀리지 않게 적게) ── */
    var yardGo = async function (pg) {
      await pg.evaluate(function () { return APP.goRoom('yard'); });
      await pg.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
      await pg.waitForTimeout(500);
    };
    var corners8 = async function (pg) {   /* 장면 네 구석의 평균 루마 (위 막대 · 아래 단추 · 조개 표 · 스틱 자리를 피해 조금 안쪽) — 허공은 0.05 아래, 낮의 풀은 0.4 위 */
      var im = await shot(pg); return [[8, 150, 40, 190], [300, 150, 340, 190], [8, 560, 40, 600], [150, 610, 180, 640]].map(function (r) { return +region(im, r).mean.toFixed(3); });
    };
    o = await open(browser, 8, { hour: 13, weather: 'clear' }); page = o.page;
    await yardGo(page);
    var offY = await page.evaluate(function () { var sc = APP.scene, r = []; function p() { var q = sc.pan(); r.push(q.x, q.y); } sc.debugSim(0.1, 2); sc.setYaw(90, true); sc.debugSim(0.05, 3); p(); sc.zoomStep(1); sc.debugSim(0.05, 3); p(); sc.zoomStep(0); sc.setYaw(0, true); sc.debugSim(0.05, 3); p(); return r; });
    ok(offY.length === 6 && offY.every(function (v) { return v === 0; }), 'L8 켜지 않으면 돌려 보기 · 키우기에도 밀기 값은 0 그대로 ' + JSON.stringify(offY));
    var off8 = await page.evaluate(function () { var sc = APP.scene; sc.debugPlayerAt(3.6, 3.6); sc.setPlayerInput({ x: 0, y: -1 }); sc.debugSim(0.1, 30); sc.setPlayerInput(null); sc.debugStep(0.1); return { on: sc.wide().on, at: sc.player().at }; });
    var offC = await corners8(page);
    ok(off8.on === false && off8.at[0] <= 3.96 && off8.at[2] <= 3.96 && Math.min.apply(null, offC) < 0.08, 'L8 켜지 않으면 마당은 예전 그대로: 앞 모서리에서 더 못 나가고 (' + off8.at[0] + ', ' + off8.at[2] + ') 받침 밖은 허공 (구석 루마 ' + JSON.stringify(offC) + ')');
    /* ── L9 (11-18 검증) 마당 어디서 집 문을 톡해도 (playerWalkTo('yardAttic')) 계단 발치를 거쳐 통로로 올라 문 앞에 선다.
          예전엔 길 찾기가 처음 걸리는 상자 하나만 돌아, 왼쪽 절반 · 집 뒤에서는 현관 옆이나 뒷벽에 걸린 채 '도착' 으로 치고 그 자리에서 집 안으로 넘어갔다.
          1.3 m 격자에서 걸어서 설 수 있는 자리만: 여덟 방향으로 세 걸음 나갔다 그대로 되돌아와지는 곳 (장애물 둘레 안에 놓인 자리는 나갈 수만 있고 못 되돌아온다) ── */
    var d9 = await page.evaluate(async function () {
      var sc = APP.scene, A = sc.doorAnchors.yardAttic, rows = [], tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
      function stand(x, z) {   /* 세 걸음 (0.33 m) 을 다 나간 방향만 본다 — 벽에 막혀 덜 나간 방향은 되돌아올 때 지나쳐서 가릴 수 없다 */
        var full = 0;
        for (var k = 0; k < 8; k++) {
          var ix = Math.cos(k * Math.PI / 4), iy = Math.sin(k * Math.PI / 4);
          sc.debugPlayerAt(x, z); sc.setPlayerInput({ x: ix, y: iy }); sc.debugSim(0.05, 3); var a = sc.player().at, went = Math.hypot(a[0] - x, a[2] - z);
          sc.setPlayerInput({ x: -ix, y: -iy }); sc.debugSim(0.05, 3); sc.setPlayerInput(null); a = sc.player().at;
          if (went >= 0.3) { full++; if (Math.hypot(a[0] - x, a[2] - z) > 0.05) return false; }
        }
        return full >= 4;
      }
      var spots = [];   /* 설 수 있는 자리를 먼저 다 고른다 — 걸음 사이에 스틱을 넣지 않게 (문 앞에 선 뒤의 스틱 입력은 앱의 문 작업을 부를 수 있다) */
      for (var xi = -3; xi <= 3; xi++) for (var zi = -3; zi <= 3; zi++) {
        var sx = xi * 1.3, sz = zi * 1.3;
        if (sx > -2.7 && sx < 1.6 && sz > -2.5 && sz < 0.4) continue;   /* 집 · 현관 */
        if (stand(sx, sz)) spots.push([sx, sz]);
      }
      for (var si = 0; si < spots.length; si++) {
        var x = spots[si][0], z = spots[si][1];
        sc.debugPlayerAt(x, z); sc.debugSim(0.05, 1);
        var done = null, f = 0, foot = false; sc.playerWalkTo('yardAttic').then(function (q) { done = q; });
        for (; f < 400 && !done; f++) { sc.debugSim(0.05, 1); var p = sc.player().at; if (p[0] > A[0] + 1.0 && Math.abs(p[2] - A[2]) < 0.36) foot = true; if (f % 8 === 7) await tick(); }
        await tick();
        var e = sc.player().at; rows.push([+x.toFixed(1), +z.toFixed(1), +(f * 0.05).toFixed(1), +Math.hypot(e[0] - A[0], e[2] - A[2]).toFixed(2), foot]);
      }
      return rows;
    });
    var miss9 = d9.filter(function (q) { return q[3] > 0.1 || !q[4]; }), left9 = d9.filter(function (q) { return q[0] <= 0; }).length, back9 = d9.filter(function (q) { return q[0] < -2.65 && q[1] < 0.4; }).length;
    ok(d9.length >= 20 && left9 >= 8 && back9 >= 1 && miss9.length === 0 && Math.max.apply(null, d9.map(function (q) { return q[2]; })) <= 9,
      'L9 마당 ' + d9.length + ' 자리 (왼쪽 절반 ' + left9 + ' · 집 뒤 ' + back9 + ') 어디서 집 문을 톡해도 계단 발치를 거쳐 문 앞에 선다 (가장 긴 걸음 ' + Math.max.apply(null, d9.map(function (q) { return q[2]; })) + ' s' + (miss9.length ? ' · 못 닿은 자리 [x, z, 초, 남은 m, 발치] ' + JSON.stringify(miss9) : '') + ')');
    /* 집 뒤 (현관 통로와 같은 z 띠) 에서 서쪽 (−x) 으로 밀어도 집 안으로 넘어가지 않는다 — 문 조건에 x 아래 끝이 없어 넘어갔다 (스틱 (−0.707, 0.707) = 월드 −x) */
    var b9 = await page.evaluate(async function () {
      var sc = APP.scene, A = sc.doorAnchors.yardAttic;
      sc.debugPlayerAt(-3.3, A[2] - 0.2); sc.debugSim(0.05, 2);
      sc.setPlayerInput({ x: -0.707, y: 0.707 }); sc.debugSim(0.05, 12); var mid = sc.playerInputAllowed(); sc.setPlayerInput(null); sc.debugSim(0.05, 4);
      await new Promise(function (r) { setTimeout(r, 50); }); sc.debugSim(0.05, 10);
      return { mid: mid, allowed: sc.playerInputAllowed(), view: sc.view(), room: APP.room, at: sc.player().at.map(function (v) { return +v.toFixed(2); }) };
    });
    ok(b9.mid && b9.allowed && b9.view === 'yard' && b9.room === 'yard' && b9.at[0] < -3.3, 'L9 집 뒤에서 서쪽으로 밀어도 집 안으로 넘어가지 않는다 (문 작업 없음 · 그대로 마당 ' + JSON.stringify(b9) + ')');
    await o.ctx.close();
    o = await open(browser, 8, { hour: 13, weather: 'clear' }, null, '&wide=1'); page = o.page;
    await yardGo(page);
    var homeC = await corners8(page);
    var w8 = await page.evaluate(function () {
      var sc = APP.scene, K = Math.SQRT1_2, r = { on: sc.wide().on, S1: sc.wide().S1, T: sc.wide().T }, st0 = sc.stats();
      function push(x, y, n) { sc.setPlayerInput({ x: x, y: y }); sc.debugSim(0.1, n); sc.setPlayerInput(null); sc.debugStep(0.1); return sc.player().at; }   /* 걷는 동안은 그리지 않고 민다 (debugSim) · 멈춘 뒤 한 프레임만 그린다 */
      function st(a) { return [+((a[0] + a[2]) * K).toFixed(2), +((a[0] - a[2]) * K).toFixed(2)]; }
      function scr() { var a = sc.player().at, q = sc.screenOf(a[0], 0.6, a[2]); return [Math.round(q.x), Math.round(q.y)]; }
      r.calls0 = st0.calls; r.prog0 = st0.programs;
      sc.debugPlayerAt(3.6, 1.0); r.fence = push(0.707, -0.707, 25);                       /* 오른쪽 변의 울타리로 민다 → 마당 안 */
      sc.debugPlayerAt(3.6, 3.6); r.out = st(push(0, -1, 50)); r.outScr = scr();          /* 앞 모서리의 문으로 나가 길을 따라 6 m */
      r.side = st(push(1, 0, 45)); r.sideScr = scr();                                      /* 띠의 오른쪽 끝까지 */
      r.end = st(push(0, -1, 90)); r.endScr = scr();                                       /* 길 끝까지 */
      var p0 = scr(); sc.setYaw(120, true); sc.debugSim(0.1, 3); sc.debugStep(0.1); r.turn = [p0, scr()]; sc.setYaw(0, true); sc.debugSim(0.1, 3); sc.debugStep(0.1); r.back = scr();
      var st1 = sc.stats(); r.calls1 = st1.calls; r.prog1 = st1.programs; r.trees = sc.wide().trees; r.vh = innerHeight; r.vw = innerWidth;
      return r;
    });
    var pathC = await corners8(page);
    ok(w8.on === true && Math.min.apply(null, homeC) > 0.25 && Math.min.apply(null, pathC) > 0.25, 'L8 넓은 바깥: 땅이 화면 네 구석까지 (집 앞 ' + JSON.stringify(homeC) + ' · 길 끝 ' + JSON.stringify(pathC) + ' — 허공이면 0.05 아래)');
    ok(w8.fence[0] <= 3.96, 'L8 울타리는 못 지나간다 (오른쪽 변으로 밀어도 x ' + w8.fence[0] + ' ≤ 3.95)');
    ok(w8.out[0] > 10 && Math.abs(w8.out[1]) < 0.3 && w8.outScr[1] > 90 && w8.outScr[1] < w8.vh - 230, 'L8 앞 모서리의 문으로 나가 길을 걷는다 (s ' + w8.out[0] + ' · t ' + w8.out[1] + ') · 화면이 따라와 캐릭터가 단추들 위에 (y ' + w8.outScr[1] + ')');
    ok(w8.side[1] <= w8.T + 0.02 && w8.side[1] > w8.T - 0.2 && w8.sideScr[0] > 20 && w8.sideScr[0] < w8.vw - 20, 'L8 문 밖 띠의 옆 끝에서 멈춘다 (t ' + w8.side[1] + ' ≤ ' + w8.T + ') · 캐릭터는 화면 안 (x ' + w8.sideScr[0] + ')');
    ok(w8.end[0] <= w8.S1 + 0.02 && w8.end[0] > w8.S1 - 0.3 && w8.endScr[1] > 90 && w8.endScr[1] < w8.vh - 230, 'L8 길 끝에서 멈춘다 (s ' + w8.end[0] + ' ≤ ' + w8.S1 + ') · 캐릭터가 단추들 위에 (y ' + w8.endScr[1] + ')');
    ok(Math.abs(w8.turn[0][0] - w8.turn[1][0]) <= 8 && Math.abs(w8.turn[0][1] - w8.turn[1][1]) <= 8 && Math.abs(w8.turn[0][0] - w8.back[0]) <= 8 && Math.abs(w8.turn[0][1] - w8.back[1]) <= 8, 'L8 길 끝에서 돌려 봐도 (120° · 다시 0°) 캐릭터는 화면 그 자리 ' + JSON.stringify(w8.turn) + ' → ' + JSON.stringify(w8.back));
    ok(w8.calls1 <= 150 && w8.prog1 === w8.prog0 && w8.trees.every(function (t) { return t[0] < t[1]; }), 'L8 드로우콜 ' + w8.calls0 + ' → ' + w8.calls1 + ' (≤ 150) · 셰이더 프로그램 그대로 (' + w8.prog0 + ') · 숲은 보이는 나무만 ' + JSON.stringify(w8.trees));
    /* 11-19 (검증): 길 끝 (울타리 밖 멀리) 에서 집 문으로 — 걷지 않고 바로 풀리고, 앱의 goRoom (집 문 단추 · '산책 갈래?' 가 타는 길) 은 모의 시간 2 s 안에 다락.
       예전엔 울타리 문을 거쳐 11 초를 혼자 걸었고 그동안 입력이 막혔다. 끝나면 다시 마당으로 (장면 루프가 멈춰 있어 손으로 민다) */
    var far8 = await page.evaluate(async function () {
      var sc = APP.scene, r = {}, tick = function () { return new Promise(function (q) { setTimeout(q, 0); }); };
      var p0 = sc.player().at, far = null; sc.playerWalkTo('yardAttic').then(function (q) { far = q; }); await tick();   /* 프레임을 밀기 전에 이미 풀려 있다 */
      r.far = far; r.moved = Math.hypot(sc.player().at[0] - p0[0], sc.player().at[2] - p0[2]); r.walking = sc.player().walking;
      var res = null, f = 0; APP.goRoom('attic').then(function (q) { res = q; }); await tick();
      for (; f < 60 && !(res && sc.view() === 'attic' && sc.playerInputAllowed()); f++) { sc.debugSim(0.1, 1); await tick(); }
      r.go = { res: res, sec: +(f * 0.1).toFixed(1), view: sc.view(), room: APP.room || '', allowed: sc.playerInputAllowed() };
      var back = null; APP.goRoom('yard').then(function (q) { back = q; }); await tick();
      for (var j = 0; j < 100 && !back; j++) { sc.debugSim(0.1, 1); await tick(); }
      sc.debugSim(0.1, 6); await tick(); r.back = !!(back && back.ok) && APP.room === 'yard';
      return r;
    });
    ok(!!far8.far && far8.far.ok === true && far8.far.walked === false && far8.moved < 1e-6 && !far8.walking, 'L8 길 끝 (울타리 밖 멀리) 에서 집 문으로: 걷지 않고 바로 풀린다 ' + JSON.stringify(far8.far));
    ok(!!far8.go.res && far8.go.res.ok === true && far8.go.view === 'attic' && !far8.go.room && far8.go.allowed && far8.go.sec <= 2 && far8.back, 'L8 길 끝에서 앱의 goRoom("attic"): 모의 시간 ' + far8.go.sec + ' s (≤ 2 — 예전 11 s) 안에 다락 · 입력이 돌아온다 · 다시 마당으로 ' + JSON.stringify(far8.go));
    var in8 = await page.evaluate(async function () {   /* 울타리 문 바로 밖 (s 6.5) 에서 집 문 앵커로 걸어가라고 하면 앞 모서리의 문을 거쳐 현관 문 앞까지 (11-19: 멀리서는 걷지 않는다 — 위) */
      var sc = APP.scene, done = false, minGate = 9;
      sc.debugPlayerAt(6.5 * Math.SQRT1_2, 6.5 * Math.SQRT1_2); sc.debugSim(0.1, 1);
      sc.playerWalkTo('yardAttic').then(function (q) { done = !!q && q.ok === true && q.walked === true; });   /* 걸어서 닿았을 때만 */
      for (var i = 0; i < 420 && !done; i++) { sc.debugSim(0.1, 1); var a = sc.player().at; if (a[0] > 3.96 || a[2] > 3.96) { if (a[0] > 3.96 && a[0] < 4.6) minGate = Math.min(minGate, a[2]); if (a[2] > 3.96 && a[2] < 4.6) minGate = Math.min(minGate, a[0]); } await new Promise(function (r) { setTimeout(r, 0); }); }
      return { done: done, at: sc.player().at, a: sc.doorAnchors.yardAttic, minGate: +minGate.toFixed(2), gate: sc.wide().gate };
    });
    ok(in8.done && Math.abs(in8.at[0] - in8.a[0]) < 0.1 && Math.abs(in8.at[2] - in8.a[2]) < 0.1 && in8.minGate > in8.gate + 0.2, 'L8 문 밖에서 집 문으로: 울타리 문을 거쳐 (울타리 줄을 넘은 자리 ' + in8.minGate + ' > 문 기둥 ' + in8.gate + ') 현관 문 앞에 선다 ' + JSON.stringify(in8.at));
    await o.ctx.close();
    /* L8 (11-18 검증) 높은 화면 (768×1024) 에서 길 끝에 서도 화면 아래가 허공이 아니다 — 카메라가 타깃에서 24 m 일 땐 near 평면이 s ≈ 30 에서 땅을 잘라 아래 28 px 가 허공이었다
       (위의 '땅이 화면 네 구석까지' 는 360×740 만 잰다). 장면 아래 끝에서 위로: 11 열 가운데 6 열 넘게 허공 (voidAt) 인 줄의 높이 */
    o = await open(browser, 8, { hour: 13, weather: 'clear' }, [768, 1024], '&wide=1'); page = o.page;
    await yardGo(page);
    var n8 = await page.evaluate(function () {
      var sc = APP.scene, r = document.getElementById('scene3d').getBoundingClientRect(), h = 0;
      sc.debugPlayerAt(3.6, 3.6); sc.setPlayerInput({ x: 0, y: -1 }); sc.debugSim(0.1, 100); sc.setPlayerInput(null); sc.debugSim(0.1, 6);
      for (var y = r.bottom - 1; y > r.top + 60; y -= 2) { var n = 0; for (var i = 0; i <= 10; i++) if (sc.voidAt(r.left + 3 + (r.width - 6) * i / 10, y)) n++; if (n > 5) h += 2; else break; }
      var a = sc.player().at; return { band: h, s: +((a[0] + a[2]) * Math.SQRT1_2).toFixed(2), on: sc.wide().on, h: Math.round(r.height) };
    });
    ok(n8.on === true && n8.s > 16.2 && n8.h > 900 && n8.band === 0, 'L8 높은 화면 (장면 높이 ' + n8.h + ' px) 의 길 끝 (s ' + n8.s + ') 에서 화면 아래 허공 띠 ' + n8.band + ' px (예전 28 — near 평면이 땅을 잘랐다)');
    await o.ctx.close();
    /* 돌려 본 뒤 (11-18 검증): 돌려 보기가 맞춘 밀기 값을 경계가 품는다 → 빈 땅 톡 · 키우기 · 손 떼기에서 화면이 띠 경계 안으로 덜컥 돌아가지 않는다.
       마당에 막 들어선 집 앞에서 가장 크다 (예전: 90° 에서 톡 44 px · 키우기 0.82 m / 두 손가락 135° 를 천천히 — 이동 하나에 프레임 둘 — 돌리면 13 px 흐르고 떼면 32 px 더) */
    o = await open(browser, 8, { hour: 13, weather: 'clear' }, null, '&wide=1'); page = o.page;
    await yardGo(page);
    var t8 = await page.evaluate(function () {
      var sc = APP.scene;
      window.__scr8 = function () { var a = sc.player().at, r = document.getElementById('scene3d').getBoundingClientRect(), q = sc.screenOf(a[0], 0.6, a[2]); return [Math.round(r.left + q.x), Math.round(r.top + q.y)]; };   /* 캐릭터의 화면 자리 (클라이언트 px) */
      sc.debugSim(0.1, 3); var p0 = window.__scr8(); sc.setYaw(90, true); sc.debugSim(0.05, 3); var p1 = window.__scr8(), hit = null;
      [[-70, -60], [70, -60], [-90, 30], [90, 30], [0, -110], [0, 100]].forEach(function (d) {   /* 캐릭터 둘레의 빈 땅 (톡해도 아무 일 없는 곳) */
        var x = p1[0] + d[0], y = p1[1] + d[1], e = document.elementFromPoint(x, y);
        if (!hit && e && /scene3d-canvas/.test(String(e.className)) && !sc.pickAt(x, y)) hit = [x, y];
      });
      return { p0: p0, p1: p1, hit: hit };
    });
    if (t8.hit) await page.touchscreen.tap(t8.hit[0], t8.hit[1]);
    var u8 = await page.evaluate(function () {
      var sc = APP.scene; sc.debugSim(0.05, 12);
      var p2 = window.__scr8(), a = sc.pan(); sc.zoomStep(1); sc.debugSim(0.05, 4); var b = sc.pan();
      sc.zoomStep(0); sc.setYaw(0, true); sc.debugSim(0.05, 4);
      return { p2: p2, m0: [+(a.x / a.n).toFixed(3), +(a.y / a.n).toFixed(3)], m1: [+(b.x / b.n).toFixed(3), +(b.y / b.n).toFixed(3)], p4: window.__scr8() };
    });
    var near8 = function (a, b, d) { return Math.abs(a[0] - b[0]) <= d && Math.abs(a[1] - b[1]) <= d; };
    ok(!!t8.hit && near8(t8.p0, t8.p1, 8) && near8(t8.p1, u8.p2, 8) && near8(u8.m0, u8.m1, 0.08) && near8(t8.p0, u8.p4, 8),
      'L8 돌려 본 뒤 (90°) 빈 땅 톡 · 키우기에도 화면이 덜컥 돌아가지 않는다: 캐릭터 ' + JSON.stringify(t8.p0) + ' → 돌림 ' + JSON.stringify(t8.p1) + ' → 톡 ' + JSON.stringify(u8.p2) + ' (±8 px) · 밀기 ' + JSON.stringify(u8.m0) + ' → 키움 ' + JSON.stringify(u8.m1) + ' m (±0.08) · 다시 0° ' + JSON.stringify(u8.p4));
    var cdp8 = await page.context().newCDPSession(page);
    var fin8 = function (a) { var t = a * Math.PI / 180; return [{ x: 180 + 90 * Math.cos(t), y: 300 + 90 * Math.sin(t), id: 0 }, { x: 180 - 90 * Math.cos(t), y: 300 - 90 * Math.sin(t), id: 1 }]; };   /* 두 손가락이 원을 따라 돈다 (거리 그대로 — 핀치 아님) */
    var q8 = await page.evaluate(function () { var sc = APP.scene; sc.recenter(); sc.debugSim(0.1, 5); return window.__scr8(); }), dev8 = 0, last8 = q8;   /* 밀기 0 · 기본 구도에서 다시 (위 검사가 남긴 자리와 무관하게) */
    await cdp8.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fin8(20) });
    for (var i8 = 1; i8 <= 45; i8++) {
      await cdp8.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fin8(20 + 135 * i8 / 45) });
      last8 = await page.evaluate(function () { APP.scene.debugSim(0.04, 2); return window.__scr8(); });   /* 이동 하나에 프레임 둘 = 각이 안 바뀐 프레임이 사이에 낀다 */
      dev8 = Math.max(dev8, Math.abs(last8[0] - q8[0]), Math.abs(last8[1] - q8[1]));
    }
    await page.waitForTimeout(120);   /* 80 ms 넘게 멈췄다 뗀다 → 돌기 관성 없음 */
    await cdp8.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp8.detach();
    var end8 = await page.evaluate(function () { var sc = APP.scene; sc.debugSim(0.05, 12); return { p: window.__scr8(), yaw: sc.yawInfo().shown }; });
    ok(end8.yaw > 100 && dev8 <= 4 && near8(last8, end8.p, 8), 'L8 두 손가락으로 천천히 돌리고 (' + end8.yaw + '°) 떼도 캐릭터는 화면 그 자리: 돌리는 동안 가장 멀리 ' + dev8 + ' px (≤ 4) · 떼기 직전 ' + JSON.stringify(last8) + ' → 뗀 뒤 ' + JSON.stringify(end8.p) + ' (±8 px)');
    await o.ctx.close();
  } catch (e) {
    fails++; console.error('CRASH ' + (e && e.stack || e));
  } finally { await browser.close(); }
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
