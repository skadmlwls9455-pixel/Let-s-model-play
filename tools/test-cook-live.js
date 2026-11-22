#!/usr/bin/env node
/* tools/test-cook-live.js - the kitchen in a real browser (Playwright + Chromium). Slice 1 (jeon), 11-15 close-up.
 *   NODE_PATH=$(npm root -g) node tools/test-cook-live.js
 *   COOK_URL=http://127.0.0.1:PORT/cook.html   run over http instead of file://
 *   COOK_SHOTS=/some/dir                       where the L1 captures go (default: <os tmp>/cook-live-shots)
 *   ONLY=L1,N2                                 run only these
 * wip/round5/cook-spec.md 15.2: L1-L19 (rewritten for the close-up: the kitchen opens straight into a step, no counter,
 * no visible words) and N1-N7, N10. Touch goes through CDP Input.dispatchTouchEvent: trusted touches, so pointer capture,
 * coalesced events and user activation work (Playwright's touchscreen only taps). Most tests install Playwright's fake
 * clock, which also drives event timestamps, so the 12 fps frames, the 250 ms gate, the slides and the flip bands are
 * exact. That clock still flows with real time between two calls: a check that needs times to the millisecond pauses it
 * first (T.pause), or pauses it before the page loads (openPage `paused`: the kitchen opens at load, so its own clock
 * starts at T.t0 exactly). Logical px (the sim's 288 x 320) map to the screen through the invisible .ck-sim box.
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
var FMS = 1000 / 12;
/* spec 2.3: k, W, H, ox, oy, chipTop at the seven target sizes (hudB 64 without insets). One change: W and H grow by up
   to 4 art px until the canvas is a whole CSS px (360x740 @2: H 166, not 165; 412x915 @2.625: H 189), so no device row is doubled */
var FIT = [
  { w: 360, h: 740, dpr: 2, k: 9, W: 80, H: 166, ox: -32, oy: 0, chipTop: 660 },
  { w: 360, h: 740, dpr: 3, k: 13, W: 84, H: 171, ox: -30, oy: 4, chipTop: 660 },
  { w: 320, h: 568, dpr: 2, k: 8, W: 80, H: 142, ox: -32, oy: -11, chipTop: 488 },
  { w: 320, h: 568, dpr: 3, k: 12, W: 80, H: 142, ox: -32, oy: -11, chipTop: 488 },
  { w: 412, h: 915, dpr: 2, k: 10, W: 83, H: 183, ox: -31, oy: 10, chipTop: 835 },
  { w: 412, h: 915, dpr: 3, k: 15, W: 83, H: 183, ox: -31, oy: 10, chipTop: 835 },
  { w: 412, h: 915, dpr: 2.625, k: 13, W: 84, H: 189, ox: -30, oy: 11, chipTop: 835 }
];
var passes = 0, fails = 0, errAll = [];
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function section(t) { console.log('== ' + t); }
function line(a, b, n) { var out = []; for (var i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
function realWait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }   /* Chrome delivers touchmove on its next real frame */
function sameRect(a, b) { return a && b && ['x', 'y', 'w', 'h'].every(function (k) { return Math.abs(a[k] - b[k]) < 0.01; }); }
function js(o) { return JSON.stringify(o); }

/* Pause the installed clock a little ahead of the page's own time: until clock.resume(), time moves in T.go only.
   Reading the page's time and pausing it are separate round trips and the clock flows with real time between them,
   so on a busy machine a short margin is sometimes already in the past ("Cannot fast-forward to the past"). Then try
   again with a longer one. Returns the margin that worked. */
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
  if (o.haptics !== undefined) await ctx.addInitScript(function (v) { try { localStorage.setItem('ppolppol_haptics', v); } catch (e) { /* none */ } }, o.haptics);
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
  if (o.vib) await ctx.addInitScript(function () {   /* a fake vibrator (records every call) and a spy on HAPTICS.buzz (js/haptics.js
                                                       says `var HAPTICS = ...`: that assignment lands in this setter) */
    window.__vib = []; window.__buzz = [];
    /* user activation as on a phone: none until the first touch ends (Playwright's navigation marks every page activated) */
    var act = false;
    window.addEventListener('touchend', function () { act = true; }, true);
    window.addEventListener('pointerup', function (e) { if (e.isTrusted) act = true; }, true);
    window.addEventListener('keydown', function (e) { if (e.isTrusted) act = true; }, true);
    try { Object.defineProperty(Navigator.prototype, 'userActivation', { configurable: true, get: function () { return { hasBeenActive: act, isActive: act }; } }); } catch (e) { /* none */ }
    try { Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, writable: true, value: function (p) { window.__vib.push({ p: JSON.parse(JSON.stringify(p)), t: performance.now() }); return true; } }); } catch (e) { /* none */ }
    var real;
    Object.defineProperty(window, 'HAPTICS', { configurable: true, enumerable: true, get: function () { return real; },
      set: function (H) {
        real = H;
        if (H && typeof H.buzz === 'function') { var b = H.buzz; H.buzz = function (n) { window.__buzz.push({ n: n, t: performance.now() }); return b.apply(this, arguments); }; }
      } });
  });
  if (o.art) await ctx.addInitScript(function () {   /* what cook.js hands the three scene painters, call by call (they still paint).
                                                        js/cook-art.js says `var COOK_ART = ...`: that assignment lands in this setter */
    window.__art = [];
    var real;
    function spy(A, name) {
      var paint = A[name];
      A[name] = function (b, opts) {
        var r = { s: name, now: performance.now() };
        ['seed', 'fh', 'fbc', 'fl', 't', 'still', 'f', 'heat', 'band', 'geo'].forEach(function (k) { r[k] = opts && k in opts && opts[k] !== undefined ? opts[k] : '-'; });   /* '-' = not passed */
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
  if (o.clock !== false) await page.clock.install({ time: new Date(o.time || '2026-11-08T10:00:00') });
  if (o.paused) await pauseClock(page);   /* before the page exists: its whole life then runs on T.go only, to the millisecond */
  /* 11-21 round 7: with no dish asked for the kitchen opens on the recipe book (tools/test-cook-book-live.js). This suite
     guards the engine with the legacy jeon, so it asks for it by id */
  var q7 = o.q ? (/(^|&)recipe=/.test(o.q) ? o.q : o.q + '&recipe=jeon') : 'recipe=jeon';
  await page.goto(o.url || (URL0 + '?' + q7));
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
  T.pt = async function (lx, ly) { var r = await T.rect('.ck-sim'); return [r.x + lx * r.w / 288, r.y + ly * r.h / 320]; };   /* logical px -> CSS px */
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
  T.until = async function (fn, max, label, step) {
    for (var w = 0; w <= (max || 6000); w += (step || 50)) { var l = await T.live(); if (fn(l)) return l; await T.go(step || 50); }
    throw new Error('timeout: ' + label + ' ' + JSON.stringify(await T.live()).slice(0, 300));
  };
  T.hash = function () {
    return page.evaluate(function () {
      var c = document.querySelector('.ck-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, h = 2166136261;
      for (var i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619);
      return h >>> 0;
    });
  };
  T.px = function (pts) {   /* canvas backing pixels (art px of the view) as '#rrggbb' */
    return page.evaluate(function (list) {
      var c = document.querySelector('.ck-cv'), g = c.getContext('2d');
      return list.map(function (p) { var d = g.getImageData(p[0], p[1], 1, 1).data; return '#' + [d[0], d[1], d[2]].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''); });
    }, pts);
  };
  T.active = function () { return page.evaluate(function () { var a = document.activeElement; return a ? (a.id ? '#' + a.id : '') + '.' + String(a.className || '').trim().split(/\s+/).join('.') : null; }); };
  T.verb = function () {
    return page.evaluate(function () { var v = document.querySelector('.ck-verb'); return { label: v.getAttribute('aria-label') || '', text: v.textContent, hidden: v.hidden, opacity: getComputedStyle(v).opacity, shown: v.classList.contains('ck-shown') }; });
  };
  /* 11-21 round 7: the plate ends on two end buttons and there is no 'again'. A second dish in the same page = the table
     button (the kitchen closes), then the page's door (it opens again with the same options) */
  T.again = async function () {
    await page.evaluate(function () { document.querySelector('.ck-table').click(); });
    await realWait(80); await T.go(60);
    await page.evaluate(function () { document.getElementById('ck-door').click(); });
    await T.go(60);
  };
  T.verbClick = function () { return page.evaluate(function () { document.querySelector('.ck-verb').click(); }); };
  T.store = function () { return page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return 'broken'; } }, KEY); };
  T.dlgText = function () {   /* the dialog's text, without the aria-live line (and cook.html's credits link, see N1) */
    return page.evaluate(function () { var d = document.querySelector('.ck-dlg'); if (!d) return ''; var c = d.cloneNode(true); c.querySelectorAll('.ck-say, .ckh-credits').forEach(function (s) { s.remove(); }); return c.textContent; });
  };
  T.strip = function () { return page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('.ck-strip .ck-step'), function (s) { return s.classList.contains('on') ? 'on' : s.classList.contains('done') ? 'done' : 'up'; }).join(','); }); };
  T.done = async function () { errAll = errAll.concat(errs); await ctx.close(); };
  if (o.paused) T.t0 = await T.now();   /* the page's clock as it loaded = where the kitchen's own clock starts (cook.html opens it at load) */
  await T.go(o.settle || 600);
  return T;
}

/* ---------- play helpers (touch) ---------- */
/* round 6: the last slice is now the horizontal line, swiped in a few real ms by CDP; Chrome then swallows the click of a
   tap that comes within about a second of real time (the tap only stops the swipe's gesture). A finger is never that fast
   and the again chip waits 0.9 s anyway, so a test lets real time pass before it taps the chip after a touch-cut dish */
function afterSwipe() { return realWait(1200); }
var DUST = [144, 280];   /* logical: on the wood under the pan, 92 logical px from the nearest mark (reach 80): a speck, never a hit */
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
    await T.drag(line([ln.ax - 2 * ln.ux, ln.ay - 2 * ln.uy], [ln.bx + 2 * ln.ux, ln.by + 2 * ln.uy], 20), 16);
    await T.go(300);
    if (i === 0 && shotMid) await shotMid();
  }
}
async function verbThrough(T, kind, presses) {   /* chip path for one step (after the 250 ms gate) */
  await T.until(function (l) { return l.kind === kind && l.phase === 'step'; }, 4000, kind + ' step');
  await T.go(700);
  for (var i = 0; i < presses; i++) { await T.verbClick(); await T.go(300); }
}
async function toReveal(T) { await verbThrough(T, 'tap', 3); await verbThrough(T, 'flip', 2); await verbThrough(T, 'slice', 2); return T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal'); }

/* ===================================================================================================== */
async function L1(browser) {   /* touch: open straight into the tap step, the dish to the plate, again -> a new dish; DPR 2 and 2.625 */
  try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) { /* exists */ }
  var setups = [{ vp: { width: 360, height: 740 }, dpr: 2, tag: '360x740-dpr2' }, { vp: { width: 412, height: 915 }, dpr: 2.625, tag: '412x915-dpr2.625' }];
  for (var s = 0; s < setups.length; s++) {
    var su = setups[s], T = await openPage(browser, { vp: su.vp, dpr: su.dpr, store: null, q: 'seed=12' });
    var l = await T.live();
    check(l.screen === 'step' && l.kind === 'tap' && l.si === 0 && l.station === 'counter' && !l.slide, 'L1 ' + su.tag + ': cook.html opens straight into the tap step at the counter (' + l.screen + ' ' + l.kind + ')');
    check(/ck-stage/.test(await T.active()), 'L1 ' + su.tag + ': focus starts on the stage box');
    var id0 = l.id, st0 = await T.store();
    check(st0 && st0.pot && st0.pot.runId === id0 && st0.pot.si === 0 && st0.book.length === 0, 'L1 ' + su.tag + ': the new dish has its pot at once');
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-1-tap.png') });
    await playTap(T);
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-2-tapped.png') });
    await playFlip(T, 3600);
    l = await T.until(function (x) { return x.kind === 'slice'; }, 3000, 'slice');
    check(l.look.band === 1, 'L1 ' + su.tag + ': swiping up 3.6 s after heat-on gives golden (band 1)');
    await playSlice(T, function () { return T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-3-slice.png') }); });
    l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
    var dishLook = JSON.stringify(l.look);
    check(l.done && l.station === 'plate' && l.look.dents.length === 9 && l.look.cuts.length === 2, 'L1 ' + su.tag + ': the dish is done on the plate (9 dents, 2 cuts)');
    await T.go(1000);
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-4-result.png') });
    var st = await T.store();
    check(st && st.pot === null && st.book.length === 1 && st.book[0].recipe === 'jeon' && JSON.stringify(st.book[0].look) === dishLook, 'L1 ' + su.tag + ': one book line with the look of the plate, no pot');
    l = await T.live();
    check(l.verb === '' && l.end.call && l.end.table && l.screen === 'reveal' && !l.hint, 'L1 ' + su.tag + ': the result shows the two end buttons (no again chip), no hand');
    await afterSwipe(); await T.tapEl('.ck-table'); await realWait(80); await T.go(60);
    check((await T.live()).screen === 'closed', 'L1 ' + su.tag + ': a touch on the table button closes the kitchen');
    await T.page.evaluate(function () { document.getElementById('ck-door').click(); }); await T.go(60);
    l = await T.until(function (x) { return x.screen === 'step'; }, 2000, 'again');
    st = await T.store();
    check(l.kind === 'tap' && l.si === 0 && l.id !== id0 && st.book.length === 1 && st.pot && st.pot.runId === l.id && st.pot.si === 0,
      'L1 ' + su.tag + ': again starts a new dish at the tap step (new run id, its pot saved, book 1)');
    await T.go(400);
    await T.page.screenshot({ path: path.join(SHOTS, 'L1-' + su.tag + '-5-again.png') });
    check(/ck-stage/.test(await T.active()), 'L1 ' + su.tag + ': after again by touch, focus on the stage');
    check(l.err === 0 && T.errs.length === 0, 'L1 ' + su.tag + ': no errors' + (T.errs.length ? ' ' + T.errs.join(' | ') : ''));
    await T.done();
  }
  console.log('   captures: ' + SHOTS);
}

async function L2(browser) {   /* keyboard only: Tab close -> chip, every step with Enter on the chip; result chip after 450 ms
                                  ignores Enter until 900 ms; Esc closes; document.activeElement after every move */
  var T = await openPage(browser, { touch: false, store: SEEN_ALL, paused: true });
  check(/ck-stage/.test(await T.active()), 'L2: open (no key yet) -> focus on the stage box');
  await T.page.keyboard.press('Tab'); await T.go(20);
  var a1 = await T.active();
  await T.page.keyboard.press('Tab'); await T.go(20);
  var a2 = await T.active(), v = await T.verb();
  check(/ck-close/.test(a1) && /ck-verb/.test(a2), 'L2: Tab order is close, then the chip (' + a1 + ', ' + a2 + ')');
  check(v.opacity === '1' && v.label === '톡톡' && v.text === '', 'L2: the focused chip shows, label 톡톡, no text');
  await T.go(700);
  for (var i = 0; i < 3; i++) { await T.page.keyboard.press('Enter'); await T.go(300); }
  var l = await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  v = await T.verb();
  check(/ck-verb/.test(await T.active()) && v.label === '불 켜기', 'L2: step 2 -> focus stays on the chip, label 불 켜기');
  await T.go(700);
  await T.page.keyboard.press('Enter'); await T.go(100);
  v = await T.verb();
  check(v.label === '뒤집기' && /ck-verb/.test(await T.active()), 'L2: after heat-on the label is 뒤집기');
  await T.go(400);
  await T.page.keyboard.press('Enter');
  l = await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  v = await T.verb();
  check(/ck-verb/.test(await T.active()) && v.label === '썰기', 'L2: step 3 -> focus on the chip, label 썰기');
  await T.go(700);
  for (var j = 0; j < 2; j++) { await T.page.keyboard.press('Enter'); await T.go(300); }
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var r0 = l.revealAt, now = await T.now();
  await T.go(Math.max(0, T.t0 + r0 + 470 - now));
  v = await T.verb();
  check(/ck-call/.test(await T.active()) && v.hidden, 'L2: at 450 ms the first end button has focus, the chip is gone (' + (await T.active()) + ')');
  var id0 = l.id;
  await T.page.keyboard.press('Enter'); await T.go(50);
  l = await T.live();
  check(l.screen === 'reveal' && l.id === id0, 'L2: Enter before 900 ms does nothing');
  now = await T.now(); await T.go(Math.max(0, T.t0 + r0 + 920 - now));
  await T.page.keyboard.press('Enter'); await realWait(80); await T.go(50);
  l = await T.live();
  check(l.screen === 'closed' && l.served === undefined && /ck-door/.test(await T.active()), 'L2: Enter after 900 ms on the end button closes the kitchen, focus back on the opener (' + (await T.active()) + ')');
  await T.page.keyboard.press('Enter'); await T.go(60);
  l = await T.live();
  check(l.screen === 'step' && l.si === 0 && l.id !== id0 && /ck-verb/.test(await T.active()), 'L2: Enter on the door starts a new dish, focus on the chip (' + (await T.active()) + ')');
  await T.go(400);
  await T.page.keyboard.press('Escape'); await T.go(100);
  l = await T.live();
  var a = await T.active();
  check(l.screen === 'closed' && a === '#ck-door.ck-door', 'L2: Esc -> closed, focus back on the opener (' + a + ')');
  /* onClose({kbd}): true after Esc and after a key on close, false after a click with the mouse */
  var kb = await T.page.evaluate(function () { window.__oc = []; return COOK.open({ storeKey: 'ppolppol_cook_v0', onClose: function (o) { window.__oc.push(o && o.kbd); } }); });
  await T.go(400);
  await T.page.keyboard.press('Escape'); await T.go(100);
  await T.page.evaluate(function () { COOK.open({ storeKey: 'ppolppol_cook_v0', onClose: function (o) { window.__oc.push(o && o.kbd); } }); });
  await T.go(400);
  var cr = await T.rect('.ck-close');
  await T.page.mouse.click(cr.x + cr.w / 2, cr.y + cr.h / 2); await T.go(100);
  var oc = await T.page.evaluate(function () { return window.__oc; });
  check(kb && oc.length === 2 && oc[0] === true && oc[1] === false, 'L2: onClose gets { kbd: true } after Esc and { kbd: false } after a mouse click on close (' + js(oc) + ')');
  check(T.errs.length === 0, 'L2: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L3(browser) {   /* touch: quiet chip, still in the tab order and the accessibility tree; 5 s idle shows it */
  var T = await openPage(browser, { store: null });
  await T.until(function (l) { return l.kind === 'tap'; }, 2000, 'tap');
  await T.go(700);
  var v = await T.verb(), l = await T.live();
  check(v.opacity === '0' && !v.hidden && l.quiet, 'L3: on touch the chip is quiet (opacity 0) but in place');
  var named = await T.page.getByRole('button', { name: '톡톡' }).count();
  check(named === 1, 'L3: the quiet chip is in the accessibility tree with its name (톡톡)');
  await T.page.keyboard.press('Tab'); await T.page.keyboard.press('Tab'); await T.go(50);
  var a = await T.active();
  check(/ck-verb/.test(a), 'L3: Tab reaches it after close (' + a + ')');
  v = await T.verb();
  check(v.opacity === '1', 'L3: a focused chip is always visible');
  await T.page.evaluate(function () { document.querySelector('.ck-stage').focus(); });
  await T.tap(DUST[0], DUST[1]);   /* a dust tap far from the marks: no progress, back to touch */
  await T.go(100);
  v = await T.verb();
  check(v.opacity === '0' && (await T.live()).progress === 0, 'L3: back to quiet when focus leaves and touch comes back');
  var idleSeen = false;
  for (var w = 0; w < 6000 && !idleSeen; w += 100) { await T.go(100); idleSeen = (await T.live()).hint === 'idle'; }
  v = await T.verb();
  check(idleSeen, 'L3: 5 s without progress -> one ghost hand');
  check(v.opacity === '1' && v.shown, 'L3: ... and from then on the chip shows');
  await playTap(T);
  await T.until(function (x) { return x.kind === 'flip'; }, 3000, 'flip');
  v = await T.verb();
  check(v.shown && v.opacity === '1', 'L3: it stays visible in the next step (until the dish ends)');
  await playFlip(T, 500);
  await playSlice(T);
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(1000); await afterSwipe(); await T.tapEl('.ck-table'); await realWait(80); await T.go(60); await T.page.evaluate(function () { document.getElementById('ck-door').click(); }); await T.go(60);
  await T.until(function (x) { return x.screen === 'step'; }, 2000, 'again');
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
  await T2.pause();   /* the hand is due 11 s after heat-on and the loop below stops 170 ms short of it: exact on a paused clock */
  await T2.tap(144, 176);
  var heat = (await T2.live()).st.heatAt, hintSeen = false;
  for (var w = 0; w < 10800; w += 400) { await T2.go(400); if ((await T2.live()).hint) hintSeen = true; }
  var l2 = await T2.live();
  check(!hintSeen && l2.st.heatAt === heat, 'L4: after heat-on no ghost hand before crisp + 5 s');
  await T2.go(500);
  l2 = await T2.live();
  check(l2.hint === 'idle' && l2.band === 2, 'L4: crisp + 5 s -> one ghost hand (the chip shows)');
  check((await T2.verb()).shown, 'L4: ... and the chip is revealed');
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

async function L5(browser) {   /* layout: no horizontal scroll at seven sizes; the notice sits under the HUD and moves nothing */
  var sizes = [[320, 460, 2], [320, 568, 2], [360, 560, 2], [360, 740, 2], [568, 320, 2], [360, 740, 2.625], [412, 915, 2.625]];
  for (var i = 0; i < sizes.length; i++) {
    var sz = sizes[i], tag = sz[0] + 'x' + sz[1] + '@' + sz[2];
    var T = await openPage(browser, { vp: { width: sz[0], height: sz[1] }, dpr: sz[2], store: SEEN_ALL });
    var m = await T.page.evaluate(function () {
      var d = document.querySelector('.ck-dlg');
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, dsw: d.scrollWidth, dcw: d.clientWidth, dsh: d.scrollHeight, dch: d.clientHeight };
    });
    check(m.sw <= m.iw && m.dsw <= m.dcw && m.dsh <= m.dch, 'L5 ' + tag + ': no scroll (' + m.sw + '/' + m.iw + ', ' + m.dsw + '/' + m.dcw + ', ' + m.dsh + '/' + m.dch + ')');
    var l = await T.live(), close = await T.rect('.ck-close'), verb = await T.rect('.ck-verb');
    check(close.w >= 44 && close.h >= 44 && verb.w >= 44 && verb.h >= 44 && close.y >= 0 && close.r <= m.iw && verb.b <= m.ih + 0.5, 'L5 ' + tag + ': close and chip >= 44 and on screen');
    check(l.st.marks.every(function (mk) { var x = mk.x / 2, y = mk.y / 2; return x >= 8 && x <= 136 && y >= 8 && y <= 152; }), 'L5 ' + tag + ': tap marks >= 8 art px inside the stage');
    var before = await T.rect('.ck-cv'), act0 = await T.active();
    var ok = await T.page.evaluate(function () { return COOK.notice({ text: '돌아왔어. 보러 갈까?', short: '돌아왔어.', label: '보러 가기', fn: function () {} }); });
    await T.go(100);
    var after = await T.rect('.ck-cv'), note = await T.rect('.ck-note'), go = await T.rect('.ck-note-go');
    check(ok && sameRect(before, after), 'L5 ' + tag + ': notice() does not move the canvas');
    check(note.w > 0 && note.y >= l.view.hudB + 8 - 0.5 && note.x >= 8 - 0.5 && note.r <= m.iw - 8 + 0.5 && go.h >= 44 && go.w >= 44, 'L5 ' + tag + ': the notice sits under the HUD (top ' + note.y + ', hudB ' + l.view.hudB + '), its button >= 44');
    check((await T.active()) === act0, 'L5 ' + tag + ': notice() takes no focus');
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
  var dust = await nextFrame('dust', function () { return T.tap(DUST[0], DUST[1]); });
  await T.go(150);
  check(dust.changed && dust.fx && (await T.live()).progress === 0, 'L6: an uncounted tap off the food still shows (a speck), no progress');
  var res = [], l = await T.live();
  for (var i = 0; i < l.st.marks.length; i++) for (var k = 0; k < 3; k++) {
    var mk = l.st.marks[i], p = await T.pt(mk.x + k - 1, mk.y + 1);
    res.push(await nextFrame('tap ' + (i * 3 + k), function () { return T.touch('touchStart', p); }));
    await T.go(30); await T.touch('touchEnd'); await T.go(150);
  }
  check(res.every(function (r) { return r.changed && r.fx; }), 'L6: each of the 9 counted taps changes the picture on the very next frame (' + res.filter(function (r) { return !(r.changed && r.fx); }).map(function (r) { return r.label; }).join(',') + ')');
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
  var ln = l.st.lines[0], pts = line([ln.ax - 2 * ln.ux, ln.ay - 2 * ln.uy], [ln.bx + 2 * ln.ux, ln.by + 2 * ln.uy], 16), sl = [];
  await T.touch('touchStart', await T.pt(pts[0][0], pts[0][1]));
  var kf = null;
  for (var j = 1; j < pts.length; j++) {
    var q = await T.pt(pts[j][0], pts[j][1]); sl.push(await nextFrame('slice ' + j, function () { return T.touch('touchMove', q); }));
    if (j === 6) {   /* round 6: the bigger knife (49 x 7) follows the hand on the lit (vertical) guide */
      var lk = await T.live(), hd = lk.st.hand, hx = lk.view.ox + (hd.x >> 1), hy = lk.view.oy + (hd.y >> 1);
      kf = { hand: hd, deg: lk.st.lines[lk.st.cur].ax === lk.st.lines[lk.st.cur].bx, px: await T.px([[hx, hy], [hx, hy - 14], [hx + 1, hy + 17], [hx + 1, hy + 26], [hx + 2, hy + 26]]) };
    }
  }
  await T.touch('touchEnd');
  check(kf && kf.deg && js(kf.px) === js(['#ebede9', '#172038', '#577277', '#4d2b32', '#7a4841']),
    'L6: the knife follows the hand at 90 deg: its bright edge under the finger, the tip 14 px above, bolster and handle below (' + js(kf) + ')');
  check(sl.every(function (r) { return r.changed; }) && sl.some(function (r) { return r.fx; }), 'L6: every knife sample shows on the next frame (the kerf follows the hand)');
  await T.go(400);
  l = await T.live();
  check(l.st.lines[0].cut, 'L6: the line was cut by the drag');
  check(l.err === 0 && T.errs.length === 0, 'L6: no errors without AUDIO ' + T.errs.join(' | '));
  await T.done();

  /* with a fake AUDIO: the act table (design 5.5), quiet on every exit */
  var A = await openPage(browser, { store: null, audio: true, q: 'seed=22' });
  var first = await A.page.evaluate(function () { return window.__acts.map(function (x) { return x.p.act; }); });
  check(first[0] === 'pick', 'L6: the AUDIO acts start with pick, at open (' + first.join(',') + ')');
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
  var n1 = await A.page.evaluate(function () { return window.__acts.length; });
  await A.go(300); await afterSwipe(); await A.tapEl('.ck-table'); await realWait(80); await A.go(60);
  n1 = await A.page.evaluate(function () { return window.__acts.length; });
  await A.page.evaluate(function () { document.getElementById('ck-door').click(); }); await A.go(900);
  var again = await A.page.evaluate(function (n) { return window.__acts.slice(n).map(function (x) { return x.p.act; }); }, n1);
  check(again[0] === 'pick', 'L6: the next dish sends pick (' + again.join(',') + ')');
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

async function L7(browser) {   /* reduced motion: no slide (the station changes from one frame to the next), the plate at rest from
                                  its first frame, still hand; no squash, particles, shake or arc; rim and dents stay */
  var T = await openPage(browser, { reduced: true, store: null, q: 'reduced=1&seed=31' });
  await T.page.evaluate(function () {   /* every frame: the station and the slide */
    window.__fr = [];
    (function f() { var l = COOK.live(); window.__fr.push([l.station, !!l.slide, l.screen]); requestAnimationFrame(f); })();
  });
  await T.until(function (x) { return x.kind === 'tap'; }, 2000, 'tap');
  await T.go(700);
  await T.pause();   /* the idle hand comes 5 s after the tap below and stays 1 s: exact on a paused clock */
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
  var r0 = await T.hash(); await T.go(600); var r1 = await T.hash();
  check(r0 === r1, 'L7: the plate is at rest from its first frame (no drop, squash or shake)');
  l = await T.live();
  check(l.look.dents.length === 9, 'L7: dents stay');
  check(l.stats.squash === 0 && l.stats.shake === 0 && l.stats.parts === 0 && l.stats.arc === 0 && l.stats.slides === 0, 'L7: no squash, shake, particles, arc or slide (' + JSON.stringify(l.stats) + ')');
  var fr = await T.page.evaluate(function () { return window.__fr; }), seq = [];
  fr.forEach(function (x) { if (!seq.length || seq[seq.length - 1] !== x[0]) seq.push(x[0]); });
  check(fr.length > 0 && fr.every(function (x) { return !x[1]; }) && seq.join(',') === 'counter,stove,board,plate', 'L7: live().slide is null on every frame and the station switches from one frame to the next (' + seq.join(',') + ')');
  check(T.errs.length === 0, 'L7: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L8() {   /* reload in step 2: straight back at the flip on the stove, step 1's dents kept, no text, strip done / on */
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
    var R = await openPage(bB, { store: JSON.stringify(store), settle: 100 });
    var l = await R.live();
    check(l.screen === 'step' && l.si === 1 && l.kind === 'flip' && l.station === 'stove' && !l.slide && l.st.heat === false && l.progress === 0, 'L8: it opens straight at the flip on the stove, from its start (heat off, no slide)');
    check(JSON.stringify(l.look.dents) === JSON.stringify(store.pot.looks[0].dents) && l.id === store.pot.runId && l.seed === store.pot.seed, 'L8: step 1 look, run id and seed kept');
    check((await R.dlgText()) === '', 'L8: no text at all');
    check((await R.strip()) === '' && (await R.page.evaluate(function () { return document.querySelector('.ck-strip') === null; })), 'L8: no step strip any more (round 7: the owner read it as buttons)');
    check(R.errs.length === 0, 'L8: no errors ' + R.errs.join(' | '));
    await R.done();
  } finally { await bB.close(); }
}

async function L9(browser) {   /* bad pots move byte-identical into potOld (newest first, at most 4) and a new dish starts */
  var line0 = { id: 'ck_book1', recipe: 'jeon', seed: 3, swaps: { herb: 'parae' }, look: { v: 1, dents: [], band: 1, cuts: [0, 0], offs: [0, 0], plate: 0 }, day: '2026-11-07', madeAt: 1 };
  var good = { v: 1, day: '2026-11-08', dayN: 1, seen: [], pot: null, book: [line0] };
  var tuneOf = await (async function () {
    var T = await openPage(browser, { store: null });
    var t = await T.page.evaluate(function () { return [COOK.VERSION, COOK.TUNE_HASH]; });
    await T.done(); return t;
  })();
  var pot = { ver: tuneOf[0], tune: tuneOf[1], runId: 'ck_abc', seed: 5, recipe: 'jeon', swaps: { herb: 'parae' }, si: 1, looks: [{ dents: [] }], tags: [null], at: 0 };
  var olds = [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }];
  var variants = [
    ['old tune', Object.assign({}, pot, { tune: 12345 }), []],
    ['old ver', Object.assign({}, pot, { ver: 'cook-0' }), [{ n: 9 }]],
    ['wrong si', Object.assign({}, pot, { si: 2 }), olds],
    ['junk', { hello: 'there', list: [1, 2, 3] }, []]
  ];
  for (var i = 0; i < variants.length; i++) {
    var v = variants[i], planted = Object.assign({}, good, { pot: v[1] });
    if (v[2].length) planted.potOld = v[2];
    var T = await openPage(browser, { store: JSON.stringify(planted) });
    var l = await T.live(), st = await T.store();
    check(l.screen === 'step' && l.si === 0 && l.kind === 'tap' && l.id !== pot.runId, 'L9 ' + v[0] + ': a new dish starts at the tap step');
    var want = [v[1]].concat(v[2]).slice(0, 4);
    check(st && Array.isArray(st.potOld) && JSON.stringify(st.potOld[0]) === JSON.stringify(v[1]) && JSON.stringify(st.potOld) === JSON.stringify(want),
      'L9 ' + v[0] + ': the bad pot is first in potOld, byte-identical, the older ones after it (at most 4: ' + (st && st.potOld ? st.potOld.length : 0) + ')');
    check(st.pot && st.pot.runId === l.id && st.pot.si === 0, 'L9 ' + v[0] + ': the new dish has its own pot');
    check(JSON.stringify(st.book) === JSON.stringify([line0]), 'L9 ' + v[0] + ': the book is untouched');
    check(T.errs.length === 0 && l.err === 0, 'L9 ' + v[0] + ': no errors ' + T.errs.join(' | '));
    await T.done();
  }
  /* 11-15 round 5 (check O-6): a bad pot over 2 KB moves to potOld and is still there after the close (the next write)
     and the next open; potOld's old size limit dropped it on the next read */
  var bigPot = Object.assign({}, pot, { tune: 12345, pad: 'z'.repeat(2150) }), bigJs = js(bigPot);
  var O = await openPage(browser, { store: JSON.stringify(Object.assign({}, good, { pot: bigPot })) });
  var o1 = await O.store();
  await O.page.evaluate(function () { COOK.close(); }); await O.go(200);
  var o2 = await O.store();
  await O.page.evaluate(function () { document.getElementById('ck-door').click(); }); await O.go(200);
  await O.page.evaluate(function () { COOK.close(); }); await O.go(200);
  var o3 = await O.store();
  check([o1, o2, o3].every(function (s) { return s && Array.isArray(s.potOld) && js(s.potOld[0]) === bigJs; }) && js(o3.book) === js([line0]),
    'L9 oversized: the ' + bigJs.length + '-byte pot is first in potOld after the open, the close and the next open, byte-identical (' + [o1, o2, o3].map(function (s) { return s && s.potOld ? s.potOld.length : 0; }).join(',') + ')');
  check(O.errs.length === 0, 'L9 oversized: no errors ' + O.errs.join(' | '));
  await O.done();
  var B = await openPage(browser, { store: '{"v":1,"pot":{"ver":' });   /* a broken key: nothing to keep, a new dish */
  var lb = await B.live();
  check(lb.screen === 'step' && lb.si === 0 && B.errs.length === 0, 'L9 broken JSON: a new dish starts, no errors');
  await B.done();
  /* the good pot does resume (control) and potOld stays as it was */
  var G = await openPage(browser, { store: JSON.stringify(Object.assign({}, good, { pot: pot, potOld: [{ n: 7 }] })) });
  var lg = await G.live(), sg = await G.store();
  check(lg.si === 1 && lg.kind === 'flip' && lg.id === 'ck_abc' && js(sg.potOld) === js([{ n: 7 }]), 'L9 control: a valid pot resumes at its step; potOld unchanged');
  await G.done();
}

async function L10(browser) {   /* storage full: play, close, notice, go -> no error anywhere */
  var T = await openPage(browser, { full: true, q: 'seed=9' });
  await T.page.evaluate(function () { COOK.auto(true); });
  var l = await T.until(function (x) { return x.screen === 'reveal'; }, 15000, 'reveal');
  check(l.done, 'L10: a whole dish with a full storage');
  await T.go(1000); await T.again(); await T.go(300);
  check((await T.live()).screen === 'step', 'L10: a second dish works with a full storage');
  await T.page.evaluate(function () { COOK.close(); });
  await T.go(200);
  await T.page.evaluate(function () { document.getElementById('ck-door').click(); });
  await T.go(500);
  var ran = await T.page.evaluate(function () { window.__ran = 0; return COOK.notice({ text: '돌아왔어.', short: '돌아왔어.', label: '보러 가기', fn: function () { window.__ran++; } }); });
  await T.go(100); await T.tapEl('.ck-note-go'); await T.go(200);
  var after = await T.page.evaluate(function () { return [window.__ran, COOK.isOpen()]; });
  check(ran && after[0] === 1 && after[1] === false, 'L10: notice and 보러 가기 still work');
  check(T.errs.length === 0, 'L10: no page errors ' + T.errs.join(' | '));
  await T.done();
}

async function L11(browser) {   /* Enter held down on the chip: one press */
  var T = await openPage(browser, { touch: false, store: SEEN_ALL });
  await T.page.keyboard.press('Tab'); await T.page.keyboard.press('Tab'); await T.go(800);
  var focused = /ck-verb/.test(await T.active());
  var reps = await T.page.evaluate(function () { window.__rep = 0; document.addEventListener('keydown', function (e) { if (e.repeat) window.__rep++; }, true); return true; });
  await T.page.keyboard.down('Enter');
  for (var i = 0; i < 6; i++) { await T.go(40); await T.page.keyboard.down('Enter'); }
  await T.page.keyboard.up('Enter'); await T.go(100);
  var l = await T.live(), r = await T.page.evaluate(function () { return window.__rep; });
  check(focused && reps && r >= 5, 'L11: the chip has focus and the browser sent repeated keydowns (' + r + ')');
  check(l.st.hits === 3, 'L11: a held Enter presses the chip once (3 hits on one mark, got ' + l.st.hits + ')');
  check(T.errs.length === 0, 'L11: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function L12(browser) {   /* the notice slot (dormant): under the HUD, no focus taken, 보러 가기 saves, closes, then fn */
  var sizes = [[360, 740], [320, 460]];
  for (var s = 0; s < sizes.length; s++) {
    var tag = sizes[s][0] + 'x' + sizes[s][1];
    var T = await openPage(browser, { vp: { width: sizes[s][0], height: sizes[s][1] }, store: SEEN_ALL, aria: true });
    await T.until(function (x) { return x.kind === 'tap'; }, 2000, 'tap');
    await T.go(700);
    var act0 = await T.active(), cv0 = await T.rect('.ck-cv');
    await T.page.evaluate(function () {
      window.__log = [];
      COOK.notice({ text: '뚜루가 돌아왔어.', short: '돌아왔어.', label: '보러 가기', fn: function () { window.__log.push(['fn', COOK.isOpen(), document.querySelector('.ck-dlg').open]); } });
    });
    await T.go(150);
    var l = await T.live(), txt = await T.page.evaluate(function () { return document.querySelector('.ck-note-t').textContent; }), note = await T.rect('.ck-note');
    check(l.note && (await T.active()) === act0 && sameRect(cv0, await T.rect('.ck-cv')), 'L12 ' + tag + ': the notice shows, focus and canvas stay');
    check(txt === '뚜루가 돌아왔어.' && note.y >= l.view.hudB + 8 - 0.5, 'L12 ' + tag + ': full text in the slot, under the HUD (' + txt + ')');
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

async function L13(browser) {   /* ?rec=1 touch session (it starts at open) replayed by COOK.simulate in node -> same look */
  var T = await openPage(browser, { store: null, q: 'rec=1&seed=1234' });
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

/* ---------- second pass: the verifier findings, each as a check ---------- */
async function toFlipQuiet(T) {   /* tap step by touch (the chip stays quiet), then the flip step with the heat on */
  await playTap(T);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip');
  await T.go(700); await T.tap(144, 176); await T.go(1000);
}
async function endPoint(T) { var r = await T.rect('.ck-call'); return [r.x + r.w / 2, r.y + r.h / 2]; }   /* 11-21: the first end button on the plate */
async function rowPoint(T) { var r = await T.rect('.ck-verb'); return [r.x + r.w / 2, r.y + r.h / 2]; }

async function L15(browser) {   /* the quiet chip: a stray touch only shows it; a flick from it still flips; a click with no
                                   pointer press (keyboard, screen reader) acts at once */
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=61' });
  await T.until(function (x) { return x.kind === 'tap' && x.phase === 'step'; }, 3000, 'tap');
  await T.go(700);
  var rp = await rowPoint(T), v0 = await T.verb();
  await T.tapCss(rp);
  var l = await T.live(), v1 = await T.verb();
  check(v0.opacity === '0' && v1.opacity === '1' && l.st.hits === 0, 'L15: tap step - a touch on the quiet chip shows it and counts nothing (hits ' + l.st.hits + ')');
  await T.tapCss(rp); await T.go(100);
  check((await T.live()).st.hits === 3, 'L15: once shown, a touch on the chip presses it (one mark, 3 hits)');
  check(T.errs.length === 0, 'L15: no errors (tap) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=62' });
  await toFlipQuiet(T);
  check((await T.verb()).opacity === '0', 'L15: flip step after heat-on, the chip is still quiet');
  await T.tapCss(await rowPoint(T)); await T.go(300);
  l = await T.live();
  check(l.kind === 'flip' && l.phase === 'step' && l.st.res === null && (await T.verb()).opacity === '1', 'L15: flip - a stray touch on the quiet chip never flips (the chip shows instead)');
  check(T.errs.length === 0, 'L15: no errors (stray) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=63' });
  await toFlipQuiet(T);
  var p0 = await rowPoint(T);
  await T.touch('touchStart', p0);
  for (var i = 1; i <= 5; i++) { await T.go(14); await T.touch('touchMove', [p0[0] + i, p0[1] - i * 22]); await realWait(20); }
  await T.go(14); await T.touch('touchEnd'); await realWait(40); await T.go(50);
  l = await T.live();
  check((l.kind === 'flip' && l.st.res === 0) || l.si === 2, 'L15: flip - a thumb flick that starts on the quiet chip flips (' + JSON.stringify([l.kind, l.st && l.st.res, l.si]) + ')');
  check(T.errs.length === 0, 'L15: no errors (flick) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=64' });
  await toFlipQuiet(T);
  await T.verbClick(); await T.go(50);   /* element.click(): what a keyboard or a screen reader press gives (no pointer press) */
  l = await T.live();
  check((l.kind === 'flip' && l.st.res === 0) || l.si === 2, 'L15: a click with no pointer press on the quiet chip acts at once (flips)');
  check(T.errs.length === 0, 'L15: no errors (click) ' + T.errs.join(' | '));
  await T.done();
}

async function L16(browser) {   /* hints: a first demo is not wiped by presses that change nothing; re-teach after nudges; on the
                                   result no hand for 6 s, the chip from 450 ms, presses ignored until 900 ms, the plate inert */
  var T = await openPage(browser, { store: JSON.stringify({ v: 1, day: '', dayN: 0, seen: ['tap', 'slice'], pot: null, book: [] }), q: 'seed=71' });
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(2200);   /* the first-time heat-on demo plays out */
  await T.pause();    /* the up-swipe demo lasts 1 s from heat-on and the presses below take 810 ms of it */
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
  check(l.hint === 'teach' && l.stats.teach === 1 && (await T.verb()).opacity === '1', 'L16: three presses that do not flip -> the up-swipe hand once more and the chip shows');
  for (i = 0; i < 30; i++) { await T.tap(130 + (i % 4) * 6, 180); await T.go(150); }
  check((await T.live()).stats.teach === 2, 'L16: the re-teach hand comes at most twice a step');
  check(T.errs.length === 0, 'L16: no errors (hints) ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: SEEN_ALL, q: 'seed=72', paused: true });
  await playTap(T); await playFlip(T, 1500); await playSlice(T);
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var r0 = l.revealAt, id0 = l.id;
  async function at(ms) { var n = await T.now(); if (T.t0 + r0 + ms > n) await T.go(T.t0 + r0 + ms - n); }
  await at(300);
  var v = await T.verb();
  check(v.hidden && (await T.live()).verb === '', 'L16: at 300 ms the result has no chip yet');
  await at(470);
  v = await T.verb();
  check(v.hidden && (await T.live()).end.call && (await T.live()).end.table && /ck-stage/.test(await T.active()), 'L16: from 450 ms the two end buttons show, focus stays on the stage by touch');
  await at(600);
  await T.tapCss(await endPoint(T));
  check((await T.live()).id === id0 && (await T.live()).screen === 'reveal', 'L16: a press on an end button before 900 ms does nothing');
  await T.tapCss(await T.pt(144, 172));   /* the plate */
  var hand = false;
  for (var w = 0; w < 5400; w += 200) { await T.go(200); if ((await T.live()).hint) hand = true; }
  l = await T.live();
  check(!hand && l.screen === 'reveal' && l.id === id0, 'L16: pressing the plate does nothing, and no hand shows for 6 s (no auto-advance)');
  await realWait(1200); await T.tapCss(await endPoint(T)); await realWait(80); await T.go(50);
  l = await T.live();
  check(l.screen === 'closed', 'L16: after 900 ms an end button closes the kitchen');
  check(T.errs.length === 0, 'L16: no errors (result) ' + T.errs.join(' | '));
  await T.done();
}

async function L17(browser) {   /* edge strip; first-seen demo 600 ms after the step start (2400 ms under ?slow=4); one-frame rim;
                                   no title element */
  var T = await openPage(browser, { vp: { width: 320, height: 568 }, store: JSON.stringify({ v: 1, day: '', dayN: 0, seen: [], pot: null, book: [] }), q: 'seed=81', paused: true, settle: 1 });
  var l = await T.live(), demoAt = null;
  for (var w = 0; w < 1200 && demoAt === null; w += 4) { await T.go(4); if ((await T.live()).hint === 'demo') demoAt = (await T.now()) - T.t0; }
  check(demoAt !== null && Math.abs(demoAt - 600) <= FMS, 'L17: the first-seen demo hand starts 600 ms after the step start, +-1 frame (' + (demoAt === null ? 'none' : demoAt.toFixed(1)) + ' ms)');
  check(await T.page.evaluate(function () { return !document.querySelector('.ck-title, .ck-name, .ck-tag, .ck-prop, .ck-head, .ck-verbrow'); }), 'L17: no title, name, tag, prop, head or verb row element');
  check((await T.store()).seen.indexOf('tap') < 0, 'L17: tap is not marked seen while its demo plays');
  await T.go(1100);
  check((await T.store()).seen.indexOf('tap') >= 0, 'L17: tap is marked seen once its demo has played');
  l = await T.live();
  var mk = l.st.marks[0], py = (await T.pt(mk.x, mk.y))[1], fx0 = l.fx;
  await T.tapCss([20, py]);   /* within 24 CSS px of the screen edge */
  l = await T.live();
  check(l.fx === fx0 && l.st.hits === 0, 'L17: a touch that starts at x 20 (within 24 px of the edge) counts nothing');
  await T.tapCss([26, py]);
  l = await T.live();
  check(l.st.hits === 1, 'L17: ... one at x 26 at the first mark\'s height counts a hit (hits ' + l.st.hits + ')');
  var mk2 = l.st.marks[1], p = await T.pt(mk2.x, mk2.y), h0 = await T.hash();
  await T.go(200);
  h0 = await T.hash();
  await T.touch('touchStart', p); await realWait(40); await T.go(17);
  var h1 = await T.hash(); await T.go(84); var h2 = await T.hash(); await T.touch('touchEnd');
  check(h1 !== h0 && h2 !== h1, 'L17: the bright rim shows on the next frame and is gone one 12 fps frame later');
  check(T.errs.length === 0, 'L17: no errors ' + T.errs.join(' | '));
  await T.done();

  T = await openPage(browser, { store: JSON.stringify({ v: 1, day: '', dayN: 0, seen: [], pot: null, book: [] }), q: 'seed=83&slow=4', paused: true, settle: 1 });
  demoAt = null;
  for (w = 0; w < 3000 && demoAt === null; w += 8) { await T.go(8); if ((await T.live()).hint === 'demo') demoAt = (await T.now()) - T.t0; }
  l = await T.live();
  check(l.slow === 4 && demoAt !== null && Math.abs(demoAt - 2400) <= FMS, 'L17: ?slow=4 stretches it: the demo starts at 2400 ms (' + (demoAt === null ? 'none' : demoAt.toFixed(1)) + ')');
  check(T.errs.length === 0, 'L17: no errors (slow) ' + T.errs.join(' | '));
  await T.done();
}

async function L18(browser) {   /* run id without a clock, kitchen keys only, sizzle back after a hidden tab, auto starts at once and
                                   stops on the plate, a lost pointer capture frees the finger, a resumed ?rec=1 recording replays */
  var ids = [];
  for (var c = 0; c < 2; c++) {
    var T = await openPage(browser, { store: null, crypto: 7, q: 'seed=91', time: c ? '2026-11-08T15:00:00' : null });   /* five hours later the same day */
    ids.push((await T.live()).id);
    await T.done();
  }
  var T3 = await openPage(browser, { store: null, crypto: 8, q: 'seed=91' });
  ids.push((await T3.live()).id); await T3.done();
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
  await verbThrough(A, 'tap', 3);
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

  var U = await openPage(browser, { store: SEEN_ALL, q: 'seed=93', settle: 50 });
  await U.page.evaluate(function () { COOK.auto(true); });
  var u = await U.until(function (x) { return x.st && x.st.hits > 0; }, 1500, 'auto starts');
  check(u.si === 0 && u.st.hits > 0, 'L18: COOK.auto(true) right after open plays at once');
  u = await U.until(function (x) { return x.screen === 'reveal'; }, 15000, 'auto to the plate');
  await U.go(3000);
  u = await U.live();
  check(u.screen === 'reveal' && u.done, 'L18: ... and stops on the plate (it does not press again)');
  await U.done();

  var P = await openPage(browser, { store: SEEN_ALL, q: 'seed=94' });
  await verbThrough(P, 'tap', 3); await verbThrough(P, 'flip', 2);
  await P.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  await P.go(700);
  await P.page.evaluate(function () {   /* a finger whose up never arrives (synthetic: the browser cannot drop one on cue) */
    var st = document.querySelector('.ck-stage'), r = st.getBoundingClientRect(), o = { pointerId: 77, pointerType: 'touch', isPrimary: true, clientX: r.left + 60, clientY: r.bottom - 120, bubbles: true };
    st.dispatchEvent(new PointerEvent('pointerdown', o));
    st.dispatchEvent(new PointerEvent('lostpointercapture', o));
  });
  var ln = (await P.live()).st.lines[0];
  await P.drag(line([ln.ax - 2 * ln.ux, ln.ay - 2 * ln.uy], [ln.bx + 2 * ln.ux, ln.by + 2 * ln.uy], 20), 16);
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
                                   (since the last band change), fl (since the flip landed), t (reveal frame), geo 'close', still - and
                                   that a frame is painted the moment one of them moves. The clock is paused before the page loads, so
                                   every time below is exact, however slow the machine is. */
  var LAND = 3 * FMS;   /* cook.js: the landing frame (fl 0) is arc frame 3, three 12 fps frames after the flick */
  var T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=101', art: true, paused: true });
  function frames(from, at) { return Math.floor((at - from) / FMS); }   /* whole 12 fps frames from an event to a moment */
  function of(list, s) { return list.filter(function (r) { return r.s === s; }); }
  function vals(list, k) { return list.map(function (r) { return r[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }); }
  /* the frames lo..hi of counter k (it started at `from`) that were not painted within one display frame (17 ms) of their own start */
  function late(recs, k, from, lo, hi) { var out = []; for (var i = lo; i <= hi; i++) if (!recs.some(function (r) { var d = r.now - (from + i * FMS); return r[k] === i && d > -0.01 && d < 17; })) out.push(i); return out; }
  /* run the clock on until the moment `ahead` ms from then lies `ms` into a global 12 fps frame (those start at T.t0 + n * FMS) */
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
  /* second line: the plate comes betweenOf('slice') later. Cut so that this is mid global frame too */
  var gap = await T.page.evaluate(function () { return COOK.betweenOf('slice'); }), cutAt = await toPhase(33, gap);
  await T.verbClick();
  await T.go(gap + 2000);

  var all = await T.art(), pan = of(all, 'flipScene').filter(function (r) { return r.heat === true; }), board = of(all, 'sliceScene'), plate = of(all, 'revealScene');
  var lr = await T.live(), R = T.t0 + lr.revealAt;       /* the reveal event, exactly (page clock) */
  check(R >= cutAt + gap - 1 && R - (cutAt + gap) < 17, 'L19: the plate comes betweenOf(slice) after the last cut (' + (R - cutAt).toFixed(1) + ' ms)');
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
  var tv = vals(plate, 't'), t0p = plate.length ? plate[0].t : -1, kt = plate.length ? frames(R, plate[plate.length - 1].now) : -1;
  check(plate.length > 0 && t0p >= 0 && t0p <= 3 && plate.every(function (r) { return r.t === frames(R, r.now); }) && tv.length === kt - t0p + 1,
    'L19: the reveal gets t = 12 fps frames since the reveal event, from the end of the slide on, none skipped (' + t0p + '..' + kt + ')');
  var lateT = late(plate, 't', R, 8, 20);
  check(lateT.length === 0, 'L19: each reveal frame t is painted as it begins (late: ' + lateT.join(',') + ')');
  check(plate.length > 0 && plate.every(function (r) { return r.geo === 'close'; }), 'L19: the reveal is painted with geo close (' + JSON.stringify(vals(plate, 'geo')) + ')');
  var seeds = vals(all, 'seed');
  check(pan.length > 0 && board.length > 0 && plate.length > 0 && seeds.length === 1 && typeof seeds[0] === 'number' && seeds[0] >= 0 && seeds[0] % 1 === 0,
    'L19: one seed for the whole dish: the pan, the board and the plate get the same whole number (' + JSON.stringify(seeds) + ')');
  check(all.length > 0 && all.every(function (r) { return r.still === false; }), 'L19: with motion on, every painter call gets still false (' + JSON.stringify(vals(all, 'still')) + ')');

  await T.go(1000); await T.again();                     /* a second dish, up to its flip step */
  await handled(function (x) { return x.screen === 'step'; }, 'second dish');
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip again');
  await T.go(300);
  var next = of(await T.art(all.length), 'flipScene');
  check(next.length > 0 && next.every(function (r) { return r.heat === false && r.fh === null && r.fbc === null && r.fl === null; }),
    'L19: the next dish starts clean: its cold pan has no landing counter left over from the last flip (fl ' + JSON.stringify(vals(next, 'fl')) + ')');
  check((await T.live()).err === 0 && T.errs.length === 0, 'L19: no errors ' + T.errs.join(' | '));
  await T.done();

  var RM = await openPage(browser, { reduced: true, store: SEEN_ALL, q: 'recipe=jeon&reduced=1&seed=102', art: true, paused: true });
  await toReveal(RM);
  await RM.go(600);
  var red = await RM.art(), rp = of(red, 'revealScene'), seeds2 = vals(red, 'seed');
  check(of(red, 'flipScene').length > 0 && of(red, 'sliceScene').length > 0 && rp.length > 0 && red.every(function (r) { return r.still === true; }),
    'L19 reduced motion: still is true on the pan, the board and the plate (' + JSON.stringify(vals(red, 'still')) + ')');
  check(rp.length > 0 && rp.every(function (r) { return r.t === null && r.geo === 'close'; }), 'L19 reduced motion: the reveal gets t null (its rest frame), geo close (' + JSON.stringify(vals(rp, 't')) + ')');
  check(seeds2.length === 1 && typeof seeds2[0] === 'number' && seeds2[0] !== seeds[0], 'L19: another dish seed gives another art seed, again one for the whole dish (' + JSON.stringify(seeds2) + ')');
  check((await RM.live()).err === 0 && RM.errs.length === 0, 'L19: no errors (reduced motion) ' + RM.errs.join(' | '));
  await RM.done();
}

/* ===================================================================================================== */
/* N1: zero visible text on every screen of a dish (open, each step at 300 ms and mid-step, every slide frame, the result at
   1 s and 6 s, after again). cook.html still adds its credits link to the dialog until lane K-C removes it: it is never
   rendered there (display none), which is checked on its own, and left out of the text */
async function textNow(T) {
  return T.page.evaluate(function () {
    var d = document.querySelector('.ck-dlg'), c = d.cloneNode(true), bad = [];
    c.querySelectorAll('.ck-say, .ckh-credits').forEach(function (s) { s.remove(); });
    var titled = d.querySelectorAll('[title]').length;
    d.querySelectorAll('*').forEach(function (e) {
      ['::before', '::after'].forEach(function (ps) { var v = getComputedStyle(e, ps).content; if (v && v !== 'none' && v !== 'normal' && v !== '""' && v !== "''") bad.push(e.className + ps + '=' + v); });
    });
    var cred = d.querySelector('.ckh-credits'), credShown = !!cred && cred.getClientRects().length > 0;
    return { text: c.textContent, titled: titled, pseudo: bad, credShown: credShown, label: d.getAttribute('aria-label') };
  });
}
async function N1(browser) {
  var T = await openPage(browser, { store: null, q: 'seed=5', paused: true, settle: 50 }), shots = [], frames = {};
  async function snap(label) { var x = await textNow(T); x.label2 = label; shots.push(x); }
  async function slideSamples() {   /* every 5 ms through a slide: each of its three frames is sampled */
    for (var w = 0; w < 320; w += 5) { var x = await T.live(); if (x.slide) { var k = x.slide.from + '>' + x.slide.to + ':' + x.slide.f; if (!frames[k]) { frames[k] = 1; await snap(k); } } await T.go(5); }
  }
  await snap('open');
  async function stepSamples(kind, presses) {
    await T.until(function (x) { return x.slide || (x.kind === kind && x.phase === 'step'); }, 4000, kind, 5);
    await slideSamples();
    await snap(kind + ' 300 ms');
    for (var i = 0; i < presses; i++) { await T.verbClick(); await T.go(i === presses - 1 ? 50 : 300); if (i === 0) await snap(kind + ' mid-step'); }
  }
  await stepSamples('tap', 3); await stepSamples('flip', 2); await stepSamples('slice', 2);
  var l = await T.until(function (x) { return x.slide || x.screen === 'reveal'; }, 3000, 'reveal', 5);
  await slideSamples();
  l = await T.live();
  var n = await T.now(); await T.go(T.t0 + l.revealAt + 1000 - n); await snap('result 1 s');
  n = await T.now(); await T.go(T.t0 + l.revealAt + 6000 - n); await snap('result 6 s');
  await T.again();
  await snap('after again');
  var slides = Object.keys(frames).length;
  check(slides === 9, 'N1: every frame of the three slides was sampled (' + Object.keys(frames).join(' ') + ')');
  var badT = shots.filter(function (s) { return s.text !== ''; });
  check(badT.length === 0, 'N1: the dialog has no text outside the aria-live line on any screen (' + badT.map(function (s) { return s.label2 + ': ' + js(s.text); }).join(' | ') + ')');
  check(shots.every(function (s) { return s.titled === 0; }), 'N1: no element in the dialog has a title');
  var badP = shots.filter(function (s) { return s.pseudo.length; });
  check(badP.length === 0, 'N1: every ::before and ::after has content none or empty (' + (badP[0] ? badP[0].pseudo.join(', ') : '') + ')');
  check(shots.every(function (s) { return !s.credShown; }), 'N1: cook.html\'s credits link is never rendered inside the dialog');
  check(shots.every(function (s) { return s.label === '해초전'; }), 'N1: the dialog is named 해초전 (aria-label)');
  check(!/\d/.test(shots.map(function (s) { return s.text; }).join('')), 'N1: no digits in the kitchen at all');
  check(T.errs.length === 0, 'N1: no console errors ' + T.errs.join(' | '));
  await T.done();

  /* the embed (cook.html?embed=1 in a full-screen frame, as index.html's #cook-overlay): its page shows no text at all */
  var wrap = path.join(os.tmpdir(), 'ck-embed-wrap.html');
  fs.writeFileSync(wrap, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;height:100%}iframe{border:0;position:fixed;inset:0;width:100%;height:100%}</style>' +
    '<iframe src="' + URL0 + '?embed=1&seed=5"></iframe>');
  var E = await openPage(browser, { store: null, url: 'file://' + wrap, settle: 1200 });
  var fr = E.page.frames().filter(function (f) { return /cook\.html/.test(f.url()); })[0], texts = [];
  async function bodyText() { return fr.evaluate(function () { var s = document.querySelector('.ck-say'), say = s ? s.innerText : ''; return document.body.innerText.replace(say, '').trim(); }); }
  if (fr) {
    texts.push(await bodyText());
    await fr.evaluate(function () { COOK.auto(true); });
    await E.go(1500); texts.push(await bodyText());
    for (var k = 0; k < 40 && (await fr.evaluate(function () { return COOK.live().screen; })) !== 'reveal'; k++) await E.go(300);
    await E.go(1200); texts.push(await bodyText());
  }
  check(fr && texts.length === 3 && texts.every(function (t) { return t === ''; }), 'N1 embed: the page inside the frame shows no text (open, mid-dish, result: ' + js(texts) + ')');
  check(E.errs.length === 0, 'N1 embed: no errors ' + E.errs.join(' | '));
  await E.done();
}

/* N2 fit, N3 hero size, N4 HUD at the seven target sizes */
async function N2(browser) {
  for (var i = 0; i < FIT.length; i++) {
    var F = FIT[i], tag = F.w + 'x' + F.h + '@' + F.dpr;
    var T = await openPage(browser, { vp: { width: F.w, height: F.h }, dpr: F.dpr, store: SEEN_ALL, q: 'seed=7' });
    var l = await T.live(), v = l.view, css = F.k / F.dpr;
    check(v.k === F.k && v.W === F.W && v.H === F.H && v.ox === F.ox && v.oy === F.oy && v.hudB === 64 && v.chipTop === F.chipTop && Math.abs(v.css - css) < 1e-9,
      'N2 ' + tag + ': live().view matches spec 2.3 (' + js([v.k, v.W, v.H, v.ox, v.oy, v.hudB, v.chipTop]) + ')');
    var cv = await T.rect('.ck-cv'), dl = await T.rect('.ck-dlg');
    function onDev(x) { var d = x * F.dpr; return Math.abs(d - Math.round(d)) <= 0.1; }   /* layout keeps 1/64 CSS px: a few hundredths of a device px are rounding, 0.25 is not */
    check(Math.abs(cv.x) < 0.01 && Math.abs(cv.y) < 0.01 && Math.abs(cv.w - F.W * css) < 0.02 && Math.abs(cv.h - F.H * css) < 0.02 && onDev(cv.w) && onDev(cv.h),
      'N2 ' + tag + ': the canvas box is (0, 0, W css, H css) on whole device px (' + js([cv.x, cv.y, cv.w, cv.h]) + ')');
    check((Math.abs(cv.w - Math.round(cv.w)) < 0.01 && Math.abs(cv.h - Math.round(cv.h)) < 0.01), 'N2 ' + tag + ': the canvas is a whole CSS px (no doubled device row: ' + js([cv.w, cv.h]) + ')');
    check(cv.w >= dl.w - 0.01 && cv.h >= dl.h - 0.01 && Math.abs(dl.x) < 0.01 && Math.abs(dl.y) < 0.01 && dl.w === F.w && dl.h === F.h, 'N2 ' + tag + ': the canvas covers the whole dialog (no letterbox)');
    var top28 = (28 + F.oy) * css, bot132 = (133 + F.oy) * css;
    check(top28 >= v.hudB - css - 1e-6 && bot132 <= v.chipTop + css + 1e-6, 'N2 ' + tag + ': stage rows 28..132 lie between the HUD and the chip (' + top28.toFixed(1) + '..' + bot132.toFixed(1) + ')');
    var sim = await T.rect('.ck-sim');
    check(Math.abs(sim.x - F.ox * css) < 0.01 && Math.abs(sim.y - F.oy * css) < 0.01 && Math.abs(sim.w - 144 * css) < 0.01 && Math.abs(sim.h - 160 * css) < 0.01, 'N2 ' + tag + ': the .ck-sim box is the stage (ox, oy, 144, 160 art px)');

    /* N4 HUD */
    var close = await T.rect('.ck-close'), chip = await T.rect('.ck-chip'), verb = await T.rect('.ck-verb');
    check(Math.abs(chip.w - 48) < 0.6 && Math.abs(chip.h - 48) < 0.6 && Math.abs(close.w - 56) < 0.6 && Math.abs(close.h - 56) < 0.6 &&
      chip.x >= close.x && chip.r <= close.r + 0.01 && chip.y >= close.y && chip.b <= close.b + 0.01, 'N4 ' + tag + ': the close chip is 48 x 48 inside a 56 x 56 hit area (' + js([chip.w, close.w]) + ')');
    check(Math.abs(verb.w - 64) < 0.6 && Math.abs(verb.h - 64) < 0.6 && Math.abs(verb.y - F.chipTop) < 0.6 && Math.abs(verb.x + verb.w / 2 - F.w / 2) <= 1, 'N4 ' + tag + ': the chip is 64 x 64 at the bottom centre');
    check([close, verb].every(function (r) { return r.x >= 0 && r.y >= 0 && r.r <= F.w + 0.01 && r.b <= F.h + 0.01; }) && (await T.rect('.ck-strip')) === null, 'N4 ' + tag + ': close and chip are inside the safe rectangle; there is no strip');
    var box = [(40 + F.ox) * css, (62 + F.oy) * css, 64 * css, 48 * css];
    function hits(r, b) { return r.x < b[0] + b[2] && r.r > b[0] && r.y < b[1] + b[3] && r.b > b[1]; }
    check(!hits(close, box) && !hits(verb, box), 'N4 ' + tag + ': no HUD item overlaps the food box');
    var icons = await T.page.evaluate(function () {
      return Array.prototype.map.call(document.querySelectorAll('.ck-close canvas, .ck-verb canvas'), function (c) { var r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, c.width]; });
    });
    var n2 = Math.floor(2 * F.dpr + 1e-6), n3 = Math.floor(3 * F.dpr + 1e-6);
    check(icons.length === 2 && icons.every(function (r, j) {
      var n = j === 1 ? n3 : n2;
      return onDev(r[0]) && onDev(r[1]) && Math.abs(r[2] * F.dpr - 16 * n) < 0.05 && r[4] === 16 * n;
    }), 'N4 ' + tag + ': HUD icons on whole device px, n device px per icon px (' + icons.map(function (r) { return (r[0] * F.dpr).toFixed(2) + '/' + (r[1] * F.dpr).toFixed(2) + ':' + r[4]; }).join(' ') + ')');
    var marks = l.st.marks.map(function (m) { return ((m.x / 2) + F.ox) * css; });
    check(marks.every(function (x) { return x >= 32 && x <= F.w - 32; }), 'N4 ' + tag + ': tap marks >= 32 CSS px from both edges (ring centres ' + marks.map(function (x) { return x.toFixed(0); }).join(',') + ')');

    /* N3 hero size: the raw jeon on the cold stove, row 86 (food colours only) */
    await verbThrough(T, 'tap', 3);
    await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step' && !x.slide; }, 3000, 'flip');
    await T.go(400);
    var span = await T.page.evaluate(function (o) {
      var c = document.querySelector('.ck-cv'), d = c.getContext('2d').getImageData(0, o.oy + 86, c.width, 1).data, food = {}, lo = -1, hi = -1;
      COOK_ART.FOOD.forEach(function (h) { food[h.toLowerCase()] = 1; });
      for (var x = 0; x < c.width; x++) { var h = '#' + [d[4 * x], d[4 * x + 1], d[4 * x + 2]].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''); if (food[h]) { if (lo < 0) lo = x; hi = x; } }
      return lo < 0 ? 0 : hi - lo + 1;
    }, { oy: F.oy });
    var wcss = span * css;
    check(wcss >= 0.69 * F.w, 'N3 ' + tag + ': the jeon spans >= 69 % of the width (' + wcss.toFixed(1) + ' px = ' + (100 * wcss / F.w).toFixed(1) + ' %)');
    if (F.w === 360 && F.dpr === 2) check(wcss >= 2.2 * 116, 'N3 360x740@2: the jeon is >= 2.2x the old 116 px (' + wcss.toFixed(1) + ')');

    await verbThrough(T, 'flip', 2);
    l = await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
    var ends = [];
    l.st.lines.forEach(function (ln) { [[ln.ax, ln.ay], [ln.bx, ln.by]].forEach(function (p) { ends.push([((p[0] / 2) + F.ox) * css, ((p[1] / 2) + F.oy) * css]); }); });
    check(ends.every(function (p) { return p[0] >= 32 - 0.01 && p[0] <= F.w - 32 + 0.01; }), 'N4 ' + tag + ': guide ends >= 32 CSS px from both edges (' + ends.map(function (p) { return p[0].toFixed(0); }).join(',') + ')');
    var gb = ends.reduce(function (a, p) { return [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])]; }, [1e9, 1e9, -1e9, -1e9]);
    var gbox = [gb[0], gb[1], gb[2] - gb[0], gb[3] - gb[1]];
    check(!hits(close, gbox) && !hits(verb, gbox), 'N4 ' + tag + ': no HUD item overlaps a guide');
    check(T.errs.length === 0 && l.err === 0, 'N2 ' + tag + ': no errors ' + T.errs.join(' | '));
    await T.done();
  }
}

/* N5 slides: frames, the gate, the carried object fixed on screen, again without a carry, none under reduced motion */
async function N5(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=15', paused: true });
  async function watch(kind, pressAt) {   /* sample a slide 30 ms into each 12 fps frame (a display frame lags up to 17 ms): 30 / 113 / 197 / 280 ms */
    var l = await T.until(function (x) { return x.slide || (kind === 'plate' ? x.screen === 'reveal' : x.kind === kind && x.phase === 'step'); }, 4000, kind, 5);
    var e = T.t0 + (kind === 'plate' ? l.revealAt : l.t0), out = [], pix = [];
    for (var j = 0; j < 4; j++) {
      var n = await T.now(), at = e + [30, 113, 197, 280][j];
      if (at > n) await T.go(at - n);
      if (pressAt && j === 1) { await T.tap(144, 176); }
      var x = await T.live(); out.push(x.slide);
      if (x.slide && j < 3) {
        var v = x.view, cx = v.ox + 72, cy = v.oy + 86 - 2, pts = [];
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) pts.push([cx + dx, cy + dy]);
        pix.push((await T.px(pts)).join(''));
      }
    }
    return { s: out, pix: pix, W: l.view.W };
  }
  await verbThrough(T, 'tap', 3);
  var a = await watch('flip', true), S = a.W + 8, want = [0.40, 0.75, 0.94].map(function (k) { return Math.round(S * k); });
  check(a.s[0] && a.s[1] && a.s[2] && a.s[0].f === 0 && a.s[1].f === 1 && a.s[2].f === 2 && a.s[0].s === want[0] && a.s[1].s === want[1] && a.s[2].s === want[2] && a.s[3] === null &&
    a.s[0].from === 'counter' && a.s[0].to === 'stove', 'N5: counter->stove: f 0/1/2 at 0/83/167 ms, s = ' + js(want) + ', null from 250 ms (' + js(a.s) + ')');
  var l = await T.live();
  check(l.st.heat === false, 'N5: a press at 100 ms (in the slide) is not counted (the heat stays off)');
  check(a.s[0] && a.s[0].carry === 'pan' && a.pix.length === 3 && a.pix[0] === a.pix[1] && a.pix[1] === a.pix[2], 'N5: the carried pan\'s centre 3 x 3 art px keep their colours on every slide frame');
  await T.go(400); await T.verbClick(); await T.go(300); await T.verbClick();
  var b = await watch('slice');
  check(b.s[0] && b.s[0].from === 'stove' && b.s[0].to === 'board' && b.s[0].carry === 'jeon' && b.s[2] && b.s[2].f === 2 && b.s[3] === null && b.pix.length === 3 && b.pix[0] === b.pix[1] && b.pix[1] === b.pix[2],
    'N5: stove->board carries the jeon, its centre fixed on screen (' + js(b.s.map(function (s) { return s && s.f; })) + ')');
  await T.go(500); await T.verbClick(); await T.go(300); await T.verbClick();
  var c = await watch('plate');
  check(c.s[0] && c.s[0].from === 'board' && c.s[0].to === 'plate' && c.s[0].carry === 'cut' && c.s[3] === null && c.pix.length === 3 && c.pix[0] === c.pix[1] && c.pix[1] === c.pix[2],
    'N5: board->plate carries the cut jeon, its centre fixed on screen');
  await T.go(1000); await T.again();
  var d = await T.live();
  check(d.screen === 'step' && d.si === 0 && d.station === 'counter' && !d.slide && d.stats.slides === 0, 'N5: the next dish opens on its first station without a slide');
  check(T.errs.length === 0, 'N5: no errors ' + T.errs.join(' | '));
  await T.done();
}

/* N6 haptics: a fake navigator.vibrate records the calls */
async function N6(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=16', paused: true, vib: true });
  var v0 = await T.page.evaluate(function () { return window.__vib.length; });
  check(v0 === 0, 'N6: nothing buzzes at open');
  var l = await T.live(), mk = l.st.marks[0];
  await T.go(700);
  var p = await T.pt(mk.x, mk.y);
  await T.touch('touchStart', p); await realWait(30); await T.go(20);
  var vDown = await T.page.evaluate(function () { return [COOK.live().st.hits, window.__vib.slice()]; });
  check(vDown[0] === 1 && vDown[1].length === 0, 'N6: the first touch counts a hit but buzzes nothing before it ends (no user activation yet: ' + js(vDown) + ')');
  await T.touch('touchEnd'); await T.go(150);
  var n0 = await T.page.evaluate(function () { return window.__vib.length; });
  for (var i = 0; i < 8; i++) { var m = (await T.live()).st.marks[Math.floor((i + 1) / 3)]; await T.tap(m.x, m.y); await T.go(150); }
  var vib = await T.page.evaluate(function () { return window.__vib.slice(); });
  check(vib.length - n0 === 8 && vib.slice(n0).every(function (x) { return x.p === 14; }), 'N6: each counted tap gives 14 (' + js(vib.slice(n0).map(function (x) { return x.p; })) + ')');
  await T.tap(DUST[0], DUST[1]); await T.go(150);
  l = await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700);
  var n1 = await T.page.evaluate(function () { return window.__vib.length; });
  await T.tap(144, 176); await T.go(100);
  vib = await T.page.evaluate(function () { return window.__vib.slice(); });
  check(vib.length - n1 === 1 && vib[n1].p === 14, 'N6: heat-on gives 14; dust and the slide gave nothing (' + js(vib.slice(n1).map(function (x) { return x.p; })) + ')');
  await T.tap(140, 190); await T.go(150); await T.tap(150, 190); await T.go(3200);   /* nudges and a band change */
  var n2 = await T.page.evaluate(function () { return window.__vib.length; });
  check(n2 === n1 + 1, 'N6: nudges and band changes give nothing');
  var s0 = await T.pt(144, 236), s1 = await T.pt(145, 150);
  await T.touch('touchStart', s0); await T.go(16);
  var flipAt = await T.now();
  await T.touch('touchMove', s1); await realWait(40);
  await T.go(16); await T.touch('touchEnd');
  await T.go(400);
  vib = await T.page.evaluate(function () { return window.__vib.slice(); });
  var fv = vib.slice(n2);
  check(fv.length === 1 && fv[0].p === 24 && fv[0].t - flipAt >= 230 && fv[0].t - flipAt <= 300, 'N6: the flip gives 24 on the landing, 230-300 ms after the flip (' + js(fv.map(function (x) { return [x.p, Math.round(x.t - flipAt)]; })) + ')');
  l = await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice');
  await T.go(700);
  var n3 = vib.length;
  for (var c = 0; c < 2; c++) {
    var ln = (await T.live()).st.lines[c];
    await T.drag(line([ln.ax - 2 * ln.ux, ln.ay - 2 * ln.uy], [ln.bx + 2 * ln.ux, ln.by + 2 * ln.uy], 20), 16);
    await T.go(300);
  }
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var R = T.t0 + l.revealAt;
  await T.go(1200);
  vib = await T.page.evaluate(function () { return window.__vib.slice(); });
  var cv = vib.slice(n3), cuts = cv.filter(function (x) { return x.t < R; }), plate = cv.filter(function (x) { return x.t >= R; });
  check(cuts.length === 2 && cuts.every(function (x) { return x.p === 16; }), 'N6: each line cut gives 16 (' + js(cuts.map(function (x) { return x.p; })) + ')');
  check(plate.length === 0, 'N6: the plate gives nothing (round 5 check O-5: the owner named only tap, flip and slice: ' + js(plate.map(function (x) { return [x.p, Math.round(x.t - R)]; })) + ')');
  var n4 = vib.length;
  var bz = js((await T.live()).stats.buzz);
  await T.tapCss(await (async function () { var r = await T.rect('.ck-table'); return [r.x + r.w / 2, r.y + r.h / 2]; })());   /* an end button's press itself */
  await T.go(1200);
  vib = await T.page.evaluate(function () { return window.__vib.slice(); });
  check(vib.length === n4, 'N6: an end button gives nothing');
  l = { stats: { buzz: JSON.parse(bz) } };
  check(js(l.stats.buzz) === js({ tap: 10, flip: 1, cut: 2 }), 'N6: stats.buzz counts the attempts, tap / flip / cut only (' + js(l.stats.buzz) + ')');
  check(T.errs.length === 0, 'N6: no errors ' + T.errs.join(' | '));
  await T.done();

  var O = await openPage(browser, { store: SEEN_ALL, q: 'seed=17', vib: true, haptics: JSON.stringify({ on: false }) });
  await O.tap(DUST[0], DUST[1]); await O.go(200);
  await toReveal(O); await O.go(800);
  var off = await O.page.evaluate(function () { return window.__vib.length; });
  check(off === 0, 'N6: with ppolppol_haptics { on: false } nothing buzzes (' + off + ')');
  await O.done();

  var M = await openPage(browser, { reduced: true, store: SEEN_ALL, q: 'seed=18&reduced=1', paused: true, vib: true });
  await M.tap(DUST[0], DUST[1]); await M.go(200);
  await verbThrough(M, 'tap', 3);
  await M.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await M.go(700); await M.tap(144, 176); await M.go(300);
  var m0 = await M.page.evaluate(function () { return window.__vib.length; });
  var q0 = await M.pt(144, 236), q1 = await M.pt(145, 150);
  await M.touch('touchStart', q0); await M.go(16);
  var fAt = await M.now();
  await M.touch('touchMove', q1); await realWait(40); await M.go(16); await M.touch('touchEnd'); await M.go(100);
  var mv = (await M.page.evaluate(function () { return window.__vib.slice(); })).slice(m0);
  check(mv.length === 1 && mv[0].p === 24 && mv[0].t - fAt < 20, 'N6 reduced motion: the flip buzzes at the flip event (' + js(mv.map(function (x) { return [x.p, Math.round(x.t - fAt)]; })) + ')');
  await verbThrough(M, 'slice', 2);
  var lm = await M.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await M.go(600);
  var dn = (await M.page.evaluate(function () { return window.__vib.slice(); })).filter(function (x) { return Array.isArray(x.p); });
  check(dn.length === 0, 'N6 reduced motion: the plate gives nothing either (' + js(dn.map(function (x) { return Math.round(x.t - (M.t0 + lm.revealAt)); })) + ')');
  check(M.errs.length === 0, 'N6: no errors (reduced) ' + M.errs.join(' | '));
  await M.done();
}

/* N7 resume and again: closing mid-step 2 and reopening gives step 2 of the same run; again: a new id, book +1, a new pot */
async function N7(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=19' });
  var id0 = (await T.live()).id;
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700); await T.verbClick(); await T.go(400);
  await T.page.evaluate(function () { COOK.close(); }); await T.go(200);
  check((await T.live()).screen === 'closed' && (await T.store()).pot.si === 1, 'N7: closed mid step 2, the pot is at step 2');
  await T.page.evaluate(function () { document.getElementById('ck-door').click(); }); await T.go(100);
  var l = await T.live();
  check(l.screen === 'step' && l.si === 1 && l.kind === 'flip' && l.id === id0 && l.st.heat === false && !l.slide, 'N7: reopening gives step 2 of the same run (from its start, no slide)');
  await verbThrough(T, 'flip', 2); await verbThrough(T, 'slice', 2);
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  var b0 = (await T.store()).book.length;
  await T.go(1000); await T.again(); await T.go(50);
  l = await T.live();
  var st = await T.store();
  check(l.screen === 'step' && l.si === 0 && l.id !== id0 && st.book.length === b0 && b0 === 1 && st.pot && st.pot.runId === l.id, 'N7: the next dish: a new run id, the book has the dish (+1), a pot for the new run');
  check(T.errs.length === 0, 'N7: no errors ' + T.errs.join(' | '));
  await T.done();
}

/* N10 safe insets: --ck-safe-t 47px, --ck-safe-b 34px and COOK.refit() -> hudB 111, chipTop vh - 114 */
async function N10(browser) {
  var T = await openPage(browser, { vp: { width: 390, height: 844 }, dpr: 3, store: SEEN_ALL });
  var ok = await T.page.evaluate(function () { var s = document.documentElement.style; s.setProperty('--ck-safe-t', '47px'); s.setProperty('--ck-safe-b', '34px'); return COOK.refit(); });
  await T.go(50);
  var l = await T.live(), v = l.view;
  check(ok && v.hudB === 111 && v.chipTop === 844 - 114 && js(v.safe) === js([47, 0, 34, 0]), 'N10: hudB 111 and chipTop vh - 114 (' + js([v.hudB, v.chipTop, v.safe]) + ')');
  check(v.k === 14 && v.W === 84 && v.H === 183 && v.ox === -30 && v.oy === 10, 'N10: 390x844@3 with insets 47/34 matches spec 2.3 (' + js([v.k, v.W, v.H, v.ox, v.oy]) + ')');
  var close = await T.rect('.ck-chip'), verb = await T.rect('.ck-verb'), cv = await T.rect('.ck-cv');
  check(close.y >= 47 + 8 - 0.01 && verb.b <= 844 - 34 - 16 + 0.01, 'N10: the HUD and the chip sit inside the insets (' + js([close.y, verb.b]) + ')');
  check(cv.x === 0 && cv.y === 0 && cv.w >= 390 && cv.h >= 844, 'N10: the canvas still covers the dialog (under the notch and the home bar)');
  check(T.errs.length === 0, 'N10: no errors ' + T.errs.join(' | '));
  await T.done();
}

/* N11 (round 6, 11-18) the golden bell and the ding: the bell appears on the frame of the band-1 event (f 0: popped 2 px up
   with a bright rim), swings f 1..7 (A on odd frames with ring marks, B on even), rests from f 8, and hides at the flip and
   at band 2; exactly one AUDIO 'ding' act per flip step; no vibrate call at that moment; reduced motion: still from f 0,
   ring marks held for f 0..7. Pixels are read from the canvas (art px of the view) at the bell sprite (GEO.bell 102, 44). */
var BELLPX = { rim: [95, 42], a: [95, 44], b: [97, 44], rest: [96, 44], mark: [93, 42] }, R1 = '#884b2b', A3 = '#e8c170', S6 = '#ebede9';
async function bellPx(T) {
  var l = await T.live(), v = l.view, keys = Object.keys(BELLPX);
  var got = await T.px(keys.map(function (k) { return [v.ox + BELLPX[k][0], v.oy + BELLPX[k][1]]; })), o = { l: l };
  keys.forEach(function (k, i) { o[k] = got[i]; });
  return o;
}
async function toGolden(T) {
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700);
  await T.tap(144, 176);   /* heat on (a touch: it also gives user activation, so a vibrate would really be called) */
  await T.go(2600);
  var pre = await T.live();
  var l = await T.until(function (x) { return x.band === 1; }, 1200, 'golden', 10);
  return { pre: pre, l: l };
}
async function N11(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=16', audio: true, vib: true });
  var g = await toGolden(T), vib0 = await T.page.evaluate(function () { return window.__vib.length; });
  check(g.pre.band === 0 && (g.pre.bell === null || !g.pre.bell.shown), 'N11: no bell while the jeon is still soft (' + js(g.pre.bell) + ')');
  var f0 = await bellPx(T);
  check(f0.l.bell && f0.l.bell.shown && f0.l.bell.f === 0, 'N11: the bell shows on the frame of the band-1 event (' + js(f0.l.bell) + ')');
  check(f0.rim === S6, 'N11: f 0 pops: the bell sits 2 px higher with a bright rim (' + f0.rim + ')');
  var byF = {};
  for (var k = 0; k < 60; k++) { await T.go(20); var q = await bellPx(T); if (!q.l.bell) break; if (!byF[q.l.bell.f]) byF[q.l.bell.f] = q; if (q.l.bell.f >= 10) break; }
  var fs2 = Object.keys(byF).map(Number), swingOk = true, restOk = true;
  fs2.forEach(function (f) {
    var q = byF[f];
    if (!q.l.bell.shown) swingOk = false;
    if (f >= 1 && f <= 7) { if ((f & 1) ? !(q.a === R1 && q.mark === A3) : !(q.b === R1 && q.mark !== A3)) swingOk = false; }
    if (f >= 8 && !(q.rest === R1 && q.a !== R1 && q.mark !== A3)) restOk = false;
  });
  check(fs2.filter(function (f) { return f >= 1 && f <= 7; }).length >= 5 && swingOk, 'N11: f 1..7 swing: A (lean left, ring marks) on odd frames, B (lean right) on even (frames seen ' + fs2.join(',') + ')');
  check(fs2.some(function (f) { return f >= 8; }) && restOk, 'N11: from f 8 the bell rests, no marks');
  var vib1 = await T.page.evaluate(function () { return window.__vib.length; });
  check(vib1 === vib0, 'N11: no vibrate call at the golden moment or while the bell rings (' + (vib1 - vib0) + ')');
  var acts = await T.page.evaluate(function () { return window.__acts.map(function (x) { return x.p.act + (x.p.band != null ? x.p.band : ''); }); });
  var di = acts.indexOf('ding');
  check(acts.filter(function (a) { return a === 'ding'; }).length === 1 && di > acts.indexOf('sizzle1') && acts.indexOf('sizzle1') >= 0, 'N11: one ding act, right after the golden sizzle (' + acts.slice(-4).join(',') + ')');
  var said = (await T.live()).said;
  check(said.indexOf('노릇노릇') >= 0 && said.every(function (w) { return !/띵|종/.test(w); }), 'N11: no new aria word (the line says 노릇노릇)');
  await T.drag(line([144, 236], [146, 140], 6), 16);   /* the flip */
  await T.go(120);
  var fl = await bellPx(T);
  check(fl.l.bell && !fl.l.bell.shown && fl.rest !== R1, 'N11: the flip hides the bell quietly');
  await verbThrough(T, 'slice', 2);
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal'); await T.go(600);
  acts = await T.page.evaluate(function () { return window.__acts.map(function (x) { return x.p.act; }); });
  check(acts.filter(function (a) { return a === 'ding'; }).length === 1, 'N11: exactly one ding for the dish (one flip step)');
  check(T.errs.length === 0, 'N11: no errors ' + T.errs.join(' | '));
  await T.done();
  /* band 2 without a flip: the bell goes quietly, no second ding */
  var C = await openPage(browser, { store: SEEN_ALL, q: 'seed=17', audio: true });
  await toGolden(C);
  await C.go(1500);
  var mid = await C.live();
  await C.until(function (x) { return x.band === 2; }, 3000, 'crisp', 20);
  var cr = await bellPx(C);
  check(mid.bell && mid.bell.shown && cr.l.bell && !cr.l.bell.shown && cr.rest !== R1, 'N11: at band 2 (crisp) the bell is gone');
  acts = await C.page.evaluate(function () { return window.__acts.map(function (x) { return x.p.act; }); });
  check(acts.filter(function (a) { return a === 'ding'; }).length === 1, 'N11: crisp brings no second ding');
  check(C.errs.length === 0, 'N11: no errors (crisp) ' + C.errs.join(' | '));
  await C.done();
  /* reduced motion: still from f 0, the ring marks held for f 0..7 */
  var M = await openPage(browser, { store: SEEN_ALL, q: 'seed=16', reduced: true });
  await toGolden(M);
  var m0 = await bellPx(M);
  check(m0.l.bell && m0.l.bell.shown && m0.l.bell.f === 0 && m0.rest === R1 && m0.rim !== S6 && m0.mark === A3, 'N11 reduced: f 0 is the still bell (no pop) with the ring marks');
  var m5 = null, m9 = null;
  for (k = 0; k < 60 && !m9; k++) { await M.go(20); var q2 = await bellPx(M); if (q2.l.bell.f === 5 && !m5) m5 = q2; if (q2.l.bell.f >= 9) m9 = q2; }
  check(m5 && m5.rest === R1 && m5.a !== R1 && m5.b !== R1 && m5.mark === A3, 'N11 reduced: f 5 still, no swing, marks held');
  check(m9 && m9.rest === R1 && m9.mark !== A3, 'N11 reduced: from f 8 the marks are gone, the bell stays');
  check(M.errs.length === 0, 'N11: no errors (reduced) ' + M.errs.join(' | '));
  await M.done();
}

(async function main() {
  var tests = { L1: L1, L2: L2, L3: L3, L4: L4, L5: L5, L6: L6, L7: L7, L8: L8, L9: L9, L10: L10, L11: L11, L12: L12, L13: L13, L15: L15, L16: L16, L17: L17, L18: L18, L19: L19,
    N1: N1, N2: N2, N5: N5, N6: N6, N7: N7, N10: N10, N11: N11 };
  var browser = await chromium.launch(), t0 = Date.now();
  try {
    for (var name in tests) {
      if (ONLY.length && ONLY.indexOf(name) < 0) continue;
      section(name);
      try { await tests[name](browser); }
      catch (e) { fails++; console.error('  FAIL ' + name + ' threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
    }
  } finally { await browser.close(); }
  if (!ONLY.length || ONLY.indexOf('L14') >= 0) { section('L14'); check(errAll.length === 0, 'L14: no console or page errors in the whole run (' + errAll.length + ')'); }   /* L14 became N1 + this */
  console.log('\n' + passes + ' passed, ' + fails + ' failed (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(fails ? 1 : 0);
})();
