#!/usr/bin/env node
/* tools/test-cook-stickers-live.js - the reaction stickers (js/cook-stickers.js, the sticker session's) on the real
 * kitchen (cook.html + js/cook.js, ours): the wiring, and that the kitchen stays the kitchen. Playwright + Chromium.
 *   NODE_PATH=$(npm root -g) node tools/test-cook-stickers-live.js
 *   ONLY=K1,K4      run only these
 * Style and helpers follow tools/test-cook-live.js (CDP touch, Playwright's fake clock, paused before the page loads so
 * every time below is exact). K7, K9 and K10 need http (sound, blocked files): the script serves the repo root itself on
 * a free 127.0.0.1 port. The other scenarios open cook.html as file://.
 * 11-15 round 5 (close-up kitchen, spec 5.4 and 15.3): the kitchen opens straight into a step (no counter, no prop); the
 * stickers live in a strip layer under the HUD; owner answer (나): no feeling face (moved, love, flush, shock, ink, hmm,
 * sweat) is ever cued in the kitchen.
 *  K1  wiring: the stage children are ck-cv ck-sim ck-stick; pick reaches the stickers at open, before any touch. One
 *      seeded dish by touch: every cooking moment reaches COOK_STICKERS.cue under the kitchen's act names, in order, with
 *      its detail; the dish seed is the sticker run id; what shows is what their own engine picks for that run id, those
 *      moments and those times (replayed in node); the same seed twice shows the same; one node per shown sticker,
 *      inside the kitchen's layer; no feeling face; the save keys are exactly book, day, dayN, pot, seen, v.
 *  K2  where and how long: s = 32 n / dpr CSS px (shown by n0 = floor(2 dpr); round 6: n = the largest of n0 .. floor(3 dpr)
 *      that fits) at hudB + 4, slot 0 at left max(8, safeL + 8) and
 *      slot 1 at right max(8, safeR + 8), on whole device px; shown or hidden by the spec 5.4 rule at eight phone sizes;
 *      about 1.85 s; never two in one slot (three moments inside 1.87 s).
 *  K3  touches pass through and nothing is covered: a flick that starts under a sticker flips, a slash that starts under
 *      one cuts, the chip and the close button work with stickers up; no sticker over the food box, marks, guides, the
 *      hand, the HUD or the chip; no layout shift, no scroll; the layer is hidden at 320x568 and 360x560.
 *  K4  reopen resumes the same dish with no counter; a second dish via again; nothing after close (no node, no frame,
 *      their timers gone within 2 s).
 *  K5  a hidden tab and back with the pan on: the sound gets quiet + sizzle, the stickers get nothing (no second one).
 *  K6  reduced motion (?reduced=1 alone, the device setting alone): stills only, a fade and no travel; the control
 *      page (no reduced motion) does move, so the check can tell.
 *  K7  sound off (the default) over http: stickers show, no AudioContext, nothing fetched under audio/ or foley/.
 *  K8  words and screen readers: the stickers add no DOM text (no digits, emoji or symbols), their alt strings keep the
 *      kitchen's glyph rules, the accessibility tree does not hold them, nothing sits in a live region.
 *  K9  js/cook-stickers.js blocked (404): the kitchen plays the same dish to the same look; css blocked: still no touch
 *      taken, no shift, no scroll.
 *  K10 a sticker object that throws never reaches the kitchen.
 * 11-24 r5 (owner: "반응 스티커는 접시에서만 한 번"): the kitchen hands the stickers ONLY the plate moment: one cue a
 * finished dish (act done, the dish id, the dish seed as run id), never pick, tap, sizzle, flip, cut, step. The chip
 * (.ck-verb) is invisible and takes no touch outside keyboard mode. Where a scenario only needs a sticker on screen it
 * puts one up itself (COOK_STICKERS.show); the layer, size, slots, pixels, motion and words rules are unchanged.
 *  K1  r5: nothing is cued at open or mid-dish (the sound hook still gets every moment: those moments do NOT reach the
 *      stickers); exactly one cue, done, after the plate's sound, dish id + seed as run id; heart_plate or star shows,
 *      one node in .ck-stick, no feeling face; node replay matches that cue; same seed twice the same; save keys as before.
 *  K2  r5: life and box measured on a sticker put up directly; the two-slot check is two put up + the plate's cue.
 *  K3  r5: nothing up at open, chip presses and heat on add no sticker; the touch-through checks use stickers put up
 *      directly; the plate's sticker is up over the plate screen.
 *  K4  r5: nothing up mid-dish (one put up directly is cleared by close); a reopened dish cues nothing until its plate,
 *      which cues once; the next dish cues nothing until its plate, which cues once under its own seed.
 *  K5  r5: the sound hook gets the moments (two sizzles), the stickers none; hidden and back adds nothing.
 *  K6  r5: the still and the strip are put up directly (stills only and a fade under reduced motion, as before).
 *  K7  r5: the plate sticker shows (one node), and the only extra requests are that sticker's pictures.
 *  K8  r5: the still and the strip are put up directly.
 *  K9  r5 (no css / no pictures): stickers put up directly, and the plate's own cue with its picture blocked.
 *  K10 r5: the throwing / lying cue stub is called exactly once (at the plate); mount that throws is retried, harmless.
 * No console or page error anywhere (K9 and K10 allow only the browser's own line for the file they block). Exit 1 on any failure.
 */
'use strict';
var fs = require('fs'), path = require('path'), http = require('http');
var { chromium } = require('playwright');
var os = require('os'), LM = require('./look-metrics.js');   /* decodePNG for K2's pixel-block check */

var ROOT = path.resolve(__dirname, '..');
var FILE0 = 'file://' + path.join(ROOT, 'cook.html');
var ONLY = (process.env.ONLY || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
var KEY = 'ppolppol_cook_v0';
var SEEN_ALL = JSON.stringify({ v: 1, day: '', dayN: 0, seen: ['tap', 'flip', 'slice'], pot: null, book: [] });
var SEED = 12;
var LIFE = { out: 1650, gone: 1870 };   /* docs/COOK_STICKERS.md: in 250 ms + stay 1.4 s, then out 180 ms; the node goes 40 ms after that */
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.svg': 'image/svg+xml' };
var passes = 0, fails = 0, errAll = [], HTTP0 = null;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function section(t) { console.log('== ' + t); }
function line(a, b, n) { var out = []; for (var i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
function realWait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }   /* the browser's own tasks (touch delivery, click, close event) run on real time */
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 0.01); }
function inter(a, b) { return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); }

function serve() {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var u = decodeURIComponent(String(req.url || '/').split('?')[0]);
      var f = path.normalize(path.join(ROOT, u));
      if (f.indexOf(ROOT) !== 0) { res.writeHead(403); res.end(); return; }
      fs.stat(f, function (err, st) {
        if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' });
        fs.createReadStream(f).pipe(res);
      });
    });
    srv.listen(0, '127.0.0.1', function () { resolve(srv); });
  });
}

async function pauseClock(page) {   /* as in tools/test-cook-live.js: a margin that is already in the past is tried again, longer */
  var margins = [250, 1000, 3000], err = null;
  for (var i = 0; i < margins.length; i++) {
    try { await page.clock.pauseAt(await page.evaluate(function (m) { return Date.now() + m; }, margins[i])); return margins[i]; }
    catch (e) { err = e; if (!/fast-forward to the past/i.test(String(e && e.message))) throw e; }
  }
  throw err;
}

/* Before any page script: watch the sticker object and its nodes. js/cook-stickers.js says `var COOK_STICKERS = ...`: that
   assignment lands in this setter (js/cook.js looks the global up at every moment, so it calls the wrapped cue). */
function spyInit() {
  var S = window.__stk = { cues: [], nodes: [], dup: 0, max: 0, ac: 0, timers: {}, raf: 0, ev: { pointerdown: 0, pointermove: 0, pointerup: 0, pointercancel: 0 } };
  var real;
  Object.keys(S.ev).forEach(function (k) { document.addEventListener(k, function () { S.ev[k]++; }, true); });   /* T.touch waits for these */
  Object.defineProperty(window, 'COOK_STICKERS', { configurable: true, enumerable: true, get: function () { return real; },
    set: function (A) {
      real = A;
      if (!A || typeof A.cue !== 'function' || A.__spied) return;
      A.__spied = true;
      var cue = A.cue;
      A.cue = function (act, d) {
        var r = cue.apply(this, arguments), cur = typeof A.current === 'function' ? A.current() : null;
        S.cues.push({ act: act, d: d ? JSON.parse(JSON.stringify(d)) : null, r: r === undefined ? null : r, t: performance.now(), dn: Date.now(), run: cur ? cur.id : null });
        return r;
      };
      /* timers and frames asked for from here on (the page's clock, real or fake, is in place by now) */
      var st0 = window.setTimeout, ct0 = window.clearTimeout, raf0 = window.requestAnimationFrame;
      window.setTimeout = function (fn, ms) {
        var mine = /cook-stickers\.js/.test(String(new Error().stack || '')), id = null, rest = Array.prototype.slice.call(arguments, 2);
        var w = typeof fn === 'function' ? function () { delete S.timers[id]; return fn.apply(this, arguments); } : fn;
        id = st0.apply(window, [w, ms].concat(rest));
        if (typeof fn === 'function') S.timers[id] = mine ? 's' : 'o';
        return id;
      };
      window.clearTimeout = function (id) { delete S.timers[id]; return ct0.call(window, id); };
      window.requestAnimationFrame = function (fn) { return raf0.call(window, function (t) { S.raf++; return fn(t); }); };
    } });
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes || [], function (n) {
        if (n.nodeType !== 1 || !n.classList || !n.classList.contains('cook-sticker')) return;
        var rec = { id: n.dataset.sticker, slot: n.dataset.slot, tag: n.tagName, parent: n.parentNode && n.parentNode.classList.contains('ck-stick') ? 'ck-stick' : (n.parentNode ? n.parentNode.className : null), add: performance.now(), out: null, rm: null };
        n.__rec = rec; S.nodes.push(rec);
        var lay = n.parentNode, slots = lay ? Array.prototype.map.call(lay.children, function (c) { return c.dataset.slot; }) : [];
        if (slots.some(function (s, i) { return slots.indexOf(s) !== i; })) S.dup++;
        if (slots.length > S.max) S.max = slots.length;
        new MutationObserver(function () { if (rec.out === null && n.classList.contains('is-out')) rec.out = performance.now(); }).observe(n, { attributes: true, attributeFilter: ['class'] });
      });
      Array.prototype.forEach.call(m.removedNodes || [], function (n) { if (n.__rec && n.__rec.rm === null) n.__rec.rm = performance.now(); });
    });
  }).observe(document, { subtree: true, childList: true });
  ['AudioContext', 'webkitAudioContext'].forEach(function (k) {
    var C = window[k]; if (!C) return;
    var W = function () { S.ac++; return Reflect.construct(C, arguments, C); };
    W.prototype = C.prototype; window[k] = W;
  });
}

/* ---------- one page ---------- */
async function openPage(browser, o) {
  o = o || {};
  var touch = o.touch !== false;
  var ctx = await browser.newContext(o.real ? { viewport: null, hasTouch: touch, reducedMotion: o.reducedOS ? 'reduce' : 'no-preference', locale: 'ko-KR', colorScheme: 'light' } : { viewport: o.vp || { width: 360, height: 740 }, deviceScaleFactor: o.dpr || 2, hasTouch: touch, isMobile: touch,
    reducedMotion: o.reducedOS ? 'reduce' : 'no-preference', locale: 'ko-KR', colorScheme: 'light' });
  if (o.store !== undefined) {
    await ctx.addInitScript(function (a) {
      try { if (!sessionStorage.getItem('__ckSeeded')) { sessionStorage.setItem('__ckSeeded', '1'); if (a[1] === null) localStorage.removeItem(a[0]); else localStorage.setItem(a[0], a[1]); } } catch (e) { /* none */ }
    }, [KEY, o.store]);
  }
  if (o.audio) await ctx.addInitScript(function () { window.__acts = []; window.AUDIO = { on: function (ch, p) { window.__acts.push({ ch: ch, p: p, t: performance.now() }); } }; });
  await ctx.addInitScript('(' + spyInit.toString() + ')();');
  if (o.init) await ctx.addInitScript(o.init);
  if (o.route) await o.route(ctx);
  var page = await ctx.newPage(), errs = [], net = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    var loc = (m.location() && m.location().url) || '';
    if (o.allow && /Failed to load resource/.test(m.text()) && o.allow.test(loc)) return;   /* the browser's own line for a file this scenario blocks */
    errs.push('console: ' + m.text() + (loc ? ' @' + loc : ''));
  });
  page.on('request', function (r) { net.push(r.url()); });
  await page.clock.install({ time: new Date('2026-11-08T10:00:00') });
  if (o.paused !== false) await pauseClock(page);
  /* 11-21 round 7: no dish asked for = the recipe book; this suite plays the legacy jeon, so it asks for it by id */
  var q7 = o.q ? (/(^|&)recipe=/.test(o.q) ? o.q : o.q + '&recipe=jeon') : 'recipe=jeon';
  await page.goto((o.url || FILE0) + '?' + q7);
  var cdp = await ctx.newCDPSession(page);
  var T = { page: page, ctx: ctx, cdp: cdp, errs: errs, net: net };
  T.go = function (ms) { return page.clock.runFor(ms); };
  T.now = function () { return page.evaluate(function () { return performance.now(); }); };
  T.live = function () { return page.evaluate(function () { return COOK.live(); }); };
  T.stk = function () { return page.evaluate(function () { return JSON.parse(JSON.stringify(window.__stk)); }); };
  T.rect = function (sel) {
    return page.evaluate(function (s) { var e = document.querySelector(s); if (!e) return null; var r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
  };
  T.onStage = function () {   /* the sticker nodes now in the page: where (stage-relative CSS px) and how they are styled */
    return page.evaluate(function () {
      var st = document.querySelector('.ck-stage').getBoundingClientRect();
      return Array.prototype.map.call(document.querySelectorAll('.cook-sticker'), function (n) {
        var r = n.getBoundingClientRect(), cs = getComputedStyle(n), f = n.querySelector('.cook-sticker-frames');
        return { id: n.dataset.sticker, slot: n.dataset.slot, tag: n.tagName, cls: n.className, x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height, ax: r.left, ay: r.top,
          parent: n.parentNode.classList.contains('ck-stick') ? 'ck-stick' : n.parentNode.className, anim: cs.animationName, tr: cs.transform, pe: cs.pointerEvents, src: n.getAttribute('src'), text: n.textContent,
          frames: f ? getComputedStyle(f).animationName : null, moving: n.getAnimations({ subtree: true }).map(function (a) { return a.animationName; }) };
      });
    });
  };
  T.pt = async function (lx, ly) { var r = await T.rect('.ck-sim'); return [r.x + lx * r.w / 288, r.y + ly * r.h / 320]; };   /* 11-15 round 5: the invisible logical box (288 x 320) */
  /* A touch is sent and then waited for (real time) until the page has handled it: Chrome hands touches over on its own
     real frames, and with the clock paused that would otherwise decide at which page time a tap or a knife sample lands.
     This way every sample lands at the page time it was sent at, on every machine. */
  var EV = { touchStart: 'pointerdown', touchMove: 'pointermove', touchEnd: 'pointerup' };
  function evCount(k) { return page.evaluate(function (n) { return window.__stk.ev[n]; }, k); }
  T.touch = async function (type, p) {
    var k = EV[type], n0 = await evCount(k);
    await cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1 }] : [] });
    for (var i = 0; i < 150; i++) { if (await evCount(k) > n0) return true; await realWait(8); }
    return false;
  };
  T.eventually = async function (fn, label) {   /* real time: for what follows a touch through the browser itself (a click, a dialog's close event) */
    for (var i = 0; i < 100; i++) { var l = await T.live(); if (fn(l)) return l; await realWait(25); }
    throw new Error('timeout (real time): ' + label + ' ' + JSON.stringify(await T.live()).slice(0, 300));
  };
  T.tapCss = async function (p) { await T.touch('touchStart', p); await T.go(30); await T.touch('touchEnd'); };
  T.tap = async function (lx, ly) { await T.tapCss(await T.pt(lx, ly)); };
  T.tapEl = async function (sel) { var r = await T.rect(sel); await T.tapCss([r.x + r.w / 2, r.y + r.h / 2]); };
  T.dragCss = async function (c) {
    await T.touch('touchStart', c[0]);
    for (var j = 1; j < c.length; j++) { await T.go(16); await T.touch('touchMove', c[j]); }
    await T.go(16); await T.touch('touchEnd');
    await T.go(34);
  };
  T.drag = async function (pts) { var c = []; for (var i = 0; i < pts.length; i++) c.push(await T.pt(pts[i][0], pts[i][1])); await T.dragCss(c); };
  T.until = async function (fn, max, label) {
    for (var w = 0; w <= (max || 6000); w += 50) { var l = await T.live(); if (fn(l)) return l; await T.go(50); }
    throw new Error('timeout: ' + label + ' ' + JSON.stringify(await T.live()).slice(0, 300));
  };
  T.verbClick = function () { return page.evaluate(function () { document.querySelector('.ck-verb').click(); }); };
  T.settle = async function () {   /* one kitchen frame; a sticker's 250 ms way in runs on real time, so it is ended here: boxes are then at rest */
    await T.go(34);
    await page.evaluate(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.cook-sticker:not(.is-out)'), function (n) { n.getAnimations().forEach(function (a) { try { a.finish(); } catch (e) { /* an endless one */ } }); });
    });
  };
  T.closed = async function () { await T.eventually(function (x) { return x.screen === 'closed'; }, 'closed'); await T.go(50); };   /* the dialog's close event is the browser's own task */
  T.done = async function () { errAll = errAll.concat(errs); await ctx.close(); };
  if (!o.wait0) await T.go(600);
  return T;
}

/* ---------- play helpers ---------- */
/* 11-15 round 5 (close-up kitchen): opening starts cooking at once, there is no counter and no prop to pick */
async function atStep(T) { return T.eventually(function (x) { return x.screen === 'step'; }, 'the kitchen opened straight into a step'); }
async function verbThrough(T, kind, presses) {
  await T.until(function (l) { return l.kind === kind && l.phase === 'step'; }, 4000, kind + ' step');
  await T.go(700);
  for (var i = 0; i < presses; i++) { await T.verbClick(); await T.go(300); }
}
/* one dish by touch on a fixed schedule: taps 150 ms apart, heat on, the pan left alone past crisp, a swipe up, two cuts */
async function touchDish(T) {
  await atStep(T);
  await T.until(function (l) { return l.kind === 'tap' && l.phase === 'step'; }, 4000, 'tap step');
  await T.go(700);
  var l = await T.live(), off = [[-3, 2], [2, -2], [0, 3]];
  for (var i = 0; i < l.st.marks.length; i++) for (var k = 0; k < 3; k++) { var m = l.st.marks[i]; await T.tap(m.x + off[k][0], m.y + off[k][1]); await T.go(150); }
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip step');
  await T.go(700);
  await T.tap(144, 176);
  await T.go(6200 + 1200);   /* golden at 3 s, crisp at 6 s */
  await T.drag(line([144, 236], [146, 140], 6));
  await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 4000, 'slice step');
  await T.go(700);
  for (var c = 0; c < 2; c++) {
    var ln = (await T.live()).st.lines[c];
    await T.drag(line([ln.ax - 2 * ln.ux, ln.ay - 2 * ln.uy], [ln.bx + 2 * ln.ux, ln.by + 2 * ln.uy], 20));   /* 11-15 5차: 가이드 끝 2 논리 px 바깥에서 (10 이면 가까이 보기에서 24 px 가장자리 띠 안 — 일부러 무시하는 곳이라 끌기가 안 먹었다, K-A 보고) */
    await T.go(300);
  }
  l = await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(500);
  return l;
}
/* what their engine picks for this run id, these moments and these times (node, no DOM): the expected stickers */
function replay(cues) {
  var p = require.resolve('../js/cook-stickers.js');
  delete require.cache[p];
  var M = require(p), i = 0;
  M.mount(null, { now: function () { return cues[i].dn; } });
  var out = [];
  for (i = 0; i < cues.length; i++) { var r = M.cue(cues[i].act, JSON.parse(JSON.stringify(cues[i].d))); out.push(r === undefined ? null : r); }
  delete require.cache[p];
  return out;
}
/* r5: the kitchen's moments of one dish by touch, as its sound hook gets them (the golden ding is a sound-only act);
   only 'done' reaches the stickers */
var ACTS = ['pick'].concat(['tap', 'tap', 'tap', 'tap', 'tap', 'tap', 'tap', 'tap', 'tap'], ['step', 'quiet', 'sizzle', 'sizzle', 'ding', 'sizzle', 'flip', 'step', 'quiet', 'cut', 'cut', 'step', 'quiet', 'done']);
/* 11-15 owner answer (나): the kitchen keeps its stickers but never cues a feeling face */
var FEEL = ['moved', 'love', 'flush', 'shock', 'ink', 'hmm', 'sweat'];
function feelings(list) { return list.filter(function (id) { return FEEL.indexOf(id) >= 0; }); }
var DISH = null;   /* K1's first dish (look, tags): K9 plays the same touches without the sticker script */
/* spec 5.4: the layer is a strip at hudB + 4, one sticker px = n device px, s = 32 n / dpr CSS px; slot 0 at left
   max(8, safeL + 8), slot 1 at right max(8, safeR + 8); shown only when hudB + 4 + 32 n0 / dpr + 8 <= (44 + oy) css with
   n0 = floor(2 dpr) (unchanged); round 6 (11-18, spec 2.3): when shown, n is the largest of n0 .. floor(3 dpr) that fits
   (11-18 lead: no '1/64 zoom' condition any more: the drift seen at 2.625 was the test browser's DPR emulation; the
   real render path gives exact blocks at every n, checked below with --force-device-scale-factor) */
/* 11-21 round 7 (owner: all stickers larger; the step strip is gone): the layer starts in the HUD row itself, top =
   max(8, safeT + 8); n is the largest of floor(2 dpr) .. floor(4 dpr) whose sticker ends 8 px above stage row 36 and
   leaves the two slots apart (row 36 since the check of 11-21: eggs and berries stand at rows 36 and below); slot 1 ends 8 px left of the 48 px close chip. Shown whenever floor(2 dpr) fits. */
function stickGeo(v, dpr, vw) {
  var n0 = Math.floor(2 * dpr), n3 = Math.floor(4 * dpr), room = (36 + v.oy) * v.css, safe = v.safe || [0, 0, 0, 0];
  var top = Math.max(8, safe[0] + 8), l0 = Math.max(8, safe[3] + 8), r1 = vw - Math.max(8, safe[1] + 8) - 48 - 8;
  function fits(k) { if (k > n0 && dpr >= 3 && dpr === Math.floor(dpr) && k % 2 && k % dpr) return false; var z = 32 * k / dpr; return top + z + 8 <= room && l0 + z + 8 <= r1 - z; }
  var shown = fits(n0), n = n0;
  if (shown) for (var k = n3; k > n0; k--) { if (fits(k)) { n = k; break; } }
  var s = 32 * n / dpr;
  return { n: n, s: s, top: top, l0: l0, r1: r1, shown: shown };
}
var STICK_SIZES = [   /* s: the sticker size in CSS px. 11-21 round 7 (owner: all stickers larger): up to floor(4 dpr) device px a
                         sticker px from the HUD row's top; 96 -> 128, 85.33 -> 121.90, 64 -> 128, and the short screens show them now */
  { vp: { width: 360, height: 740 }, dpr: 2, shown: true, s: 128 }, { vp: { width: 360, height: 740 }, dpr: 3, shown: true, s: 128 },
  { vp: { width: 412, height: 915 }, dpr: 2.625, shown: true, s: 121.90, real: true },   /* 11-18 lead: on the real render path (see BLK) */ { vp: { width: 412, height: 915 }, dpr: 2, shown: true, s: 128 },
  { vp: { width: 390, height: 844 }, dpr: 3, shown: true, s: 128 }, { vp: { width: 360, height: 640 }, dpr: 2, shown: true, s: 96 },
  { vp: { width: 320, height: 568 }, dpr: 2, shown: true, s: 80 }, { vp: { width: 320, height: 568 }, dpr: 3, shown: true, s: 64 },
  { vp: { width: 360, height: 560 }, dpr: 2, shown: true, s: 80 }
];
function visibleStickers(page) {   /* only what a player can see (the layer may be hidden on short screens) */
  return page.evaluate(function () {
    return Array.prototype.filter.call(document.querySelectorAll('.cook-sticker'), function (n) {
      var r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (!n.checkVisibility || n.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }));
    }).map(function (n) { var r = n.getBoundingClientRect(); return { id: n.dataset.sticker, x: r.left, y: r.top, w: r.width, h: r.height }; });
  });
}

/* ===================================================================================================== */
async function K1(browser) {
  var runs = [];
  for (var n = 0; n < 2; n++) {
    var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED, audio: n === 1 });   /* r5: run 2 stubs the sound hook to see every moment the kitchen has */
    if (n === 0) {
      var w =await T.page.evaluate(function () {
        var lay = document.querySelector('.ck-stick'), st = document.querySelector('.ck-stage');
        return { obj: !!(window.COOK_STICKERS && COOK_STICKERS.cue), css: Array.prototype.some.call(document.styleSheets, function (s) { return /cook-stickers\.css/.test(s.href || ''); }),
          lay: !!lay, inStage: !!lay && lay.parentNode === st, order: Array.prototype.map.call(st.children, function (c) { return c.classList[0] || ''; }).join(' '),   /* first class of each child: a state class on the layer is fine */
          wrapped: !!(window.AUDIO && AUDIO.on && AUDIO.on.__cookStickers), scripts: Array.prototype.map.call(document.scripts, function (s) { return (s.getAttribute('src') || '').replace(/^.*\//, ''); }).filter(Boolean).join(' '),
          props: document.querySelectorAll('.ck-prop, .ck-props').length, screen: COOK.live().screen };
      });
      check(w.obj && w.css, 'K1: cook.html loads js/cook-stickers.js and css/cook-stickers.css');
      check(/cook\.js cook-stickers\.js/.test(w.scripts), 'K1: ... the sticker script right after js/cook.js (' + w.scripts + ')');
      check(w.lay && w.inStage && w.order === 'ck-cv ck-sim ck-stick', 'K1: the stage children are exactly ck-cv ck-sim ck-stick (' + w.order + ')');
      check(w.screen === 'step' && w.props === 0, 'K1: the kitchen opened straight into a step, no counter and no prop (' + w.screen + ')');
      check(!w.wrapped, 'K1: the sound hook is not wrapped (no listenAudio(): the kitchen cues the stickers itself)');
      var S0 = await T.stk();
      check(S0.cues.length === 0 && S0.nodes.length === 0 && S0.ev.pointerdown === 0 && S0.ev.pointerup === 0, 'K1: r5: nothing reaches the stickers at open, nothing is up (' + S0.cues.map(function (c) { return c.act; }).join(',') + ' · nodes ' + S0.nodes.length + ')');
    }
    var l = await touchDish(T), S = await T.stk();
    var log = await T.page.evaluate(function () { return window.COOK_STICKERS && COOK_STICKERS.log ? COOK_STICKERS.log().map(function (e) { return { by: e.by, run: e.run, act: e.act, sticker: e.sticker }; }) : []; });
    runs.push({ S: S, l: l, log: log, errs: T.errs.slice() });
    var bad = feelings(S.nodes.map(function (x) { return x.id; }).concat(S.cues.map(function (c) { return c.r; }).filter(Boolean)));
    check(bad.length === 0, 'K1: no feeling face is ever cued or shown in the kitchen (run ' + (n + 1) + ': ' + bad.join(',') + ')');
    var none = { d: {}, r: null, run: null }, done = S.cues[0] || none;
    check(S.cues.length === 1 && done.act === 'done', 'K1: r5: a whole dish by touch reaches the stickers exactly once, at the plate (run ' + (n + 1) + ': ' + S.cues.map(function (c) { return c.act; }).join(',') + ')');
    if (n === 1) {   /* this run has the sound hook stubbed: the kitchen's own moments, with their times */
      var snd = await T.page.evaluate(function () { return window.__acts.filter(function (x) { return x.ch === 'cook'; }).map(function (x) { return { act: x.p.act, t: x.t }; }); });
      check(snd.map(function (x) { return x.act; }).join() === ACTS.join(), 'K1: the kitchen still has every cooking moment (its sound hook gets them, in order: ' + snd.map(function (x) { return x.act; }).join(',') + ')');
      var plateT = (snd.filter(function (x) { return x.act === 'done'; })[0] || { t: Infinity }).t;
      var early = S.cues.filter(function (c) { return c.t < plateT; }), skipped = snd.filter(function (x) { return x.act !== 'done'; });
      check(early.length === 0 && skipped.length === ACTS.length - 1 && skipped.every(function (x) { return x.t < plateT; }), 'K1: r5: no cue arrives before the plate: pick, tap, sizzle, ding, flip, cut, step, quiet (' + skipped.length + ' moments) do NOT reach the stickers (' + early.map(function (c) { return c.act; }).join(',') + ')');
    }
    if (n === 0) {
      check(['pick', 'tap', 'sizzle', 'flip', 'cut', 'step', 'quiet'].every(function (a) { return S.cues.every(function (c) { return c.act !== a; }); }), 'K1: r5: no pick, tap, sizzle, flip, cut, step or quiet cue (' + S.cues.map(function (c) { return c.act; }).join(',') + ')');
      check(done.d.dish === 'jeon', 'K1: the plate cue carries the dish id (their recipe script) (' + done.d.dish + ')');
      check(done.d.runId === SEED && done.run === String(SEED), 'K1: the dish seed is the sticker run id (' + done.d.runId + ' / ' + done.run + ')');
      check(done.r === 'heart_plate' || done.r === 'star', 'K1: the plate shows heart_plate or star (' + done.r + ')');
      var want = replay(S.cues), got = S.cues.map(function (c) { return c.r; });
      check(want.length === 1 && JSON.stringify(want) === JSON.stringify(got), 'K1: the sticker shown is the one their engine picks for this run id, this moment and time (node replay)\n       want ' + want.join(',') + '\n       got  ' + got.join(','));
      var shown = got.filter(Boolean);
      check(S.nodes.length === 1 && shown.length === 1 && S.nodes[0].id === shown[0], 'K1: one node for the one shown sticker, none twice (' + S.nodes.map(function (x) { return x.id; }).join(',') + ')');
      check(S.nodes.every(function (nd) { return nd.parent === 'ck-stick'; }), 'K1: every sticker node is inside the kitchen\'s layer');
      check(S.dup === 0 && S.max <= 2, 'K1: never two stickers in one slot, never more than two up (most at once: ' + S.max + ')');
      check(log.length === shown.length && log.every(function (e) { return e.by === 'demo-rules'; }), 'K1: their log holds every shown sticker, each marked by: demo-rules (' + log.length + ')');
      check(l.done && l.look.dents.length === 9 && l.look.cuts.length === 2 && l.look.band === 2 && l.err === 0, 'K1: the dish itself is done as always (9 dents, crisp, 2 cuts, no kitchen error)');
      check(S.ac === 0, 'K1: no AudioContext was made (sound off, file://)');
      check(T.net.filter(function (u) { return /\/(audio|foley)\//.test(u); }).length === 0, 'K1: nothing requested under audio/ or foley/');
      var st = await T.page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, KEY);
      check(st && st.book.length === 1 && st.pot === null && Object.keys(st).sort().join() === 'book,day,dayN,pot,seen,v', 'K1: the save keys are exactly book, day, dayN, pot, seen, v (nothing from the stickers) ' + JSON.stringify(st && Object.keys(st)));
      DISH = { look: JSON.stringify(l.look), tag: l.tag };
    }
    check(T.errs.length === 0, 'K1: no console or page error (run ' + (n + 1) + ') ' + T.errs.join(' | '));
    await T.done();
  }
  var a = runs[0].S, b = runs[1].S;
  check(a.cues.length === 1 && JSON.stringify(a.cues.map(function (c) { return [c.act, c.r, c.d.runId]; })) === JSON.stringify(b.cues.map(function (c) { return [c.act, c.r, c.d.runId]; })), 'K1: the same seed and the same touches show the same sticker at the plate');
  check(JSON.stringify(a.nodes.map(function (x) { return [x.id, x.slot]; })) === JSON.stringify(b.nodes.map(function (x) { return [x.id, x.slot]; })), 'K1: ... in the same slots');
}

async function K2(browser) {
  /* life: r5: nothing comes up at open any more, so a sticker is put up mid-dish (their own show(), on the kitchen's mount) */
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
  var stage0 = await T.rect('.ck-stage');
  await atStep(T);
  check((await T.stk()).nodes.length === 0, 'K2: r5: nothing is up at open');
  var t0 = await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); return performance.now(); });
  async function age(ms) { var d = t0 + ms - await T.now(); if (d > 0) await T.go(d); }
  await T.settle();
  var on = await T.onStage(), n = on[0], v = (await T.live()).view, g = stickGeo(v, 2, 360), S;
  check(on.length === 1 && n.parent === 'ck-stick', 'K2: a sticker is up, in the kitchen\'s layer');
  check(!!n && near(n.w, g.s) && near(n.h, g.s) && near(n.ay, g.top, 0.5) && (near(n.ax, g.l0, 0.5) || near(n.ax + n.w, g.r1, 0.5)),
    'K2: ' + g.s + ' x ' + g.s + ' CSS px at the top of the HUD row (' + g.top + '), in slot 0 (left ' + g.l0 + ') or slot 1 (right edge ' + g.r1 + ') (' + JSON.stringify(n && [n.ax, n.ay, n.w, n.h]) + ')');
  check(n && n.pe === 'none', 'K2: it takes no pointer events');
  var stage1 = await T.rect('.ck-stage');
  check(JSON.stringify(stage0) === JSON.stringify(stage1), 'K2: the stage did not move or grow');
  await age(LIFE.out - 50);
  on = await T.onStage();
  check(on.length === 1 && !/is-out/.test(on[0].cls), 'K2: still there 1.6 s after the moment');
  await age(LIFE.out + 50);
  on = await T.onStage();
  check(on.length === 1 && /is-out/.test(on[0].cls), 'K2: leaving at 1.7 s');
  await age(LIFE.gone - 30);
  check((await T.onStage()).length === 1, 'K2: the node is there until 1.87 s');
  await age(LIFE.gone + 50);
  check((await T.onStage()).length === 0, 'K2: ... and gone after it');
  S = await T.stk();
  var rec = S.nodes[0];
  check(rec && near(rec.out - rec.add, LIFE.out, 2) && near(rec.rm - rec.add, LIFE.gone, 2), 'K2: on screen ' + (rec && Math.round(rec.rm - rec.add)) + ' ms (out from ' + (rec && Math.round(rec.out - rec.add)) + ' ms)');
  await T.done();

  /* three inside 1.87 s: r5: two put up (one a slot) just after the last cut, then the plate's own cue (the only one a
     dish): two slots, so the kitchen lets the plate's sticker take one over */
  var U = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
  await atStep(U);
  await U.page.evaluate(function () { COOK.auto(true); });
  await U.until(function (x) { return x.done && x.screen === 'step'; }, 15000, 'the last step finished');
  check((await U.stk()).cues.length === 0, 'K2: r5: no cue before the plate (whole dish on the chip path)');
  var pT = await U.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); return performance.now(); });
  await U.go(120);
  await U.page.evaluate(function () { COOK_STICKERS.show('clap', { slot: 1 }); });
  await U.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await U.go(34);
  var SU = await U.stk(), shownU = SU.cues.filter(function (c) { return c.r; });
  on = await U.onStage();
  check(SU.cues.length === 1 && shownU.length === 1 && SU.nodes.length === 3 && shownU[0].t - pT < LIFE.gone, 'K2: two put up and the plate\'s sticker cued inside 1.87 s (' + SU.nodes.map(function (x) { return x.id; }).join(' ') + ' / ' + (shownU[0] && Math.round(shownU[0].t - pT)) + ' ms)');
  check(on.length === 2 && on[0].slot !== on[1].slot && !near(on[0].x, on[1].x), 'K2: ... and two are up, one in each slot (' + on.map(function (s) { return s.id + '@' + s.x; }).join(' ') + ')');
  check(SU.dup === 0 && SU.max === 2, 'K2: at no point two in one slot (most at once: ' + SU.max + ')');
  check(on.length > 0 && !!shownU[0] && on[on.length - 1].id === shownU[0].r, 'K2: the newest one (the plate\'s) is the one that stays');
  check(U.errs.length === 0, 'K2: no errors ' + U.errs.join(' | '));
  await U.done();

  /* box and pixel grid at phone sizes: s = 32 n / dpr, whole device px, at the slots of spec 5.4; hidden where the strip does not fit */
  for (var z = 0; z < STICK_SIZES.length; z++) {
    var su = STICK_SIZES[z], tag = su.vp.width + 'x' + su.vp.height + '@' + su.dpr;
    var suBr = su.real ? await chromium.launch({ args: ['--force-device-scale-factor=' + su.dpr, '--window-size=' + su.vp.width + ',' + su.vp.height] }) : null;
    var G = await openPage(suBr || browser, { store: SEEN_ALL, q: 'seed=' + SEED, vp: su.vp, dpr: su.dpr, real: !!su.real });
    await G.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); COOK_STICKERS.show('clap', { slot: 1 }); });   /* a still and a strip, both slots */
    await G.settle();
    var m = await G.page.evaluate(function () {
      var dpr = window.devicePixelRatio, dlg = document.querySelector('.ck-dlg'), lv = COOK.live(), lay = document.querySelector('.ck-stick'), lr = lay.getBoundingClientRect();
      return { dpr: dpr, view: lv.view, stick: lv.stick, vw: innerWidth, vh: innerHeight, lay: { x: lr.left, y: lr.top, w: lr.width, h: lr.height, pe: getComputedStyle(lay).pointerEvents },
        scroll: dlg.scrollWidth > dlg.clientWidth || dlg.scrollHeight > dlg.clientHeight || document.documentElement.scrollWidth > document.documentElement.clientWidth,
        st: Array.prototype.map.call(document.querySelectorAll('.cook-sticker'), function (n) {
          var r = n.getBoundingClientRect();
          return { id: n.dataset.sticker, x: r.left, y: r.top, w: r.width, h: r.height, px: r.width * dpr / 32, py: r.height * dpr / 32, dx: r.left * dpr, dy: r.top * dpr,
            vis: r.width > 0 && (!n.checkVisibility || n.checkVisibility({ checkVisibilityCSS: true })) };
        }) };
    });
    var gg = stickGeo(m.view, m.dpr, m.vw), two = m.st.filter(function (x) { return x.id === 'thumbs' || x.id === 'clap'; });
    check(m.stick === gg.shown && gg.shown === su.shown, 'K2 ' + tag + ': the layer is ' + (su.shown ? 'shown' : 'hidden') + ' (live ' + m.stick + ', rule hudB ' + m.view.hudB + ' + 4 + ' + gg.s + ' + 8 <= (44 + ' + m.view.oy + ') x ' + m.view.css + ')');
    check(m.lay.pe === 'none', 'K2 ' + tag + ': the layer takes no touch');
    if (su.shown) check(near(gg.s, su.s, 0.01), 'K2 ' + tag + ': stickers are ' + su.s + ' CSS px (n ' + gg.n + ', ' + gg.s.toFixed(2) + ')');
    if (su.shown) {
      check(two.length === 2 && two.every(function (x) { return x.vis && near(x.px, gg.n, 0.02) && near(x.py, gg.n, 0.02); }), 'K2 ' + tag + ': one sticker pixel is n = ' + gg.n + ' device px (' + two.map(function (x) { return x.px.toFixed(3); }).join(', ') + ')');
      var snap = function (v) { return Math.round(v * m.dpr) / m.dpr; }, tol = 0.5 / m.dpr + 0.01;   /* spec 2.5: every box sits on whole device px (round(v dpr) / dpr) */
      check(two.length === 2 && two.every(function (x) { return near(x.w, gg.s, 0.02) && near(x.y, snap(gg.top), tol); }), 'K2 ' + tag + ': both are ' + gg.s.toFixed(2) + ' CSS px at the top = ' + gg.top + ' (' + two.map(function (x) { return x.w.toFixed(2) + '@' + x.y.toFixed(2); }).join(' / ') + ')');
      check(two.length === 2 && near(two[0].x, snap(gg.l0), tol) && near(two[1].x + two[1].w, snap(gg.r1), tol), 'K2 ' + tag + ': slot 0 at left ' + gg.l0 + ', slot 1 ends at ' + gg.r1 + ' (' + two.map(function (x) { return x.x.toFixed(2) + '..' + (x.x + x.w).toFixed(2); }).join(' / ') + ')');
      check(two.every(function (x) { return near(x.dx, Math.round(x.dx), 0.02) && near(x.dy, Math.round(x.dy), 0.02); }), 'K2 ' + tag + ': on whole device px (' + two.map(function (x) { return x.dx.toFixed(2) + ',' + x.dy.toFixed(2); }).join(' / ') + ')');
      check(two.every(function (x) { return x.x >= 0 && x.y >= 0 && x.x + x.w <= m.vw + 0.01 && x.y + x.h <= m.vh + 0.01; }) && !m.scroll, 'K2 ' + tag + ': inside the window, nothing scrolls');
    } else {
      check(two.length === 2 && two.every(function (x) { return !x.vis; }) && !m.scroll, 'K2 ' + tag + ': stickers still come and go but none is visible, nothing scrolls');
    }
    check(G.errs.length === 0, 'K2 ' + tag + ': no errors ' + G.errs.join(' | '));
    await G.done();
    if (suBr) await suBr.close();
  }

  /* 11-15 round 5 (check K-2): at DPR 2.625 a sticker at rest is whole device-px blocks: every opaque px of its 32 x 32
     picture is an n x n block of exactly its own colour (an identity transform kept after the rise put the shadowed
     sticker on a layer of its own, resampled under the layer zoom: 29-49 % of the blocks were exact) */
  /* round 6: also the grown sizes (n 6 at 360x740@2, n 9 at 360x740@3) */
  /* 11-18 lead: 2.625 now grows to n 7 (zoom 4/3) and is checked on the REAL render path (a browser started with
     --force-device-scale-factor=2.625, viewport null): Playwright's deviceScaleFactor emulation lays out in CSS 1/64 units
     and resamples any zoom that is not a whole 1/64 (95 % exact at n 7), which no phone does */
  var BLK = [{ vp: { width: 412, height: 915 }, dpr: 2.625, n: 10, real: true }, { vp: { width: 360, height: 740 }, dpr: 2, n: 8 }, { vp: { width: 360, height: 740 }, dpr: 3, n: 12 }];   /* 11-21 round 7: n 7 / 6 / 9 before */
  for (var bi = 0; bi < BLK.length; bi++) {
  var BK = BLK[bi], btag = BK.vp.width + 'x' + BK.vp.height + '@' + BK.dpr;
  var realBr = BK.real ? await chromium.launch({ args: ['--force-device-scale-factor=' + BK.dpr, '--window-size=' + BK.vp.width + ',' + BK.vp.height] }) : null;
  var X = await openPage(realBr || browser, { store: SEEN_ALL, q: 'seed=' + SEED, vp: BK.vp, dpr: BK.dpr, real: !!BK.real });
  await X.page.evaluate(function () { document.querySelector('.ck-stick').textContent = ''; COOK_STICKERS.show('thumbs', { slot: 0 }); COOK_STICKERS.show('star', { slot: 1 }); });
  await X.page.evaluate(function () { return Promise.all(Array.prototype.map.call(document.querySelectorAll('.cook-sticker'), function (i) { return i.decode ? i.decode().catch(function () { /* checked below */ }) : null; })); });
  await X.settle();
  var bx = await X.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('.ck-stick .cook-sticker'), function (e) { var r = e.getBoundingClientRect(), d = devicePixelRatio; return { id: e.dataset.sticker, x: r.left * d, y: r.top * d, w: r.width * d, tr: getComputedStyle(e).transform }; });
  });
  var shotFile = path.join(os.tmpdir(), 'ck-stick-2625-' + process.pid + '.png');
  await X.page.screenshot({ path: shotFile });
  var shot = LM.decodePNG(shotFile); fs.unlinkSync(shotFile);
  var blocks = bx.map(function (b) {   /* the grid may sit one device px off the box's rounded edge (the zoomed layer snaps on its own): the best of +-1 */
    var s = LM.decodePNG(path.join(ROOT, 'assets/stickers/cook/' + b.id + '.png')), n = Math.round(b.w / s.w), best = 0;
    for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
      var x0 = Math.round(b.x) + ox, y0 = Math.round(b.y) + oy, tot = 0, ex = 0;
      for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) {
        var si = (j * s.w + i) * s.bpp, ok = true; if (s.bpp === 4 && s.px[si + 3] !== 255) continue;
        tot++;
        for (var v = 0; v < n && ok; v++) for (var u = 0; u < n && ok; u++) {
          var pi = ((y0 + j * n + v) * shot.w + x0 + i * n + u) * shot.bpp;
          ok = Math.abs(shot.px[pi] - s.px[si]) <= 2 && Math.abs(shot.px[pi + 1] - s.px[si + 1]) <= 2 && Math.abs(shot.px[pi + 2] - s.px[si + 2]) <= 2;
        }
        if (ok) ex++;
      }
      if (tot && ex / tot > best) best = ex / tot;
    }
    return { id: b.id, n: n, tr: b.tr, exact: best };
  });
  check(blocks.length === 2 && blocks.every(function (b) { return b.n === BK.n && b.exact === 1; }), 'K2 ' + btag + ': resting stickers are exact ' + BK.n + ' x ' + BK.n + ' device-px blocks (2.625 on the real render path) (' + blocks.map(function (b) { return b.id + ' ' + (b.exact * 100).toFixed(1) + ' % ' + b.tr; }).join(', ') + ')');
  check(X.errs.length === 0, 'K2 ' + btag + ' blocks: no errors ' + X.errs.join(' | '));
  await X.done();
  if (realBr) await realBr.close();
  }
}

async function K3(browser) {
  var T = await openPage(browser, { store: null, q: 'seed=' + SEED });   /* a first run: the demo hands show too */
  function geo() {
    return T.page.evaluate(function () {
      function r(sel) { var e = document.querySelector(sel); if (!e || e.hidden) return null; var b = e.getBoundingClientRect(); return b.width || b.height ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; }
      var sim = document.querySelector('.ck-sim').getBoundingClientRect(), u = sim.width / 144, l = COOK.live(), st = l.st, dlg = document.querySelector('.ck-dlg'), need = {};
      function art(x, y, w, h) { return { x: sim.left + x * u, y: sim.top + y * u, w: w * u, h: h * u }; }
      ['.ck-close', '.ck-verb', '.ck-call', '.ck-table', '.ck-note'].forEach(function (s) { var x = r(s); if (x) need[s] = x; });   /* the HUD and the chip (its box even while quiet) */
      if (st && st.box) need.food = art(st.box[0], st.box[1], st.box[2], st.box[3]);
      (st && st.marks || []).forEach(function (m, i) { need['mark' + i] = art(m.x / 2 - 8, m.y / 2 - 12, 16, 24); });   /* the mark and the hand over it */
      (st && st.lines || []).forEach(function (L, i) { var b = art(Math.min(L.ax, L.bx) / 2, Math.min(L.ay, L.by) / 2, Math.abs(L.bx - L.ax) / 2, Math.abs(L.by - L.ay) / 2); need['line' + i] = { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }; });
      if (l.kind === 'flip') need.flipHand = art(72 - 10, 110 - 32 - 6, 20, 32 + 18);   /* the up-arrow at (72,110) and the flick hand sweeping 32 art px up from it */
      return { need: need, stage: r('.ck-stage'), verb: r('.ck-verb'), close: r('.ck-close'), hint: l.hint, stick: l.stick,
        scroll: dlg.scrollHeight > dlg.clientHeight || dlg.scrollWidth > dlg.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth || dlg.scrollTop !== 0,
        st: Array.prototype.filter.call(document.querySelectorAll('.cook-sticker'), function (n) { return !n.checkVisibility || n.checkVisibility({ checkVisibilityCSS: true }); })
          .map(function (n) { var b = n.getBoundingClientRect(); return { id: n.dataset.sticker, x: b.left, y: b.top, w: b.width, h: b.height }; }).filter(function (b) { return b.w > 0 && b.h > 0; }) };
    });
  }
  var seen = 0, cover = [], shift = [], base = await geo();
  async function look(label) {
    var g = await geo();
    seen += g.st.length;
    g.st.forEach(function (s) { Object.keys(g.need).forEach(function (k) { if (inter(s, g.need[k]) > 0) cover.push(label + ': ' + s.id + ' over ' + k); }); });
    if (g.scroll || JSON.stringify(g.stage) !== JSON.stringify(base.stage) || (g.verb && JSON.stringify(g.verb) !== JSON.stringify(base.verb)) || JSON.stringify(g.close) !== JSON.stringify(base.close)) shift.push(label);
    return g;
  }
  await atStep(T); await T.settle();
  var g = await look('open');
  check(g.stick === true && g.st.length === 0 && (await T.stk()).cues.length === 0, 'K3: at 360x740 the layer is shown and, r5, nothing is up at open');
  await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); COOK_STICKERS.show('clap', { slot: 1 }); });   /* r5: put up directly */
  await T.settle();
  g = await look('open (placed)');
  check(g.st.length === 2, 'K3: two stickers put up over the opening step (' + g.st.length + ')');
  var hit =await T.page.evaluate(function () { var n = document.querySelector('.cook-sticker'), b = n.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e ? e.className : null; });
  check(/^(ck-cv|ck-sim|ck-stage)$/.test(hit || ''), 'K3: a touch on a sticker lands on the stage (' + hit + ')');
  await T.go(700);
  var l = await T.live();
  check(l.hint === 'demo', 'K3: the first-run demo hand is showing (' + l.hint + ')');
  await look('tap demo hand');
  for (var i = 0; i < 3; i++) {   /* one chip press = three tap moments: r5: none of them adds a sticker */
    var n0 = (await T.stk()).nodes.length;
    await T.verbClick(); await T.go(34);
    var added = (await T.stk()).nodes.length - n0;
    check(added === 0, 'K3: r5: chip press ' + (i + 1) + ' (three tap moments) adds no sticker (' + added + ')');
    await look('tap press ' + i); await T.go(266);
  }
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip step');
  await T.go(700);
  await look('flip demo hand');
  var nH = (await T.stk()).nodes.length;
  await T.tap(144, 176); await T.settle();
  l = await T.live();
  check(l.band === 0 && l.st.heat && (await T.stk()).nodes.length === nH && (await T.stk()).cues.length === 0, 'K3: r5: heat on shows no sticker (nothing cued)');
  await T.page.evaluate(function () { COOK_STICKERS.show('cheer', { slot: 0 }); });   /* r5: put up directly, then flicked from under */
  await T.settle();
  g = await look('heat on');
  var st = g.st[g.st.length - 1];
  check(!!st, 'K3: a sticker is up over the pan');
  if (st) {   /* an upward flick of 48 logical px (the rule is 32) that starts on the sticker */
    var sim = await T.rect('.ck-sim'), up = 48 * sim.h / 320, p0 = [st.x + st.w / 2, st.y + st.h - 6], pts = [p0];
    for (var k = 1; k <= 8; k++) pts.push([p0[0], p0[1] - up * k / 8]);
    await T.dragCss(pts);
    l = await T.live();
    check(l.stats.flips === 1 && l.phase === 'between', 'K3: a flick that starts under a sticker flips the jeon (flips ' + l.stats.flips + ')');
  }
  await T.settle(); await look('flip');
  await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 4000, 'slice step');
  await T.go(300);
  g = await look('slice start');
  if (!g.st.length) { await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); }); await T.go(34); g = await look('slice (placed)'); }
  var top = g.st[0], ln = (await T.live()).st.lines[0], sm = await T.rect('.ck-sim'), u = sm.w / 288;
  var a = [top.x + top.w / 2, top.y + top.h / 2], mid = [sm.x + (ln.ax + ln.bx) / 2 * u, sm.y + (ln.ay + ln.by) / 2 * u], b = [mid[0] + (mid[0] - a[0]) * 0.5, mid[1] + (mid[1] - a[1]) * 0.5], sl = [];
  for (k = 0; k <= 14; k++) sl.push([a[0] + (b[0] - a[0]) * k / 14, a[1] + (b[1] - a[1]) * k / 14]);
  await T.dragCss(sl);
  l = await T.live();
  check(l.st.lines[0].cut, 'K3: a slash that starts under a sticker cuts the line (' + l.st.lines[0].how + ')');
  await T.settle(); await look('cut');
  await T.go(300);
  await T.verbClick(); await T.go(34);
  l = await T.live();
  check(l.st.lines[1].cut, 'K3: the chip works with stickers up');
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(500); await T.settle();
  g = await look('plate');
  var cs = (await T.stk()).cues;
  check(g.st.length >= 1 && cs.length === 1 && cs[0].act === 'done' && g.st.some(function (s) { return s.id === cs[0].r; }), 'K3: r5: the plate\'s sticker (the one cue of the dish) is up over the plate screen (' + cs.map(function (c) { return c.act + '>' + c.r; }).join(',') + ')');
  await T.go(1000); await look('plate at rest');
  check(seen >= 6, 'K3: stickers were on screen at the checks (' + seen + ' sightings)');
  check(cover.length === 0, 'K3: no sticker ever lies over the food, a mark or hand, a guide line, the strip, the close button or the chip' + (cover.length ? ' (' + cover.slice(0, 4).join('; ') + ')' : ''));
  check(shift.length === 0, 'K3: no layout shift and no scroll while stickers come and go' + (shift.length ? ' (' + shift.join(', ') + ')' : ''));
  var z = await T.page.evaluate(function () {
    var lay = getComputedStyle(document.querySelector('.ck-stick')), c = document.querySelector('.ck-close').getBoundingClientRect(), vE = document.querySelector('.ck-verb'), v = (vE.hidden ? document.querySelector('.ck-table') : vE).getBoundingClientRect();   /* on the plate the end buttons stand where the chip was */
    var ec = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2), ev = document.elementFromPoint(v.left + v.width / 2, v.top + v.height / 2);
    return { pe: lay.pointerEvents, close: !!ec && !!ec.closest('.ck-close'), verb: !!ev && (vE.hidden ? !!ev.closest('.ck-stage') : !!ev.closest('.ck-verb')) };   /* 11-24 r5: on the plate the drawn table place (the stage) takes the touch where the framed button stood */
  });
  check(z.pe === 'none' && z.close && z.verb, 'K3: the layer takes no touch and the close button and the chip are on top (' + JSON.stringify(z) + ')');
  await T.page.evaluate(function () { COOK_STICKERS.show('star', { slot: 1 }); });
  await T.go(34);
  await T.tapEl('.ck-close');
  var shut = await T.closed().then(function () { return true; }, function () { return false; });
  check(shut && (await T.live()).screen === 'closed', 'K3: the close button works with a sticker up');
  check(T.errs.length === 0, 'K3: no errors ' + T.errs.join(' | '));
  await T.done();

  /* short screens: the strip does not fit above the food, so the layer is hidden (the stickers still run, nobody sees them) */
  var short = [{ vp: { width: 320, height: 568 }, dpr: 2 }, { vp: { width: 360, height: 560 }, dpr: 2 }];
  for (var q = 0; q < short.length; q++) {
    var H = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED, vp: short[q].vp, dpr: short[q].dpr }), tg = short[q].vp.width + 'x' + short[q].vp.height;
    await atStep(H);
    var hs0 = (await H.stk()).nodes.length;
    await H.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); });   /* r5: nothing comes up at open: put one up */
    await H.settle();
    var hs = await H.stk(), vis = await visibleStickers(H.page), lvH = await H.live();
    /* 11-21 round 7: with the strip gone the layer starts in the HUD row, so these short screens show stickers too */
    check(lvH.stick === true && hs0 === 0 && hs.nodes.length === 1 && vis.length === 1, 'K3 ' + tg + ': the layer shows on a short screen now: nothing at open, a sticker put up ran (' + hs.nodes.length + ') and is visible (' + vis.length + ')');
    var gS = stickGeo(lvH.view, short[q].dpr, short[q].vp.width), bS = await H.page.evaluate(function () { var b = document.querySelector('.cook-sticker').getBoundingClientRect(), v = COOK.live().view; return [b.width, b.bottom - 8, (36 + v.oy) * v.css]; });
    check(Math.abs(bS[0] - gS.s) < 0.02 && bS[0] >= 64 && bS[1] <= bS[2] + 0.01, 'K3 ' + tg + ': it is ' + bS[0] + ' CSS px and ends 8 px above stage row 36 (' + bS[1] + ' + 8 <= ' + bS[2] + ')');
    await verbThrough(H, 'tap', 3);
    check(H.errs.length === 0, 'K3 ' + tg + ': no errors ' + H.errs.join(' | '));
    await H.done();
  }
}

async function K4(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
  function count() { return T.page.evaluate(function () { var t = window.__stk.timers, o = { nodes: document.querySelectorAll('.cook-sticker').length, lay: document.querySelector('.ck-stick') ? document.querySelector('.ck-stick').childNodes.length : 0, s: 0, o: 0, raf: window.__stk.raf }; Object.keys(t).forEach(function (k) { o[t[k]]++; }); return o; }); }
  var l0 = await atStep(T); await verbThrough(T, 'tap', 2); await T.go(34);
  var c = await count();
  check(c.nodes === 0 && c.s === 0 && (await T.stk()).cues.length === 0, 'K4: r5: nothing is up mid-dish, nothing cued, no sticker timer (' + c.nodes + ' / ' + c.s + ')');
  await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); });   /* one put up directly: the close must clear it */
  await T.go(34);
  c = await count();
  check(c.nodes === 1 && c.s === 2, 'K4: a sticker put up mid-dish is up (its two timers are running: ' + c.s + ')');
  await T.page.evaluate(function () { COOK.close(); });
  await T.closed();
  c = await count();
  var raf0 = c.raf;
  check((await T.live()).screen === 'closed' && c.nodes === 0 && c.lay === 0, 'K4: closed mid-dish: no sticker node is left (' + c.nodes + ')');
  check(c.o === 0, 'K4: ... and no kitchen timer (' + c.o + ')');
  await T.go(2000);
  c = await count();
  check(c.s === 0 && c.o === 0, 'K4: 2 s later the sticker script\'s own timers are gone too (' + c.s + ')');
  check(c.raf === raf0, 'K4: no frame ran after the close (' + (c.raf - raf0) + ')');
  check((await T.stk()).nodes.length === 1, 'K4: nothing was shown while closed');
  await T.page.evaluate(function () { document.getElementById('ck-door').click(); });
  await T.go(400);
  var l = await T.live(), props = await T.page.evaluate(function () { return document.querySelectorAll('.ck-prop, .ck-props').length; });
  check(l.screen === 'step' && l.kind === 'tap' && l.id === l0.id && props === 0, 'K4: opened again: straight back into the saved dish (same run ' + l.id + '), no counter');
  var S = await T.stk();
  check(S.cues.length === 0 && (await T.onStage()).length === 0, 'K4: r5: the reopened dish cues nothing and shows nothing (' + S.cues.map(function (x) { return x.act; }).join(',') + ')');
  /* the first dish to the plate on the chip path, then 'again' (the chip, after 900 ms) to a second dish, also to the plate */
  await T.page.evaluate(function () { COOK.auto(true); });
  await T.until(function (x) { return x.done && x.screen === 'step'; }, 15000, 'dish 1: the last step finished');
  check((await T.stk()).cues.length === 0, 'K4: r5: ... nothing until its plate (' + (await T.stk()).cues.map(function (x) { return x.act; }).join(',') + ')');
  var r1 = await T.until(function (x) { return x.screen === 'reveal'; }, 15000, 'reveal 1');
  await T.go(300);
  var up1 = await T.onStage(), c1 = (await T.stk()).cues;
  check(c1.length === 1 && c1[0].act === 'done' && c1[0].d.runId === SEED && c1[0].d.dish === 'jeon' && !!c1[0].r, 'K4: dish 1 (resumed): its plate cues once, done, under the dish seed (' + c1.map(function (x) { return x.act + ':' + x.d.runId + '>' + x.r; }).join(',') + ')');
  check(up1.length === 1 && up1[0].id === c1[0].r, 'K4: dish 1: its sticker is up at the plate (' + up1.map(function (s) { return s.id; }).join(',') + ')');
  await T.go(1000);
  var n0 = (await T.stk()).cues.length, k0 = (await T.stk()).nodes.length;
  /* 11-21 round 7: no 'again'. The table button closes the kitchen, the page's door opens the next dish */
  await T.page.evaluate(function () { document.querySelector('.ck-table').click(); });
  await new Promise(function (ok) { setTimeout(ok, 80); }); await T.go(60);
  n0 = (await T.stk()).cues.length;
  await T.page.evaluate(function () { document.getElementById('ck-door').click(); }); await T.go(34);
  var l2 = await T.until(function (x) { return x.screen === 'step' && x.kind === 'tap' && x.id !== r1.id; }, 3000, 'again: a new dish');
  await T.go(300);
  var after = (await T.stk()).cues.slice(n0);
  check(after.length === 0 && (await T.onStage()).length === 0, 'K4: r5: the next dish starts with no cue and nothing up (' + after.map(function (x) { return x.act; }).join(',') + ')');
  await T.page.evaluate(function () { COOK.auto(true); });
  await T.until(function (x) { return x.done && x.screen === 'step' && x.id === l2.id; }, 15000, 'dish 2: the last step finished');
  check((await T.stk()).cues.length === n0, 'K4: r5: ... nothing until its plate');
  await T.until(function (x) { return x.screen === 'reveal' && x.id === l2.id; }, 15000, 'reveal 2');
  await T.go(300);
  S = await T.stk();
  var cues2 = S.cues.slice(n0), nodes2 = S.nodes.slice(k0), up2 = await T.onStage();
  check(cues2.length === 1 && cues2[0].act === 'done' && cues2[0].d.runId === l2.seed && cues2[0].d.dish === l2.recipe && !!cues2[0].r, 'K4: the next dish\'s plate cues once, done, with its own seed as run id (' + cues2.map(function (x) { return x.act + ':' + x.d.runId + '/' + x.run + '>' + x.r; }).join(',') + ' · seed ' + l2.seed + ')');
  check(up2.length === 1 && nodes2.length === 1 && up2[0].id === cues2[0].r && S.dup === 0, 'K4: the second dish shows one node, none left from the first, its plate\'s (' + up2.map(function (s) { return s.id; }).join(',') + ')');
  var bad = feelings(S.nodes.map(function (x) { return x.id; }));
  check(bad.length === 0, 'K4: no feeling face in either dish (' + bad.join(',') + ')');
  /* nothing after the close */
  await T.page.evaluate(function () { COOK.close(); });
  await T.closed();
  var cn = (await T.stk()).cues.length, nn = (await T.stk()).nodes.length;
  await T.go(2500);
  c = await count();
  check((await T.stk()).cues.length === cn && (await T.stk()).nodes.length === nn && c.nodes === 0 && c.s === 0, 'K4: after the close: no moment, no node, no sticker timer (' + c.nodes + ' / ' + c.s + ')');
  check((await T.live()).err === 0 && T.errs.length === 0, 'K4: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K5(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, audio: true, q: 'recipe=jeon&seed=' + SEED });
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700); await T.tap(144, 176); await T.go(3500);
  var S0 = await T.stk(), a0 = await T.page.evaluate(function () { return window.__acts.length; });
  var sz0 = await T.page.evaluate(function () { return window.__acts.filter(function (x) { return x.ch === 'cook' && x.p.act === 'sizzle'; }).length; });
  check(sz0 === 2 && S0.cues.length === 0 && S0.nodes.length === 0, 'K5: the pan is on and golden (two sizzle moments so far, to the sound hook; r5: none to the stickers: ' + S0.cues.length + ')');
  await T.page.evaluate(function () {
    COOK_STICKERS.show('thumbs', { slot: 0 });   /* r5: one put up right before the tab hides: it must not wait there */
    Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await T.go(3000);
  var hidden = (await T.onStage()).length;
  await T.page.evaluate(function () { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await T.go(100);
  var S1 = await T.stk(), tail = await T.page.evaluate(function (n) { return window.__acts.slice(n).map(function (x) { return x.p.act + (x.p.band != null ? x.p.band : ''); }); }, a0);
  check(tail.join() === 'quiet,sizzle1', 'K5: hidden then shown: the sound gets quiet, then the sizzle again (' + tail.join() + ')');
  check(S1.cues.length === S0.cues.length && S1.nodes.length === S0.nodes.length + 1, 'K5: ... the stickers get neither: no moment, no sticker but the one put up (' + S1.cues.slice(S0.cues.length).map(function (c) { return c.act; }).join() + ')');
  check(hidden === 0, 'K5: no sticker waits on a hidden tab (3 s)');
  var all = await T.page.evaluate(function () { return window.__acts.filter(function (x) { return x.ch === 'cook'; }).map(function (x) { return x.p.act; }); });
  check(all.length >= 10 && all[0] === 'pick' && S1.cues.length === 0, 'K5: r5: the sound hook got every moment so far (' + all.length + '), the stickers none of them (only the plate reaches them)');
  check(T.errs.length === 0, 'K5: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K6(browser) {
  var modes = [{ label: '?reduced=1 alone', q: '&reduced=1', os: false, red: true }, { label: 'the device setting alone', q: '', os: true, red: true }, { label: 'control (no reduced motion)', q: '', os: false, red: false }];
  for (var m = 0; m < modes.length; m++) {
    var mo = modes[m], T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED + mo.q, reducedOS: mo.os });
    await T.go(34);
    check((await T.onStage()).length === 0, 'K6 ' + mo.label + ': r5: nothing is up at open');
    await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); });   /* r5: a still, put up directly */
    await T.go(34);
    var l = await T.live(), first = (await T.onStage())[0];
    check(l.reduced === mo.red, 'K6 ' + mo.label + ': the kitchen runs ' + (mo.red ? 'reduced' : 'with motion'));
    await verbThrough(T, 'tap', 3);
    await T.page.evaluate(function () { COOK_STICKERS.show('clap', { slot: 1 }); });   /* r5: the jeon's clap no longer comes from the last tap: a moving strip, put up directly */
    await T.go(34);
    var on = await T.onStage(), clap = on.filter(function (s) { return s.id === 'clap'; }).pop();
    if (mo.red) {
      check(!!first && first.tag === 'IMG' && /is-reduced/.test(first.cls) && first.anim === 'cook-sticker-fade-in' && first.tr === 'none', 'K6 ' + mo.label + ': a sticker only fades in, no travel (' + JSON.stringify(first && [first.anim, first.tr]) + ')');
      check(!!clap && clap.tag === 'IMG' && /clap\.png$/.test(clap.src || '') && clap.frames === null, 'K6 ' + mo.label + ': a moving strip shows as its still (its first cell)');
      check(on.length > 0 && on.every(function (s) { return s.tr === 'none' && s.moving.every(function (a) { return /fade/.test(a); }); }), 'K6 ' + mo.label + ': nothing on the stage travels or flips cells (' + on.map(function (s) { return s.moving.join('+'); }).join(' ') + ')');
      var S = await T.stk(), t0 = S.nodes[S.nodes.length - 1].add, d = t0 + LIFE.out + 60 - await T.now();
      if (d > 0) await T.go(d);
      var out = (await T.onStage()).filter(function (s) { return /is-out/.test(s.cls); })[0];
      check(!!out && out.anim === 'cook-sticker-fade-out' && out.tr === 'none', 'K6 ' + mo.label + ': it fades out, no travel (' + JSON.stringify(out && [out.anim, out.tr]) + ')');
    } else {
      check(!!first && first.anim === 'cook-sticker-in', 'K6 ' + mo.label + ': a sticker travels in');
      check(!!clap && clap.tag === 'DIV' && clap.frames === 'cook-sticker-frames', 'K6 ' + mo.label + ': the strip flips its cells');
    }
    check(T.errs.length === 0, 'K6 ' + mo.label + ': no errors ' + T.errs.join(' | '));
    await T.done();
  }
}

async function K7(browser) {
  var T = await openPage(browser, { url: HTTP0, store: SEEN_ALL, q: 'seed=' + SEED });
  var l = await touchDish(T), S = await T.stk();
  var au = await T.page.evaluate(function () { var s = window.AUDIO && AUDIO.state ? AUDIO.state() : null; return s ? { enabled: s.enabled, ctx: s.ctx, started: s.started, played: s.played.length, cook: !!(s.cook && s.cook.ready) } : null; });
  check(!!au && au.enabled === false, 'K7: over http the game\'s own sound script is there and sound is off (the default)');
  check(S.cues.length === 1 && S.cues[0].act === 'done' && S.nodes.length === 1 && S.nodes[0].id === S.cues[0].r && l.done, 'K7: the stickers show all the same: r5: the plate\'s one (' + S.nodes.map(function (x) { return x.id; }).join(',') + ') and the dish is done');
  check(S.ac === 0 && !!au && au.ctx === 'none' && !au.started && au.played === 0 && !au.cook, 'K7: no AudioContext, nothing played, no kitchen sound list (' + JSON.stringify(au) + ', made ' + S.ac + ')');
  var bad = T.net.filter(function (u) { return /\/(audio|foley)\//.test(u); });
  check(bad.length === 0, 'K7: nothing requested under audio/ or foley/ (' + bad.length + ')');
  var pics = T.net.filter(function (u) { return /\/assets\/stickers\//.test(u); });
  var shownK7 = S.nodes.map(function (x) { return x.id; }), picIds = pics.map(function (u) { var m = /\/assets\/stickers\/cook\/([a-z_]+?)(_anim)?\.png$/.exec(u); return m ? m[1] : null; });
  check(pics.length >= 1 && picIds.every(function (id) { return id !== null && shownK7.indexOf(id) >= 0; }) && shownK7.every(function (id) { return picIds.indexOf(id) >= 0; }), 'K7: the only extra requests are the sticker pictures that showed (' + pics.map(function (u) { return u.replace(/^.*\//, ''); }).join(',') + ' for ' + shownK7.join(',') + ')');
  check(T.errs.length === 0, 'K7: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K8(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED });
  await T.go(34);
  var before = await T.page.evaluate(function () { var d = document.querySelector('.ck-dlg').cloneNode(true); var l = d.querySelector('.ck-stick'); if (l) l.remove(); return d.textContent; });
  await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); COOK_STICKERS.show('clap', { slot: 1 }); });   /* r5 (nothing at open): a still (img alt) and a strip (div role=img), put up directly */
  await T.go(34);
  var r = await T.page.evaluate(function () {
    var lay = document.querySelector('.ck-stick'), dlg = document.querySelector('.ck-dlg');
    return { text: dlg.textContent, layText: lay.textContent, hidden: lay.getAttribute('aria-hidden'), live: !!lay.closest('[aria-live]'), tab: lay.querySelectorAll('[tabindex], a, button, input').length,
      nodes: Array.prototype.map.call(lay.querySelectorAll('*'), function (n) { return { tag: n.tagName, text: n.textContent, alt: n.getAttribute('alt'), label: n.getAttribute('aria-label'), title: n.getAttribute('title'), live: n.getAttribute('aria-live') }; }) };
  });
  var kinds = r.nodes.filter(function (n) { return n.alt || n.label; });
  check(kinds.length === 2, 'K8: a still (img alt) and a strip (role img) are up (' + r.nodes.map(function (n) { return n.tag; }).join(',') + ')');
  check(r.layText === '' && r.nodes.every(function (n) { return n.text === ''; }) && r.text === before, 'K8: the stickers add no DOM text (the dialog reads the same: ' + JSON.stringify(r.text) + ')');
  check(!/\d/.test(r.text), 'K8: no digits in the kitchen with stickers up');
  /* the same glyph rule as tools/test-cook.js (WORDS): letters, Hangul and plain punctuation only */
  var BAD = /[^\sA-Za-z0-9.,!?:;'"()\/%+~\-ᄀ-ᇿ㄰-㆏가-힣·…‘’“”—–]/gu, EMOTE = /zZ|Zz|\^\^|<3|[:;]-?[()]|T_T|>_</g;
  var strings = [];
  r.nodes.forEach(function (n) { ['alt', 'label', 'title'].forEach(function (k) { if (n[k]) strings.push(n[k]); }); });
  var all = await T.page.evaluate(function () { return Object.keys(COOK_STICKERS.CATALOG).map(function (k) { return COOK_STICKERS.CATALOG[k].alt; }); });
  strings = strings.concat(all);
  check(strings.length >= 20 && strings.every(function (s) { return !/\d/.test(s) && !(s.match(BAD) || []).length && !(s.match(EMOTE) || []).length; }), 'K8: every alt string (the ' + all.length + ' in their catalog too) is free of digits, emoji and symbols');
  check(r.hidden === 'true' && !r.live && r.tab === 0 && r.nodes.every(function (n) { return n.live === null; }), 'K8: the layer is aria-hidden, in no live region, and holds nothing to focus');
  var snap = await T.page.locator('#cook-dlg').ariaSnapshot(), imgs = await T.page.getByRole('img').count();
  check(imgs === 0 && !/img/.test(snap) && snap.indexOf(all[0].slice(-6)) < 0, 'K8: the accessibility tree holds no sticker (' + snap.replace(/\s+/g, ' ').trim() + ')');
  var said0 = (await T.live()).said.length;
  await T.page.evaluate(function () { COOK_STICKERS.show('star', { slot: 1 }); });
  await T.go(200);
  check((await T.live()).said.length === said0, 'K8: a sticker says nothing through the kitchen\'s aria-live line');
  check(T.errs.length === 0, 'K8: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K9(browser) {
  var T = await openPage(browser, { url: HTTP0, store: SEEN_ALL, q: 'seed=' + SEED, allow: /js\/cook-stickers\.js/,
    route: function (ctx) { return ctx.route(/js\/cook-stickers\.js/, function (r) { return r.fulfill({ status: 404, contentType: 'text/plain', body: '404' }); }); } });
  check(await T.page.evaluate(function () { return typeof window.COOK_STICKERS === 'undefined' && !!document.querySelector('.ck-stick'); }), 'K9: js/cook-stickers.js is blocked (404): no sticker object');
  var l = await touchDish(T), S = await T.stk();
  check(l.done && l.err === 0, 'K9: the kitchen plays the whole dish without it');
  check(DISH === null || (JSON.stringify(l.look) === DISH.look && l.tag === DISH.tag), 'K9: ... to the very same look as with the stickers (same seed, same touches)' + (DISH === null ? ' [K1 did not run]' : ''));
  check(S.nodes.length === 0 && S.cues.length === 0, 'K9: and shows no sticker');
  var st = await T.page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, KEY);
  check(st && st.book.length === 1 && st.pot === null, 'K9: one book line, no pot');
  check(T.errs.length === 0, 'K9: no error but the browser\'s own line for the blocked file ' + T.errs.join(' | '));
  await T.done();

  /* the stylesheet blocked instead: the pictures come unstyled, and the kitchen's layer alone keeps them harmless */
  var C = await openPage(browser, { url: HTTP0, store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED, allow: /css\/cook-stickers\.css/,
    route: function (ctx) { return ctx.route(/css\/cook-stickers\.css/, function (r) { return r.fulfill({ status: 404, contentType: 'text/plain', body: '404' }); }); } });
  var stage0 = await C.rect('.ck-stage');
  await verbThrough(C, 'tap', 3);
  await C.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip step');
  await C.go(700); await C.tap(144, 176); await C.go(34);
  check((await C.stk()).cues.length === 0, 'K9 (no css): r5: nothing cued mid-dish');
  await C.page.evaluate(function () { COOK_STICKERS.show('cheer', { slot: 0 }); });   /* r5: put up directly over the hot pan */
  await C.go(34);
  var on = await C.onStage(), s0 = on[on.length - 1];
  check(!!s0 && s0.anim === 'none', 'K9 (no css): a sticker node is up, unstyled');
  var m = await C.page.evaluate(function () {
    var n = document.querySelector('.cook-sticker'), b = n.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2), dlg = document.querySelector('.ck-dlg');
    return { hit: e ? e.className : null, scroll: dlg.scrollHeight > dlg.clientHeight || dlg.scrollWidth > dlg.clientWidth, at: [b.left + b.width / 2, b.top + b.height - 6] };
  });
  check(m.hit === 'ck-cv' && !m.scroll && JSON.stringify(await C.rect('.ck-stage')) === JSON.stringify(stage0), 'K9 (no css): it still takes no touch, the stage has not moved, nothing scrolls (' + m.hit + ')');
  /* 11-15 5차: 8 논리 px 씩 여섯 걸음 (48 ≥ flick 32). 예전 8 CSS px 는 가까이 보기 (논리 1 px ≈ 2 CSS px 남짓) 에선 flick 에 못 미쳤다 */
  var sim = await C.rect('.ck-sim'), dy = 8 * sim.h / 320;
  var pts = [m.at]; for (var k = 1; k <= 6; k++) pts.push([m.at[0], m.at[1] - dy * k]);
  await C.dragCss(pts);
  check((await C.live()).stats.flips === 1, 'K9 (no css): a flick from under it still flips');
  check(C.errs.length === 0, 'K9 (no css): no error but the browser\'s own line for the blocked file ' + C.errs.join(' | '));
  await C.done();

  /* the pictures blocked: a sticker whose picture does not come goes away again, nothing broken stays on the stage */
  var P = await openPage(browser, { url: HTTP0, store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED, allow: /assets\/stickers\//,
    route: function (ctx) { return ctx.route(/assets\/stickers\//, function (r) { return r.fulfill({ status: 404, contentType: 'text/plain', body: '404' }); }); } });
  /* r5: a strip put up directly mid-dish, then the plate's own still */
  await verbThrough(P, 'tap', 3);
  var lp = await P.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip step');
  await P.page.evaluate(function () { COOK_STICKERS.show('clap', { slot: 1 }); });
  var gone = false;
  for (var w = 0; w < 120 && !gone; w++) { gone = (await P.onStage()).length === 0; if (!gone) await realWait(25); }   /* the 404 is the browser's own task */
  var SP = await P.stk();
  check(lp.err === 0 && gone && SP.nodes.length === 1 && SP.nodes[0].rm !== null && SP.nodes[0].rm - SP.nodes[0].add < LIFE.out, 'K9 (no pictures): the kitchen plays on, a strip without pictures goes away at once, the stage stays clear');
  await P.page.evaluate(function () { COOK.auto(true); });
  var lr = await P.until(function (x) { return x.screen === 'reveal'; }, 15000, 'reveal');
  await P.go(34);
  for (w = 0, gone = false; w < 120 && !gone; w++) { gone = (await P.onStage()).length === 0; if (!gone) await realWait(25); }
  SP = await P.stk();
  var pn = SP.nodes[SP.nodes.length - 1];
  check(lr.err === 0 && gone && SP.cues.length === 1 && SP.cues[0].act === 'done' && SP.nodes.length === 2 && pn.rm !== null && pn.rm - pn.add < LIFE.out, 'K9 (no pictures): the plate\'s sticker came and, with no picture, went away at once (' + SP.cues.map(function (c) { return c.act + '>' + c.r; }).join(',') + ')');
  check(P.errs.length === 0, 'K9 (no pictures): no error but the browser\'s own lines for the blocked pictures ' + P.errs.join(' | '));
  await P.done();
}

async function K10(browser) {
  var stubs = {
    'mount throws': function () { window.COOK_STICKERS = { cue: function () { return null; }, mount: function () { window.__boom = (window.__boom || 0) + 1; throw new Error('sticker mount failed'); } }; },
    'cue throws': function () { window.COOK_STICKERS = { cue: function () { window.__boom = (window.__boom || 0) + 1; throw new Error('sticker cue failed'); } }; },
    'cue lies': function () { window.COOK_STICKERS = { cue: function () { window.__boom = (window.__boom || 0) + 1; return { not: 'an id' }; }, mount: null }; },
    'no cue': function () { window.COOK_STICKERS = { mount: function () { window.__boom = 1; } }; }
  };
  var names = Object.keys(stubs);
  for (var i = 0; i < names.length; i++) {
    var name = names[i], T = await openPage(browser, { url: HTTP0, store: SEEN_ALL, q: 'seed=' + SEED, init: '(' + stubs[name].toString() + ')();',
      route: function (ctx) { return ctx.route(/js\/cook-stickers\.js/, function (r) { return r.abort(); }); }, allow: /js\/cook-stickers\.js/ });
    await T.page.evaluate(function () { COOK.auto(true); });
    await T.until(function (x) { return x.screen === 'reveal'; }, 15000, 'reveal');
    var l = await T.live();
    await T.go(1200);   /* the plate lands, the again chip shows; COOK.auto stops on the plate */
    var boom = await T.page.evaluate(function () { return window.__boom || 0; });
    check(l.done && l.err === 0 && (await T.live()).err === 0, 'K10 (' + name + '): the dish is done, the kitchen counts no error');
    /* r5: a cue is called once a dish (the plate); a mount that throws is tried again at every moment (it never sticks) */
    var wantBoom = name === 'no cue' ? boom === 0 : name === 'mount throws' ? boom >= 20 : boom === 1;
    check(wantBoom, 'K10 (' + name + '): the stub was ' + (name === 'no cue' ? 'left alone' : name === 'mount throws' ? 'really called (' + boom + ' times)' : 'called exactly once, at the plate (' + boom + ' times)'));
    check(T.errs.length === 0, 'K10 (' + name + '): nothing reaches the page: no console or page error ' + T.errs.join(' | '));
    await T.done();
  }
}

(async function main() {
  var tests = { K1: K1, K2: K2, K3: K3, K4: K4, K5: K5, K6: K6, K7: K7, K8: K8, K9: K9, K10: K10 };
  var srv = await serve(), browser = await chromium.launch(), t0 = Date.now();
  HTTP0 = 'http://127.0.0.1:' + srv.address().port + '/cook.html';
  try {
    for (var name in tests) {
      if (ONLY.length && ONLY.indexOf(name) < 0) continue;
      section(name);
      try { await tests[name](browser); }
      catch (e) { fails++; console.error('  FAIL ' + name + ' threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
    }
    if (!ONLY.length) check(errAll.length === 0, 'no console or page error in the whole run (' + errAll.length + ')');
  } finally { await browser.close(); srv.close(); }
  console.log('\n' + passes + ' passed, ' + fails + ' failed (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(fails ? 1 : 0);
})();
