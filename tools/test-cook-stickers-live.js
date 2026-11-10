#!/usr/bin/env node
/* tools/test-cook-stickers-live.js - the reaction stickers (js/cook-stickers.js, the sticker session's) on the real
 * kitchen (cook.html + js/cook.js, ours): the wiring, and that the kitchen stays the kitchen. Playwright + Chromium.
 *   NODE_PATH=$(npm root -g) node tools/test-cook-stickers-live.js
 *   ONLY=K1,K4      run only these
 * Style and helpers follow tools/test-cook-live.js (CDP touch, Playwright's fake clock, paused before the page loads so
 * every time below is exact). K7, K9 and K10 need http (sound, blocked files): the script serves the repo root itself on
 * a free 127.0.0.1 port. The other scenarios open cook.html as file://.
 *  K1  wiring: one seeded dish by touch. Every cooking moment reaches COOK_STICKERS.cue under the kitchen's act names,
 *      in order, with its detail; the dish seed is the sticker run id; what shows is what their own engine picks for
 *      that run id, those moments and those times (replayed in node); the same seed twice shows the same; one node per
 *      shown sticker, inside the kitchen's layer; the dish itself is done as always. No AudioContext on file://.
 *  K2  where and how long: the two top corners of the stage, on the art grid, one sticker pixel = one art pixel (DPR 2,
 *      3 and 2.625), about 1.85 s; never two in one corner (three moments inside 1.87 s).
 *  K3  touches pass through: a flick that starts under a sticker flips, a slash that starts under one cuts, the verb
 *      button and the close button work with stickers up; nothing the player needs is covered; no layout shift, no scroll.
 *  K4  nothing left behind: closed mid-dish (no node, no frame, their timers gone within 2 s), reopened, resumed, a
 *      second dish, back on the counter.
 *  K5  a hidden tab and back with the pan on: the sound gets quiet + sizzle, the stickers get nothing (no second one).
 *  K6  reduced motion (?reduced=1 alone, the device setting alone): stills only, a fade and no travel; the control
 *      page (no reduced motion) does move, so the check can tell.
 *  K7  sound off (the default) over http: stickers show, no AudioContext, nothing fetched under audio/ or foley/.
 *  K8  words and screen readers: the stickers add no DOM text (no digits, emoji or symbols), their alt strings keep the
 *      kitchen's glyph rules, the accessibility tree does not hold them, nothing sits in a live region.
 *  K9  js/cook-stickers.js blocked (404): the kitchen plays the same dish to the same look; css blocked: still no touch
 *      taken, no shift, no scroll.
 *  K10 a sticker object that throws never reaches the kitchen.
 * No console or page error anywhere (K9 and K10 allow only the browser's own line for the file they block). Exit 1 on any failure.
 */
'use strict';
var fs = require('fs'), path = require('path'), http = require('http');
var { chromium } = require('playwright');

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
        var rec = { id: n.dataset.sticker, slot: n.dataset.slot, tag: n.tagName, parent: n.parentNode ? n.parentNode.className : null, add: performance.now(), out: null, rm: null };
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
  var ctx = await browser.newContext({ viewport: o.vp || { width: 360, height: 740 }, deviceScaleFactor: o.dpr || 2, hasTouch: touch, isMobile: touch,
    reducedMotion: o.reducedOS ? 'reduce' : 'no-preference', locale: 'ko-KR', colorScheme: 'light' });
  if (o.store !== undefined) {
    await ctx.addInitScript(function (a) {
      try { if (!sessionStorage.getItem('__ckSeeded')) { sessionStorage.setItem('__ckSeeded', '1'); if (a[1] === null) localStorage.removeItem(a[0]); else localStorage.setItem(a[0], a[1]); } } catch (e) { /* none */ }
    }, [KEY, o.store]);
  }
  if (o.audio) await ctx.addInitScript(function () { window.__acts = []; window.AUDIO = { on: function (ch, p) { window.__acts.push({ ch: ch, p: p }); } }; });
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
  await page.goto((o.url || FILE0) + (o.q ? '?' + o.q : ''));
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
          parent: n.parentNode.className, anim: cs.animationName, tr: cs.transform, pe: cs.pointerEvents, src: n.getAttribute('src'), text: n.textContent,
          frames: f ? getComputedStyle(f).animationName : null, moving: n.getAnimations({ subtree: true }).map(function (a) { return a.animationName; }) };
      });
    });
  };
  T.pt = async function (lx, ly) { var r = await T.rect('.ck-cv'); return [r.x + lx * r.w / 288, r.y + ly * r.h / 320]; };
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
  await T.go(600);
  return T;
}

/* ---------- play helpers ---------- */
async function pickPan(T) { await T.tapEl('.ck-prop'); return T.eventually(function (x) { return x.screen === 'step'; }, 'the pan was picked'); }   /* the click follows the touch in real time: the clock stands still */
async function verbThrough(T, kind, presses) {
  await T.until(function (l) { return l.kind === kind && l.phase === 'step'; }, 4000, kind + ' step');
  await T.go(700);
  for (var i = 0; i < presses; i++) { await T.verbClick(); await T.go(300); }
}
/* one dish by touch on a fixed schedule: taps 180 ms apart, heat on, the pan left alone past crisp, a swipe up, two cuts */
async function touchDish(T) {
  await pickPan(T);
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
    await T.drag(line([ln.ax - 10 * ln.ux, ln.ay - 10 * ln.uy], [ln.bx + 10 * ln.ux, ln.by + 10 * ln.uy], 20));
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
var ACTS = ['pick'].concat(['tap', 'tap', 'tap', 'tap', 'tap', 'tap', 'tap', 'tap', 'tap'], ['step', 'quiet', 'sizzle', 'sizzle', 'sizzle', 'flip', 'step', 'quiet', 'cut', 'cut', 'step', 'quiet', 'done']);
var DISH = null;   /* K1's first dish (look, tags): K9 plays the same touches without the sticker script */

/* ===================================================================================================== */
async function K1(browser) {
  var runs = [];
  for (var n = 0; n < 2; n++) {
    var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
    if (n === 0) {
      var w = await T.page.evaluate(function () {
        var lay = document.querySelector('.ck-stick'), st = document.querySelector('.ck-stage');
        return { obj: !!(window.COOK_STICKERS && COOK_STICKERS.cue), css: Array.prototype.some.call(document.styleSheets, function (s) { return /cook-stickers\.css/.test(s.href || ''); }),
          lay: !!lay, inStage: !!lay && lay.parentNode === st, order: Array.prototype.map.call(st.children, function (c) { return c.className; }).join(' '),
          wrapped: !!(window.AUDIO && AUDIO.on && AUDIO.on.__cookStickers), scripts: Array.prototype.map.call(document.scripts, function (s) { return (s.getAttribute('src') || '').replace(/^.*\//, ''); }).filter(Boolean).join(' ') };
      });
      check(w.obj && w.css, 'K1: cook.html loads js/cook-stickers.js and css/cook-stickers.css');
      check(/cook\.js cook-stickers\.js/.test(w.scripts), 'K1: ... the sticker script right after js/cook.js (' + w.scripts + ')');
      check(w.lay && w.inStage && w.order === 'ck-cv ck-stick ck-props ck-title ck-name', 'K1: the kitchen\'s sticker layer sits in the stage, over the canvas and under the props and tags (' + w.order + ')');
      check(!w.wrapped, 'K1: the sound hook is not wrapped (no listenAudio(): the kitchen cues the stickers itself)');
    }
    var l = await touchDish(T), S = await T.stk();
    var log = await T.page.evaluate(function () { return window.COOK_STICKERS && COOK_STICKERS.log ? COOK_STICKERS.log().map(function (e) { return { by: e.by, run: e.run, act: e.act, sticker: e.sticker }; }) : []; });
    runs.push({ S: S, l: l, log: log, errs: T.errs.slice() });
    if (n === 0) {
      var acts = S.cues.map(function (c) { return c.act; });
      check(acts.join() === ACTS.join(), 'K1: every cooking moment reaches the stickers once, in the kitchen\'s order (' + acts.join(',') + ')');
      var taps = S.cues.filter(function (c) { return c.act === 'tap'; }).map(function (c) { return c.d.i; });
      check(taps.join() === '0,1,2,3,4,5,6,7,8', 'K1: tap moments carry i 0..8 (' + taps.join() + ')');
      var bands = S.cues.filter(function (c) { return c.act === 'sizzle'; }).map(function (c) { return c.d.band; }), none = { d: {}, r: null, run: null };
      var flip = S.cues.filter(function (c) { return c.act === 'flip'; })[0] || none, pick = S.cues[0] || none, done = S.cues.filter(function (c) { return c.act === 'done'; })[0] || none, last = S.cues.filter(function (c) { return c.act === 'tap' && c.d.i === 8; })[0] || none;
      check(bands.join() === '0,1,2' && flip.d.band === 2, 'K1: sizzle carries the band (0,1,2), the flip the band it was flipped at');
      var cuts = S.cues.filter(function (c) { return c.act === 'cut'; }).map(function (c) { return c.d.i; }), steps = S.cues.filter(function (c) { return c.act === 'step'; }).map(function (c) { return c.d.kind; });
      check(cuts.join() === '0,1' && steps.join() === 'tap,flip,slice', 'K1: cut carries i 0,1 and step its kind (' + cuts.join() + ' / ' + steps.join() + ')');
      check(pick.d.dish === 'jeon' && done.d.dish === 'jeon', 'K1: pick and done carry the dish id (their recipe script)');
      check(pick.d.runId === SEED && S.cues.length > 0 && S.cues.every(function (c) { return c.run === String(SEED); }), 'K1: the dish seed is the sticker run id (' + pick.d.runId + ' / ' + pick.run + ')');
      check(!!pick.r && !!flip.r && !!done.r && !!last.r, 'K1: the moments their doc always shows did show: pick, the last tap of the jeon, flip, done (' + [pick.r, last.r, flip.r, done.r].join(',') + ')');
      var want = replay(S.cues), got = S.cues.map(function (c) { return c.r; });
      check(JSON.stringify(want) === JSON.stringify(got), 'K1: the stickers shown are the ones their engine picks for this run id, these moments and times (node replay)\n       want ' + want.join(',') + '\n       got  ' + got.join(','));
      var shown = got.filter(Boolean);
      check(shown.length >= 5, 'K1: a dish shows five stickers or more (' + shown.length + ': ' + shown.join(',') + ')');
      check(S.nodes.length === shown.length && S.nodes.every(function (nd, i) { return nd.id === shown[i]; }), 'K1: one node per shown sticker, none twice (' + S.nodes.map(function (x) { return x.id; }).join(',') + ')');
      check(S.nodes.every(function (nd) { return nd.parent === 'ck-stick'; }), 'K1: every sticker node is inside the kitchen\'s layer');
      check(S.dup === 0 && S.max <= 2, 'K1: never two stickers in one corner, never more than two on the stage (most at once: ' + S.max + ')');
      check(log.length === shown.length && log.every(function (e) { return e.by === 'demo-rules'; }), 'K1: their log holds every shown sticker, each marked by: demo-rules (' + log.length + ')');
      check(l.done && l.look.dents.length === 9 && l.look.cuts.length === 2 && l.look.band === 2 && l.err === 0, 'K1: the dish itself is done as always (9 dents, crisp, 2 cuts, no kitchen error)');
      check(S.ac === 0, 'K1: no AudioContext was made (sound off, file://)');
      check(T.net.filter(function (u) { return /\/(audio|foley)\//.test(u); }).length === 0, 'K1: nothing requested under audio/ or foley/');
      var st = await T.page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, KEY);
      check(st && st.book.length === 1 && st.pot === null && Object.keys(st).sort().join() === 'book,day,dayN,pot,seen,v', 'K1: the save holds the dish and nothing from the stickers');
      DISH = { look: JSON.stringify(l.look), tag: l.tag };
    }
    check(T.errs.length === 0, 'K1: no console or page error (run ' + (n + 1) + ') ' + T.errs.join(' | '));
    await T.done();
  }
  var a = runs[0].S, b = runs[1].S;
  check(JSON.stringify(a.cues.map(function (c) { return [c.act, c.r]; })) === JSON.stringify(b.cues.map(function (c) { return [c.act, c.r]; })), 'K1: the same seed and the same touches show the same stickers at the same moments');
  check(JSON.stringify(a.nodes.map(function (x) { return [x.id, x.slot]; })) === JSON.stringify(b.nodes.map(function (x) { return [x.id, x.slot]; })), 'K1: ... in the same corners');
}

async function K2(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
  var stage0 = await T.rect('.ck-stage');
  await pickPan(T);
  var S = await T.stk(), t0 = S.cues[0].t;
  async function age(ms) { var d = t0 + ms - await T.now(); if (d > 0) await T.go(d); }
  await T.settle();
  var on = await T.onStage(), n = on[0];
  check(on.length === 1 && n.parent === 'ck-stick', 'K2: the pick sticker is on the stage, in the kitchen\'s layer');
  check(n && near(n.w, 64) && near(n.h, 64) && near(n.y, 6) && (near(n.x, 8) || near(n.x, 216)), 'K2: 64 x 64 CSS px in a top corner, 8 px from the side and 6 from the top (' + JSON.stringify(n && [n.x, n.y, n.w, n.h]) + ')');
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

  /* three moments inside 1.87 s (pick, the middle tap, the last tap of the jeon): two corners, so the third takes one over */
  var U = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
  await pickPan(U);
  var l = await U.live(), pT = (await U.stk()).cues[0].t, off = [[-3, 2], [2, -2], [0, 3]], at = [300, 420, 540, 660, 960, 1080, 1200, 1320, 1440], k = 0;
  for (var i = 0; i < l.st.marks.length; i++) for (var j = 0; j < 3; j++) {
    var d = pT + at[k++] - await U.now(); if (d > 0) await U.go(d);
    var p = await U.pt(l.st.marks[i].x + off[j][0], l.st.marks[i].y + off[j][1]);
    await U.touch('touchStart', p); await U.touch('touchEnd');
  }
  await U.go(34);
  var SU = await U.stk(), shownU = SU.cues.filter(function (c) { return c.r; });
  on = await U.onStage();
  check(shownU.length === 3 && SU.cues[SU.cues.length - 3].t - pT < LIFE.gone, 'K2: three stickers were cued inside 1.87 s (' + shownU.map(function (c) { return c.act + (c.d.i != null ? c.d.i : '') + '>' + c.r; }).join(' ') + ')');
  check(on.length === 2 && on[0].slot !== on[1].slot && !near(on[0].x, on[1].x), 'K2: ... and the stage shows two, one in each corner (' + on.map(function (s) { return s.id + '@' + s.x; }).join(' ') + ')');
  check(SU.dup === 0 && SU.max === 2, 'K2: at no point two in one corner (most at once: ' + SU.max + ')');
  check(on.length > 0 && on[on.length - 1].id === shownU[2].r, 'K2: the newest one is the one that stays');
  check(U.errs.length === 0, 'K2: no errors ' + U.errs.join(' | '));
  await U.done();

  /* pixel grid: one sticker pixel = one art pixel of the stage, on the stage's art grid, at whole and fractional DPR */
  var setups = [{ vp: { width: 320, height: 568 }, dpr: 3 }, { vp: { width: 360, height: 740 }, dpr: 2 }, { vp: { width: 412, height: 915 }, dpr: 2.625 }, { vp: { width: 800, height: 1280 }, dpr: 2, touch: false }];
  for (var s = 0; s < setups.length; s++) {
    var su = setups[s], tag = su.vp.width + 'x' + su.vp.height + '@' + su.dpr;
    var G = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED, vp: su.vp, dpr: su.dpr, touch: su.touch });
    await G.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); COOK_STICKERS.show('clap', { slot: 1 }); });   /* a still and a strip, both corners */
    await G.settle();
    var m = await G.page.evaluate(function () {
      var dpr = window.devicePixelRatio, st = document.querySelector('.ck-stage').getBoundingClientRect(), k = COOK.live().k, dlg = document.querySelector('.ck-dlg');
      return { k: k, scroll: dlg.scrollWidth > dlg.clientWidth || dlg.scrollHeight > dlg.clientHeight || document.documentElement.scrollWidth > document.documentElement.clientWidth,
        st: Array.prototype.map.call(document.querySelectorAll('.cook-sticker'), function (n) {
          var r = n.getBoundingClientRect();
          return { id: n.dataset.sticker, px: r.width * dpr / 32, py: r.height * dpr / 32, gx: (r.left - st.left) * dpr / k, gy: (r.top - st.top) * dpr / k, inside: r.left >= st.left && r.top >= st.top && r.right <= st.right + 0.01 && r.bottom <= st.bottom + 0.01 };
        }) };
    });
    var two = m.st.filter(function (x) { return x.id === 'thumbs' || x.id === 'clap'; });
    check(two.length === 2 && two.every(function (x) { return near(x.px, m.k, 0.02) && near(x.py, m.k, 0.02); }), 'K2 ' + tag + ': one sticker pixel is ' + m.k + ' device px, the stage\'s art pixel (' + two.map(function (x) { return x.px.toFixed(3); }).join(', ') + ')');
    check(two.length === 2 && near(two[0].gx, 4, 0.02) && near(two[0].gy, 3, 0.02) && near(two[1].gx, 108, 0.02) && near(two[1].gy, 3, 0.02), 'K2 ' + tag + ': both sit on the art grid, 4 art px in from the side and 3 down (' + two.map(function (x) { return x.gx.toFixed(3) + ',' + x.gy.toFixed(3); }).join(' / ') + ')');
    check(two.every(function (x) { return x.inside; }) && !m.scroll, 'K2 ' + tag + ': inside the stage, nothing scrolls');
    check(G.errs.length === 0, 'K2 ' + tag + ': no errors ' + G.errs.join(' | '));
    await G.done();
  }
}

async function K3(browser) {
  var T = await openPage(browser, { store: null, q: 'seed=' + SEED });   /* a first run: the demo hands show too */
  function geo() {
    return T.page.evaluate(function () {
      function r(sel) { var e = document.querySelector(sel); if (!e || e.hidden) return null; var b = e.getBoundingClientRect(); return b.width || b.height ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; }
      var cv = document.querySelector('.ck-cv').getBoundingClientRect(), u = cv.width / 144, l = COOK.live(), st = l.st, dlg = document.querySelector('.ck-dlg'), need = {};
      ['.ck-title', '.ck-name', '.ck-verbrow', '.ck-close', '.ck-dlg .ckh-credits', '.ck-prop', '.ck-strip'].forEach(function (s) { var x = r(s); if (x) need[s] = x; });
      if (st && st.box) need.food = { x: cv.left + st.box[0] * u, y: cv.top + st.box[1] * u, w: st.box[2] * u, h: st.box[3] * u };
      (st && st.marks || []).forEach(function (m, i) { need['mark' + i] = { x: cv.left + m.x / 2 * u - 8 * u, y: cv.top + m.y / 2 * u - 12 * u, w: 16 * u, h: 24 * u }; });   /* the mark and the hand over it */
      (st && st.lines || []).forEach(function (L, i) { need['line' + i] = { x: cv.left + Math.min(L.ax, L.bx) / 2 * u - 4, y: cv.top + Math.min(L.ay, L.by) / 2 * u - 4, w: Math.abs(L.bx - L.ax) / 2 * u + 8, h: Math.abs(L.by - L.ay) / 2 * u + 8 }; });
      return { need: need, stage: r('.ck-stage'), verbRow: r('.ck-verbrow'), close: r('.ck-close'), hint: l.hint,
        scroll: dlg.scrollHeight > dlg.clientHeight || dlg.scrollWidth > dlg.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth || dlg.scrollTop !== 0,
        st: Array.prototype.map.call(document.querySelectorAll('.cook-sticker'), function (n) { var b = n.getBoundingClientRect(); return { id: n.dataset.sticker, x: b.left, y: b.top, w: b.width, h: b.height }; }) };
    });
  }
  var seen = 0, cover = [], shift = [], base = await geo();
  async function look(label) {
    var g = await geo();
    seen += g.st.length;
    g.st.forEach(function (s) { Object.keys(g.need).forEach(function (k) { if (inter(s, g.need[k]) > 0) cover.push(label + ': ' + s.id + ' over ' + k); }); });
    if (g.scroll || JSON.stringify(g.stage) !== JSON.stringify(base.stage) || JSON.stringify(g.verbRow) !== JSON.stringify(base.verbRow) || JSON.stringify(g.close) !== JSON.stringify(base.close)) shift.push(label);
    return g;
  }
  await pickPan(T); await T.settle();
  var g = await look('pick + title');
  check(g.st.length === 1 && !!g.need['.ck-title'], 'K3: the pick sticker and the title tag are up together');
  var hit = await T.page.evaluate(function () { var n = document.querySelector('.cook-sticker'), b = n.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e ? e.className : null; });
  check(hit === 'ck-cv', 'K3: a touch on a sticker lands on the stage canvas (' + hit + ')');
  await T.go(700);
  l = await T.live();
  check(l.hint === 'demo', 'K3: the first-run demo hand is showing');
  await look('tap demo hand');
  for (var i = 0; i < 3; i++) {   /* one verb press = three tap moments: at most one sticker a press */
    var n0 = (await T.stk()).nodes.length;
    await T.verbClick(); await T.go(34);
    var added = (await T.stk()).nodes.length - n0;
    check(added <= 1, 'K3: verb press ' + (i + 1) + ' (three tap moments) adds at most one sticker (' + added + ')');
    await look('tap press ' + i); await T.go(266);
  }
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip step');
  await T.go(700);
  await T.tap(144, 176); await T.settle();
  g = await look('heat on');
  var st = g.st[g.st.length - 1], l = await T.live();
  check(!!st && l.band === 0 && l.st.heat, 'K3: heat on shows a sticker');
  if (st) {
    var p0 = [st.x + st.w / 2, st.y + st.h - 6], pts = [p0];
    for (var k = 1; k <= 6; k++) pts.push([p0[0], p0[1] - 8 * k]);
    await T.dragCss(pts);
    l = await T.live();
    check(l.stats.flips === 1 && l.phase === 'between', 'K3: a flick that starts under a sticker flips the jeon (flips ' + l.stats.flips + ')');
  }
  await T.settle(); await look('flip');
  await T.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 4000, 'slice step');
  await T.go(300);
  g = await look('slice title');
  if (!g.st.length) { await T.page.evaluate(function () { COOK_STICKERS.show('thumbs', { slot: 0 }); }); await T.go(34); g = await look('slice (placed)'); }
  var top = g.st[0], ln = (await T.live()).st.lines[0], cv = await T.rect('.ck-cv'), u = cv.w / 288;
  var a = [top.x + top.w / 2, top.y + top.h / 2], mid = [cv.x + (ln.ax + ln.bx) / 2 * u, cv.y + ln.ay * u], b = [mid[0] + (mid[0] - a[0]) * 0.5, mid[1] + (mid[1] - a[1]) * 0.5], sl = [];
  for (k = 0; k <= 14; k++) sl.push([a[0] + (b[0] - a[0]) * k / 14, a[1] + (b[1] - a[1]) * k / 14]);
  await T.dragCss(sl);
  l = await T.live();
  check(l.st.lines[0].cut, 'K3: a slash that starts under a sticker cuts the line (' + l.st.lines[0].how + ')');
  await T.settle(); await look('cut');
  await T.go(300);
  await T.verbClick(); await T.go(34);
  l = await T.live();
  check(l.st.lines[1].cut, 'K3: the verb button works with stickers up');
  await T.until(function (x) { return x.screen === 'reveal'; }, 3000, 'reveal');
  await T.go(500); await T.settle();
  g = await look('plate reveal');
  check(g.st.length >= 1 && !!g.need['.ck-name'], 'K3: the done sticker and the name tag are up together');
  check(seen >= 6, 'K3: stickers were on screen at the checks (' + seen + ' sightings)');
  check(cover.length === 0, 'K3: no sticker ever lies over the food, a mark or hand, a guide line, the title or name tag, the step strip, the verb row or the close button' + (cover.length ? ' (' + cover.slice(0, 4).join('; ') + ')' : ''));
  check(shift.length === 0, 'K3: no layout shift and no scroll while stickers come and go' + (shift.length ? ' (' + shift.join(', ') + ')' : ''));
  var z = await T.page.evaluate(function () { var c = function (s) { return getComputedStyle(document.querySelector(s)); }; return { lay: c('.ck-stick').zIndex, pe: c('.ck-stick').pointerEvents, ov: c('.ck-stick').overflow, title: c('.ck-title').zIndex, name: c('.ck-name').zIndex, props: c('.ck-props').zIndex }; });
  check(z.lay === '0' && z.pe === 'none' && z.title === 'auto' && z.name === 'auto' && z.props === 'auto', 'K3: the layer keeps the stickers under the kitchen\'s own tags and prop buttons and takes no touch (' + JSON.stringify(z) + ')');
  await T.tap(144, 150); await T.go(60);
  l = await T.live();
  g = await look('counter');
  check(l.screen === 'counter' && g.st.length === 0, 'K3: back on the counter there is no sticker (the lamp, the pan and the credits link are clear)');
  await T.page.evaluate(function () { COOK_STICKERS.show('star', { slot: 1 }); });
  await T.go(34);
  await T.tapEl('.ck-close');
  var shut = await T.closed().then(function () { return true; }, function () { return false; });
  check(shut && (await T.live()).screen === 'closed', 'K3: the close button works with a sticker up');
  check(T.errs.length === 0, 'K3: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K4(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'seed=' + SEED });
  function count() { return T.page.evaluate(function () { var t = window.__stk.timers, o = { nodes: document.querySelectorAll('.cook-sticker').length, lay: document.querySelector('.ck-stick').childNodes.length, s: 0, o: 0, raf: window.__stk.raf }; Object.keys(t).forEach(function (k) { o[t[k]]++; }); return o; }); }
  await pickPan(T); await T.go(34);
  var c = await count();
  check(c.nodes === 1 && c.s === 2, 'K4: a sticker is up mid-dish (its two timers are running: ' + c.s + ')');
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
  var l = await T.live();
  c = await count();
  check(l.screen === 'counter' && l.pending && c.nodes === 0, 'K4: opened again: the counter, the saved dish waiting, no sticker');
  await pickPan(T); await T.go(34);
  var S = await T.stk(), picks = S.cues.filter(function (x) { return x.act === 'pick'; });
  check(picks.length === 2 && picks[1].d.runId === SEED && picks[1].run === String(SEED) && !!picks[1].r, 'K4: the resumed dish is a new sticker run under the same dish seed, and picking shows a sticker again');
  check((await T.onStage()).length === 1, 'K4: ... one, not two');
  /* a second dish in the same open: the button path to the plate and back, twice */
  var seq = [];
  for (var d = 0; d < 2; d++) {
    var n0 = (await T.stk()).cues.length, k0 = (await T.stk()).nodes.length;
    if (d === 1) { await T.go(700); await pickPan(T); }
    await T.page.evaluate(function () { COOK.auto(true); });
    await T.until(function (x) { return x.screen === 'reveal'; }, 15000, 'reveal ' + d);
    await T.go(300);
    var up = (await T.onStage()).length;
    await T.until(function (x) { return x.screen === 'counter' && x.recipe === null; }, 5000, 'counter ' + d);
    c = await count();
    check(up >= 1 && c.nodes === 0 && c.lay === 0, 'K4: dish ' + (d + 1) + ': a sticker at the plate reveal (' + up + '), none once back on the counter (' + c.nodes + ')');
    S = await T.stk();
    seq.push({ cues: S.cues.slice(n0), nodes: S.nodes.slice(k0) });
  }
  var p2 = seq[1].cues.filter(function (x) { return x.act === 'pick'; });
  check(p2.length === 1 && seq[1].cues[0].act === 'pick' && !!p2[0].r, 'K4: the second dish starts with one pick moment and its sticker');
  check(seq[1].nodes.length === seq[1].cues.filter(function (x) { return x.r; }).length && (await T.stk()).dup === 0, 'K4: the second dish shows one node per sticker, none left from the first');
  check((await T.live()).err === 0 && T.errs.length === 0, 'K4: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K5(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, audio: true, q: 'recipe=jeon&seed=' + SEED });
  await verbThrough(T, 'tap', 3);
  await T.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 3000, 'flip');
  await T.go(700); await T.tap(144, 176); await T.go(3500);
  var S0 = await T.stk(), a0 = await T.page.evaluate(function () { return window.__acts.length; });
  check(S0.cues.filter(function (c) { return c.act === 'sizzle'; }).length === 2, 'K5: the pan is on and golden (two sizzle moments so far)');
  await T.page.evaluate(function () {
    Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await T.go(3000);
  var hidden = (await T.onStage()).length;
  await T.page.evaluate(function () { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await T.go(100);
  var S1 = await T.stk(), tail = await T.page.evaluate(function (n) { return window.__acts.slice(n).map(function (x) { return x.p.act + (x.p.band != null ? x.p.band : ''); }); }, a0);
  check(tail.join() === 'quiet,sizzle1', 'K5: hidden then shown: the sound gets quiet, then the sizzle again (' + tail.join() + ')');
  check(S1.cues.length === S0.cues.length && S1.nodes.length === S0.nodes.length, 'K5: ... the stickers get neither: no moment, no second sticker (' + S1.cues.slice(S0.cues.length).map(function (c) { return c.act; }).join() + ')');
  check(hidden === 0, 'K5: no sticker waits on a hidden tab (3 s)');
  var all = await T.page.evaluate(function () { return window.__acts.filter(function (x) { return x.ch === 'cook'; }).map(function (x) { return x.p.act; }); });
  check(all.slice(0, S1.cues.length).join() === S1.cues.map(function (c) { return c.act; }).join(), 'K5: before that the sound hook and the stickers got the same moments, one each');
  check(T.errs.length === 0, 'K5: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K6(browser) {
  var modes = [{ label: '?reduced=1 alone', q: '&reduced=1', os: false, red: true }, { label: 'the device setting alone', q: '', os: true, red: true }, { label: 'control (no reduced motion)', q: '', os: false, red: false }];
  for (var m = 0; m < modes.length; m++) {
    var mo = modes[m], T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED + mo.q, reducedOS: mo.os });
    await T.go(34);
    var l = await T.live(), first = (await T.onStage())[0];
    check(l.reduced === mo.red, 'K6 ' + mo.label + ': the kitchen runs ' + (mo.red ? 'reduced' : 'with motion'));
    await verbThrough(T, 'tap', 3);   /* the last press: the jeon's clap, a moving strip */
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
  check(S.nodes.length >= 5 && l.done, 'K7: the stickers show all the same (' + S.nodes.length + ') and the dish is done');
  check(S.ac === 0 && !!au && au.ctx === 'none' && !au.started && au.played === 0 && !au.cook, 'K7: no AudioContext, nothing played, no kitchen sound list (' + JSON.stringify(au) + ', made ' + S.ac + ')');
  var bad = T.net.filter(function (u) { return /\/(audio|foley)\//.test(u); });
  check(bad.length === 0, 'K7: nothing requested under audio/ or foley/ (' + bad.length + ')');
  var pics = T.net.filter(function (u) { return /\/assets\/stickers\//.test(u); });
  check(pics.length >= 4 && pics.every(function (u) { return /\/assets\/stickers\/cook\/[a-z_]+\.png$/.test(u); }), 'K7: the only extra requests are the sticker pictures that showed (' + pics.length + ')');
  check(T.errs.length === 0, 'K7: no errors ' + T.errs.join(' | '));
  await T.done();
}

async function K8(browser) {
  var T = await openPage(browser, { store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED });
  await T.go(34);
  var before = await T.page.evaluate(function () { var d = document.querySelector('.ck-dlg').cloneNode(true); var l = d.querySelector('.ck-stick'); if (l) l.remove(); return d.textContent; });
  await T.page.evaluate(function () { COOK_STICKERS.show('clap', { slot: 0 }); });   /* a strip (div role=img) beside the pick's still (img alt) */
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
  var on = await C.onStage(), s0 = on[on.length - 1];
  check(!!s0 && s0.anim === 'none', 'K9 (no css): a sticker node is up, unstyled');
  var m = await C.page.evaluate(function () {
    var n = document.querySelector('.cook-sticker'), b = n.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2), dlg = document.querySelector('.ck-dlg');
    return { hit: e ? e.className : null, scroll: dlg.scrollHeight > dlg.clientHeight || dlg.scrollWidth > dlg.clientWidth, at: [b.left + b.width / 2, b.top + b.height - 6] };
  });
  check(m.hit === 'ck-cv' && !m.scroll && JSON.stringify(await C.rect('.ck-stage')) === JSON.stringify(stage0), 'K9 (no css): it still takes no touch, the stage has not moved, nothing scrolls (' + m.hit + ')');
  var pts = [m.at]; for (var k = 1; k <= 6; k++) pts.push([m.at[0], m.at[1] - 8 * k]);
  await C.dragCss(pts);
  check((await C.live()).stats.flips === 1, 'K9 (no css): a flick from under it still flips');
  check(C.errs.length === 0, 'K9 (no css): no error but the browser\'s own line for the blocked file ' + C.errs.join(' | '));
  await C.done();

  /* the pictures blocked: a sticker whose picture does not come goes away again, nothing broken stays on the stage */
  var P = await openPage(browser, { url: HTTP0, store: SEEN_ALL, q: 'recipe=jeon&seed=' + SEED, allow: /assets\/stickers\//,
    route: function (ctx) { return ctx.route(/assets\/stickers\//, function (r) { return r.fulfill({ status: 404, contentType: 'text/plain', body: '404' }); }); } });
  var gone = false;
  for (var w = 0; w < 120 && !gone; w++) { gone = (await P.onStage()).length === 0; if (!gone) await realWait(25); }   /* the 404 is the browser's own task */
  var SP = await P.stk();
  check(SP.nodes.length === 1 && gone && SP.nodes[0].rm !== null && SP.nodes[0].rm - SP.nodes[0].add < LIFE.out, 'K9 (no pictures): the pick sticker came and, with no picture, went away at once');
  await verbThrough(P, 'tap', 3);
  var lp = await P.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 4000, 'flip step');
  for (w = 0, gone = false; w < 120 && !gone; w++) { gone = (await P.onStage()).length === 0; if (!gone) await realWait(25); }
  check(lp.err === 0 && gone && (await P.stk()).nodes.length >= 2, 'K9 (no pictures): the kitchen plays on, a strip without pictures goes away too, the stage stays clear');
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
    await T.until(function (x) { return x.screen === 'counter' && x.recipe === null; }, 5000, 'counter');
    var boom = await T.page.evaluate(function () { return window.__boom || 0; });
    check(l.done && l.err === 0 && (await T.live()).err === 0, 'K10 (' + name + '): the dish is done, the kitchen counts no error');
    check(name === 'no cue' ? boom === 0 : boom >= 20, 'K10 (' + name + '): the stub was ' + (name === 'no cue' ? 'left alone' : 'really called (' + boom + ' times)'));
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
