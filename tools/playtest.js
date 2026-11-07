#!/usr/bin/env node
/* tools/playtest.js — 처음 온 사람처럼, 실제 속도로 이틀 플레이 (docs/PLAYTEST.md). SwiftShader WebGL, 360×740 터치.
 *   node tools/playtest.js            → tests/evidence/playtest/run/NN-*.png + journal.json + 끝에 '첫 1분 수치' 요약
 *   PLAYTEST_OUT=/path node tools/playtest.js
 * 순서: 입장(?intro=1) → 이름 → 문어 톡 ×4 · 창문 톡 → 산책 3번(힌트 없음/고래/없음) → 포스터 → ⚙ 설정 → 놀이방 문(달리기) → 새로고침 → 다음 날 산책 1번.
 * 위키는 가짜 응답(한 문장). 실패해도 끝까지 가고 수치를 찍는다. 고치기 전후로 같은 수치를 비교한다.
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.env.PLAYTEST_OUT || path.join(__dirname, '..', 'tests', 'evidence', 'playtest', 'run'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const INDEX = 'file://' + path.join(__dirname, '..', 'index.html');
const J = []; let n = 0, T0 = Date.now();
const t = () => ((Date.now() - T0) / 1000).toFixed(1);
function note(k, v) { J.push({ t: +t(), k, v }); console.log(t() + 's', k, typeof v === 'string' ? v.slice(0, 160) : JSON.stringify(v).slice(0, 200)); }
const WIKI = { query: { pages: { '1': { pageid: 1, title: '고래', extract: '고래는 바다에 사는 포유류다. 물 위로 올라와 숨을 쉰다.', links: [{ ns: 0, title: '바다' }] } } } };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push(m.text()); });
  await p.route('https://ko.wikipedia.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WIKI) }));
  async function shot(name, full) { n++; const f = path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'); await p.screenshot({ path: f, fullPage: !!full }); note('shot', path.basename(f)); }
  async function txt(sel) { return p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+\n/g, '\n').trim() : null; }, sel); }
  async function vis(sel) { return p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel); }
  async function waitTripDone(label) {
    const s0 = Date.now(); let rows = 0, last = '';
    while (Date.now() - s0 < 90000) {
      const st = await p.evaluate(() => ({ busy: !!(document.getElementById('btn-go') && document.getElementById('btn-go').classList.contains('away')), rows: document.querySelectorAll('#log .lrow').length, go: document.getElementById('btn-go') ? document.getElementById('btn-go').innerText.trim() : '' }));
      if (st.rows !== rows) { rows = st.rows; const lt = await p.evaluate(() => { const r = document.querySelectorAll('#log .lrow'); return r.length ? r[r.length - 1].innerText.replace(/\s+/g, ' ').trim() : ''; }); if (lt !== last) { last = lt; note(label + ' row', lt); } }
      if (!st.busy && Date.now() - s0 > 1500) break;
      await p.waitForTimeout(400);
    }
    note(label + ' duration_s', ((Date.now() - s0) / 1000).toFixed(1));
  }

  /* 1. 입장 */
  await p.goto(INDEX + '?intro=1'); note('open', 'index.html?intro=1');
  await p.waitForTimeout(1200); await shot('intro-sky');
  await p.waitForSelector('#intro.hinted', { timeout: 15000 }); note('intro title ready', ''); await shot('intro-title');
  await p.tap('.intro-title'); await p.waitForSelector('#name-dialog[open]', { timeout: 6000 }); await p.waitForTimeout(400); await shot('name-dialog');
  note('name dialog text', await txt('#name-dialog'));
  await p.fill('#name-in', '뚜루'); await p.tap('#name-form button[type=submit]'); await p.waitForTimeout(1500);
  await shot('first-screen'); await shot('first-screen-full', true);
  note('status', await txt('#status')); note('invite', await txt('#invite')); note('log', await txt('#log'));
  /* 2. 장면 찌르기 (사람이 제일 먼저 해 보는 것) */
  const oc = await p.evaluate(() => APP.scene.octScreenPos ? APP.scene.octScreenPos() : null); note('octopus at', oc);
  if (oc) { await p.touchscreen.tap(oc.x, oc.y - 8); await p.waitForTimeout(700); note('after poke bubble', await txt('#oct-bubble')); await shot('poke'); await p.waitForTimeout(1500); await p.touchscreen.tap(oc.x, oc.y - 8); await p.waitForTimeout(300); await p.touchscreen.tap(oc.x, oc.y - 8); await p.waitForTimeout(700); note('after 3 pokes bubble', await txt('#oct-bubble')); note('log after poke', await txt('#log')); }
  await p.touchscreen.tap(60, 70); await p.waitForTimeout(900); note('tap window? bubble', await txt('#oct-bubble')); await shot('tap-window');
  /* 3. 첫 산책 (힌트 비움) */
  await p.tap('#btn-go'); note('go#1', 'hint empty');
  await p.waitForTimeout(2500); await shot('trip1-early');
  await waitTripDone('trip1'); await shot('trip1-done'); await shot('trip1-done-full', true);
  note('status after trip1', await txt('#status'));
  /* 4. 포스터 보기 */
  const hasMini = await p.evaluate(() => document.querySelectorAll('.wall-mini, .pcard, #album .pcard, #album button').length); note('poster thumbnails', hasMini);
  const pc = await p.$('#album .pcard, .pcard, .wall-mini');
  if (pc) { await pc.scrollIntoViewIfNeeded(); await pc.tap(); await p.waitForTimeout(900); await shot('poster-open'); note('poster dialog', await txt('#poster-dialog')); await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  /* 5. 둘째 산책 (힌트) */
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.fill('#hint-in', '고래'); await p.tap('#btn-go'); note('go#2', 'hint 고래');
  await waitTripDone('trip2'); await shot('trip2-done');
  /* 6. ⚙ 설정 (예전 방 보기 자리) → 닫고 놀이방 문 (다락방 달리기) */
  await p.tap('#btn-settings'); await p.waitForTimeout(900); await shot('settings'); note('settings', await txt('#set-body'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const play = await p.$('#btn-door');
  note('play door', !!play);
  if (play) {
    await play.tap(); await p.waitForTimeout(1200); await shot('runner-open'); note('runner text', await txt('#runner-dlg'));
    const box = await p.evaluate(() => { const c = document.querySelector('#runner-dlg canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (box) { for (let i = 0; i < 40; i++) { await p.touchscreen.tap(box.x, box.y); await p.waitForTimeout(450); } }
    await p.waitForTimeout(1500); await shot('runner-after'); note('runner text after', await txt('#runner-dlg'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  /* 7. 셋째 산책 */
  await p.evaluate(() => window.scrollTo(0, 0)); await p.fill('#hint-in', ''); await p.tap('#btn-go'); note('go#3', 'hint empty');
  await waitTripDone('trip3'); await shot('trip3-done');
  note('full log day1', await txt('#log'));
  /* 8. 새로고침 (같은 날) */
  await p.reload(); await p.waitForTimeout(600); await shot('reload-intro'); await p.waitForSelector('#intro.hinted', { timeout: 6000 }).catch(() => note('reload', 'no intro'));
  await p.tap('.intro-title').catch(() => {}); await p.waitForTimeout(1500); await shot('reload-game'); note('log after reload', await txt('#log'));
  /* 9. 다음 날 */
  const tomorrow = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  await p.addInitScript(d => { window.__ppolTest = { today: d }; }, tomorrow);
  await p.reload(); await p.waitForSelector('#intro.hinted', { timeout: 15000 }).catch(() => {}); await p.tap('.intro-title').catch(() => {}); await p.waitForTimeout(1500);
  await shot('day2'); note('day2 log', await txt('#log')); note('day2 status', await txt('#status'));
  await p.tap('#btn-go'); await waitTripDone('day2 trip'); await shot('day2-trip-done'); await shot('day2-full', true);
  note('errors', errs);
  /* 첫 1분 수치 (docs/PLAYTEST.md 의 '기준'과 같은 것) */
  const pick = k => J.filter(e => e.k === k).map(e => e.v);
  const trips = J.filter(e => / duration_s$/.test(e.k)).map(e => +e.v);
  const allText = J.filter(e => typeof e.v === 'string').map(e => e.v).join('\n');
  const M = {
    firstTapBubble: pick('after poke bubble')[0] || null,                 /* 목표: '?' 가 아닌 반응 */
    tapLogRows: (pick('log after poke')[0] || '').split('혼잣말').length - 1,   /* 목표: 0 (톡은 로그에 안 남김) */
    tripSeconds: trips,                                                    /* 산책마다 걸린 초 */
    endWords: (allText.match(/오늘은 여기까지/g) || []).length,             /* 목표: 0 (데모 규칙 문장에서) */
    reloadAskedTap: J.some(e => e.k === 'reload' && e.v === 'no intro') ? false : true,   /* 목표: 같은 날 다시 열면 탭 없이 */
    lanternDay1: ((pick('day2 status')[0] || '').match(/(\d)\/8/) || [])[1] || null,   /* 첫날 산책 3번 뒤 등불 칸 (지금 3) */
    consoleErrors: errs.length
  };
  note('METRICS', M); console.log('\n첫 1분 수치:', JSON.stringify(M, null, 1));
  fs.writeFileSync(path.join(OUT, 'journal.json'), JSON.stringify(J, null, 1));
  await b.close();
})().catch(e => { console.error('PLAYTEST CRASH', e); fs.writeFileSync(path.join(OUT, 'journal.json'), JSON.stringify(J, null, 1)); process.exit(1); });
