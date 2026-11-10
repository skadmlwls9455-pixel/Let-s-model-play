#!/usr/bin/env node
/* tools/test-cook-live.js - the kitchen in a real browser (Playwright + Chromium). Wave 9, slice 1 (jeon) only.
 *   NODE_PATH=$(npm root -g) node tools/test-cook-live.js
 *   COOK_URL=http://127.0.0.1:PORT/cook.html   run over http instead of file://
 *   COOK_SHOTS=/some/dir                       where the L1 captures go (default: <os tmp>/cook-live-shots)
 *   ONLY=L1,L4                                 run only these
 * Design 6.7 L1-L14, restricted to slice 1 (no stir / place, no notebook screen). Touch goes through CDP
 * Input.dispatchTouchEvent: trusted touches, so pointer capture and coalesced events work (Playwright's touchscreen
 * only taps). Most tests install Playwright's fake clock, which also drives event timestamps, so the 12 fps frames,
 * the 250 ms gate and the flip bands are exact. That clock still flows with real time between two calls: a check that
 * needs times to the millisecond pauses it first (T.pause in L17; openPage's `paused` stops it before the page loads,
 * as L19 does). L15-L18 are the verifier findings, L19 is the art wiring (what cook.js hands the painters).
 * Exit 1 on any failure.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var URL0 = process.env.COOK_URL || ('file://' + path.join(ROOT, 'cook.html'));
var SHOTS = process.env.COOK_SHOTS || path.join(os.tmpdir(), 'cook-live-shots');
var ONLY = (process.env.ONLY || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
var KEY = 'ppolppol_cook_v0';
var SEEN_ALL = JSON.stringify({ v: 1, day: '', dayN: 0, seen: ['tap', 'flip', 'slice'], pot: null, book: [] });
var BANDS = ['보들보들', '노릇노릇', '바삭바삭'];
var passes = 0, fails = 0, errAll = [];
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function section(t) { console.log('== ' + t); }
function line(a, b, n) { var out = []; for (var i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
function realWait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }   /* Chrome delivers touchmove on its next real frame */
function sameRect(a, b) { return a && b && ['x', 'y', 'w', 'h'].every(function (k) { return Math.abs(a[k] - b[k]) < 0.01; }); }

/* Pause the installed clock a little ahead of the page's own time: until clock.resume(), time moves in T.go only.
   Reading the page's time and pausing it are separate round trips and the clock flows with real time between them,
   so on a busy machine a short margin is sometimes already in the past ("Cannot fast-forward to the past"). Then try
   again with a longer one. (A pauseAt that fails this way has already stopped the clock, so the second try reads a
   time that no longer moves.) Returns the margin that worked. */
async function pauseClock(page) {
  var margins = [250, 1000, 3000], err = null;
  for (var i = 0; i < margins.length; i++) {
    try { await page.clock.pauseAt(await page.evaluate(function (m) { return Date.now() + m; }, margins[i])); return margins[i]; }
    catch (e) { err = e; if (!/fast-forward to the past/i.test(String(e && e.message))) throw e; }
  }
  throw err;
}

/* ---------- one page: context options, init scripts, fake clock, CDP touch, small helpers ---------- */
async function openPage(browser, o) {
  o = o || {};
  var touch = o.touch !== false;
  var ctx = await browser.newContext({ viewport: o.vp || { width: 360, height: 740 }, deviceScaleFactor: o.dpr || 2, hasTouch: touch, isMobile: touch,
    reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  if (o.store !== undefined) {
    await ctx.addInitScript(function (a) {   /* seed the save key once per tab (a reload keeps what the page wrote) */
      try { if (!sessionStorage.getItem('__ckSeeded')) { sessionStorage.setItem('__ckSeeded', '1'); if (a[1] === null) localStorage.removeItem(a[0]); else localStorage.setItem(a[0], a[1]); } } catch (e) { /* none */ }
    }, [KEY, o.store]);
  }
  if (o.audio) await ctx.addInitScript(function () { window.__acts = []; window.AUDIO = { on: function (ch, p) { window.__acts.push({ ch: ch, p: p, t: performance.now() }); } }; });
  if (o.full) await ctx.addInitScript(function () { Storage.prototype.setItem = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }; });
  if (o.aria) await ctx.addInitScript(function () {   /* what the aria-live line really said (not COOK.live().said) */
    window.__aria = [];
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        var n = m.target && m.target.nodeType === 3 ? m.target.parentNode : m.target, say = n && n.closest ? n.closest('.ck-say') : null;
        if (say && say.textContent) window.__aria.push(say.textContent);
      });
    }).observe(document, { subtree: true, childList: true, characterData: true });   /* the document: init scripts run before <html> exists */
  });
  if (o.crypto != null) await ctx.addInitScript(function (v) { crypto.getRandomValues = function (a) { for (var i = 0; i < a.length; i++) a[i] = v; return a; }; }, o.crypto);
  if (o.art) await ctx.addInitScript(function () {   /* what cook.js hands the three scene painters, call by call (they still paint).
                                                        js/cook-art.js says `var COOK_ART = ...`: that assignment lands in this setter */
    window.__art = [];
    var real;
    function spy(A, name) {
      var paint = A[name];
      A[name] = function (b, opts) {
        var r = { s: name, now: performance.now() };
        ['seed', 'fh', 'fbc', 'fl', 't', 'still', 'f', 'heat', 'band'].forEach(function (k) { r[k] = opts && k in opts && opts[k] !== undefined ? opts[k] : '-'; });   /* '-' = not passed */
        window.__art.push(r);
        return paint.apply(this, arguments);
      };
    }
    Object.defineProperty(window, 'COOK_ART', { configurable: true, enumerable: true, get: function () { return real; },
      set: function (A) { real = A; ['flipScene', 'sliceScene', 'revealScene'].forEach(function (n) { if (A && typeof A[n] === 'function') spy(A, n); }); } });
  });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  if (o.clock !== false) await page.clock.install({ time: new Date('2026-11-08T10:00:00') });
  if (o.paused) await pauseClock(page);   /* before the page exists: its whole life then runs on T.go only, to the millisecond */
  await page.goto(URL0 + (o.q ? '?' + o.q : ''));
  var cdp = await ctx.newCDPSession(page);
  var T = { page: page, ctx: ctx, cdp: cdp, errs: errs };
  T.go = function (ms) { return o.clock === false ? page.waitForTimeout(ms) : page.clock.runFor(ms); };
  T.pause = function () { return pauseClock(page); };
  T.now = function () { return page.evaluate(function () { return performance.now(); }); };
  T.art = function (from) { return page.evaluate(function (n) { return (window.__art || []).slice(n); }, from || 0); };
  T.live = function () { return page.evaluate(function () { return COOK.live(); }); };
  T.rect = function (sel) {
    return page.evaluate(function (s) { var e = document.querySelector(s); if (!e) return null; var r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
  };
  T.pt = async function (lx, ly) { var r = await T.rect('.ck-cv'); return [r.x + lx * r.w / 288, r.y + ly * r.h / 320]; };
  T.touch = function (type, p, id) { return cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: p ? [{ x: p[0], y: p[1], id: id || 1 }] : [] }); };
  T.tap = async function (lx, ly) { var p = await T.pt(lx, ly); await T.touch('touchStart', p); await T.go(30); await T.touch('touchEnd'); };
  T.tapEl = async function (sel) { var r = await T.rect(sel); var p = [r.x + r.w / 2, r.y + r.h / 2]; await T.touch('touchStart', p); await T.go(30); await T.touch('touchEnd'); };
  T.tapCss = async function (p) { await T.touch('touchStart', p); await T.go(30); await T.touch('touchEnd'); await realWait(40); await T.go(20); };
  T.aria = function () { return page.evaluate(function () { return window.__aria || []; }); };
  T.drag = async function (pts, ms) {
    var c = [];
    for (var i = 0; i < pts.length; i++) c.push(await T.pt(pts[i][0], pts[i][1]));
    await T.touch('touchStart', c[0]);
    for (var j = 1; j < c.length; j++) { await T.go(ms || 16); await T.touch('touchMove', c[j]); }
    await T.go(16); await T.touch('touchEnd');
  };
  T.until = async function (fn, max, label) {
    for (var w = 0; w <= (max || 6000); w += 50) { var l = await T.live(); if (fn(l)) return l; await T.go(50); }
    throw new Error('timeout: ' + label + ' ' + JSON.stringify(await T.live()).slice(0, 300));
  };
  T.hash = function () {
    return page.evaluate(function () {
      var c = document.querySelector('.ck-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, h = 2166136261;
      for (var i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619);
      return h >>> 0;
    });
  };
  T.active = function () { return page.evaluate(function () { var a = document.activeElement; return a ? (a.id ? '#' + a.id : '') + '.' + String(a.className || '').trim().split(/\s+/).join('.') : null; }); };
  T.verb = function () { return page.evaluate(function () { var v = document.querySelector('.ck-verb'); return { text: v.textContent, hidden: v.hidden, opacity: getComputedStyle(v).opacity, shown: v.classList.contains('ck-shown') }; }); };
  T.verbClick = function () { return page.evaluate(function () { document.querySelector('.ck-verb').click(); }); };
  T.store = function () { return page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return 'broken'; } }, KEY); };
  T.dlgText = function () {   /* the dialog's visible text, without the aria-live line */
    return page.evaluate(function () { var d = document.querySelector('.ck-dlg'); if (!d) return ''; var c = d.cloneNode(true); var s = c.querySelector('.ck-say'); if (s) s.remove(); return c.textContent; });
  };
  T.done = async function () { errAll = errAll.concat(errs); await ctx.close(); };
  if (o.paused) T.t0 = await T.now();   /* the page's clock as it loaded = where the kitchen's own clock starts (cook.html opens it at load) */
  await T.go(o.settle || 600);
  return T;
}

/* ---------- play helpers (touch) ---------- */
async function playTap(T) {
  await T.until(function (l) { return l.kind === 'tap' && l.phase === 'step'; }, 4000, 'tap step');
  await T.go(700);
  var l = await T.live(), off = [[-3, 2], [2, -2], [0, 3]];
  for (var i = 0; i < l.st.marks.length; i++) for (var k = 0; k < 3; k++) { var m = l.st.marks[i]; await T.tap(m.x + off[k][0], m.y + off[k][1]); await T.go(150); }
}
async function playFlip(T, waitMs) {
  await T.until(function (l) { return l.kind === 'flip' && l.phase === 'step'; }, 4000, 'flip step');
  await T.go(700);
  await T.tap(144, 176);                      /* heat on */
  await T.go(waitMs);
  await T.drag(line([144, 236], [146, 140], 6), 16);   /* swipe up */
}
async function playSlice(T, shotMid) {
  await T.until(function (l) { return l.kind === 'slice' && l.phase === 'step'; }, 4000, 'slice step');
  await T.go(700);
  for (var i = 0; i < 2; i++) {
    var ln = (await T.live()).st.lines[i];
    await T.drag(line([ln.ax - 10 * ln.ux, ln.ay - 10 * ln.uy], [ln.bx + 10 * ln.ux, ln.by + 10 * ln.uy], 20), 16);
    await T.go(300);
    if (i === 0 && shotMid) await shotMid();
  }
}
async function verbThrough(T, kind, presses) {   /* button path for one step (after the 250 ms gate) */
  await T.until(function (l) { return l.kind === kind && l.phase === 'step'; }, 4000, kind + ' step');
  await T.go(700);
  for (var i = 0; i < presses; i++) { await T.verbClick(); await T.go(300); }
}

/* ===================================================================================================== */
async function L1(browser) {   /* touch path to the end, plate reveal, back to the counter; DPR 2 and 2.625; captures */
  try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) { /* exists */ }
  var setups = [{ vp: { width: 360, height: 740 }, dpr: 2, tag: '360x740-dpr2' }, { vp: { width: 412, height: 915 }, dpr: 2.625, tag: '412x915-dpr2.625' }];
  for (var s = 0; s < setups.length; s++) {
    var su = setups[s], T = await openPage(browser, { vp: su.vp, dpr: su.dpr, store: null, q: 'seed=12' });
    var l = await T.live();
    check(l.screen === 'counter', 'L1 ' + su.tag + ': cook.html opens straight into the counter');
    check(/ck-prop/.test(await T.active()), 'L1 ' + su.tag + ': focus starts on the pan');
    var h0 = await T.hash();
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-1-counter.png') });
    await T.tapEl('.ck-prop');
    l = await T.until(function (x) { return x.screen === 'step'; }, 2000, 'step');
    check(l.kind === 'tap' && /ck-stage/.test(await T.active()), 'L1 ' + su.tag + ': a touch on the pan starts the tap step, focus on the stage box');
    await playTap(T);
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-2-tap.png') });
    await playFlip(T, 3600);
    l = await T.until(function (x) { return x.kind === 'slice'; }, 3000, 'slice');
    check(l.look.band === 1, 'L1 ' + su.tag + ': swiping up 3.6 s after heat-on gives golden (band 1)');
    await playSlice(T, function () { return T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-3-slice.png') }); });
    l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
    var dishLook = JSON.stringify(l.look);
    check(l.done && l.look.dents.length === 9 && l.look.cuts.length === 2, 'L1 ' + su.tag + ': the dish is done (9 dents, 2 cuts)');
    await T.go(700);
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-4-reveal.png') });
    await T.tap(144, 150);
    l = await T.until(function (x) { return x.screen === 'counter'; }, 2000, 'counter');
    await T.go(400);
    check(/ck-prop/.test(await T.active()), 'L1 ' + su.tag + ': back on the counter, focus on the pan');
    check(l.screen === 'counter' && (await T.hash()) !== h0, 'L1 ' + su.tag + ': the last plate now sits beside the pan (counter picture changed)');
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-5-counter.png') });
    var st = await T.store();
    check(st && st.pot === null && st.book.length === 1 && st.book[0].recipe === 'jeon', 'L1 ' + su.tag + ': one book line, no pot');
    check(JSON.stringify(st.book[0].look) === dishLook, 'L1 ' + su.tag + ': the book line carries the look of the plate');
    await T.go(1000);
    l = await T.live();
    check(l.screen === 'counter', 'L1 ' + su.tag + ': the reveal tap does not start a new dish');
    check(l.err === 0 && T.errs.length === 0, 'L1 ' + su.tag + ': no errors' + (T.errs.length ? ' ' + T.errs.join(' | ') : ''));
    await T.done();
  }
  console.log('   captures: ' + SHOTS);
}

async function L2(browser) {   /* keyboard only; document.activeElement after every move */
  var T = await openPage(browser, { touch: false, store: null });
  var a = await T.active();
  check(/ck-prop/.test(a), 'L2: open -> focus on the pan (' + a + ')');
  await T.page.keyboard.press('Enter'); await T.go(50);
  var l = await T.live(), v = await T.verb();
  a = await T.active();
  check(l.screen === 'step' && l.kind === 'tap', 'L2: Enter on the pan starts the dish');
  check(/ck-verb/.test(a) && v.opacity === '1' && v.text === '톡톡', 'L2: step 1 -> focus on the verb button, visible, label 톡톡 (' + a + ', ' + v.opacity + ')');
  await T.go(700);
  for (var i = 0; i < 3; i++) { await T.page.keyboard.press(' '); await T.go(300); }
  l = await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  a = await T.active(); v = await T.verb();
  check(/ck-verb/.test(a) && v.text === '불 켜기', 'L2: step 2 -> focus stays on the verb, label 불 켜기 (' + a + ')');
  await T.go(700);
  await T.page.keyboard.press(' '); await T.go(100);
  v = await T.verb();
  check(v.text === '뒤집기' && /ck-verb/.test(await T.active()), 'L2: after heat-on the label is 뒤집기');
  await T.go(400);
  await T.page.keyboard.press(' ');
  l = await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  a = await T.active(); v = await T.verb();
  check(/ck-verb/.test(a) && v.text === '썰기', 'L2: step 3 -> focus on the verb, label 썰기 (' + a + ')');
  await T.go(700);
  for (var j = 0; j < 2; j++) { await T.page.keyboard.press(' '); await T.go(300); }
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(600);
  a = await T.active(); v = await T.verb();
  check(/ck-verb/.test(a) && v.text === '돌아가기', 'L2: plate reveal -> after the plate is up, focus on 돌아가기 (' + a + ')');
  await T.page.keyboard.press('Enter'); await T.go(100);
  l = await T.live(); a = await T.active();
  check(l.screen === 'counter' && /ck-prop/.test(a), 'L2: Enter -> counter, focus on the pan (' + a + ')');
  await T.go(400);
  await T.page.keyboard.press('Escape'); await T.go(100);
  l = await T.live(); a = await T.active();
  check(l.screen === 'closed' && a === '#ck-door.ck-door', 'L2: Esc -> closed, focus back on the opener (' + a + ')');
  check(T.errs.length === 0, 'L2: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L3(browser) {   /* touch: quiet verb button, still in the tab order and the accessibility tree; 5 s idle shows it */
  var T = await openPage(browser, { store: null });
  await T.tapEl('.ck-prop');
  await T.until(function (l) { return l.kind === 'tap'; }, 2000, 'tap');
  await T.go(700);
  var v = await T.verb(), l = await T.live();
  check(v.opacity === '0' && !v.hidden && l.quiet, 'L3: on touch the verb button is quiet (opacity 0) but in place');
  var named = await T.page.getByRole('button', { name: '톡톡' }).count();
  check(named === 1, 'L3: the quiet button is in the accessibility tree with its name (톡톡)');
  var tabbable = await T.page.evaluate(function () { var b = document.querySelector('.ck-verb'); return b.tabIndex >= 0 && !b.disabled; });
  await T.page.keyboard.press('Tab'); await T.go(50);
  var a = await T.active();
  check(tabbable && /ck-verb/.test(a), 'L3: Tab from the stage reaches it (' + a + ')');
  v = await T.verb();
  check(v.opacity === '1', 'L3: a focused verb button is always visible');
  await T.page.evaluate(function () { document.querySelector('.ck-stage').focus(); });
  await T.tap(20 * 2, 150 * 2);   /* a dust tap far from the marks: no progress, back to touch */
  await T.go(100);
  v = await T.verb();
  check(v.opacity === '0', 'L3: back to quiet when focus leaves and touch comes back');
  var idleSeen = false;
  for (var w = 0; w < 6000 && !idleSeen; w += 100) { await T.go(100); idleSeen = (await T.live()).hint === 'idle'; }
  v = await T.verb();
  check(idleSeen, 'L3: 5 s without progress -> one ghost hand');
  check(v.opacity === '1' && v.shown, 'L3: ... and from then on the verb button shows');
  await playTap(T);
  await T.until(function (x) { return x.kind === 'flip'; }, 3000, 'flip');
  v = await T.verb();
  check(v.shown && v.opacity === '1', 'L3: it stays visible in the next step (until the dish ends)');
  await playFlip(T, 500);
  await playSlice(T);
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(700); await T.tap(144, 150);
  await T.until(function (x) { return x.screen === 'counter'; }, 2000, 'counter');
  await T.go(700); await T.tapEl('.ck-prop');   /* past the counter's calm (TUNE.calmMs) */
  await T.until(function (x) { return x.screen === 'step'; }, 2000, 'step');
  await T.go(700);
  v = await T.verb();
  check(v.opacity === '0' && !v.shown, 'L3: the next dish starts quiet again');
  check(T.errs.length === 0, 'L3: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L4(browser) {   /* flip with the fake clock: bands, waiting, no early hint, band words only in aria-live */
  var cases = [[1000, 0, 'soft'], [4000, 1, 'golden'], [7000, 2, 'crisp']];
  for (var c = 0; c < cases.length; c++) {
    var T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=' + (40 + c) });
    await verbThrough(T, 'tap', 3);
    await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
    await T.go(700);
    await T.tap(144, 176); await T.go(cases[c][0]);
    await T.drag(line([144, 236], [145, 150], 5), 16);
    var l = await T.live();
    check(l.kind === 'flip' && l.tag === cases[c][2] && l.look.band === cases[c][1], 'L4: swipe up ' + cases[c][0] / 1000 + ' s after heat-on -> ' + cases[c][2] + ' (' + l.tag + ')');
    await T.done();
  }
  var T2 = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=50', aria: true });
  await verbThrough(T2, 'tap', 3);
  await T2.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T2.go(700);
  await T2.pause();   /* the hand is due 11 s after heat-on and the loop below stops 170 ms short of it: exact on a paused clock,
                         while a clock that also flows with real time loses that room on a slow machine (see L17) */
  await T2.tap(144, 176);
  var heat = (await T2.live()).st.heatAt, hintSeen = false;
  for (var w = 0; w < 10800; w += 400) { await T2.go(400); if ((await T2.live()).hint) hintSeen = true; }
  var l2 = await T2.live();
  check(!hintSeen && l2.st.heatAt === heat, 'L4: after heat-on no ghost hand before crisp + 5 s');
  await T2.go(500);
  l2 = await T2.live();
  check(l2.hint === 'idle' && l2.band === 2, 'L4: crisp + 5 s -> one ghost hand (the verb button shows)');
  check((await T2.verb()).shown, 'L4: ... and the verb button is revealed');
  await T2.go(50000);
  l2 = await T2.live();
  check(l2.kind === 'flip' && l2.phase === 'step' && !l2.done && l2.band === 2 && l2.progress === 0.5, 'L4: 60 s after heat-on it still waits at crisp (no burn, no auto flip)');
  var text = await T2.dlgText();
  check(BANDS.every(function (b) { return text.indexOf(b) < 0; }), 'L4: no band word anywhere in the visible DOM');
  var aria = await T2.aria();   /* read from the .ck-say node itself (MutationObserver), not from COOK.live().said */
  check(BANDS.every(function (b) { return aria.indexOf(b) >= 0; }), 'L4: every band word reached the aria-live node, once per change (' + aria.join(' ') + ')');
  check(aria.filter(function (s) { return BANDS.indexOf(s) >= 0; }).length === 3, 'L4: band words are not repeated');
  check(T2.errs.length === 0, 'L4: no errors ' + T2.errs.join(' | '));
  await T2.done();
}

async function L5(browser) {   /* layout at five sizes + DPR 2.625; notice keeps the stage still */
  var sizes = [[320, 460, 2], [320, 568, 2], [360, 560, 2], [360, 740, 2], [568, 320, 2], [360, 740, 2.625], [412, 915, 2.625]];
  for (var i = 0; i < sizes.length; i++) {
    var sz = sizes[i], tag = sz[0] + 'x' + sz[1] + '@' + sz[2];
    var T = await openPage(browser, { vp: { width: sz[0], height: sz[1] }, dpr: sz[2], store: SEEN_ALL });
    var m = await T.page.evaluate(function () {
      var d = document.querySelector('.ck-dlg');
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, dsw: d.scrollWidth, dcw: d.clientWidth, dpr: devicePixelRatio };
    });
    check(m.sw <= m.iw && m.dsw <= m.dcw, 'L5 ' + tag + ': no horizontal scroll (' + m.sw + '/' + m.iw + ', ' + m.dsw + '/' + m.dcw + ')');
    var close = await T.rect('.ck-close'), pan = await T.rect('.ck-prop'), stage = await T.rect('.ck-stage'), row = await T.rect('.ck-verbrow');
    check(close.w >= 44 && close.h >= 44 && pan.w >= 44 && pan.h >= 44, 'L5 ' + tag + ': close and pan >= 44 x 44');
    check(row.y >= 0 && row.b <= m.ih + 0.5 && row.h >= 56, 'L5 ' + tag + ': the verb row is fully on screen');
    check(stage.x >= 16 - 0.01 && stage.r <= m.iw - 16 + 0.01, 'L5 ' + tag + ': 16 px side gutters');
    var l = await T.live();
    check(Math.abs(stage.w - 144 * l.k / m.dpr) < 0.02 && Math.abs(stage.h - 160 * l.k / m.dpr) < 0.02 && l.k / m.dpr <= 3, 'L5 ' + tag + ': stage = 144k / dpr (k ' + l.k + ', ' + stage.w.toFixed(3) + ' px)');
    check(Math.abs(row.y - stage.b - 8) < 0.6, 'L5 ' + tag + ': the stage sits right above the verb row');
    function onDev(v) { var d = v * m.dpr; return Math.abs(d - Math.round(d)) <= 0.1; }   /* layout keeps 1/64 CSS px: a few hundredths of a device px are rounding, 0.25 (the old header) is not */
    check(onDev(stage.x) && onDev(stage.y) && onDev(stage.w) && onDev(stage.h), 'L5 ' + tag + ': the stage box sits on whole device pixels (' + [stage.x, stage.y].map(function (v) { return (v * m.dpr).toFixed(3); }).join(', ') + ')');
    await T.tapEl('.ck-prop');
    l = await T.until(function (x) { return x.kind === 'tap'; }, 2000, 'tap');
    var verb = await T.rect('.ck-verb');
    check(verb.h >= 44 && verb.w >= 44 && verb.b <= m.ih + 0.5, 'L5 ' + tag + ': the verb button >= 44 and on screen');
    await T.go(100);
    var icons = await T.page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('.ck-step canvas'), function (c) { var r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }); });
    check(icons.length === 3 && icons.every(function (r) { return r.every(onDev) && Math.abs(r[2] * m.dpr / 16 - Math.round(r[2] * m.dpr / 16)) < 0.01; }),
      'L5 ' + tag + ': step icons on whole device pixels, a whole number of device px per art px (' + icons.map(function (r) { return (r[0] * m.dpr).toFixed(2) + '/' + (r[1] * m.dpr).toFixed(2); }).join(' ') + ')');
    check(l.st.marks.every(function (mk) { var x = mk.x / 2, y = mk.y / 2; return x >= 8 && x <= 136 && y >= 8 && y <= 152; }), 'L5 ' + tag + ': tap marks >= 8 art px inside the stage');
    var before = await T.rect('.ck-stage'), act0 = await T.active();
    var ok = await T.page.evaluate(function () { return COOK.notice({ text: '돌아왔어. 보러 갈까?', short: '돌아왔어.', label: '보러 가기', fn: function () {} }); });
    await T.go(100);
    var after = await T.rect('.ck-stage'), note = await T.rect('.ck-note'), go = await T.rect('.ck-note-go'), head = await T.rect('.ck-head');
    check(ok && sameRect(before, after), 'L5 ' + tag + ': notice() does not move the stage');
    check(note.w > 0 && note.y >= 0 && go.h >= 44 && go.w >= 44, 'L5 ' + tag + ': the notice slot is on screen, its button >= 44');
    check((await T.active()) === act0, 'L5 ' + tag + ': notice() takes no focus');
    l = await T.live();
    if (l.tight) check(note.y >= head.y - 2 && note.b <= head.b + 2, 'L5 ' + tag + ': short screen -> the notice lies over the header');
    else check(note.b <= head.y, 'L5 ' + tag + ': the notice sits in the slot above the header');
    for (var p = 0; p < 20 && (await T.live()).kind !== 'slice'; p++) { await T.verbClick(); await T.go(350); }
    l = await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
    check(l.st.lines.every(function (ln) { return [ln.ax, ln.bx].every(function (x) { return x / 2 >= 8 && x / 2 <= 136; }) && [ln.ay, ln.by].every(function (y) { return y / 2 >= 8 && y / 2 <= 152; }); }),
      'L5 ' + tag + ': slice guides >= 8 art px inside the stage');
    check(T.errs.length === 0, 'L5 ' + tag + ': no errors ' + T.errs.join(' | '));
    await T.done();
  }
}

async function L6(browser) {   /* sound off is the main case: every counted input changes the next frame; AUDIO acts */
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=21' });
  await T.tapEl('.ck-prop');
  await T.until(function (x) { return x.kind === 'tap'; }, 2000, 'tap');
  await T.go(700);
  async function nextFrame(label, act) {
    var h0 = await T.hash(), f0 = (await T.live()).fx;
    await act();
    await realWait(40);
    await T.go(17);
    var h1 = await T.hash(), f1 = (await T.live()).fx;
    return { changed: h1 !== h0, fx: f1 > f0, label: label };
  }
  var dust = await nextFrame('dust', function () { return T.tap(40, 300); });
  await T.go(150);
  check(dust.changed && dust.fx && (await T.live()).progress === 0, 'L6: an uncounted tap off the food still shows (a speck on the board), no progress');
  var res = [], l = await T.live();
  for (var i = 0; i < l.st.marks.length; i++) for (var k = 0; k < 3; k++) {
    var mk = l.st.marks[i], p = await T.pt(mk.x + k - 1, mk.y + 1);
    res.push(await nextFrame('tap ' + (i * 3 + k), function () { return T.touch('touchStart', p); }));
    await T.go(30); await T.touch('touchEnd'); await T.go(150);
  }
  check(res.every(function (r) { return r.changed && r.fx; }), 'L6: each of the 9 counted taps changes the stage on the very next frame (' + res.filter(function (r) { return !(r.changed && r.fx); }).map(function (r) { return r.label; }).join(',') + ')');
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700);
  var c = await T.pt(144, 176);
  var heat = await nextFrame('heat', function () { return T.touch('touchStart', c); });
  await T.go(30); await T.touch('touchEnd'); await T.go(400);
  var nudge = await nextFrame('nudge', function () { return T.touch('touchStart', c); });
  await T.go(30); await T.touch('touchEnd'); await T.go(1500);
  check(heat.changed && heat.fx && nudge.changed && nudge.fx, 'L6: heat-on and a tap after it (a hop) both show on the next frame');
  var s0 = await T.pt(144, 236), s1 = await T.pt(144, 210), s2 = await T.pt(145, 180);
  await T.touch('touchStart', s0); await T.go(16); await T.touch('touchMove', s1); await T.go(16);
  var flip = await nextFrame('flip', function () { return T.touch('touchMove', s2); });
  await T.touch('touchEnd');
  check(flip.changed && flip.fx, 'L6: the flip shows on the next frame');
  await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  await T.go(700);
  l = await T.live();
  var ln = l.st.lines[0], pts = line([ln.ax - 10 * ln.ux, ln.ay - 10 * ln.uy], [ln.bx + 10 * ln.ux, ln.by + 10 * ln.uy], 16), sl = [];
  await T.touch('touchStart', await T.pt(pts[0][0], pts[0][1]));
  for (var j = 1; j < pts.length; j++) { var q = await T.pt(pts[j][0], pts[j][1]); sl.push(await nextFrame('slice ' + j, function () { return T.touch('touchMove', q); })); }
  await T.touch('touchEnd');
  check(sl.every(function (r) { return r.changed; }) && sl.some(function (r) { return r.fx; }), 'L6: every knife sample shows on the next frame (the kerf follows the hand)');
  await T.go(400);
  l = await T.live();
  check(l.st.lines[0].cut, 'L6: the line was cut by the drag');
  check(l.err === 0 && T.errs.length === 0, 'L6: no errors without AUDIO ' + T.errs.join(' | '));
  await T.done();

  /* with a fake AUDIO: the act table (design 5.5), quiet on every exit */
  var A = await openPage(browser, { store: null, audio: true, q: 'seed=22' });
  await A.tapEl('.ck-prop');
  await playTap(A); await playFlip(A, 3500); await playSlice(A);
  await A.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await A.go(800);
  var acts = await A.page.evaluate(function () { return window.__acts; });
  var names = acts.map(function (x) { return x.p.act; });
  check(acts.every(function (x) { return x.ch === 'cook'; }), 'L6: every call is AUDIO.on(\'cook\', ...)');
  ['pick', 'tap', 'cut', 'sizzle', 'flip', 'step', 'done'].forEach(function (n) { check(names.indexOf(n) >= 0, 'L6: act ' + n + ' sent'); });
  var tapI = acts.filter(function (x) { return x.p.act === 'tap'; }).map(function (x) { return x.p.i; });
  check(tapI.length === 9 && tapI.every(function (v, i) { return v === i; }), 'L6: tap acts carry i 0..8 (' + tapI.join(',') + ')');
  var pick = acts.filter(function (x) { return x.p.act === 'pick'; })[0], done = acts.filter(function (x) { return x.p.act === 'done'; })[0];
  check(pick && pick.p.dish === 'jeon' && done && done.p.dish === 'jeon', 'L6: pick and done carry the dish');
  var sz = acts.filter(function (x) { return x.p.act === 'sizzle'; }).map(function (x) { return x.p.band; });
  check(sz.join(',') === '0,1', 'L6: sizzle at heat-on (band 0) and at the band change (' + sz.join(',') + ')');
  var fi = names.indexOf('flip');
  check(fi >= 0 && names.slice(fi + 1).indexOf('quiet') >= 0 && names.slice(fi + 1, fi + 3).indexOf('quiet') >= 0, 'L6: quiet right after the flip');
  var steps = acts.filter(function (x) { return x.p.act === 'step'; });
  check(steps.length === 3 && steps.every(function (x) { var k = names.indexOf('quiet', acts.indexOf(x)); return k === acts.indexOf(x) + 1; }), 'L6: every step end is followed by quiet');
  var gaps = {}, FREE = ['tap', 'step', 'done', 'pick', 'quiet'];   /* js/cook.js SND_FREE: these skip the 120 ms gap (TUNE.sndGapMs) */
  acts.forEach(function (x) { var a = x.p.act; if (FREE.indexOf(a) >= 0) return; if (gaps[a] != null && x.t - gaps[a] < 120) gaps.bad = (gaps.bad || 0) + 1; gaps[a] = x.t; });
  check(!gaps.bad, 'L6: a rate-limited act (any but ' + FREE.join(', ') + ') is never sent twice within 120 ms');
  async function quietAfter(label, fn) {
    var n0 = await A.page.evaluate(function () { return window.__acts.length; });
    await fn(); await realWait(80); await A.go(100);   /* the dialog's close event comes on Chrome's next real frame */
    var tail = await A.page.evaluate(function (n) { return window.__acts.slice(n).map(function (x) { return x.p.act; }); }, n0);
    check(tail.indexOf('quiet') >= 0, 'L6: quiet on ' + label + ' (' + tail.join(',') + ')');
  }
  await A.go(300); await A.tap(144, 150); await A.go(700); await A.tapEl('.ck-prop'); await A.go(900);
  await quietAfter('hidden tab', function () {
    return A.page.evaluate(function () {
      Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'hidden'; } });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  });
  await A.page.evaluate(function () { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  await quietAfter('close', function () { return A.page.evaluate(function () { COOK.close(); }); });
  await A.page.evaluate(function () { document.getElementById('ck-door').click(); });
  await A.go(400);
  await A.page.evaluate(function () { COOK.notice({ text: '돌아왔어.', short: '돌아왔어.', label: '보러 가기', fn: function () {} }); });
  await A.go(100);
  await quietAfter('notice go', function () { return A.tapEl('.ck-note-go'); });
  check(A.errs.length === 0, 'L6: no errors with AUDIO ' + A.errs.join(' | '));
  await A.done();
}

async function L7(browser) {   /* reduced motion: no shake, squash, particles, arc; still ghost hand; rim and dents stay */
  var T = await openPage(browser, { reduced: true, store: null, q: 'reduced=1&seed=31' });
  await T.tapEl('.ck-prop');
  await T.until(function (x) { return x.kind === 'tap'; }, 2000, 'tap');
  await T.go(700);
  await T.pause();   /* the idle hand comes 5 s after the tap below and stays 1 s; the three pictures of it are taken 5.5 to 5.7 s
                        after the tap: exact on a paused clock (see L17) */
  var l = await T.live(), mk = l.st.marks[0];
  check(l.reduced, 'L7: reduced motion is on');
  var h0 = await T.hash(), p = await T.pt(mk.x, mk.y);
  await T.touch('touchStart', p); await T.go(17);
  var h1 = await T.hash(); await T.touch('touchEnd'); await T.go(200);
  check(h1 !== h0, 'L7: a counted tap still shows on the next frame (bright rim + dent)');
  await T.go(5300);
  l = await T.live();
  check(l.hint === 'idle', 'L7: the idle ghost hand still comes');
  var a = await T.hash(); await T.go(84); var b = await T.hash(); await T.go(84); var c = await T.hash();
  check(a === b && b === c, 'L7: ... as a still pose (no frame changes)');
  await playTap(T); await playFlip(T, 3500); await playSlice(T);
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(800);
  check(l.look.dents.length === 9, 'L7: dents stay');
  check(l.stats.squash === 0 && l.stats.shake === 0 && l.stats.parts === 0 && l.stats.arc === 0, 'L7: no squash, shake, particles or arc (' + JSON.stringify(l.stats) + ')');
  check(T.errs.length === 0, 'L7: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L8() {   /* reload in the middle of step 2: '이어서' on the pan, step 2 from its start, step 1 look kept */
  var bA = await chromium.launch(), store = null;
  try {
    var T = await openPage(bA, { store: SEEN_ALL, q: 'recipe=jeon&seed=77' });
    await verbThrough(T, 'tap', 3);
    await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
    await T.go(700); await T.tap(144, 176); await T.go(1200);   /* mid step 2: heat is on */
    store = await T.store();
    check(store && store.pot && store.pot.si === 1 && store.pot.looks.length === 1, 'L8: the pot was saved at the step boundary (si 1)');
    await T.done();
  } finally { await bA.close(); }
  var bB = await chromium.launch();   /* a separate browser instance; the pot is planted before the page runs */
  try {
    var R = await openPage(bB, { store: JSON.stringify(store) });
    var lab = await R.page.evaluate(function () { var b = document.querySelector('.ck-prop'); return [b.getAttribute('aria-label'), b.textContent]; });
    check(lab[0] === '해초전, 이어서' && lab[1] === '이어서', 'L8: the pan says 이어서 (' + lab.join(' / ') + ')');
    check((await R.live()).pending, 'L8: live() sees the pot');
    await R.tapEl('.ck-prop');
    var l = await R.until(function (x) { return x.screen === 'step'; }, 2000, 'step');
    check(l.si === 1 && l.kind === 'flip' && l.st.heat === false && l.progress === 0, 'L8: resume restarts step 2 from its start (heat off)');
    check(JSON.stringify(l.look.dents) === JSON.stringify(store.pot.looks[0].dents) && l.id === store.pot.runId && l.seed === store.pot.seed, 'L8: step 1 look, run id and seed kept');
    check(R.errs.length === 0, 'L8: no errors ' + R.errs.join(' | '));
    await R.done();
  } finally { await bB.close(); }
}

async function L9(browser) {   /* bad pots are dropped quietly */
  var good = { v: 1, day: '2026-11-08', dayN: 1, seen: [], pot: null, book: [] };
  var tuneOf = await (async function () {
    var T = await openPage(browser, { store: null });
    var t = await T.page.evaluate(function () { return [COOK.VERSION, COOK.TUNE_HASH]; });
    await T.done(); return t;
  })();
  var pot = { ver: tuneOf[0], tune: tuneOf[1], runId: 'ck_abc', seed: 5, recipe: 'jeon', swaps: { herb: 'parae' }, si: 1, looks: [{ dents: [] }], tags: [null], at: 0 };
  var variants = [
    ['old ver', JSON.stringify(Object.assign({}, good, { pot: Object.assign({}, pot, { ver: 'cook-0' }) }))],
    ['other tune', JSON.stringify(Object.assign({}, good, { pot: Object.assign({}, pot, { tune: 12345 }) }))],
    ['broken JSON', '{"v":1,"pot":{"ver":'],
    ['cut JSON', JSON.stringify(Object.assign({}, good, { pot: pot })).slice(0, 60)]
  ];
  for (var i = 0; i < variants.length; i++) {
    var T = await openPage(browser, { store: variants[i][1] });
    var l = await T.live(), lab = await T.page.evaluate(function () { return document.querySelector('.ck-prop').getAttribute('aria-label'); });
    check(l.screen === 'counter' && !l.pending && lab === '해초전', 'L9 ' + variants[i][0] + ': the counter opens without 이어서');
    await T.tapEl('.ck-prop');
    l = await T.until(function (x) { return x.screen === 'step'; }, 2000, 'step');
    check(l.si === 0, 'L9 ' + variants[i][0] + ': the pan starts a new dish');
    check(T.errs.length === 0 && l.err === 0, 'L9 ' + variants[i][0] + ': no errors ' + T.errs.join(' | '));
    await T.done();
  }
  /* the good pot does resume (control) */
  var G = await openPage(browser, { store: JSON.stringify(Object.assign({}, good, { pot: pot })) });
  check((await G.live()).pending, 'L9 control: a valid pot shows 이어서');
  await G.done();
}

async function L10(browser) {   /* storage full: play, close, notice, go -> no error anywhere */
  var T = await openPage(browser, { full: true, q: 'seed=9' });
  await T.page.evaluate(function () { COOK.auto(true); });
  var l = await T.until(function (x) { return x.screen === 'reveal'; }, 15000, 'reveal');
  check(l.done, 'L10: a whole dish with a full storage');
  l = await T.until(function (x) { return x.screen === 'counter'; }, 3000, 'counter');
  await T.page.evaluate(function () { COOK.close(); });
  await T.go(200);
  await T.page.evaluate(function () { document.getElementById('ck-door').click(); });
  await T.go(400);
  await T.tapEl('.ck-prop'); await T.go(500);
  var ran = await T.page.evaluate(function () { window.__ran = 0; return COOK.notice({ text: '돌아왔어.', short: '돌아왔어.', label: '보러 가기', fn: function () { window.__ran++; } }); });
  await T.go(100); await T.tapEl('.ck-note-go'); await T.go(200);
  var after = await T.page.evaluate(function () { return [window.__ran, COOK.isOpen()]; });
  check(ran && after[0] === 1 && after[1] === false, 'L10: notice and 보러 가기 still work');
  check(T.errs.length === 0, 'L10: no page errors ' + T.errs.join(' | '));
  await T.done();
}

async function L11(browser) {   /* Enter held down: one press */
  var T = await openPage(browser, { touch: false, store: SEEN_ALL });
  await T.page.keyboard.press('Enter'); await T.go(800);
  var reps = await T.page.evaluate(function () { window.__rep = 0; document.addEventListener('keydown', function (e) { if (e.repeat) window.__rep++; }, true); return true; });
  await T.page.keyboard.down('Enter');
  for (var i = 0; i < 6; i++) { await T.go(40); await T.page.keyboard.down('Enter'); }
  await T.page.keyboard.up('Enter'); await T.go(100);
  var l = await T.live(), r = await T.page.evaluate(function () { return window.__rep; });
  check(reps && r >= 5, 'L11: the browser sent repeated keydowns (' + r + ')');
  check(l.st.hits === 3, 'L11: a held Enter presses the verb button once (3 hits on one mark, got ' + l.st.hits + ')');
  check(T.errs.length === 0, 'L11: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L12(browser) {   /* the notice slot: shown, no focus taken, 보러 가기 saves, closes, then fn */
  var sizes = [[360, 740], [320, 460]];
  for (var s = 0; s < sizes.length; s++) {
    var tag = sizes[s][0] + 'x' + sizes[s][1];
    var T = await openPage(browser, { vp: { width: sizes[s][0], height: sizes[s][1] }, store: SEEN_ALL, aria: true });
    await T.tapEl('.ck-prop');
    await T.until(function (x) { return x.kind === 'tap'; }, 2000, 'tap');
    await T.go(700);
    var act0 = await T.active(), st0 = await T.rect('.ck-stage');
    await T.page.evaluate(function () {
      window.__log = [];
      COOK.notice({ text: '뚜루가 돌아왔어.', short: '돌아왔어.', label: '보러 가기', fn: function () { window.__log.push(['fn', COOK.isOpen(), document.querySelector('.ck-dlg').open]); } });
    });
    await T.go(150);
    var l = await T.live(), txt = await T.page.evaluate(function () { return document.querySelector('.ck-note-t').textContent; });
    check(l.note && (await T.active()) === act0 && sameRect(st0, await T.rect('.ck-stage')), 'L12 ' + tag + ': the notice shows, focus and stage stay');
    check(txt === (l.tight ? '돌아왔어.' : '뚜루가 돌아왔어.'), 'L12 ' + tag + ': ' + (l.tight ? 'short' : 'full') + ' text in the slot (' + txt + ')');
    if (l.tight) check(await T.page.evaluate(function () { return getComputedStyle(document.querySelector('.ck-strip')).visibility === 'hidden'; }), 'L12 ' + tag + ': the strip steps aside on a short screen');
    check((await T.aria()).filter(function (x) { return x === '뚜루가 돌아왔어.'; }).length === 1, 'L12 ' + tag + ': read once by the aria-live node');
    await T.page.evaluate(function () { localStorage.removeItem('ppolppol_cook_v0'); });
    await T.tapEl('.ck-note-go');
    await T.go(100);
    var log = await T.page.evaluate(function () { return window.__log; }), store = await T.store(), a = await T.active();
    check(log.length === 1 && log[0][1] === false && log[0][2] === false, 'L12 ' + tag + ': fn ran once, after the dialog closed');
    check(store && store.pot && store.pot.si === 0, 'L12 ' + tag + ': 보러 가기 saved the pot first');
    check(a !== '#ck-door.ck-door', 'L12 ' + tag + ': focus does not go back to the opener (the host decides)');
    check(T.errs.length === 0, 'L12 ' + tag + ': no errors ' + T.errs.join(' | '));
    await T.done();
  }
}

async function L13(browser) {   /* ?rec=1 touch session replayed by COOK.simulate in node -> same look */
  var T = await openPage(browser, { store: null, q: 'rec=1&seed=1234' });
  await T.tapEl('.ck-prop');
  await playTap(T); await playFlip(T, 4200); await playSlice(T);
  var l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var rec = await T.page.evaluate(function () { return window.__cookRec; });
  await T.done();
  var sb = { console: console, Math: Math, JSON: JSON };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cook.js'), 'utf8'), sb, { filename: 'cook.js' });
  var r = sb.COOK.simulate(rec.recipe, rec.seed, JSON.parse(JSON.stringify(rec.steps)));
  check(rec && rec.steps.length === 3 && rec.steps.every(function (x) { return x.length > 0; }), 'L13: the touch session was recorded (' + rec.steps.map(function (x) { return x.length; }).join(',') + ' events)');
  check(r.done && JSON.stringify(r.look) === JSON.stringify(l.look), 'L13: node simulate() replays it to the same look');
}

async function L14(browser) {   /* DOM text: no N/M counts, no digits on any screen; console errors 0 across the run */
  var T = await openPage(browser, { store: null, q: 'seed=3' }), texts = [];
  texts.push(await T.dlgText());
  await T.pause();   /* the loop presses the verb button three times a step, 300 ms apart; the slice step is done at the second
                        press and 400 ms later the same button means "back". Paused, the third press always falls before that */
  await T.tapEl('.ck-prop');
  for (var k = 0; k < 3; k++) {
    await T.until(function (x) { return x.phase === 'step' && x.si === k; }, 3000, 'step ' + k);
    await T.go(300); texts.push(await T.dlgText());
    await T.go(400);
    for (var p = 0; p < 3; p++) { await T.verbClick(); await T.go(300); }
  }
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(700); texts.push(await T.dlgText());
  await T.page.evaluate(function () { COOK.notice({ text: '돌아왔어.', short: '돌아왔어.', label: '보러 가기', fn: function () {} }); });
  texts.push(await T.dlgText());
  var page = await T.page.evaluate(function () { return document.body.textContent; });
  texts.push(page);
  check(texts.every(function (t) { return !/\d+\s*\/\s*\d+/.test(t); }), 'L14: no N/M count in the DOM text');
  check(texts.slice(0, -1).every(function (t) { return !/\d/.test(t); }), 'L14: no digits in the kitchen at all');
  check(T.errs.length === 0, 'L14: no console errors ' + T.errs.join(' | '));
  await T.done();
  check(errAll.length === 0, 'L14: no console or page errors in the whole run (' + errAll.length + ')');
}

/* ---------- second pass: the verifier findings, each as a check ---------- */
async function toFlipQuiet(T) {   /* tap step by touch (the verb button stays quiet), then the flip step with the heat on */
  await T.tapEl('.ck-prop');
  await playTap(T);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip');
  await T.go(700); await T.tap(144, 176); await T.go(1000);
}
async function rowPoint(T) { var r = await T.rect('.ck-verbrow'); return [r.x + r.w / 2, r.y + r.h / 2]; }

async function L15(browser) {   /* the quiet verb row: a stray touch only shows the button; a flick from it still flips; a click
                                   with no pointer press (keyboard, screen reader) acts at once */
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=61' });
  await T.tapEl('.ck-prop');
  await T.until(function (x) { return x.kind === 'tap' && x.phase === 'step'; }, 3000, 'tap');
  await T.go(700);
  var rp = await rowPoint(T), v0 = await T.verb();
  await T.tapCss(rp);
  var l = await T.live(), v1 = await T.verb();
  check(v0.opacity === '0' && v1.opacity === '1' && l.st.hits === 0, 'L15: tap step - a touch on the quiet verb row shows the button and counts nothing (hits ' + l.st.hits + ')');
  await T.tapCss(rp); await T.go(100);
  check((await T.live()).st.hits === 3, 'L15: once shown, a touch on the button presses it (one mark, 3 hits)');
  check(T.errs.length === 0, 'L15: no errors (tap) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=62' });
  await toFlipQuiet(T);
  check((await T.verb()).opacity === '0', 'L15: flip step after heat-on, the verb button is still quiet');
  await T.tapCss(await rowPoint(T)); await T.go(300);
  l = await T.live();
  check(l.kind === 'flip' && l.phase === 'step' && l.st.res === null && (await T.verb()).opacity === '1', 'L15: flip - a stray touch on the quiet row never flips (the button shows instead)');
  check(T.errs.length === 0, 'L15: no errors (stray) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=63' });
  await toFlipQuiet(T);
  var p0 = await rowPoint(T);
  await T.touch('touchStart', p0);
  for (var i = 1; i <= 5; i++) { await T.go(14); await T.touch('touchMove', [p0[0] + i, p0[1] - i * 22]); await realWait(20); }
  await T.go(14); await T.touch('touchEnd'); await realWait(40); await T.go(50);
  l = await T.live();
  check((l.kind === 'flip' && l.st.res === 0) || l.si === 2, 'L15: flip - a thumb flick that starts on the quiet row (below the stage) flips (' + JSON.stringify([l.kind, l.st && l.st.res, l.si]) + ')');
  check(T.errs.length === 0, 'L15: no errors (flick) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=64' });
  await toFlipQuiet(T);
  await T.verbClick(); await T.go(50);   /* element.click(): what a keyboard or a screen reader press gives (no pointer press) */
  l = await T.live();
  check((l.kind === 'flip' && l.st.res === 0) || l.si === 2, 'L15: a click with no pointer press on the quiet button acts at once (flips)');
  check(T.errs.length === 0, 'L15: no errors (click) ' + T.errs.join(' | '));
  await T.done();
}

async function L16(browser) {   /* hints: a first demo is not wiped by presses that change nothing; re-teach after nudges; the
                                   reveal shows the way back after 5 s; a second tap on the plate does not start a new dish */
  var T = await openPage(browser, { store: JSON.stringify({ v: 1, day: '', dayN: 0, seen: ['tap', 'slice'], pot: null, book: [] }), q: 'seed=71' });
  await T.tapEl('.ck-prop');
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(2200);   /* the first-time heat-on demo plays out */
  await T.pause();    /* the up-swipe demo lasts 1 s from heat-on and the presses below take 810 ms of it: paused, so that a slow
                         machine cannot stretch them past its end */
  await T.tap(144, 176); await T.go(60);
  var l = await T.live();
  check(l.hint === 'demo', 'L16: heat on, first time -> the up-swipe demo (' + l.hint + ')');
  for (var i = 0; i < 4; i++) { await T.tap(130 + i * 6, 180); await T.go(150); }   /* nudges: they change nothing */
  l = await T.live();
  var seen = (await T.store()).seen;
  check(l.hint === 'demo' && seen.indexOf('flip') < 0, 'L16: presses that change nothing do not wipe the demo, and flip is not marked seen yet (' + l.hint + ', ' + seen.join(',') + ')');
  await T.go(600);
  seen = (await T.store()).seen;
  check((await T.live()).hint !== 'demo' && seen.indexOf('flip') >= 0, 'L16: after the demo has played to its end, flip counts as seen');
  for (i = 0; i < 3; i++) { await T.tap(130 + i * 6, 180); await T.go(150); }
  l = await T.live();
  check(l.hint === 'teach' && l.stats.teach === 1 && (await T.verb()).opacity === '1', 'L16: three presses that do not flip -> the up-swipe hand once more and the verb button shows');
  for (i = 0; i < 30; i++) { await T.tap(130 + (i % 4) * 6, 180); await T.go(150); }
  check((await T.live()).stats.teach === 2, 'L16: the re-teach hand comes at most twice a step');
  check(T.errs.length === 0, 'L16: no errors (hints) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=72' });
  await T.tapEl('.ck-prop');
  await playTap(T); await playFlip(T, 1500);
  await T.pause();    /* from the last cut on, the times count: the plate's hand shows 5.45 to 6.45 s after the reveal, and the
                         second tap must land within 500 ms of the way back. Paused before the cuts, so both are exact */
  await playSlice(T);
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(600);
  check((await T.verb()).opacity === '0' && !(await T.live()).hint, 'L16: reveal on touch, at first nothing extra shows');
  await T.go(5000);
  l = await T.live();
  check(l.hint === 'idle' && (await T.verb()).opacity === '1' && (await T.verb()).text === '돌아가기', 'L16: 5 s with the plate up -> one tap hand on the plate and 돌아가기 shows');
  await T.go(1500);
  check((await T.live()).screen === 'reveal', 'L16: ... and it does not go back by itself');
  var plate = await T.pt(144, 172);
  await T.tapCss(plate);
  await T.until(function (x) { return x.screen === 'counter'; }, 2000, 'counter');
  await T.go(260); await T.tapCss(plate); await T.go(400);
  check((await T.live()).screen === 'counter', 'L16: a second tap on the plate 300 ms later stays on the counter (no new dish)');
  await T.go(400); await T.tapEl('.ck-prop'); await T.go(100);
  check((await T.live()).screen === 'step', 'L16: a tap on the pan after the calm starts the next dish');
  check(T.errs.length === 0, 'L16: no errors (reveal) ' + T.errs.join(' | '));
  await T.done();
}

async function L17(browser) {   /* brief items: 24 px edge, 600 ms title and tap-dismiss, first-seen demos, name tag delay, ?slow=4,
                                   a bright rim that lasts one 12 fps frame */
  var T = await openPage(browser, { vp: { width: 320, height: 568 }, store: JSON.stringify({ v: 1, day: '', dayN: 0, seen: [], pot: null, book: [] }), q: 'seed=81' });
  /* the title's 600 ms is timed on a paused clock: Playwright's installed clock otherwise also flows with real time
     between runFor calls, so a busy machine or a cold first frame could eat the 50 ms margin of the 550 ms check.
     Paused before the tap, on the idle counter (T.pause: a little ahead, and again with more room if a slow machine
     has already passed that point). From here to the end of this page the checks do not depend on how fast the machine
     is: the demo's end, the one-frame rim, the next step's title and the tap that takes it down are timed as well. */
  await T.pause();
  await T.tapEl('.ck-prop');
  var l = await T.live();
  for (var w0 = 0; w0 < 200 && !(l.kind === 'tap' && l.title); w0++) { await T.go(10); l = await T.live(); }
  check(l.kind === 'tap' && l.title, 'L17: a step opens with its title tag');
  await T.go(550); check((await T.live()).title, 'L17: ... still there at 550 ms');
  await T.go(100); l = await T.live();
  check(!l.title && l.hint === 'demo', 'L17: the title goes at 600 ms, then the first-time demo hand plays (' + l.hint + ')');
  check((await T.store()).seen.indexOf('tap') < 0, 'L17: tap is not marked seen while its demo plays');
  await T.go(1100);
  check((await T.store()).seen.indexOf('tap') >= 0, 'L17: tap is marked seen once its demo has played');
  var st = await T.rect('.ck-stage'), mk = l.st.marks[0], fx0 = (await T.live()).fx, py = st.y + mk.y * st.h / 320;
  await T.tapCss([st.x + 4, py]);   /* inside the stage but within 24 CSS px of the screen edge */
  l = await T.live();
  check(st.x + 4 < 24 && l.fx === fx0 && l.st.hits === 0, 'L17: a touch that starts within 24 px of the screen edge is ignored (x ' + (st.x + 4) + ')');
  await T.tapCss([st.x + 30, py]);
  check((await T.live()).fx > fx0, 'L17: ... and 30 px in it counts (a speck or a hit)');
  var p = await T.pt(mk.x, mk.y), h0 = await T.hash();
  await T.touch('touchStart', p); await realWait(40); await T.go(17);
  var h1 = await T.hash(); await T.go(84); var h2 = await T.hash(); await T.touch('touchEnd');
  check(h1 !== h0 && h2 !== h1, 'L17: the bright rim shows on the next frame and is gone one 12 fps frame later');
  await T.go(300);
  for (var i = 0; i < 9; i++) { await T.verbClick(); await T.go(300); if ((await T.live()).kind !== 'tap') break; }
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  check((await T.live()).title, 'L17: the next step opens with its title');
  await T.go(300); await T.tap(144, 176); await T.go(20);
  check(!(await T.live()).title, 'L17: a tap takes the title down at once');
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=82' });
  await T.tapEl('.ck-prop');
  await verbThrough(T, 'tap', 3); await verbThrough(T, 'flip', 2); await verbThrough(T, 'slice', 2);
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var tag0 = await T.page.evaluate(function () { return document.querySelector('.ck-name').hidden; });
  await T.go(450);
  var tag1 = await T.page.evaluate(function () { var n = document.querySelector('.ck-name'); return !n.hidden && n.textContent; });
  check(tag0 === true && tag1 === '해초전', 'L17: the name tag waits for the plate to rise, then reads 해초전');
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=83&slow=4' });
  await T.tapEl('.ck-prop');
  await T.until(function (x) { return x.screen === 'step'; }, 2000, 'step');
  await T.go(1500); l = await T.live();
  check(l.slow === 4 && l.title, 'L17: ?slow=4 stretches every time (the title is still up at 1.5 s)');
  await T.go(1200);
  check(!(await T.live()).title, 'L17: ... and goes at 2.4 s');
  check(T.errs.length === 0, 'L17: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L18(browser) {   /* run id without a clock, kitchen keys only, sizzle back after a hidden tab, auto after the counter
                                   calm, a lost pointer capture frees the finger, a resumed ?rec=1 recording replays */
  var ids = [];
  for (var c = 0; c < 2; c++) {
    var T = await openPage(browser, { store: null, crypto: 7, q: 'seed=91' });
    if (c === 1) await T.page.clock.setSystemTime(new Date('2026-11-08T15:00:00'));   /* five hours later the same day (Date.now only) */
    await T.tapEl('.ck-prop'); await T.go(100);
    ids.push((await T.live()).id);
    await T.done();
  }
  var T3 = await openPage(browser, { store: null, crypto: 8, q: 'seed=91' });
  await T3.tapEl('.ck-prop'); await T3.go(100); ids.push((await T3.live()).id); await T3.done();
  check(ids[0] && ids[0] === ids[1] && ids[2] !== ids[0], 'L18: the run id does not change with the time a dish starts, only with its random salt (' + ids.join(' ') + ')');

  var MAIN = 'ppolppol_' + 'v2';   /* the main game's save key (never in the cook files) */
  var K = await openPage(browser, { store: SEEN_ALL });
  var r = await K.page.evaluate(function (key) {
    localStorage.setItem(key, '{"fake":"main save"}');
    COOK.close();
    var a = COOK.open({ storeKey: key }), k = COOK.live().key;
    var imp = COOK.importData({ book: [] }, key), exp = COOK.exportData(key);
    return { open: a, key: k, imp: imp, exp: exp, main: localStorage.getItem(key) };
  }, MAIN);
  check(r.open && r.key === 'ppolppol_cook' && r.imp === false && r.exp === null && r.main === '{"fake":"main save"}', 'L18: only kitchen keys: the main save key falls back to ppolppol_cook and is never written (' + JSON.stringify(r) + ')');
  await K.done();

  var A = await openPage(browser, { store: SEEN_ALL, audio: true, q: 'seed=92' });
  await A.tapEl('.ck-prop'); await verbThrough(A, 'tap', 3);
  await A.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await A.go(700); await A.tap(144, 176); await A.go(3500);
  var n0 = await A.page.evaluate(function () { return window.__acts.length; });
  await A.page.evaluate(function () {
    Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
  });
  var tail = await A.page.evaluate(function (n) { return window.__acts.slice(n).map(function (x) { return x.p.act + (x.p.band != null ? x.p.band : ''); }); }, n0);
  check(tail.join(',') === 'quiet,sizzle1', 'L18: hidden then shown with the pan on -> quiet, then the sizzle again at the band now (' + tail.join(',') + ')');
  await A.done();

  var U = await openPage(browser, { store: SEEN_ALL, q: 'seed=93' });
  await U.page.evaluate(function () { COOK.auto(true); });
  await U.until(function (x) { return x.screen === 'counter' && x.done === false && x.frames > 0 && x.recipe === null && x.fx > 0; }, 15000, 'back on the counter');
  await U.go(20);
  await U.page.evaluate(function () { COOK.auto(true); });
  var u = await U.until(function (x) { return x.screen === 'step'; }, 3000, 'auto again');
  check(u.screen === 'step', 'L18: COOK.auto(true) right after returning to the counter still starts the next dish');
  await U.done();

  var P = await openPage(browser, { store: SEEN_ALL, q: 'seed=94' });
  await P.tapEl('.ck-prop'); await verbThrough(P, 'tap', 3); await verbThrough(P, 'flip', 2);
  await P.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  await P.go(700);
  await P.page.evaluate(function () {   /* a finger whose up never arrives (synthetic: the browser cannot drop one on cue) */
    var st = document.querySelector('.ck-stage'), r = st.getBoundingClientRect(), o = { pointerId: 77, pointerType: 'touch', isPrimary: true, clientX: r.left + 20, clientY: r.bottom - 20, bubbles: true };
    st.dispatchEvent(new PointerEvent('pointerdown', o));
    st.dispatchEvent(new PointerEvent('lostpointercapture', o));
  });
  var ln = (await P.live()).st.lines[0];
  await P.drag(line([ln.ax - 10 * ln.ux, ln.ay - 10 * ln.uy], [ln.bx + 10 * ln.ux, ln.by + 10 * ln.uy], 20), 16);
  await realWait(40); await P.go(100);
  check((await P.live()).st.lines[0].cut, 'L18: after a lost pointer capture, the next finger cuts (flip and slice follow one finger)');
  check(P.errs.length === 0, 'L18: no errors ' + P.errs.join(' | '));
  await P.done();

  var store = null;
  var R0 = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=95' });
  await verbThrough(R0, 'tap', 3);
  await R0.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  store = await R0.store(); await R0.done();
  var R = await openPage(browser, { store: JSON.stringify(store), q: 'rec=1' });
  await R.tapEl('.ck-prop');
  await R.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'resumed flip');
  await playFlip(R, 3500); await playSlice(R);
  var lr = await R.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var rec = await R.page.evaluate(function () { return window.__cookRec; });
  await R.done();
  var sb = { console: console, Math: Math, JSON: JSON };
  vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cook.js'), 'utf8'), sb, { filename: 'cook.js' });
  var out = sb.COOK.simulate(rec.recipe, rec.seed, JSON.parse(JSON.stringify(rec.steps)), { pot: JSON.parse(JSON.stringify(rec.pot)) });
  check(rec.pot && rec.pot.si === 1 && out.done && JSON.stringify(out.look) === JSON.stringify(lr.look), 'L18: a ?rec=1 recording of a resumed dish replays in node with { pot } to the same look');
}

/* ---------- third pass: the art wiring ---------- */
async function L19(browser) {   /* what cook.js hands the scene painters, frame by frame: seed, fh (12 fps frames since heat-on), fbc
                                   (since the last band change), fl (since the flip landed), t (reveal frame), still - and that a
                                   frame is painted the moment one of them moves. The clock is paused before the page loads, so
                                   every time below is exact, however slow the machine is. */
  var FMS = 1000 / 12, LAND = 3 * FMS;   /* cook.js: the landing frame (fl 0) is arc frame 3, three 12 fps frames after the flick */
  var T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=101', art: true, paused: true });
  function frames(from, at) { return Math.floor((at - from) / FMS); }   /* whole 12 fps frames from an event to a moment */
  function of(list, s) { return list.filter(function (r) { return r.s === s; }); }
  function vals(list, k) { return list.map(function (r) { return r[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }); }
  /* the frames lo..hi of counter k (it started at `from`) that were not painted within one display frame (17 ms) of their own start */
  function late(recs, k, from, lo, hi) { var out = []; for (var i = lo; i <= hi; i++) if (!recs.some(function (r) { var d = r.now - (from + i * FMS); return r[k] === i && d > -0.01 && d < 17; })) out.push(i); return out; }
  /* run the clock on until the moment `ahead` ms from then lies `ms` into a global 12 fps frame (those start at T.t0 + n * FMS).
     A counter started there ticks in the middle of global frames: a paint on time for it can only come from the counter itself */
  async function toPhase(ms, ahead) { var n = await T.now(), x = n; while (Math.floor((x + (ahead || 0) - T.t0) % FMS) !== ms) x++; await T.go(x - n); return x; }
  /* wait in real time, the clock standing still, until the page has handled the touch just sent */
  async function handled(fn, label) { for (var w = 0; w < 400; w++) { if (fn(await T.live())) return; await realWait(10); } throw new Error('timeout: ' + label); }

  await verbThrough(T, 'tap', 3);
  var l = await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700);
  var bandMs = l.st.bandMs, per = frames(0, bandMs), cold = of(await T.art(), 'flipScene');
  check(cold.length > 0 && cold.every(function (r) { return r.heat === false && r.fh === null && r.fbc === null && r.fl === null; }), 'L19: a cold pan gets no counters (fh, fbc and fl are null)');

  var heatAt = await toPhase(33);
  await T.touch('touchStart', await T.pt(144, 176));
  await handled(function (x) { return x.st && x.st.heat; }, 'heat');
  await T.go(30); await T.touch('touchEnd');
  await T.go(2 * bandMs + 170);                          /* soft, golden, then 200 ms into crisp */
  var s0 = await T.pt(144, 236), s1 = await T.pt(145, 150);
  await T.touch('touchStart', s0);
  var flipAt = await toPhase(33), landAt = flipAt + LAND;
  await T.touch('touchMove', s1);                        /* one long move up: the flick */
  await handled(function (x) { return x.st && x.st.res != null; }, 'flip');   /* Chrome hands a touchmove over on its next real frame */
  await T.go(16); await T.touch('touchEnd');
  await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  await T.go(1400);
  await T.verbClick(); await T.go(300);                  /* first line */
  /* second line: the plate comes betweenOf('slice') later, on the next display frame. Cut so that this is mid global frame too */
  var gap = await T.page.evaluate(function () { return COOK.betweenOf('slice'); }), cutAt = await toPhase(33, gap);
  await T.verbClick();
  await T.go(gap + 2000);

  var all = await T.art(), pan = of(all, 'flipScene').filter(function (r) { return r.heat === true; }), board = of(all, 'sliceScene'), plate = of(all, 'revealScene');
  var plateAt = plate.length ? plate[0].now : 0;         /* the first reveal frame */
  check(of(all, 'flipScene').concat(board).every(function (r) { return r.f === frames(T.t0, r.now); }), 'L19: f is the global 12 fps frame of the kitchen clock (so the events sit where toPhase put them)');
  var kh = pan.length ? frames(heatAt, pan[pan.length - 1].now) : -1;
  check(pan.length > 0 && pan.every(function (r) { return r.fh === frames(heatAt, r.now); }) && vals(pan, 'fh').length === kh + 1,
    'L19: fh = 12 fps frames since heat-on, on every frame of the hot pan, none skipped (0..' + kh + ')');
  var gold = pan.filter(function (r) { return r.band === 1; }), crisp = pan.filter(function (r) { return r.band === 2; });
  check(pan.length > 0 && pan.every(function (r) { return r.fbc === (r.band > 0 ? frames(heatAt + r.band * bandMs, r.now) : null); }) && pan[0].fbc === null &&
    gold.length > 0 && gold[0].fbc === 0 && gold[gold.length - 1].fbc === per - 1 && crisp.length > 0 && crisp[0].fbc === 0 && crisp[crisp.length - 1].fbc > 0,
    'L19: fbc is null while soft, back at 0 on each band change (golden, crisp) and counts from there (golden ' + JSON.stringify(vals(gold, 'fbc').slice(0, 3)) + ' .., crisp ' + JSON.stringify(vals(crisp, 'fbc').slice(0, 3)) + ' ..)');
  var lateFh = late(pan, 'fh', heatAt, 2, per - 1);
  check(lateFh.length === 0, 'L19: each fh frame is painted as it begins (within one display frame), not held until the next global frame (late: ' + lateFh.join(',') + ')');
  function fl(r) { return r.now >= landAt ? frames(landAt, r.now) : null; }
  var arc = pan.filter(function (r) { return r.now >= flipAt && r.now < landAt; });
  check(pan.length > 0 && pan.every(function (r) { return r.fl === fl(r); }) && arc.length > 0 && late(pan, 'fl', landAt, 0, 0).length === 0,
    'L19: fl is null before the flick and through its arc (' + arc.length + ' frames), then 0 on the landing frame ' + LAND + ' ms after the flick (' + JSON.stringify(vals(pan, 'fl')) + ')');
  var b0 = board.length && typeof board[0].fl === 'number' ? board[0].fl : 0;
  check(board.length > 0 && board.every(function (r) { return r.fl === fl(r); }) && b0 > 0,
    'L19: fl counts on into the slice step without a restart (the pan ended at ' + (pan.length ? pan[pan.length - 1].fl : '?') + ', the board shows ' + JSON.stringify(vals(board, 'fl').slice(0, 3)) + ' ..)');
  var lateFl = late(board, 'fl', landAt, b0 + 1, b0 + 12);
  check(lateFl.length === 0, 'L19: on the board each fl frame is painted as it begins too (late: ' + lateFl.join(',') + ')');
  var kt = plate.length ? frames(plateAt, plate[plate.length - 1].now) : -1;
  check(plate.length > 0 && plateAt >= cutAt + gap && plateAt - (cutAt + gap) < 17 && plate.every(function (r) { return r.t === frames(plateAt, r.now); }) && vals(plate, 't').length === kt + 1,
    'L19: the reveal gets t = 12 fps frames since the plate came, none skipped (0..' + kt + ', got ' + JSON.stringify(vals(plate, 't').slice(0, 3)) + ' .., the plate ' + (plateAt - cutAt) + ' ms after the last cut)');
  var lateT = late(plate, 't', plateAt, 8, 20);
  check(lateT.length === 0, 'L19: each reveal frame t is painted as it begins (late: ' + lateT.join(',') + ')');
  var seeds = vals(all, 'seed');
  check(pan.length > 0 && board.length > 0 && plate.length > 0 && seeds.length === 1 && typeof seeds[0] === 'number' && seeds[0] >= 0 && seeds[0] % 1 === 0,
    'L19: one seed for the whole dish: the pan, the board and the plate get the same whole number (' + JSON.stringify(seeds) + ')');
  check(all.length > 0 && all.every(function (r) { return r.still === false; }), 'L19: with motion on, every painter call gets still false (' + JSON.stringify(vals(all, 'still')) + ')');

  await T.verbClick();                                   /* back to the counter, then a second dish up to its flip step */
  await T.until(function (x) { return x.screen === 'counter'; }, 2000, 'counter');
  await T.go(700); await T.tapEl('.ck-prop');
  await handled(function (x) { return x.screen === 'step'; }, 'second dish');
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip again');
  await T.go(300);
  var next = of(await T.art(all.length), 'flipScene');
  check(next.length > 0 && next.every(function (r) { return r.heat === false && r.fh === null && r.fbc === null && r.fl === null; }),
    'L19: the next dish starts clean: its cold pan has no landing counter left over from the last flip (fl ' + JSON.stringify(vals(next, 'fl')) + ')');
  check((await T.live()).err === 0 && T.errs.length === 0, 'L19: no errors ' + T.errs.join(' | '));
  await T.done();

  var R = await openPage(browser, { reduced: true, store: SEEN_ALL, q: 'recipe=jeon&reduced=1&seed=102', art: true, paused: true });
  await verbThrough(R, 'tap', 3); await verbThrough(R, 'flip', 2); await verbThrough(R, 'slice', 2);
  await R.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await R.go(600);
  var red = await R.art(), rp = of(red, 'revealScene'), seeds2 = vals(red, 'seed');
  check(of(red, 'flipScene').length > 0 && of(red, 'sliceScene').length > 0 && rp.length > 0 && red.every(function (r) { return r.still === true; }),
    'L19 reduced motion: still is true on the pan, the board and the plate (' + JSON.stringify(vals(red, 'still')) + ')');
  check(rp.length > 0 && rp.every(function (r) { return r.t === null; }), 'L19 reduced motion: the reveal gets t null, its still picture (' + JSON.stringify(vals(rp, 't')) + ')');
  check(seeds2.length === 1 && typeof seeds2[0] === 'number' && seeds2[0] !== seeds[0], 'L19: another dish seed gives another art seed, again one for the whole dish (' + JSON.stringify(seeds2) + ')');
  check((await R.live()).err === 0 && R.errs.length === 0, 'L19: no errors (reduced motion) ' + R.errs.join(' | '));
  await R.done();
}

(async function main() {
  var tests = { L1: L1, L2: L2, L3: L3, L4: L4, L5: L5, L6: L6, L7: L7, L8: L8, L9: L9, L10: L10, L11: L11, L12: L12, L13: L13, L14: L14, L15: L15, L16: L16, L17: L17, L18: L18, L19: L19 };
  var browser = await chromium.launch(), t0 = Date.now();
  try {
    for (var name in tests) {
      if (ONLY.length && ONLY.indexOf(name) < 0) continue;
      section(name);
      try { await tests[name](browser); }
      catch (e) { fails++; console.error('  FAIL ' + name + ' threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
    }
  } finally { await browser.close(); }
  console.log('\n' + passes + ' passed, ' + fails + ' failed (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(fails ? 1 : 0);
})();
