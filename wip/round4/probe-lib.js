/* wip/round4/probe-lib.js — 갈래 탐침용 작은 도우미 (배포에 안 나간다: wip/).
   쓰기: const P = require('./wip/round4/probe-lib.js'); const b = await P.launch(); const { page } = await P.open(b, { lantern: 3, look: { hour: 20 } });
   NODE_PATH=$(npm root -g) 로 돌린다 (Playwright 는 전역). */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z';
const DAYS = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'];
/* 등불 lv 칸 · 함께한 날 days 개 (기본 lv) 인 기록. extra 는 맨 위 열쇠를 덮는다 (user · room 등) */
function REC(lv, extra, days) {
  const n = days == null ? lv : days;
  const r = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: lv, days: DAYS.slice(0, Math.min(n, DAYS.length)), affinity: {}, visits: {}, state: 'idle', color: RED,
    colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: lv, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
    settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  return Object.assign(r, extra || {});
}
async function launch() { return chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); }
/* o = { w, h, touch (기본 true), rec, lantern, today, look, q (주소 뒤에 붙일 것), dpr } */
async function open(browser, o) {
  o = o || {};
  const touch = o.touch !== false;
  const ctx = await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: o.dpr || 1, locale: 'ko-KR', hasTouch: touch, isMobile: touch });
  await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const rec = o.rec || REC(o.lantern == null ? 3 : o.lantern);
  await page.addInitScript({ content: "if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(rec)) + '); } ' +
    'window.__ppolTest = Object.assign(window.__ppolTest || {}, { today: ' + JSON.stringify(o.today || '2026-11-14') + ' });' + (o.look ? 'window.__ppolLook = ' + JSON.stringify(o.look) + ';' : '') });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0' + (o.q || ''));
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 20000 });
  await page.waitForFunction(() => window.APP && !APP.goResting, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}
/* 진짜 손가락 (CDP): 한 손가락 끌기 · 두 손가락 비틀기/벌리기. pts = [[x, y], …] 시작점, to = 끝점, n 단계 */
async function touchPath(page, from, to, n) {
  const cdp = await page.context().newCDPSession(page);
  const at = k => from.map((p, i) => ({ x: p[0] + (to[i][0] - p[0]) * k, y: p[1] + (to[i][1] - p[1]) * k, id: i }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
  for (let i = 1; i <= (n || 10); i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / (n || 10)) }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
/* 두 손가락을 가운데 (cx, cy) 둘레 반지름 r 로 a0 → a1 (도) 만큼 비튼다 */
function twist(page, cx, cy, r, a0, a1, n) {
  const P = a => { const t = a * Math.PI / 180; return [[cx + r * Math.cos(t), cy + r * Math.sin(t)], [cx - r * Math.cos(t), cy - r * Math.sin(t)]]; };
  return touchPath(page, P(a0), P(a1), n || 20);
}
module.exports = { ROOT, REC, launch, open, touchPath, twist };
