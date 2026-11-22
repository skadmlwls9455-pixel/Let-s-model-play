#!/usr/bin/env node
/* tools/cook-shots.js - the kitchen's documentation captures (wip/round5/cook-spec.md 16.2) into docs/shots/cook/.
 *   NODE_PATH=$(npm root -g) node tools/cook-shots.js
 *   COOK_SHOTS_DIR=/some/dir   write the PNGs there instead of docs/shots/cook/
 *   ONLY=360x740,embed         only these sets (360x740, 320x568, 412x915, book, embed)
 * What it writes (23 PNGs, sound off, light colour scheme, ?seed=12, one dish played the same way on every size):
 *   360x740 @2 and 320x568 @2 (suffix -360x740 / -320x568):
 *     01-tap-start       700 ms after open, fresh save (nothing seen yet): the first-time demo hand on the first ring
 *     02-tap-mid         after 4 hits, 125 ms after the 4th: its first squash frame (wide)
 *     03-slide           the counter -> stove slide, its first frame (slide.f 0): the pan carried, both stations
 *     04-flip-cold       the stove 290 ms after heat-on: flames, burner knob on, the jeon still pale (band 0); the up-arrow
 *                        is drawn from heat-on, as the game plays it ('flip' already seen, so no up-swipe demo hand)
 *     05-flip-golden     4.04 s after heat-on: golden (band 1), the up-arrow
 *     06-flip-landed     the landing frame: arc frame 3, 290 ms after the flick (oil flood, steam, 1 px shake)
 *     07-slice-start     the board, the first guide with the first-time demo hand ('slice' not seen yet)
 *     08-slice-mid       one line cut, the second guide lit
 *     09-result          the plate 1.04 s after the reveal (t 12 >= 6), the again chip shown
 *     10-result-reduced  the same dish with prefers-reduced-motion: reduce (emulated): the plate at rest, the again chip
 *   412x915 @2.625 (suffix -412x915): 01-tap-start and 09-result
 *   11-21 round 7 (set 'book', 360x740 @2, real time, the book dishes of js/cook-steps.js; pictures need js/cook-sprites.js):
 *     20-book, 21-book-locked, 22..30 one step of every kind (slice stir pour flip tap swipe drag rub bake), 31..35 the five plates
 *     with their end buttons. These are not byte-stable (no fake clock); 09 / 10 now show the end buttons, not an again chip.
 *   11-embed-360x740     index.html (stub world and brain, the first-run name dialog filled), the play room, the kitchen
 *                        opened by a touch on the counter (cook.html?embed=1 in #cook-overlay), the tap step after 3 hits
 * Two saves: 01-03 come from a fresh save (nothing seen); 04-10 from a save that has seen 'tap' and 'flip' but not
 * 'slice' (the same 9 taps again, so the dish is the same), which keeps the up-swipe demo hand off the cold pan in 04
 * and gives 07 its first-time slice demo. The embed starts from no save at all (its dish has the game's day seed).
 * Deterministic: Playwright's fake clock (2026-11-08 10:00) is paused before each kitchen opens, so the kitchen's own clock
 * (cook.html opens it at load) moves only in T.go; a fixed seed, a fixed save (ppolppol_cook_v0), a fixed run-id salt
 * (crypto), the same touches at the same sim times on every size. The fake clock paints on requestAnimationFrame every 16
 * ticks; alignClock (an empty probe page written to the OS temp folder) makes every kitchen open 8 ticks after such a
 * frame, so each capture shows the same 12 fps frame on every run, and every capture time lies inside a 12 fps frame.
 * Touch goes through CDP Input.dispatchTouchEvent (trusted touches, as in tools/test-cook-live.js) and each touch is
 * waited for before the clock moves on, so its event time is exact; logical px (the sim's 288 x 320) map to the screen
 * through the invisible .ck-sim box. Screenshots stop CSS animations (the reaction stickers rise and fade on real time),
 * so a sticker is either fully in or gone. Two runs, one of them on a fully loaded CPU, gave byte-identical files.
 * Every capture first checks COOK.live() (screen, kind, station, slide frame, band, hint, chip), that the dialog shows
 * no text and that the page logged no error; a capture whose state is not right is not written.
 * Exit 1 if a capture could not be made.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var OUT = process.env.COOK_SHOTS_DIR ? path.resolve(process.env.COOK_SHOTS_DIR) : path.join(ROOT, 'docs/shots/cook');
var ONLY = (process.env.ONLY || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
var COOK_URL = 'file://' + path.join(ROOT, 'cook.html');
var INDEX_URL = 'file://' + path.join(ROOT, 'index.html');
var PROBE = path.join(os.tmpdir(), 'ck-shots-clock.html'), PROBE_URL = 'file://' + PROBE;   /* an empty page: reads the clock (alignClock) */
var KEY = 'ppolppol_cook_v0';
var SEED = 12;
var TIME = '2026-11-08T10:00:00', DAY = '2026-11-08';
var SALT = 7;   /* crypto.getRandomValues in the kitchen frame: the run id salt (the id is not drawn; fixed anyway) */
var FMS = 1000 / 12;
var FRESH = null;   /* no save at all: nothing seen */
var SEEN_TF = JSON.stringify({ v: 1, day: '', dayN: 0, seen: ['tap', 'flip'], pot: null, book: [] });
var SETS = [
  { tag: '360x740', w: 360, h: 740, dpr: 2, shots: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'] },
  { tag: '320x568', w: 320, h: 568, dpr: 2, shots: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'] },
  { tag: '412x915', w: 412, h: 915, dpr: 2.625, shots: ['01', '09'] }
];
var NAMES = { '01': '01-tap-start', '02': '02-tap-mid', '03': '03-slide', '04': '04-flip-cold', '05': '05-flip-golden', '06': '06-flip-landed',
  '07': '07-slice-start', '08': '08-slice-mid', '09': '09-result', '10': '10-result-reduced' };
/* the play, in sim ms from the kitchen's open (the tap step starts at 0): 9 taps, 3 per ring, 200 ms apart */
var TAP_AT = [900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500];
var TAP_OFF = [[-3, 2], [2, -2], [0, 3]];   /* logical px around the ring centre, per tap on that ring */
/* when each capture is taken (sim ms after its event); every one lies inside a 12 fps frame, never on its first 16 ms */
var AT = { start: 700, squash: 125, slide: 42, heatIn: 700, cold: 290, golden: 4040, flick: 4500, landed: 290, demo: 800, cut0: 1800, cutRest: 400, result: 1040, embed: 1320 };
var PHASE = 8;   /* every kitchen opens 8 ticks after a fake-rAF boundary (alignClock) */

var made = [], failed = [];
function realWait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function line(a, b, n) { var out = []; for (var i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
function js(o) { return JSON.stringify(o); }
function want(tag) { return !ONLY.length || ONLY.indexOf(tag) >= 0; }
async function poll(fn, max) { for (var w = 0; w <= max; w += 50) { if (await fn()) return true; await realWait(50); } return false; }   /* real time */

/* Pause the installed clock a little ahead of the page's own time (as tools/test-cook-live.js): until the end, time
   moves in T.go only. A short margin can already be past on a busy machine; then a longer one */
async function pauseClock(page) {
  var margins = [250, 1000, 3000], err = null;
  for (var i = 0; i < margins.length; i++) {
    try { await page.clock.pauseAt(await page.evaluate(function (m) { return Date.now() + m; }, margins[i])); return margins[i]; }
    catch (e) { err = e; if (!/fast-forward to the past/i.test(String(e && e.message))) throw e; }
  }
  throw err;
}

/* The fake clock fires requestAnimationFrame on multiples of 16 ticks (performance.now()), and a document created after
   pauseAt starts at the ticks its replayed clock log adds up to: the real time between install and pauseAt, different on
   every run. The kitchen paints on those frames, so that phase decides which 12 fps frame a capture shows. Read the start
   in a document made now (probe: the probe page's or a probe frame's performance.now()) and run the clock on until it is
   PHASE past a frame boundary: the next document (the kitchen) opens there on every run */
async function alignClock(page, probe) {
  var p = await probe(), add = (((PHASE - p) % 16) + 16) % 16;
  if (add) await page.clock.runFor(add);
  return p + add;
}
async function probeFrame(page) {   /* the embed: a hidden frame in the game page, made after pauseAt */
  await page.evaluate(function (src) {
    var f = document.createElement('iframe'); f.id = 'ck-shots-probe'; f.src = src; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
  }, PROBE_URL);
  var pf = null;
  if (!await poll(async function () { pf = page.frames().filter(function (f) { return f.url() === PROBE_URL; })[0]; return !!pf && await pf.evaluate(function () { return document.readyState === 'complete'; }).catch(function () { return false; }); }, 10000)) throw new Error('the clock probe frame did not load');
  var p = await pf.evaluate(function () { return performance.now(); });
  await page.evaluate(function () { var f = document.getElementById('ck-shots-probe'); if (f) f.remove(); });
  return p;
}

/* init script (every frame): count the pointer events the page has handled, so a touch is waited for before the clock moves */
function countPointers() {
  window.__ckPtr = { d: 0, m: 0, u: 0 };
  ['pointerdown', 'pointermove', 'pointerup'].forEach(function (t) { window.addEventListener(t, function () { window.__ckPtr[t.charAt(7)]++; }, true); });
}
/* init script (every frame, acts in cook.html only): a fixed crypto salt for the run id */
function fixSalt(v) {
  if (!/cook\.html$/.test(location.pathname)) return;
  try { crypto.getRandomValues = function (a) { for (var i = 0; i < a.length; i++) a[i] = v; return a; }; } catch (e) { /* none */ }
}

/* ---------- helpers on one kitchen frame (standalone: the page; embed: the iframe). Touches go to the page (CSS px) ---------- */
function helpers(page, cdp, frame, errs) {
  var T = { page: page, cdp: cdp, fr: frame, errs: errs, t0: 0 };
  T.ev = function (fn, arg) { return T.fr.evaluate(fn, arg); };
  T.go = function (ms) { return ms > 0 ? page.clock.runFor(ms) : Promise.resolve(); };
  T.now = function () { return T.ev(function () { return performance.now(); }); };
  T.at = async function (ms, label) {   /* run the clock to t0 + ms (sim ms since the kitchen opened) */
    var n = await T.now(), to = T.t0 + ms;
    if (to < n - 0.01) throw new Error('already past ' + (label || ms) + ' (' + (n - T.t0).toFixed(1) + ' > ' + ms + ')');
    await T.go(to - n);
  };
  T.sim = async function () { return (await T.now()) - T.t0; };
  T.live = function () { return T.ev(function () { return COOK.live(); }); };
  T.rect = function (sel) {
    return T.ev(function (s) { var e = document.querySelector(s); if (!e) return null; var r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
  };
  T.pt = async function (lx, ly) { var r = await T.rect('.ck-sim'); return [r.x + lx * r.w / 288, r.y + ly * r.h / 320]; };   /* logical px -> CSS px */
  T.ptr = function () { return T.ev(function () { return window.__ckPtr ? [window.__ckPtr.d, window.__ckPtr.m, window.__ckPtr.u] : [0, 0, 0]; }); };
  /* one touch event, then wait (real time, the clock standing still) until the frame has handled it: its time is exact */
  T.touch = async function (type, p) {
    var k = type === 'touchStart' ? 0 : type === 'touchMove' ? 1 : 2, n0 = (await T.ptr())[k];
    await cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1 }] : [] });
    for (var w = 0; w < 60; w++) { if ((await T.ptr())[k] > n0) return true; await realWait(10); }
    return false;   /* no pointer event for it (e.g. a move inside the touch slop): go on */
  };
  T.handled = async function (fn, label) { for (var w = 0; w < 300; w++) { if (fn(await T.live())) return; await realWait(10); } throw new Error('timeout: ' + label + ' ' + js(await T.live()).slice(0, 300)); };
  T.until = async function (fn, max, label, step) {
    for (var w = 0; w <= (max || 6000); w += (step || 10)) { var l = await T.live(); if (fn(l)) return l; await T.go(step || 10); }
    throw new Error('timeout: ' + label + ' ' + js(await T.live()).slice(0, 300));
  };
  T.drag = async function (pts, ms) {   /* logical points; each move handled before the clock moves on */
    var c = [];
    for (var i = 0; i < pts.length; i++) c.push(await T.pt(pts[i][0], pts[i][1]));
    await T.touch('touchStart', c[0]);
    for (var j = 1; j < c.length; j++) { await T.go(ms || 16); await T.touch('touchMove', c[j]); }
    await T.go(16); await T.touch('touchEnd');
  };
  T.text = function () {   /* the dialog's text, without the aria-live line (spec 6: zero visible words) */
    return T.ev(function () { var d = document.querySelector('.ck-dlg'); if (!d) return null; var c = d.cloneNode(true); c.querySelectorAll('.ck-say').forEach(function (s) { s.remove(); }); return c.textContent; });
  };
  return T;
}

/* the reaction stickers are <img> / strip backgrounds: have every one loaded and decoded before a screenshot */
async function stickersReady(fr) {
  return fr.evaluate(async function () {
    var urls = [], imgs = [];
    document.querySelectorAll('.cook-sticker').forEach(function (n) {
      if (n.tagName === 'IMG') { urls.push(n.src); imgs.push(n); }
      n.querySelectorAll('.cook-sticker-frames').forEach(function (f) { var m = /url\("?([^")]*)"?\)/.exec(f.style.backgroundImage || ''); if (m) urls.push(m[1]); });
    });
    await Promise.all(urls.map(function (u) { return new Promise(function (r) { var i = new Image(); i.onload = i.onerror = function () { r(); }; i.src = u; }); }));
    await Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; }));
    return urls.length;
  });
}

/* check the state, then write the PNG (device px, CSS animations stopped) */
async function shoot(T, name, checks) {
  var bad = checks.filter(function (c) { return !c[0]; }).map(function (c) { return c[1]; });
  var text = await T.text();
  if (text !== '') bad.push('dialog text ' + js(text));
  var l = await T.live();
  if (l.err) bad.push('kitchen err ' + l.err);
  if (T.errs.length) bad.push('page errors: ' + T.errs.join(' | '));
  if (bad.length) { failed.push(name + ': ' + bad.join('; ')); console.error('  FAIL ' + name + ': ' + bad.join('; ')); return false; }
  await stickersReady(T.fr);
  await realWait(120);   /* let the compositor show the last canvas frame */
  var file = path.join(OUT, name + '.png');
  try { await T.page.screenshot({ path: file, animations: 'disabled' }); }
  catch (e) { failed.push(name + ': screenshot ' + e.message); console.error('  FAIL ' + name + ': screenshot ' + e.message); return false; }
  made.push(name); console.log('  ok   ' + name + '  (sim ' + (await T.sim()).toFixed(0) + ' ms, ' + [l.screen, l.kind || '-', l.station, l.slide ? 'slide f' + l.slide.f : 'no slide', l.hint ? l.hint + ' hand' : 'no hand', !l.verb ? 'no chip' : l.quiet ? 'chip quiet' : 'chip ' + l.verb + ' shown'].join(', ') + ')');
  return true;
}

/* ---------- one standalone page (cook.html?recipe=jeon&seed=12) ---------- */
async function openKitchen(browser, set, o) {
  var ctx = await browser.newContext({ viewport: { width: set.w, height: set.h }, deviceScaleFactor: set.dpr, hasTouch: true, isMobile: true,
    colorScheme: 'light', locale: 'ko-KR', reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(function (a) {   /* the save, once per tab, in cook.html */
    if (!/cook\.html$/.test(location.pathname)) return;
    try { if (!sessionStorage.getItem('__ckSeeded')) { sessionStorage.setItem('__ckSeeded', '1'); if (a[1] === null) localStorage.removeItem(a[0]); else localStorage.setItem(a[0], a[1]); } } catch (e) { /* none */ }
  }, [KEY, o.store]);
  await ctx.addInitScript(fixSalt, SALT);
  await ctx.addInitScript(countPointers);
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.clock.install({ time: new Date(TIME) });
  await pauseClock(page);   /* before the kitchen exists: it opens at load with its clock standing still */
  await page.goto(PROBE_URL);
  var start = await alignClock(page, function () { return page.evaluate(function () { return performance.now(); }); });
  await page.goto(COOK_URL + '?recipe=jeon&seed=' + SEED);
  var T = helpers(page, await ctx.newCDPSession(page), page.mainFrame(), errs);
  T.ctx = ctx;
  T.done = function () { return ctx.close(); };
  T.t0 = await T.now();   /* the kitchen's sim 0 (cook.html opens it at load; the clock has not moved since) */
  if (Math.abs(T.t0 - start) > 1e-6) { await T.done(); throw new Error('the kitchen did not open on the aligned clock (' + T.t0 + ' vs ' + start + ')'); }
  return T;
}

/* the tap step: 9 taps at TAP_AT; after(i) runs right after tap i (0-based) was handled */
async function playTap(T, after) {
  var l = await T.live();
  if (!(l.screen === 'step' && l.kind === 'tap' && l.si === 0)) throw new Error('not at the tap step: ' + js([l.screen, l.kind, l.si]));
  for (var i = 0; i < 9; i++) {
    await T.at(TAP_AT[i], 'tap ' + i);
    l = await T.live();
    var mk = l.st.marks[Math.floor(i / 3)], off = TAP_OFF[i % 3], n0 = l.st.hits;
    await T.touch('touchStart', await T.pt(mk.x + off[0], mk.y + off[1]));
    await T.handled(function (x) { return x.st && x.st.hits > n0; }, 'hit ' + i);
    await T.go(30); await T.touch('touchEnd');
    if (after) await after(i);
  }
}
/* the flip step: heat on at t0 + heatIn, the flick at heat + flick. hooks: cold(heatAt), golden(heatAt), landed(flickAt) */
async function playFlip(T, hooks) {
  var l = await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip step');
  var t0 = l.t0, heatAt = t0 + AT.heatIn;
  await T.at(heatAt, 'heat');
  await T.touch('touchStart', await T.pt(144, 176));
  await T.handled(function (x) { return x.st && x.st.heat; }, 'heat on');
  await T.go(30); await T.touch('touchEnd');
  if (hooks.cold) await hooks.cold(heatAt, t0);
  if (hooks.golden) await hooks.golden(heatAt, t0);
  await T.at(heatAt + AT.flick, 'flick');
  await T.touch('touchStart', await T.pt(144, 236));
  await T.go(16);
  var flickAt = await T.sim();
  await T.touch('touchMove', await T.pt(145, 150));   /* one long move up: the flick */
  await T.handled(function (x) { return x.kind !== 'flip' || (x.st && x.st.res != null); }, 'flip');
  await T.go(16); await T.touch('touchEnd');
  if (hooks.landed) await hooks.landed(flickAt);
  return flickAt;
}
/* the slice step: line 0 dragged at t0 + cut0, then line 1. hooks: start(t0), mid() after line 0 */
async function playSlice(T, hooks) {
  var l = await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 3000, 'slice step');
  var t0 = l.t0;
  if (hooks.start) await hooks.start(t0);
  await T.at(t0 + AT.cut0, 'cut 0');
  for (var i = 0; i < 2; i++) {
    var ln = (await T.live()).st.lines[i];
    await T.drag(line([ln.ax - 2 * ln.ux, ln.ay - 2 * ln.uy], [ln.bx + 2 * ln.ux, ln.by + 2 * ln.uy], 20), 16);
    if (i === 0) {
      var cut = await T.live();
      if (!cut.st.lines[0].cut) throw new Error('line 0 not cut by the drag');
      await T.go(AT.cutRest);
      if (hooks.mid) await hooks.mid();
    }
  }
  return T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
}

async function setA(browser, set) {   /* fresh save: 01 tap start (demo hand), 02 after 4 hits (squash), 03 the slide's first frame */
  var T = await openKitchen(browser, set, { store: FRESH }), sfx = '-' + set.tag, has = function (k) { return set.shots.indexOf(k) >= 0; };
  try {
    await T.at(AT.start, '01');
    var l = await T.live();
    await shoot(T, NAMES['01'] + sfx, [[l.screen === 'step' && l.kind === 'tap' && l.station === 'counter' && !l.slide, 'tap step at the counter (' + js([l.screen, l.kind, l.station]) + ')'],
      [l.hint === 'demo', 'first-time demo hand (' + l.hint + ')'], [l.st.hits === 0, 'no hit yet'], [l.seen.length === 0, 'nothing seen (' + l.seen.join(',') + ')']]);
    if (!has('02') && !has('03')) return;
    var sq0 = 0;
    await playTap(T, async function (i) {
      if (i === 2) sq0 = (await T.live()).stats.squash;
      if (i !== 3 || !has('02')) return;
      await T.at(TAP_AT[3] + AT.squash, '02');
      var x = await T.live(), fr = Math.floor((await T.sim() - TAP_AT[3]) / FMS);
      await shoot(T, NAMES['02'] + sfx, [[x.kind === 'tap' && x.st.hits === 4, '4 hits (' + x.st.hits + ')'], [fr === 1, 'the 12 fps frame after the 4th hit (' + fr + ')'],
        [x.reduced || x.stats.squash > sq0, 'squash frames painted (' + sq0 + ' -> ' + x.stats.squash + ')'], [!x.hint, 'no hand (' + x.hint + ')']]);
    });
    if (!has('03')) return;
    l = await T.until(function (x) { return x.kind === 'flip'; }, 1000, 'flip start');
    await T.at(l.t0 + AT.slide, '03');
    l = await T.live();
    await shoot(T, NAMES['03'] + sfx, [[l.slide && l.slide.from === 'counter' && l.slide.to === 'stove' && l.slide.f === 0 && l.slide.carry === 'pan', 'counter -> stove slide, frame 0, pan carried (' + js(l.slide) + ')']]);
  } finally { await T.done(); }
}

async function setB(browser, set) {   /* seen tap + flip: 04-06 on the stove, 07-08 on the board, 09 the plate */
  var T = await openKitchen(browser, set, { store: SEEN_TF }), sfx = '-' + set.tag, has = function (k) { return set.shots.indexOf(k) >= 0; };
  try {
    await playTap(T);
    await playFlip(T, {
      cold: has('04') && async function (heatAt) {
        await T.at(heatAt + AT.cold, '04');
        var l = await T.live();
        await shoot(T, NAMES['04'] + sfx, [[l.kind === 'flip' && l.station === 'stove' && !l.slide, 'on the stove (' + js([l.kind, l.station, l.slide]) + ')'],
          [l.st.heat && l.band === 0 && l.st.res === null, 'heat on, band 0, not flipped (' + js([l.st.heat, l.band, l.st.res]) + ')'], [!l.hint, 'no hand (' + l.hint + ')']]);
      },
      golden: has('05') && async function (heatAt) {
        await T.at(heatAt + AT.golden, '05');
        var l = await T.live();
        await shoot(T, NAMES['05'] + sfx, [[l.kind === 'flip' && l.st.heat && l.band === 1 && l.st.res === null, 'golden band, not flipped (arrow up) (' + js([l.band, l.st.res]) + ')'], [!l.hint, 'no hand (' + l.hint + ')']]);
      },
      landed: has('06') && async function (flickAt) {
        await T.at(flickAt + AT.landed, '06');
        var l = await T.live(), fr = Math.floor((await T.sim() - flickAt) / FMS);
        await shoot(T, NAMES['06'] + sfx, [[l.kind === 'flip' && l.st.res === 1 && l.station === 'stove' && !l.slide, 'flipped golden, still in the pan (' + js([l.kind, l.st && l.st.res]) + ')'],
          [fr === 3, 'arc frame 3 = the landing frame (' + fr + ')']]);
      }
    });
    var rev = await playSlice(T, {
      start: has('07') && async function (t0) {
        await T.at(t0 + AT.demo, '07');
        var l = await T.live();
        await shoot(T, NAMES['07'] + sfx, [[l.kind === 'slice' && l.station === 'board' && !l.slide, 'on the board (' + js([l.kind, l.station, l.slide]) + ')'],
          [l.hint === 'demo' && !l.st.lines[0].cut, 'the first-time slice demo on guide 0 (' + l.hint + ')']]);
      },
      mid: has('08') && async function () {
        var l = await T.live();
        await shoot(T, NAMES['08'] + sfx, [[l.kind === 'slice' && l.st.lines[0].cut && !l.st.lines[1].cut && l.st.cur === 1, 'line 0 cut, line 1 lit (' + js([l.st.cur, l.st.lines.map(function (x) { return x.cut; })]) + ')'], [!l.hint, 'no hand (' + l.hint + ')']]);
      }
    });
    if (!has('09')) return;
    await T.at(rev.revealAt + AT.result, '09');
    var l = await T.live();
    await shoot(T, NAMES['09'] + sfx, [[l.screen === 'reveal' && l.station === 'plate' && !l.slide && l.done, 'the plate, at rest after the slide (' + js([l.screen, l.station, l.slide]) + ')'],
      [l.chip && l.end.table && l.verb === '', 'the end buttons shown (' + js([l.chip, l.end]) + ')'], [!l.hint, 'no hand'], [Math.floor(AT.result / FMS) >= 6, 't >= 6']]);
  } finally { await T.done(); }
}

async function setC(browser, set) {   /* reduced motion (emulated): the same dish, 10 the plate at rest with the again chip */
  var T = await openKitchen(browser, set, { store: SEEN_TF, reduced: true }), sfx = '-' + set.tag;
  try {
    await playTap(T);
    await playFlip(T, {});
    var rev = await playSlice(T, {});
    await T.at(rev.revealAt + AT.result, '10');
    var l = await T.live();
    await shoot(T, NAMES['10'] + sfx, [[l.reduced, 'reduced motion on'], [l.screen === 'reveal' && l.station === 'plate' && !l.slide, 'the plate (' + js([l.screen, l.station]) + ')'],
      [l.chip && l.end.table && l.verb === '', 'the end buttons shown (' + js([l.chip, l.end]) + ')'], [l.stats.slides === 0 && l.stats.squash === 0 && l.stats.shake === 0, 'no slide, squash or shake (' + js(l.stats) + ')']]);
  } finally { await T.done(); }
}

/* ---------- the embed: index.html, play room, the counter -> #cook-overlay (tools/smoke.js scenario Z2 part 3) ---------- */
async function setEmbed(browser) {
  var name = '11-embed-360x740', errs = [];
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: 'light', locale: 'ko-KR', reducedMotion: 'no-preference' });
  try {
    await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
    await ctx.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') });   /* tools/smoke.js: the stub world and brain, the real files routed empty */
    await ctx.addInitScript(function (a) {
      window.__ppolTest = { today: a[0] };
      try { if (!sessionStorage.getItem('__ckSeeded')) { sessionStorage.setItem('__ckSeeded', '1'); localStorage.removeItem(a[1]); } } catch (e) { /* none */ }
    }, [DAY, KEY]);
    await ctx.addInitScript(fixSalt, SALT);
    await ctx.addInitScript(countPointers);
    var page = await ctx.newPage();
    page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
    page.on('console', function (m) {
      if (m.type() !== 'error') return;
      if (/Failed to load resource|ERR_FILE_NOT_FOUND|net::/.test(m.text())) return;   /* tools/smoke.js: asset / font 404s fall back by design */
      errs.push('console: ' + m.text());
    });
    await page.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/cook-shots.js */' }); });
    await page.clock.install({ time: new Date(TIME) });   /* flowing with real time while the game boots; paused before the counter */
    await page.goto(INDEX_URL + '?dev=0&intro=0');
    await page.waitForSelector('#name-dialog[open]', { timeout: 30000 });
    await page.fill('#name-in', '뚜루');
    await page.click('#name-form button[type=submit]');
    await page.waitForSelector('#name-dialog[open]', { state: 'hidden', timeout: 10000 });
    await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return window.APP && APP.sceneMode && b && !b.classList.contains('away') && !APP.goResting && !document.querySelector('dialog[open]'); }, null, { timeout: 30000 });
    await page.waitForTimeout(2000);   /* the first-day gift (1.5 s after the name) and its line */
    var sceneMode = await page.evaluate(function () { return APP.sceneMode; });
    if (sceneMode !== '3d') throw new Error('no 3D scene (' + sceneMode + '): the play room counter needs it');
    await page.evaluate(function () { return APP.goRoom('play'); });
    await page.waitForFunction(function () { var e = document.getElementById('btn-cook'); return APP.scene.view() === 'play' && e && !e.hidden && !APP.goResting; }, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    var cpt = await page.evaluate(function () {   /* a point on the counter button that the scene picks as the counter (tools/smoke.js) */
      var q = document.getElementById('btn-cook').getBoundingClientRect(), F = [0.5, 0.35, 0.65, 0.2, 0.8];
      for (var i = 0; i < F.length; i++) for (var j = 0; j < F.length; j++) { var x = q.x + q.width * F[j], y = q.y + q.height * F[i], k = APP.scene.pickAt(x, y); if (k && k.kind === 'spot' && k.id === 'counter') return [x, y]; }
      return null;
    });
    if (!cpt) throw new Error('no counter point under #btn-cook');
    await pauseClock(page);   /* from here time moves in T.go only, in the game and in the kitchen frame (created below, paused) */
    var start = await alignClock(page, function () { return probeFrame(page); });
    var cdp = await ctx.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cpt[0], y: cpt[1], id: 1 }] });
    await realWait(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    /* 11-18 round 6: a fresh kitchen key -> the counter shows the dish tray (#dish-pick) first; a finger picks the jeon */
    if (!await poll(function () { return page.evaluate(function () { var d = document.getElementById('dish-pick'); return !!(d && d.open); }); }, 10000)) throw new Error('the counter did not show the dish tray');
    var chip = await page.evaluate(function () { var r = document.querySelector('#dish-pick .dp-chip[data-recipe="jeon"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: chip[0], y: chip[1], id: 2 }] });
    await realWait(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    /* from here the page's own timers and frames stand still: wait in real time, polling */
    if (!await poll(function () { return page.evaluate(function () { var o = document.getElementById('cook-overlay'); return !!(o && o.open && o.querySelector('iframe')); }); }, 10000)) throw new Error('the counter did not open #cook-overlay');
    var fh = await page.$('#cook-overlay iframe'), fr = null;
    if (!await poll(async function () { fr = await fh.contentFrame(); return !!fr && await fr.evaluate(function () { return !!(window.COOK && COOK.isOpen() && document.documentElement.classList.contains('ck-embed')); }).catch(function () { return false; }); }, 15000)) throw new Error('the kitchen did not open in the frame');
    var T = helpers(page, cdp, fr, errs);
    T.t0 = await T.now();   /* the kitchen opened at the frame's load; the clock has stood still since */
    if (Math.abs(T.t0 - start) > 1e-6) throw new Error('the kitchen frame did not open on the aligned clock (' + T.t0 + ' vs ' + start + ')');
    var l = await T.live();
    if (!(l.screen === 'step' && l.kind === 'tap' && l.st.hits === 0)) throw new Error('the kitchen did not open at the tap step: ' + js([l.screen, l.kind]));
    for (var i = 0; i < 3; i++) {   /* the first ring, 3 taps */
      await T.at(400 + 200 * i, 'embed tap ' + i);
      l = await T.live();
      var mk = l.st.marks[0], off = TAP_OFF[i], n0 = l.st.hits;
      await T.touch('touchStart', await T.pt(mk.x + off[0], mk.y + off[1]));
      await T.handled(function (x) { return x.st && x.st.hits > n0; }, 'embed hit ' + i);
      await T.go(30); await T.touch('touchEnd');
    }
    await T.at(AT.embed, '11');
    l = await T.live();
    var box = await page.evaluate(function () {
      var o = document.getElementById('cook-overlay'), f = o && o.querySelector('iframe'), r = o.getBoundingClientRect(), q = f.getBoundingClientRect();
      return { open: o.open, o: [r.left, r.top, r.width, r.height], f: [q.left, q.top, q.width, q.height], vw: innerWidth, vh: innerHeight };
    });
    var full = function (b) { return Math.abs(b[0]) < 0.01 && Math.abs(b[1]) < 0.01 && Math.abs(b[2] - box.vw) < 0.01 && Math.abs(b[3] - box.vh) < 0.01; };
    await shoot(T, name, [[box.open && full(box.o) && full(box.f), 'the overlay and its frame fill the screen (' + js(box) + ')'],
      [l.screen === 'step' && l.kind === 'tap' && l.station === 'counter' && l.st.hits === 3 && !l.hint, 'the tap step after 3 hits, no hand (' + js([l.kind, l.st.hits, l.hint]) + ')']]);
  } catch (e) {
    failed.push(name + ': ' + (e && e.message)); console.error('  FAIL ' + name + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
  } finally { await ctx.close(); }
}

/* ---------- 11-21 round 7: the recipe book, one step of every kind, the five plates (real time, mouse pointer) ---------- */
async function setBook(browser) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light', locale: 'ko-KR' });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(function () { try { if (!sessionStorage.getItem('__s7')) { sessionStorage.setItem('__s7', '1'); localStorage.removeItem('ppolppol_cook_v0'); } } catch (e) { /* none */ } });
  await page.goto(COOK_URL + '?seed=' + SEED);
  function live() { return page.evaluate(function () { return COOK.live(); }); }
  async function snap(name, ok, why) {
    var l = await live(), text = await page.evaluate(function () { var d = document.getElementById('cook-dlg'), c = d.cloneNode(true), q = c.querySelector('.ck-say'); if (q) q.remove(); return (c.textContent || '').replace(/\s+/g, ''); });
    if (!ok(l) || text !== '' || l.err || errs.length) { failed.push(name + ': ' + (why || 'state') + ' ' + js([l.screen, l.recipe, l.si, l.kind, text, errs])); console.error('  FAIL ' + name); return; }
    await page.evaluate(function () { return Promise.all([].map.call(document.querySelectorAll('.cook-sticker'), function (i) { return i.decode ? i.decode().catch(function () {}) : null; })); });
    await realWait(120);
    await page.screenshot({ path: path.join(OUT, name + '.png'), animations: 'disabled' });
    made.push(name); console.log('  ok   ' + name + '  (' + [l.screen, l.recipe || '-', l.kind || '-', l.station].join(', ') + ')');
  }
  async function pt(lx, ly) { var v = (await live()).view; return [(lx / 2 + v.ox) * v.css, (ly / 2 + v.oy) * v.css]; }
  async function open(o) {   /* close (the kitchen saves its pot), drop that pot (a half-made one would win over the dish asked for), open */
    await page.evaluate(function () { COOK.close(); }); await realWait(120);
    await page.evaluate(function (x) {
      try { var sv = JSON.parse(localStorage.getItem('ppolppol_cook_v0') || 'null'); if (sv) { sv.pot = null; localStorage.setItem('ppolppol_cook_v0', JSON.stringify(sv)); } } catch (e) { /* none */ }
      var q = { storeKey: 'ppolppol_cook_v0', seed: 12 }; for (var k in x) q[k] = x[k]; COOK.open(q);
    }, o || {});
    await realWait(200);
  }
  async function toStep(id, si) {   /* by the chip, up to the start of step si */
    await open({ recipe: id });
    for (var g = 0; g < 80; g++) {
      var l = await live();
      if (l.si === si && l.phase === 'step' && !l.slide) break;
      if (l.phase === 'step' && l.si < si) await page.evaluate(function () { document.querySelector('.ck-verb').click(); });
      await realWait(330);
    }
    await realWait(700);
  }
  await realWait(900);
  await snap('20-book', function (l) { return l.screen === 'book' && l.book.id === 'jeon2' && l.book.open === 3; });
  await open({ host: true }); await page.evaluate(function () { document.querySelectorAll('.ck-bk-tab')[4].click(); }); await realWait(500);
  await snap('21-book-locked', function (l) { return l.screen === 'book' && l.book.id === 'cake' && l.book.locked.indexOf('cake') >= 0; });
  var p, st;
  await toStep('jeon2', 0); await page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await realWait(400);
  await snap('22-slice-jeon2', function (l) { return l.kind === 'slice' && l.st.cur === 1; });
  await toStep('jeon2', 1); st = (await live()).st; p = await pt(st.cx + 40, st.cy); await page.mouse.move(p[0], p[1]); await page.mouse.down();
  for (var a = 0; a <= 400; a += 20) { p = await pt(st.cx + 40 * Math.cos(a * Math.PI / 180), st.cy + 24 * Math.sin(a * Math.PI / 180)); await page.mouse.move(p[0], p[1]); }
  await snap('23-stir-jeon2', function (l) { return l.kind === 'stir' && l.progress > 0.2 && !!l.st.hand; }); await page.mouse.up();
  await toStep('jeon2', 2); p = await pt(144, 200); await page.mouse.move(p[0], p[1]); await page.mouse.down(); await realWait(1300);
  await snap('24-pour-jeon2', function (l) { return l.kind === 'pour' && !!l.st.hold && l.st.fill >= 1; }); await page.mouse.up();
  await toStep('jeon2', 3); await page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await realWait(3400);
  await snap('25-flip-jeon2', function (l) { return l.kind === 'flip' && l.band === 1 && l.bell && l.bell.shown; });
  await toStep('gyeran', 0); st = (await live()).st; for (var e = 0; e < 3; e++) { p = await pt(st.marks[e > 1 ? 1 : 0].x, st.marks[e > 1 ? 1 : 0].y); await page.mouse.click(p[0], p[1]); await realWait(160); }
  await realWait(300);
  await snap('26-tap-gyeran', function (l) { return l.kind === 'tap' && l.st.hits === 3; });
  await toStep('gyeran', 3); await page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await realWait(500);
  await snap('27-swipe-gyeran', function (l) { return l.kind === 'swipe' && l.st.n === 1; });
  await toStep('jumeokbap2', 0); st = (await live()).st; await page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await realWait(350);
  p = await pt(st.items[1].hx, st.items[1].hy); await page.mouse.move(p[0], p[1]); await page.mouse.down(); p = await pt(st.items[1].hx + 30, st.items[1].hy + 44); await page.mouse.move(p[0], p[1]); await realWait(200);
  await snap('28-drag-jumeokbap2', function (l) { return l.kind === 'drag' && l.st.n === 1 && !!l.st.pen; }); await page.mouse.up();
  await toStep('kkochi2', 0); st = (await live()).st; p = await pt(st.box[0] * 2 + 10, st.box[1] * 2 + 30); await page.mouse.move(p[0], p[1]); await page.mouse.down();
  for (var u = 0; u <= 10; u++) { p = await pt((st.box[0] + st.box[2] * u / 10) * 2, st.box[1] * 2 + 30); await page.mouse.move(p[0], p[1]); }
  await realWait(150);
  await snap('29-rub-kkochi2', function (l) { return l.kind === 'rub' && l.st.n > 8 && !!l.st.hand; }); await page.mouse.up();
  await toStep('cake', 3); await page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await realWait(3400);
  await snap('30-bake-cake', function (l) { return l.kind === 'bake' && l.band === 1; });
  var ids = ['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2', 'cake'];
  for (var i = 0; i < ids.length; i++) {
    await open({ recipe: ids[i] }); await page.evaluate(function () { COOK.auto(true); });
    await page.waitForFunction(function () { var l = COOK.live(); return l.screen === 'reveal' && l.chip && !l.slide; }, null, { timeout: 40000 });
    await realWait(900);
    await snap((31 + i) + '-plate-' + ids[i], function (l) { return l.screen === 'reveal' && l.end.call && l.end.table; });
  }
  await ctx.close();
}

(async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(PROBE, '<!doctype html><meta charset="utf-8"><title>clock</title>');
  var browser = await chromium.launch(), t0 = Date.now();
  try {
    for (var s = 0; s < SETS.length; s++) {
      var set = SETS[s];
      if (!want(set.tag)) continue;
      console.log('== ' + set.tag + ' @' + set.dpr);
      var runs = [['A', setA, ['01', '02', '03']], ['B', setB, ['04', '05', '06', '07', '08', '09']], ['C', setC, ['10']]];
      for (var r = 0; r < runs.length; r++) {
        if (!runs[r][2].some(function (k) { return set.shots.indexOf(k) >= 0; })) continue;
        try { await runs[r][1](browser, set); }
        catch (e) {
          var miss = runs[r][2].filter(function (k) { return set.shots.indexOf(k) >= 0 && made.indexOf(NAMES[k] + '-' + set.tag) < 0; });
          miss.forEach(function (k) { failed.push(NAMES[k] + '-' + set.tag + ': ' + (e && e.message)); });
          console.error('  FAIL ' + set.tag + ' ' + runs[r][0] + ' threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
        }
      }
    }
    if (want('book')) { console.log('== book 360x740 @2 (round 7)'); try { await setBook(browser); } catch (eb) { failed.push('book set: ' + (eb && eb.message)); console.error('  FAIL book set threw: ' + (eb && eb.stack || eb)); } }
    if (want('embed')) { console.log('== embed 360x740 @2'); await setEmbed(browser); }
  } finally { await browser.close(); }
  console.log('\n' + made.length + ' captures written to ' + path.relative(ROOT, OUT) + ', ' + failed.length + ' could not be made (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  failed.forEach(function (f) { console.error('  missing: ' + f); });
  process.exit(failed.length ? 1 : 0);
})();
