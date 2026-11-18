#!/usr/bin/env node
/* tools/test-light.js — 저녁·밤 밝기 · 계단 표시 회귀 테스트 (11-15, 주인 11-14 "저녁이라 해도 너무 어두워서 조금 더 밝게" · "계단이 어두울 때는 잘 안 보이는데 눈에 띄게")
 *   node tools/test-light.js      → "N passed, M failed", 실패 있으면 exit 1   (Playwright 전역: NODE_PATH=$(npm root -g))
 *   L1 노을 → 밤 섞기: SCENE3D.duskBlend 가 19:00 0 → 15분마다 1/8 → 21:00 1 (8칸, 단조, 19시 전 0 = 툭 바뀌지 않음) · 조명 열쇠도 8번 바뀐다
 *   L2 22시 장면: 밤 등불 세기 1.5 · 닿는 거리 7.5 · 달빛 바닥 0.48 (등불 0칸이면 헤미가 그 값)
 *   L3 20시 · 등불 3 · 맑음: 다락 방 띠 평균 루마 ≥ 바닥값 (예전 0.117 · 지금 0.147 — 재어 둔 값에서 여유를 뺀 것)
 *   L5 (11-18) 다락 계단 단추 (가장자리) · 걸음 따라오기 · 내려오면 계단이 보임 · 방을 옮겨도 방향키가 이어짐
 *   L4 계단 표시: 다락 · 위층 모두 밤엔 켜짐 · 낮엔 꺼짐 · 20시 등불 0 에서 계단 칸의 루마 대비 ≥ 바닥값 · 위층 다녀와도 셰이더 프로그램 그대로
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
async function open(browser, lv, look) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { ok(false, 'pageerror: ' + e.message); });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 0; if (!localStorage.getItem("__seed")) { localStorage.setItem("__seed", "1"); localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(rec(lv))) + '); }' +
    'window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = ' + JSON.stringify(look) + ';' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.waitForFunction(function () { return window.APP && APP.scene && !APP.goResting; }, null, { timeout: 30000 });
  return { ctx: ctx, page: page };
}
async function at(page, h) { await page.evaluate(function (h) { APP.scene.setTime(h, true); }, h); await page.waitForTimeout(400); }
async function shot(page) { var f = path.join(os.tmpdir(), 'ppol-light-' + process.pid + '.png'); await page.screenshot({ path: f }); var img = LM.decodePNG(f); fs.unlinkSync(f); return img; }
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
    var sr = srMode === 'over' ? await rectOf(page, '#btn-stair') : null, img = await shot(page), st = sr && region(img, sr);   /* 가장자리 단추 (edge) 면 계단 그림이 아니라 단추 그림을 재게 된다 → 없음으로 */
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
      var b = document.getElementById('btn-stair'), r = b.getBoundingClientRect(), st = document.getElementById('stick').getBoundingClientRect(), sf = document.getElementById('btn-sofa'), sr = sf && !sf.hidden ? sf.getBoundingClientRect() : null, bx = b.querySelector('.stair-box').getBoundingClientRect();
      function hit(a, c) { return !!c && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom; }
      return { hidden: b.hidden, spot: b.dataset.spot, side: b.dataset.side, w: r.width, h: r.height, left: r.left, top: r.top, box: bx.width, ico: !!b.querySelector('svg'), stick: hit(r, st), sofa: hit(r, sr), label: b.getAttribute('aria-label'), sw: document.documentElement.scrollWidth, iw: innerWidth };
    });
    ok(!e5.hidden && e5.spot === 'edge' && e5.side === 'left' && e5.w >= 44 && e5.h >= 44 && e5.left >= 0 && e5.box >= 32 && e5.ico && !e5.stick && !e5.sofa && e5.label === '위층으로' && e5.sw <= e5.iw,
      'L5 360px 기본 구도: 계단이 화면 밖이면 왼쪽 가장자리에 계단 그림 단추 (44px · 스틱 · 소파 점과 안 겹침 · 가로 스크롤 없음) ' + JSON.stringify({ spot: e5.spot, side: e5.side, at: [e5.left, e5.top], w: e5.w }));
    await page.touchscreen.tap(e5.left + e5.w / 2, e5.top + e5.h / 2);
    var w5 = { minX: 1e9, n: 0, up: false };
    for (var i5 = 0; i5 < 150 && !w5.up; i5++) {
      await page.waitForTimeout(80);
      var q5 = await page.evaluate(function () { var p = APP.scene.player(), m = APP.scene.motion(), s = APP.scene.screenOf(p.at[0], 0.6, p.at[2]); return { x: s ? s.x : null, room: APP.room, trans: !!m.trans, dq: m.dq, walking: p.walking }; });
      if (!q5.room && !q5.trans && q5.walking && q5.x !== null) { w5.n++; if (q5.x < w5.minX) w5.minX = q5.x; }
      if (q5.room === 'loft' && !q5.trans && q5.dq === '') w5.up = true;
    }
    ok(w5.up && w5.n > 3 && w5.minX >= 20, 'L5 계단 단추 톡 → 걸어가 오른다 · 걷는 동안 화면이 따라와 캐릭터가 화면 안 (가장 왼쪽 ' + Math.round(w5.minX) + ' px ≥ 20 · ' + w5.n + ' 프레임)');
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
  } catch (e) {
    fails++; console.error('CRASH ' + (e && e.stack || e));
  } finally { await browser.close(); }
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
