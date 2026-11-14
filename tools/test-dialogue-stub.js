#!/usr/bin/env node
/* tools/test-dialogue-stub.js — 대사창 공개 API (카드 13 의 얼린 표, docs/DIALOGUE_UI.md §5.11) 모양 점검. 하나라도 FAIL 이면 exit 1.
 *   node tools/test-dialogue-stub.js                                                   # js/dialogue-stub.js (주 세션의 가짜)
 *   node tools/test-dialogue-stub.js js/dialogue.js --css css/dialogue.css --level v0  # 카드 13 엔진 (v1.1 이 되면 --level 없이)
 *   --tmp DIR  임시 html 을 둘 폴더 (기본: os.tmpdir() 아래 새 폴더)
 * Playwright 크로미움, 360×740 hasTouch, file:// 쪽에 그 스크립트 (+ css) 만 싣는다. 묶음마다 새 쪽.
 * v1.1 이름 (ask · endAsk) 은 기본으로 꼭 있어야 한다. --level v0 이면 없어도 되고, 있으면 똑같이 잰다.
 * 재는 것: 이름·인자 수 · say 는 톡 뒤에 풀림 · flow 는 읽는 시간 뒤 · hold 동안 안 넘어감 · by·text 그대로 · ask 는 누른 id ·
 *   Esc → cancel · endAsk → null · data-ui-busy 낱말 · 다시 보기 · 콘솔 오류 0 · 바깥 요청 0 · Math.random 0 · 가로 스크롤 0. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const argv = process.argv.slice(2);
function take(flag) { const i = argv.indexOf(flag); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; }
const CSS = []; for (let c; (c = take('--css'));) CSS.push(path.resolve(c));
const LEVEL = take('--level') || 'v1.1';
const TMPARG = take('--tmp');
const SCRIPT = path.resolve(argv[0] || path.join(__dirname, '..', 'js', 'dialogue-stub.js'));
const IS_STUB = path.basename(SCRIPT) === 'dialogue-stub.js';
if (!fs.existsSync(SCRIPT)) { console.error('no such script: ' + SCRIPT); process.exit(2); }

let passes = 0, fails = 0;
function ok(c, m) { if (c) { passes++; console.log('  ok   ' + m); } else { fails++; console.log('  FAIL ' + m); } return !!c; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ARITY = { init: 2, say: 1, hold: 1, open: 0, current: 0, pending: 0 }, ARITY11 = { ask: 1, endAsk: 0 };

/* ── 임시 쪽 ── */
const TMP = TMPARG ? path.resolve(TMPARG) : fs.mkdtempSync(path.join(os.tmpdir(), 'dlg-api-'));
fs.mkdirSync(TMP, { recursive: true });
function pageFile(name, preset) {
  const f = path.join(TMP, name);
  fs.writeFileSync(f, '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    CSS.map((c) => '<link rel="stylesheet" href="' + pathToFileURL(c).href + '">').join('') +
    '</head><body style="margin:0"><div id="host" style="margin:24px 16px 0"></div><div id="outside" style="height:240px"></div>' +
    (preset ? '<script>window.DLG = { mine: 1 };</script>' : '') +
    '<script src="' + pathToFileURL(SCRIPT).href + '"></script></body></html>');
  return f;
}
const MAIN = pageFile('dlg-api.html', false), GUARD = pageFile('dlg-api-guard.html', true);

let browser, ctx;
const errors = [], net = [];
let rand = 0;
async function fresh(file, noInit) {
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { if (!/^(file|data|about|blob):/.test(r.url())) net.push(r.url()); });
  await page.goto(pathToFileURL(file).href);
  if (!noInit) await page.evaluate(() => DLG.init(document.getElementById('host'), {
    portrait: function () { const c = document.createElement('canvas'); c.width = c.height = 48; return c; },
    name: function () { return '뚜루'; },
  }));
  return page;
}
async function done(page) { rand += await page.evaluate(() => window.__rand || 0); await page.close(); }

/* page 안 도우미: track(k, promise) → __p[k] = { done, v } */
const st = (page, k) => page.evaluate((k) => window.__p[k], k);
const cur = (page) => page.evaluate(() => DLG.current());
const tap = (page) => page.tap('#dbox .dlg-next', { timeout: 3000 });
const busyWords = (page) => page.evaluate(() => (document.documentElement.getAttribute('data-ui-busy') || '').split(/\s+/).filter(Boolean));
const choices = (page) => page.$$eval('#dbox .dlg-choice', (bs) => bs.filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()));
async function tapUntil(page, text, max) {   /* 쪽이 여럿이면 쪽마다 톡 (카드 13 엔진), 120ms 안 두 번 톡은 무시되니 넉넉히 쉰다 */
  for (let i = 0; i < (max || 14); i++) { const c = await cur(page); if (c && c.text === text) return true; await tap(page); await sleep(450); }
  const c = await cur(page); return !!(c && c.text === text);
}
const say = (page, k, line) => page.evaluate(([k, l]) => track(k, DLG.say(l)), [k, line]);
const ask = (page, k, q) => page.evaluate(([k, q]) => track(k, DLG.ask(q)), [k, q]);
const GO = [{ id: 'go', label: '같이 가기' }, { id: 'stay', label: '집에서 기다리기' }];
const LONG = ('비 오는 다락에서 뚜루는 모자의 방 글을 오래 읽었다. 책장 메모에는 바다의 방 이야기가 적혀 있었고, 창가의 빗소리가 점점 작아졌다. ').repeat(3) +
  'https://ko.wikipedia.org/wiki/%EB%AC%B8%EC%96%B4_%EB%AA%A8%EC%9E%90_%EC%9D%B4%EC%95%BC%EA%B8%B0 끝.';

(async () => {
  console.log('script: ' + SCRIPT + '  level: ' + LEVEL + (CSS.length ? '  css: ' + CSS.join(', ') : ''));
  browser = await chromium.launch();
  ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    const R = Math.random; window.__rand = 0; Math.random = function () { window.__rand++; return R.call(Math); };
    window.__p = {};
    window.track = function (k, p) {
      window.__p[k] = { done: false, thenable: !!(p && typeof p.then === 'function') };
      if (p && typeof p.then === 'function') p.then(function (v) { window.__p[k] = { done: true, thenable: true, v: v === undefined ? '__undef' : v }; });
    };
  });

  console.log('[shape] 이름 · 인자 수 · 처음 상태');
  let page = await fresh(MAIN, true);
  const shape = await page.evaluate(() => { const o = {}; ['init', 'say', 'hold', 'open', 'current', 'pending', 'ask', 'endAsk'].forEach((n) => { o[n] = typeof DLG[n] === 'function' ? DLG[n].length : null; }); return o; });
  Object.keys(ARITY).forEach((n) => ok(shape[n] === ARITY[n], 'DLG.' + n + ' 함수, length ' + ARITY[n] + ' (받음 ' + shape[n] + ')'));
  const has11 = shape.ask !== null || shape.endAsk !== null;
  if (LEVEL === 'v0' && !has11) console.log('  -    v1.1 이름 (ask · endAsk) 없음 — --level v0 이라 건너뜀');
  else Object.keys(ARITY11).forEach((n) => ok(shape[n] === ARITY11[n], 'DLG.' + n + ' 함수, length ' + ARITY11[n] + ' (받음 ' + shape[n] + ')'));
  await page.evaluate(() => DLG.init(document.getElementById('host'), { name: function () { return '뚜루'; } }));
  await page.evaluate(() => DLG.init(document.getElementById('outside'), {}));
  const dom = await page.evaluate(() => ({
    cur: DLG.current(), pend: DLG.pending(), boxes: document.querySelectorAll('#dbox').length,
    inHost: !!document.querySelector('#host #dbox'), role: (document.getElementById('dbox') || {}).getAttribute && document.getElementById('dbox').getAttribute('role'),
    next: !!document.querySelector('#dbox button.dlg-next'), log: (document.querySelector('#dbox button.dlg-log') || { getAttribute: () => null }).getAttribute('aria-haspopup'),
  }));
  ok(dom.cur === null && dom.pend === 0, '줄 전: current() null · pending() 0');
  ok(dom.boxes === 1 && dom.inHost && dom.role === 'group', 'init → host 안 #dbox 하나 (role=group), 두 번째 init 무시');
  ok(dom.next && dom.log === 'dialog', 'button.dlg-next · button.dlg-log[aria-haspopup=dialog]');
  await done(page);

  console.log('[say] 기다리는 줄은 톡 뒤에 풀린다');
  page = await fresh(MAIN);
  await say(page, 'a', { voice: 'house', text: '하나' });
  await sleep(800);
  let s = await st(page, 'a'), c = await cur(page);
  ok(s.thenable && !s.done, 'say → Promise, 톡 전에는 안 풀림');
  ok(c && c.voice === 'house' && c.text === '하나' && c.page >= 1 && c.page <= c.pages, 'current() = { voice, text, by, page(1부터), pages }');
  ok((await page.textContent('#dbox')).includes('하나'), '#dbox 에 글');
  await tap(page); await sleep(400);
  s = await st(page, 'a'); c = await cur(page);
  ok(s.done && s.v === '__undef', '톡 → 풀림 (값 없음)');
  ok(c && c.text === '하나' && (await page.evaluate(() => DLG.pending())) === 0, '마지막 줄은 풀려도 남는다 · pending 0');
  await say(page, 'b', { voice: 'house', text: '둘' }); await say(page, 'c', { voice: 'house', text: '셋' });
  await sleep(800);
  ok((await cur(page)).text === '둘' && (await page.evaluate(() => DLG.pending())) === 1, '줄 둘 → 지금 줄 + pending 1');
  await tap(page); await sleep(800);
  ok((await st(page, 'b')).done && (await cur(page)).text === '셋' && !(await st(page, 'c')).done, '톡 → 다음 줄, 그 줄은 아직');
  await say(page, 'u', { voice: 'user', text: '내가 고른 말', by: 'user' });
  await say(page, 'e1', { voice: 'octopus', by: 'model', text: null }); await say(page, 'e2', { voice: 'house', text: '' });
  await sleep(300);
  ok((await st(page, 'u')).done && (await st(page, 'e1')).done && (await st(page, 'e2')).done, "voice:'user' · 빈 text → 톡 없이 바로 풀림");
  ok((await cur(page)).text === '셋' && (await page.evaluate(() => DLG.pending())) === 0, '그 줄들은 대사창에 안 뜬다');
  await done(page);

  console.log('[flow] 흐르는 줄은 읽는 시간 (§5.5, 2자 = 2.5초) 뒤');
  page = await fresh(MAIN);
  await say(page, 'f1', { voice: 'house', text: '흐름', pace: 'flow' }); await say(page, 'f2', { voice: 'house', text: '다음 줄' });
  await sleep(1000);
  ok((await cur(page)).text === '흐름' && !(await st(page, 'f1')).done, '1초: 아직 흐르는 줄');
  await sleep(2400);
  ok((await cur(page)).text === '다음 줄' && (await st(page, 'f1')).done, '3.4초: 저절로 다음 줄, flow 풀림');
  await sleep(2600);
  ok(!(await st(page, 'f2')).done, "pace 없음 = 'wait': 시간이 가도 안 풀림");
  await tap(page); await sleep(300);
  await say(page, 'f3', { voice: 'house', text: '끝 줄', pace: 'flow' });
  await sleep(3400);
  ok((await st(page, 'f3')).done && (await cur(page)).text === '끝 줄', '마지막 flow 줄도 읽는 시간 뒤 풀리고 남는다');
  await done(page);

  console.log('[hold] 켠 동안 안 넘어간다');
  page = await fresh(MAIN);
  await page.evaluate(() => DLG.hold(true)); await page.evaluate(() => DLG.hold(false));
  ok(!(await page.evaluate(() => document.documentElement.hasAttribute('data-ui-busy'))), 'hold 켰다 끄면 data-ui-busy 없음');
  await say(page, 'h1', { voice: 'house', text: '멈춤 하나' }); await say(page, 'h2', { voice: 'house', text: '멈춤 둘' });
  await sleep(800);
  await page.evaluate(() => DLG.hold(true));
  ok((await busyWords(page)).includes('dlg'), "hold(true) → data-ui-busy 에 'dlg'");
  await tap(page); await sleep(500);
  ok(!(await st(page, 'h1')).done && (await cur(page)).text === '멈춤 하나', 'hold 중 톡 → 안 넘어감, 안 풀림');
  await page.evaluate(() => DLG.hold(false)); await sleep(300);
  ok(!(await busyWords(page)).includes('dlg'), "hold(false) → 'dlg' 빠짐");
  await tap(page); await sleep(800);
  ok((await st(page, 'h1')).done && (await cur(page)).text === '멈춤 둘', '끈 뒤 톡 → 넘어감');
  await say(page, 'h3', { voice: 'house', text: '멈춘 흐름', pace: 'flow' }); await say(page, 'h4', { voice: 'house', text: '그 뒤' });
  await tap(page); await page.evaluate(() => DLG.hold(true));
  await sleep(3500);
  ok((await cur(page)).text === '멈춘 흐름' && !(await st(page, 'h3')).done, 'hold 중엔 읽는 시간도 멈춤 (3.5초 뒤에도 그 줄)');
  await page.evaluate(() => DLG.hold(false)); await sleep(3200);
  ok((await cur(page)).text === '그 뒤' && (await st(page, 'h3')).done, '끄면 남은 시간 뒤 넘어감');
  await done(page);

  console.log('[by] 출처와 글은 받은 그대로 · 다시 보기');
  page = await fresh(MAIN);
  await say(page, 'o1', { voice: 'octopus', text: '안녕, 나는 뚜루야.', by: 'demo-rules', expr: 'happy' });
  await sleep(800); c = await cur(page);
  ok(c && c.voice === 'octopus' && c.by === 'demo-rules' && c.text === '안녕, 나는 뚜루야.', "by:'demo-rules' 그대로");
  ok((await page.textContent('#dbox')).includes('데모 규칙'), "이름표 글 '데모 규칙'");
  await say(page, 'o2', { voice: 'octopus', text: LONG, by: 'model', model: 'fake' });
  ok(await tapUntil(page, LONG), '300자 안팎 줄로 넘어감');
  c = await cur(page);
  ok(c.text === LONG && c.by === 'model' && c.pages >= 1 && c.page === 1, 'text 는 글자 그대로 (자르기 0), page 1');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '긴 줄 · URL 에도 가로 스크롤 0');
  await say(page, 'o3', { voice: 'octopus', text: '출처 없는 줄' });
  ok(await tapUntil(page, '출처 없는 줄'), 'by 없는 문어 줄로 넘어감');
  c = await cur(page);
  ok(c.voice === 'house' && !c.by, "by 없는 octopus → voice 'house'");
  await say(page, 'o4', { voice: 'octopus', text: '낯선 꼬리표', by: 'odd-label' });
  ok(await tapUntil(page, '낯선 꼬리표') && (await cur(page)).by === 'odd-label', '모르는 by 도 그대로');
  await say(page, 'o5', { voice: 'user', text: '내가 고른 말', by: 'user' });
  await say(page, 'o6', { voice: 'house', text: '아직 안 나온 줄' });
  await sleep(300);
  await page.evaluate(() => document.documentElement.setAttribute('data-ui-busy', 'guide'));
  await page.evaluate(() => DLG.open()); await sleep(400);
  const bl = await page.evaluate(() => { const d = document.getElementById('backlog'); return { tag: d && d.tagName, open: !!(d && d.open), text: d ? d.textContent : '' }; });
  ok(bl.tag === 'DIALOG' && bl.open, 'open() → dialog#backlog 열림');
  ok(['안녕, 나는 뚜루야.', LONG, '출처 없는 줄', '내가 고른 말'].every((t) => bl.text.includes(t)), '다시 보기: 보여 준 줄 + 너 줄, 글 그대로');
  ok(!bl.text.includes('아직 안 나온 줄'), '다시 보기: 아직 안 나온 줄은 없음');
  let w = await busyWords(page);
  ok(w.includes('dlg') && w.includes('guide'), "열린 동안 'dlg' 더함, 남의 낱말 'guide' 그대로");
  await page.keyboard.press('Escape'); await sleep(400);
  const after = await page.evaluate(() => ({ open: document.getElementById('backlog').open, focus: !!(document.activeElement && document.activeElement.matches('.dlg-log')), busy: document.documentElement.getAttribute('data-ui-busy') }));
  ok(!after.open && after.focus, 'Esc → 닫힘, 포커스 button.dlg-log');
  ok(after.busy === 'guide', "닫으면 'dlg' 만 빠짐 (data-ui-busy = 'guide')");
  await done(page);

  if (has11 && shape.ask !== null && shape.endAsk !== null) {   /* 없으면 [shape] 에서 이미 FAIL (v1.1) 이거나 건너뜀 (v0) */
    console.log('[ask] 단추 → id · Esc → cancel · endAsk → null (v1.1)');
    page = await fresh(MAIN);
    await say(page, 'k0', { voice: 'house', text: '앞 줄' });
    await ask(page, 'k1', { voice: 'house', text: '어떻게 할까?', choices: GO });
    await sleep(800);
    ok((await st(page, 'k1')).thenable && (await page.evaluate(() => DLG.pending())) === 1 && (await choices(page)).length === 0, 'ask 는 대기열 차례를 기다린다 (pending 1, 단추 아직)');
    await tap(page); await sleep(800);
    ok((await st(page, 'k0')).done && JSON.stringify(await choices(page)) === JSON.stringify(['같이 가기', '집에서 기다리기']), '차례가 오면 단추 둘, 글 = label 순서대로');
    ok((await cur(page)).text === '어떻게 할까?' && !(await page.isVisible('#dbox .dlg-next')), '질문이 지금 줄, 넘기기 숨김');
    ok((await busyWords(page)).includes('dlg'), "질문 동안 'dlg'");
    const bb = await page.$eval('#dbox', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await page.touchscreen.tap(Math.round(bb.x + bb.w * 0.4), Math.round(bb.y + bb.h * 0.3));
    const ob = await page.$eval('#outside', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.touchscreen.tap(Math.round(ob.x), Math.round(ob.y));
    await page.keyboard.press('Escape'); await sleep(400);
    ok(!(await st(page, 'k1')).done && (await choices(page)).length === 2, '상자 톡 · 바깥 톡 · cancel 없는 Esc → 아무 일 없음');
    await page.evaluate(() => DLG.hold(true));
    await page.locator('#dbox .dlg-choice', { hasText: '집에서 기다리기' }).tap();
    await page.evaluate(() => DLG.hold(false)); await sleep(300);
    s = await st(page, 'k1');
    ok(s.done && s.v === 'stay', "누른 단추의 id ('stay'), hold 중에도 단추는 눌림");
    ok((await choices(page)).length === 0 && !(await busyWords(page)).includes('dlg'), "답한 뒤 단추 0 · 'dlg' 빠짐");
    await ask(page, 'k2', { voice: 'house', text: '넓혀 볼까?', choices: [{ id: 'yes', label: '넓혀 보자' }, { id: 'no', label: '지금은 그대로' }], cancel: 'dismiss' });
    await sleep(500); await page.keyboard.press('Escape'); await sleep(300);
    s = await st(page, 'k2');
    ok(s.done && s.v === 'dismiss', "Esc → cancel 값 ('dismiss')");
    await ask(page, 'k3', { voice: 'octopus', by: 'demo-rules', text: '뭐 물어볼까?', chips: true,
      choices: [{ id: 'where', label: '어디 갔어?' }, { id: 'how', label: '어땠어?' }, { id: 'stop', label: '그만' }] });
    await sleep(500);
    c = await cur(page);
    ok((await choices(page)).length === 3 && c.voice === 'octopus' && c.by === 'demo-rules', 'chips 셋 · 질문의 by 그대로');
    const e1 = await page.evaluate(() => DLG.endAsk()); await sleep(200);
    const e2 = await page.evaluate(() => DLG.endAsk());
    s = await st(page, 'k3');
    ok(e1 === true && e2 === false && s.done && s.v === null && (await choices(page)).length === 0, 'endAsk() → true, 그 ask 는 null, 다시 부르면 false');
    await ask(page, 'k4', { voice: 'house', text: '첫 질문', choices: GO });
    await ask(page, 'k5', { voice: 'house', text: '둘째 질문', choices: GO });
    await sleep(500);
    ok((await st(page, 'k4')).done && (await st(page, 'k4')).v === null && !(await st(page, 'k5')).done, '새 ask → 앞 질문은 null');
    await page.locator('#dbox .dlg-choice', { hasText: '같이 가기' }).tap(); await sleep(300);
    ok((await st(page, 'k5')).v === 'go', "둘째 질문은 누른 id ('go')");
    await say(page, 'k6', { voice: 'house', text: '또 앞 줄' });
    await ask(page, 'k7', { voice: 'house', text: '기다리는 질문', choices: GO });
    await sleep(500);
    const e3 = await page.evaluate(() => DLG.endAsk()); await sleep(200);
    ok(e3 === true && (await st(page, 'k7')).v === null && (await page.evaluate(() => DLG.pending())) === 0, '아직 안 뜬 질문도 endAsk 로 거둠 (pending 0)');
    await tap(page); await sleep(300);
    ok((await st(page, 'k6')).done, '그 앞 줄은 그대로 톡으로 풀림');
    await done(page);
  }

  if (IS_STUB) {
    console.log('[guard] window.DLG 가 이미 있으면 가짜는 손대지 않는다');
    page = await fresh(GUARD, true);
    ok(await page.evaluate(() => window.DLG.mine === 1 && typeof window.DLG.say === 'undefined'), '미리 있던 window.DLG 그대로');
    await done(page);
  }

  console.log('[global]');
  const src = fs.readFileSync(SCRIPT, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok(!/Math\.random/.test(src) && rand === 0, 'Math.random 0 (코드 · 실행)');
  ok(net.length === 0, '바깥 요청 0' + (net.length ? ': ' + net.slice(0, 3).join(' ') : ''));
  ok(errors.length === 0, '콘솔 오류 0' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch(async (e) => {
  console.error('CRASH ' + (e && e.message ? e.message.split('\n')[0] : e));
  console.log('\n' + passes + ' passed, ' + (fails + 1) + ' failed (멈춤)');
  try { await browser.close(); } catch (_) { /* already gone */ }
  process.exit(1);
});
