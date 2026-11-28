#!/usr/bin/env node
/* tools/test-cook-book-live.js -- round 7 (11-21): the recipe book, the five book dishes and the end buttons in a real
 * browser (Playwright, Chromium).   NODE_PATH=$(npm root -g) node tools/test-cook-book-live.js
 * B1 the book is the first screen: 11-24 r5 the page shows only the dish, its name and its ingredients (words in
 *    .ck-bk-words, nothing else visible), names in aria-labels, no run and no pot yet; tabs, arrow
 *    keys and a sideways drag turn the page; the first-time hand shows once.
 * B2 locked dishes (a host with no ctx: the three free ones): a touch only shakes; setCtx; standalone = all open.
 * B3 touching the dish picture starts it; a pot with a finished step skips the book on the next open, an empty pot does not;
 *    an asked-for recipe (?recipe=) skips the book; legacy dishes still open that way.
 * B4 every book dish by real gestures (mouse pointer: circle, hold, drag, rub, upward strokes, cuts, taps), zero
 *    visible characters on every frame, slides between stations, one result, 0 errors.
 * B5 every book dish by keyboard only (Enter on the chip), ending on the end buttons.
 * B6 the end buttons: sizes, gap, the 900 ms guard, 'serve' with the mode, close without serve, canCall false.
 * B7 the embed: 'result' once, 'ctx' in, 'serve' then 'close' out.
 * B9 (11-24 r5) gestures, not buttons: the chip unseen and untouchable on touch (kept for the keyboard), one sticker cue a
 *    dish (the plate), the plate's drawn places (drag the dish onto the table), the easier judgement after 15 s.
 * B8 layout at four sizes: boxes on screen, tabs outside nothing, stickers larger; reduced motion.
 */
'use strict';
var path = require('path'), fs = require('fs'), os = require('os');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var passes = 0, fails = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function js(o) { return JSON.stringify(o); }
var NEW = ['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2', 'cake'];
var NAMES = { jeon2: '해초전', gyeran: '계란말이', jumeokbap2: '주먹밥', kkochi2: '과일 꼬치', cake: '딸기 케이크' };
var REC = function () {   /* every frame: what shows, and whether the dialog has any visible character or a title */
  window.__bk = { rows: [], txt: 0, titles: 0, err: 0, res: [], serve: [], close: [], wordsOff: 0 };
  window.AUDIO = { on: function () {}, init: function () {} };
  function tick() {
    try {
      if (window.COOK && COOK.live) {
        var l = COOK.live(), d = document.getElementById('cook-dlg');
        if (d && d.open) {
          var c = d.cloneNode(true), s = c.querySelector('.ck-say'); if (s) s.remove();
          /* 11-24 r5: the book page's words (the dish's name, its ingredients) are the one place with text: counted apart */
          var bw = c.querySelector('.ck-bk-words'); if (bw) { if (bw.textContent && l.screen !== 'book') window.__bk.wordsOff++; bw.remove(); }
          if ((c.textContent || '').replace(/\s+/g, '')) window.__bk.txt++;
          window.__bk.titles += d.querySelectorAll('[title]').length;
        }
        var row = l.screen + '|' + l.station + '|' + (l.slide ? l.slide.from + '>' + l.slide.to : '');
        if (window.__bk.rows[window.__bk.rows.length - 1] !== row) window.__bk.rows.push(row);
      }
    } catch (e) { window.__bk.err++; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
};
async function open(b, q, o) {
  o = o || {};
  var ctx = await b.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: o.dpr || 2, hasTouch: true });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(REC);
  if (o.store !== undefined) await page.addInitScript({ content: 'if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem("ppolppol_cook_v0", ' + js(o.store) + '); }' });
  await page.goto('file://' + ROOT + '/cook.html' + (q || ''));
  await page.waitForFunction(function () { return window.COOK && COOK.live().screen !== 'closed'; }, null, { timeout: 15000 });
  return { ctx: ctx, page: page, errs: errs };
}
function live(page) { return page.evaluate(function () { return COOK.live(); }); }
function store(page) { return page.evaluate(function () { return JSON.parse(localStorage.getItem('ppolppol_cook_v0') || 'null'); }); }
function bk(page) { return page.evaluate(function () { return window.__bk; }); }
/* reopen the kitchen in the page with our own options (a host, callbacks) */
function reopen(page, opts) {
  return page.evaluate(function (o) {
    COOK.close();
    var x = { storeKey: 'ppolppol_cook_v0', onResult: function (r) { window.__bk.res.push(r.id); }, onServe: function (s) { window.__bk.serve.push(s); }, onClose: function (c) { window.__bk.close.push(c); } };
    for (var k in o) x[k] = o[k];
    return COOK.open(x);
  }, opts || {});
}
/* stage logical px -> client px */
async function pt(page, lx, ly) {
  var v = (await live(page)).view;
  return [(lx / 2 + v.ox) * v.css, (ly / 2 + v.oy) * v.css];
}
async function stroke(page, pts, gap) {
  var p0 = await pt(page, pts[0][0], pts[0][1]);
  await page.mouse.move(p0[0], p0[1]); await page.mouse.down();
  for (var i = 1; i < pts.length; i++) { var p = await pt(page, pts[i][0], pts[i][1]); await page.mouse.move(p[0], p[1]); if (gap) await page.waitForTimeout(gap); }
  await page.mouse.up();
}
async function tap(page, lx, ly) { var p = await pt(page, lx, ly); await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(110); }
async function waitStep(page, si) {
  await page.waitForFunction(function (n) { var l = COOK.live(); return (l.screen === 'step' && l.si === n && l.phase === 'step' && !l.slide) || l.screen === 'reveal'; }, si, { timeout: 15000 });
  await page.waitForTimeout(320);   /* the 250 ms gate */
}
/* one step by its real gesture; returns the kinds of trouble seen ('' = fine) */
async function gesture(page) {
  var l = await live(page), st = l.st, i, j, pts;
  if (l.kind === 'tap') { for (i = 0; i < st.marks.length; i++) for (j = 0; j < st.per; j++) await tap(page, st.marks[i].x, st.marks[i].y); }
  else if (l.kind === 'slice') { for (i = 0; i < st.lines.length; i++) { var ln = st.lines[i]; pts = []; for (j = 0; j <= 10; j++) pts.push([ln.ax + (ln.bx - ln.ax) * j / 10, ln.ay + (ln.by - ln.ay) * j / 10]); await stroke(page, pts); await page.waitForTimeout(80); } }
  else if (l.kind === 'flip') { await tap(page, 144, 172); pts = []; for (j = 0; j <= 6; j++) pts.push([144, 210 - j * 10]); await stroke(page, pts, 8); }
  else if (l.kind === 'stir') { pts = []; for (j = 0; j <= (st.need + 60) / 15; j++) { var a = j * 15 * Math.PI / 180; pts.push([st.cx + 40 * Math.cos(a), st.cy + 24 * Math.sin(a)]); } await stroke(page, pts); }
  else if (l.kind === 'pour') { var p = await pt(page, 144, 190); await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.waitForTimeout(1000); var mid = await live(page); await page.mouse.up(); await page.waitForTimeout(300); var mid2 = await live(page);
    check(mid.st.hold && mid.st.fill >= 1 && !mid2.st.hold && mid2.st.ms >= 900 && mid2.kind === 'pour', l.recipe + ' pour: holding fills, letting go pauses (' + mid2.st.ms + ' ms banked)');
    await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up(); }
  else if (l.kind === 'drag') { for (i = 0; i < st.items.length; i++) { var it = st.items[i], sl = st.slots[i]; pts = []; for (j = 0; j <= 8; j++) pts.push([it.hx + (sl.x - it.hx) * j / 8, it.hy + (sl.y - it.hy) * j / 8]); await stroke(page, pts); await page.waitForTimeout(60); } }
  else if (l.kind === 'rub') { var b = st.box; pts = []; for (j = 0; j < 6; j++) for (i = 0; i <= 8; i++) { var u = j % 2 ? 1 - i / 8 : i / 8; pts.push([(b[0] + b[2] * u) * 2, (b[1] + b[3] * (j + 0.5) / 6) * 2]); } await stroke(page, pts); }
  else if (l.kind === 'swipe') { for (i = 0; i < st.need; i++) { pts = []; for (j = 0; j <= 5; j++) pts.push([150, 236 - j * 10]); await stroke(page, pts, 6); await page.waitForTimeout(120); } }
  else if (l.kind === 'bake') { await tap(page, 144, 180); await page.waitForTimeout(700); await tap(page, 144, 180); }
}

(async function () {
  var b = await chromium.launch(), T, l, s, r;
  try {
    /* ---------- B1 ---------- */
    T = await open(b, '');
    await T.page.waitForTimeout(900);
    l = await live(T.page); s = await store(T.page);
    check(l.screen === 'book' && l.recipe === null && l.book && js(l.book.ids) === js(NEW) && l.book.id === 'jeon2' && l.book.open === 3, 'B1 the book is the first screen, on the first dish, opened');
    check(s === null || s.pot === null, 'B1 no pot is written while the book shows');
    r = await T.page.evaluate(function () {
      var d = document.getElementById('cook-dlg'), tabs = [].slice.call(d.querySelectorAll('.ck-bk-tab')), go = d.querySelector('.ck-bk-go'), cv = d.querySelector('.ck-cv');
      var c = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, cols = {};
      for (var i = 0; i < c.length; i += 4 * 97) cols[c[i] + ',' + c[i + 1] + ',' + c[i + 2]] = 1;
      function box(e) { var q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }
      return { label: d.getAttribute('aria-label'), tabs: tabs.map(function (t) { return [t.getAttribute('aria-label'), t.getAttribute('aria-pressed'), box(t)]; }), go: [go.getAttribute('aria-label'), box(go)],
        verbHidden: d.querySelector('.ck-verb').hidden, endHidden: d.querySelector('.ck-call').hidden && d.querySelector('.ck-table').hidden, strip: !!d.querySelector('.ck-strip'), cols: Object.keys(cols).length, closeLabel: d.querySelector('.ck-close').getAttribute('aria-label') };
    });
    check(r.label === '요리 수첩' && js(r.tabs.map(function (t) { return t[0]; })) === js(NEW.map(function (id) { return NAMES[id]; })) && r.go[0].indexOf('해초전') === 0 && r.closeLabel === '닫기', 'B1 names live in aria-labels (요리 수첩, the five dishes, 닫기)');
    check(r.tabs[0][1] === 'true' && r.tabs[1][1] === 'false', 'B1 the shown dish\'s tab is pressed');
    check(r.verbHidden && r.endHidden && !r.strip, 'B1 no chip, no end buttons, no step strip');
    check(r.cols > 12, 'B1 the page is painted (' + r.cols + ' colours sampled)');
    var WORDS7 = { jeon2: ['해초전', '밀가루', '물', '해초', '기름'], gyeran: ['계란말이', '달걀 3개', '소금', '기름'], cake: ['딸기 케이크'] };
    var ww = await T.page.evaluate(function () { return [].map.call(document.querySelectorAll('.ck-bk-w'), function (e) { var q = e.getBoundingClientRect(); return [e.textContent, q.left, q.top, q.width, q.height, e.closest('[aria-hidden]') ? 1 : 0]; }); });
    check(js(ww.map(function (x) { return x[0]; })) === js(WORDS7.jeon2), 'B1 r5: the first page shows the dish name and its ingredients only (' + ww.map(function (x) { return x[0]; }).join(' · ') + ')');
    check(ww.every(function (x) { return x[5] === 1 && x[1] >= 0 && x[1] + x[3] <= 360 && x[4] > 0; }), 'B1 r5: the words are aria-hidden (the dish button says them) and on screen');
    var lab = await T.page.evaluate(function () { return document.querySelector('.ck-bk-go').getAttribute('aria-label'); });
    check(lab === '해초전. 밀가루, 물, 해초, 기름', 'B1 r5: the dish button reads the name and the ingredients (' + lab + ')');
    var tabTop = await T.page.evaluate(function () { return document.querySelector('.ck-bk-tab').getBoundingClientRect().top; });
    check(ww.every(function (x) { return x[2] + x[4] <= tabTop + 0.5; }), 'B1 r5: every word ends above the bookmark tabs');
    check(r.tabs.every(function (t) { return t[2][2] >= 44 && t[2][3] >= 44 && t[2][0] >= 0 && t[2][0] + t[2][2] <= 360; }) && r.go[1][2] >= 200 && r.go[1][3] >= 150, 'B1 touch boxes: tabs at least 44 px, the dish picture large');
    check(l.hint === 'book', 'B1 the first-time hand is on the dish picture');
    await T.page.mouse.click(r.tabs[2][2][0] + 30, r.tabs[2][2][1] + 30);
    l = await live(T.page); check(l.book.id === 'jumeokbap2', 'B1 a tab turns to its dish');
    await T.page.keyboard.press('ArrowRight'); l = await live(T.page); check(l.book.id === 'kkochi2', 'B1 the right arrow turns the page');
    await T.page.keyboard.press('ArrowLeft'); await T.page.keyboard.press('ArrowLeft'); l = await live(T.page); check(l.book.id === 'gyeran', 'B1 the left arrow turns back');
    await T.page.mouse.move(250, 300); await T.page.mouse.down(); await T.page.mouse.move(200, 304); await T.page.mouse.move(120, 306); await T.page.mouse.up();
    l = await live(T.page); check(l.book.id === 'jumeokbap2' && l.screen === 'book', 'B1 a drag to the left turns to the next dish and starts nothing');
    await T.page.mouse.move(120, 300); await T.page.mouse.down(); await T.page.mouse.move(250, 300); await T.page.mouse.up();
    await T.page.mouse.move(120, 300); await T.page.mouse.down(); await T.page.mouse.move(250, 300); await T.page.mouse.up();
    await T.page.mouse.move(120, 300); await T.page.mouse.down(); await T.page.mouse.move(250, 300); await T.page.mouse.up();
    l = await live(T.page); check(l.book.id === 'jeon2', 'B1 drags to the right stop at the first dish');
    s = await bk(T.page); check(s.txt === 0 && s.titles === 0 && s.err === 0 && s.wordsOff === 0, 'B1 nothing visible but the page\'s words, and no title, on every frame of the book');
    await T.page.keyboard.press('Escape'); await T.page.waitForTimeout(100);
    l = await live(T.page); check(l.screen === 'closed', 'B1 Escape closes the book');
    check(T.errs.length === 0, 'B1 no console errors ' + js(T.errs));
    await T.ctx.close();

    /* ---------- B2 ---------- */
    T = await open(b, '');
    await reopen(T.page, { host: true });
    l = await live(T.page);
    check(l.screen === 'book' && js(l.book.locked) === js(['kkochi2', 'cake']) && l.canCall === false, 'B2 a host with no ctx: the two gift dishes are locked, no call');
    r = await T.page.evaluate(function () { var t = document.querySelectorAll('.ck-bk-tab'); t[4].click(); var g = document.querySelector('.ck-bk-go'); g.click(); return [t[4].getAttribute('aria-disabled'), g.getAttribute('aria-disabled'), g.getAttribute('aria-label')]; });
    l = await live(T.page); s = await store(T.page);
    check(l.screen === 'book' && l.book.id === 'cake' && js(r) === js(['true', 'true', '딸기 케이크']) && (!s || !s.pot), 'B2 a locked dish can be looked at; touching it starts nothing');
    check(await T.page.evaluate(function () { return COOK.pick('cake'); }) === false, 'B2 COOK.pick refuses a locked dish');
    await reopen(T.page, { host: true, ctx: { canCall: true, unlocked: ['jeon2', 'gyeran', 'jumeokbap2', 'cake'] } });
    l = await live(T.page); check(js(l.book.locked) === js(['kkochi2']) && l.canCall === true, 'B2 ctx.unlocked opens the gifted dish; ctx.canCall is read');
    await reopen(T.page, {});
    l = await live(T.page); check(l.book.locked.length === 0 && l.canCall === true, 'B2 standalone: everything open, both end buttons');
    await T.ctx.close();

    /* ---------- B3 ---------- */
    T = await open(b, '');
    await T.page.waitForTimeout(500);
    r = await T.page.evaluate(function () { var q = document.querySelector('.ck-bk-go').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
    await T.page.mouse.click(r[0], r[1]);
    l = await live(T.page); s = await store(T.page);
    check(l.screen === 'step' && l.recipe === 'jeon2' && l.si === 0 && l.kind === 'slice' && s.pot && s.pot.recipe === 'jeon2' && s.pot.si === 0, 'B3 touching the dish picture starts it (a pot exists from now on)');
    check(s.seen.indexOf('book') >= 0, 'B3 the book\'s hand counts as seen once a dish was started');
    r = await T.page.evaluate(function () { var d = document.getElementById('cook-dlg'); return [d.getAttribute('aria-label'), d.querySelector('.ck-bk').hidden, d.querySelector('.ck-verb').getAttribute('aria-label')]; });
    check(js(r) === js(['해초전', true, '썰기']), 'B3 the dialog is named after the dish, the chip after the step');
    await T.page.reload(); await T.page.waitForFunction(function () { return window.COOK && COOK.live().screen !== 'closed'; });
    l = await live(T.page); check(l.screen === 'book' && l.hint !== 'book', 'B3 an empty pot (no finished step) does not skip the book; the hand does not come again');
    await T.page.evaluate(function () { COOK.pick('jeon2'); });
    await waitStep(T.page, 0); await gesture(T.page); await waitStep(T.page, 1);
    s = await store(T.page); check(s.pot && s.pot.si === 1 && s.pot.looks.length === 1 && s.potOld === undefined, 'B3 the pot holds the finished step (and the same pot went on, nothing moved to potOld)');
    await T.page.reload(); await T.page.waitForFunction(function () { return window.COOK && COOK.live().screen !== 'closed'; });
    l = await live(T.page); check(l.screen === 'step' && l.recipe === 'jeon2' && l.si === 1 && l.kind === 'stir', 'B3 a pot with a finished step resumes straight into cooking (the book is skipped) ' + js([l.screen, l.recipe, l.si, l.kind]));
    await T.ctx.close();
    T = await open(b, '?recipe=gyeran'); l = await live(T.page);
    check(l.screen === 'step' && l.recipe === 'gyeran' && l.kind === 'tap', 'B3 an asked-for recipe starts at once'); await T.ctx.close();
    T = await open(b, '?recipe=jeon'); l = await live(T.page);
    check(l.screen === 'step' && l.recipe === 'jeon' && l.kind === 'tap', 'B3 a legacy dish still opens by id');
    await T.page.evaluate(function () { COOK.auto(true); });
    await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 30000 });
    l = await live(T.page); check(l.end.call && l.end.table && l.verb === '', 'B3 a legacy dish ends on the two end buttons too (no again chip)');
    await T.ctx.close();
    var oldLine = { id: 'ck_old1', recipe: 'kkochi', seed: 4, swaps: {}, look: { v: 1, cuts: [0, 0], offs: [0, 0], dents: [], plate: 0 }, day: '2026-11-18', madeAt: 1 };
    T = await open(b, '', { store: js({ v: 1, day: '2026-11-18', dayN: 1, seen: ['tap', 'slice'], pot: null, book: [oldLine] }) });
    l = await live(T.page); s = await store(T.page);
    check(l.screen === 'book' && l.book.id === 'kkochi2' && js(l.book.made) === js(['kkochi2']), 'B3 the book opens on the dish cooked last (an old fruit skewer line -> its page, stamped)');
    check(js(s.book) === js([oldLine]) && js(s.seen) === js(['tap', 'slice']), 'B3 the old notebook line and seen list are untouched');
    check(await T.page.evaluate(function (ln) { var d = COOK.drawDish(ln.recipe, ln.look, ln.seed), n = 0; for (var i = 3; i < d.d.length; i += 4) if (d.d[i]) n++; return n > 200; }, oldLine), 'B3 an old notebook line still draws');
    await T.ctx.close();

    /* ---------- B4 ---------- */
    for (var di = 0; di < NEW.length; di++) {
      var id = NEW[di];
      T = await open(b, '?seed=11');
      await reopen(T.page, { seed: 11 });
      check(await T.page.evaluate(function (x) { return COOK.pick(x); }, id), 'B4 ' + id + ': picked from the book');
      var n = await T.page.evaluate(function (x) { return COOK.recipe(x).steps.length; }, id), kinds = [];
      for (var si = 0; si < n; si++) {
        await waitStep(T.page, si);
        l = await live(T.page); kinds.push(l.kind);
        if (l.screen !== 'step' || l.si !== si) { check(false, 'B4 ' + id + ': step ' + si + ' did not start (' + l.screen + ' ' + l.si + ')'); break; }
        await gesture(T.page);
        await T.page.waitForFunction(function (k) { var q = COOK.live(); return q.si > k || q.phase !== 'step'; }, si, { timeout: 6000 }).catch(function () {});
        l = await live(T.page);
        check(l.si > si || l.phase !== 'step', 'B4 ' + id + ': step ' + si + ' (' + kinds[si] + ') finished by its gesture (progress ' + l.progress + ')');
      }
      await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip && !q.slide; }, null, { timeout: 8000 }).catch(function () {});
      l = await live(T.page); s = await bk(T.page); var st2 = await store(T.page);
      check(l.screen === 'reveal' && l.done && l.end.table && l.end.call, 'B4 ' + id + ': the plate with both end buttons');
      check(s.txt === 0 && s.titles === 0 && s.err === 0 && s.wordsOff === 0, 'B4 ' + id + ': zero visible characters on every cooking frame (the book\'s words are gone once a dish starts)');
      check(s.res.length === 1 && st2.pot === null && st2.book[0].recipe === id && st2.book[0].look.v === 2, 'B4 ' + id + ': one result, the pot cleared, a notebook line with a v 2 look');
      check(s.rows.filter(function (x) { return />/.test(x); }).length >= 1 && l.stats.slides >= 2, 'B4 ' + id + ': stations slide (' + l.stats.slides + ' slides)');
      check(l.err === 0 && T.errs.length === 0, 'B4 ' + id + ': no errors ' + js(T.errs));
      check(l.look.s.length === n && (id !== 'jeon2' && id !== 'cake' || typeof l.look.band === 'number'), 'B4 ' + id + ': the look has one entry per step' + (id === 'jeon2' || id === 'cake' ? ' and the band' : ''));
      await T.ctx.close();
    }

    /* ---------- B5 ---------- */
    for (di = 0; di < NEW.length; di++) {
      T = await open(b, '');
      await T.page.keyboard.press('Tab');
      for (var k = 0; k < di; k++) await T.page.keyboard.press('ArrowRight');
      r = await T.page.evaluate(function () { var g = document.querySelector('.ck-bk-go'); g.focus(); return g.getAttribute('aria-label'); });
      await T.page.keyboard.press('Enter');
      l = await live(T.page);
      check(typeof r === 'string' && r.indexOf(NAMES[NEW[di]] + '. ') === 0 && l.screen === 'step' && l.recipe === NEW[di], 'B5 ' + NEW[di] + ': arrows and Enter on the dish picture start it');
      check(await T.page.evaluate(function () { return document.activeElement === document.querySelector('.ck-verb') && document.getElementById('cook-dlg').classList.contains('ck-kbd'); }), 'B5 ' + NEW[di] + ': by key the chip has the focus and rings show');
      var labels = {};
      for (k = 0; k < 60; k++) {
        l = await live(T.page); if (l.screen === 'reveal') break;
        if (l.verb) labels[l.verb] = 1;
        await T.page.keyboard.press('Enter'); await T.page.waitForTimeout(330);
      }
      await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 8000 }).catch(function () {});
      l = await live(T.page);
      check(l.screen === 'reveal' && l.done, 'B5 ' + NEW[di] + ': Enter alone reaches the plate (' + Object.keys(labels).join(' · ') + ')');
      r = await T.page.evaluate(function () { var a = document.activeElement; return a ? a.getAttribute('aria-label') : null; });
      check(r === '문어 부르기', 'B5 ' + NEW[di] + ': the first end button has the focus');
      if (di === 0) {
        await T.page.waitForTimeout(600); await T.page.keyboard.press('Tab');
        r = await T.page.evaluate(function () { var a = document.activeElement; return a ? a.getAttribute('aria-label') : null; });
        check(r === '식탁에 두기', 'B5 Tab moves to the second end button');
        await T.page.keyboard.press('Enter'); await T.page.waitForTimeout(100);
        l = await live(T.page); check(l.screen === 'closed', 'B5 Enter on an end button closes the kitchen');
      }
      check(T.errs.length === 0, 'B5 ' + NEW[di] + ': no errors ' + js(T.errs));
      await T.ctx.close();
    }

    /* ---------- B6 ---------- */
    T = await open(b, '');
    await reopen(T.page, { recipe: 'kkochi2', host: true, ctx: { canCall: true, unlocked: NEW } });
    await T.page.evaluate(function () { COOK.auto(true); });
    await T.page.waitForFunction(function () { return COOK.live().screen === 'reveal'; }, null, { timeout: 30000 });
    l = await live(T.page); check(!l.end.call && !l.end.table, 'B6 no end button at the moment of the reveal');
    await T.page.waitForFunction(function () { return COOK.live().chip; }, null, { timeout: 3000 });
    r = await T.page.evaluate(function () {
      function box(e) { var q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }
      var c = document.querySelector('.ck-call'), t = document.querySelector('.ck-table'), dpr = devicePixelRatio;
      c.click(); t.click();   /* inside the 900 ms guard: nothing */
      return { c: box(c), t: box(t), cl: c.getAttribute('aria-label'), tl: t.getAttribute('aria-label'), early: window.__bk.serve.length, open: COOK.isOpen(),
        px: [c, t].map(function (e) { var v = e.querySelector('canvas'), q = v.getBoundingClientRect(); return [v.width / 20, q.width * dpr / v.width, q.left * dpr, q.top * dpr]; }) };
    });
    check(r.cl === '문어 부르기' && r.tl === '식탁에 두기', 'B6 end buttons\' names');
    check(r.c[2] === 80 && r.c[3] === 80 && r.t[2] === 60 && r.t[3] === 60 && r.t[0] - (r.c[0] + r.c[2]) >= 8 && Math.abs((r.c[0] + r.t[0] + r.t[2]) / 2 - 180) <= 1 && r.c[1] + r.c[3] === r.t[1] + r.t[3], 'B6 call 80 px, table 60 px, 12 px apart, centred, on one base line');
    check(r.px.every(function (p) { return p[0] === Math.floor(p[0]) && Math.abs(p[1] - 1) < 1e-6 && Math.abs(p[2] - Math.round(p[2])) < 1e-6 && Math.abs(p[3] - Math.round(p[3])) < 1e-6; }), 'B6 end pictures: whole device px per art px, on the device grid');
    check(r.early === 0 && r.open, 'B6 presses inside 900 ms do nothing');
    await T.page.evaluate(function () { COOK.setCtx({ canCall: false }); });
    r = await T.page.evaluate(function () { var c = document.querySelector('.ck-call'), t = document.querySelector('.ck-table'), q = t.getBoundingClientRect(); return [c.hidden, q.width, Math.round(q.left + q.width / 2)]; });
    check(js(r) === js([true, 80, 180]), 'B6 canCall false (a later ctx): only the table button, large and centred');
    await T.page.evaluate(function () { COOK.setCtx({ canCall: true }); });
    await T.page.waitForTimeout(700);
    await T.page.evaluate(function () { document.querySelector('.ck-call').click(); });
    await T.page.waitForTimeout(100);
    s = await bk(T.page); l = await live(T.page);
    check(js(s.serve.map(function (x) { return x.mode; })) === js(['call']) && s.serve[0].id === s.res[0] && l.screen === 'closed' && s.close.length >= 1, 'B6 call: serve { id, mode: call } once, with the dish id of the result, then the kitchen closes');
    await reopen(T.page, { recipe: 'gyeran', host: true, ctx: { canCall: false, unlocked: NEW } });
    await T.page.evaluate(function () { COOK.auto(true); });
    await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 30000 });
    l = await live(T.page); check(!l.end.call && l.end.table, 'B6 canCall false at open: the table button alone');
    await T.page.waitForTimeout(700);
    await T.page.evaluate(function () { window.__bk.serve = []; document.querySelector('.ck-table').click(); });
    s = await bk(T.page); check(js(s.serve.map(function (x) { return x.mode; })) === js(['table']), 'B6 table: serve { mode: table }');
    await reopen(T.page, { recipe: 'gyeran', host: true, ctx: { canCall: true, unlocked: NEW } });
    await T.page.evaluate(function () { window.__bk.serve = []; COOK.auto(true); });
    await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 30000 });
    await T.page.waitForTimeout(700);
    await T.page.evaluate(function () { document.querySelector('.ck-close').click(); });
    await T.page.waitForTimeout(100);
    s = await bk(T.page); l = await live(T.page);
    check(s.serve.length === 0 && l.screen === 'closed', 'B6 the close chip closes without a serve');
    await reopen(T.page, {});
    l = await live(T.page); check(l.screen === 'book' && l.book.id === 'gyeran', 'B6 after a dish the next open shows the book again, on that dish');
    await T.ctx.close();

    /* ---------- B7 the embed ---------- */
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ckbook-')), host = path.join(dir, 'host.html');
    fs.writeFileSync(host, '<!doctype html><meta charset="utf-8"><body style="margin:0"><script>window.M=[];addEventListener("message",function(e){if(e.data&&e.data.ppolCook)M.push(e.data);});</script>' +
      '<iframe id="f" style="border:0;width:360px;height:740px" src="file://' + ROOT + '/cook.html?embed=1&ctx=' + encodeURIComponent(js({ canCall: false, unlocked: ['jeon2', 'gyeran', 'jumeokbap2'] })) + '"></iframe></body>');
    var ctx7 = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 }), p7 = await ctx7.newPage();
    await p7.goto('file://' + host);
    await p7.waitForFunction(function () { return window.M.some(function (m) { return m.ppolCook === 'ready'; }); }, null, { timeout: 15000 });
    var fr = p7.frames()[1];
    l = await fr.evaluate(function () { return COOK.live(); });
    check(l.screen === 'book' && js(l.book.locked) === js(['kkochi2', 'cake']) && l.canCall === false, 'B7 the frame opens on the book with the ctx of its URL');
    await fr.evaluate(function () { COOK.pick('gyeran'); COOK.auto(true); });
    await fr.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 30000 });
    l = await fr.evaluate(function () { return COOK.live(); }); check(!l.end.call && l.end.table, 'B7 canCall false: the table button alone');
    await p7.evaluate(function () { document.getElementById('f').contentWindow.postMessage({ ppolCook: 'ctx', canCall: true }, '*'); });
    await fr.waitForFunction(function () { return COOK.live().end.call; }, null, { timeout: 3000 }).catch(function () {});
    l = await fr.evaluate(function () { return COOK.live(); }); check(l.end.call && l.end.table, "B7 a 'ctx' message after the result shows the call button");
    await p7.waitForTimeout(700);
    await fr.evaluate(function () { document.querySelector('.ck-call').click(); });
    await p7.waitForFunction(function () { return window.M.some(function (m) { return m.ppolCook === 'close'; }); }, null, { timeout: 3000 }).catch(function () {});
    var M = await p7.evaluate(function () { return window.M; }), names = M.map(function (m) { return m.ppolCook; });
    check(js(names) === js(['ready', 'result', 'serve', 'close']), 'B7 messages in order: ready, result, serve, close (' + names.join(' ') + ')');
    var res = M[1], sv = M[2];
    check(res && js(Object.keys(res).sort()) === js(['day', 'id', 'look', 'ppolCook', 'recipe', 'seed', 'v']) && res.recipe === 'gyeran' && res.look.v === 2 && js(res.look).length < 2048, "B7 'result' keeps its seven fields; the look is v 2 and small");
    check(sv && js(Object.keys(sv).sort()) === js(['id', 'mode', 'ppolCook']) && sv.id === res.id && sv.mode === 'call', "B7 'serve' = { id, mode }");
    await p7.evaluate(function () { document.getElementById('f').contentWindow.postMessage({ ppolCook: 'open', kbd: false, ctx: { canCall: true, unlocked: ['jeon2', 'gyeran', 'jumeokbap2', 'cake'] } }, '*'); });
    await fr.waitForFunction(function () { return COOK.live().screen === 'book'; }, null, { timeout: 3000 }).catch(function () {});
    l = await fr.evaluate(function () { return COOK.live(); }); check(l.screen === 'book' && js(l.book.locked) === js(['kkochi2']), "B7 'open' with a new ctx: the book again, the gifted dish open");
    await ctx7.close();

    /* ---------- B8 ---------- */
    var SIZES = [[360, 740, 2], [320, 568, 2], [412, 915, 2.625], [1280, 800, 1]];
    for (var zi = 0; zi < SIZES.length; zi++) {
      var Z = SIZES[zi], tag = Z[0] + 'x' + Z[1] + '@' + Z[2];
      T = await open(b, '', { w: Z[0], h: Z[1], dpr: Z[2] });
      await T.page.waitForTimeout(500);
      r = await T.page.evaluate(function () {
        function box(e) { var q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }
        var cv = document.querySelector('.ck-cv').getBoundingClientRect();
        return { tabs: [].map.call(document.querySelectorAll('.ck-bk-tab'), box), go: box(document.querySelector('.ck-bk-go')), close: box(document.querySelector('.ck-close')), cv: [cv.width, cv.height], dpr: devicePixelRatio, lay: COOK.live().book.lay, view: COOK.live().view };
      });
      var all = r.tabs.concat([r.go]);
      check(all.every(function (q) { return q[0] >= 0 && q[1] >= 0 && q[0] + q[2] <= Z[0] + 0.5 && q[1] + q[3] <= Z[1] + 0.5; }), 'B8 ' + tag + ': the dish picture and every tab are on screen');
      check(r.tabs.every(function (q) { return q[2] >= 44 && q[3] >= 44; }) && r.tabs[0][0] + r.tabs[0][2] > 48 && r.tabs[4][0] < Z[0] - 48, 'B8 ' + tag + ': tabs at least 44 px; the outer ones reach well inside the 24 px edge band');
      check(r.go[1] >= r.close[1] + r.close[3] - 8 || r.go[0] + r.go[2] <= r.close[0], 'B8 ' + tag + ': the page starts under the close chip');
      check(Math.abs(r.cv[0] - Math.round(r.cv[0])) < 1e-6 && Math.abs(r.cv[1] - Math.round(r.cv[1])) < 1e-6 && Math.abs(r.view.css * r.dpr - Math.round(r.view.css * r.dpr)) < 1e-6, 'B8 ' + tag + ': one art px is a whole number of device px, the canvas a whole number of CSS px');
      await T.page.evaluate(function () { COOK.pick('jeon2'); });
      await T.page.waitForTimeout(400);
      /* 11-24 r5: the kitchen cues a sticker only on the plate; the size and place rule is measured on one put up directly */
      await T.page.evaluate(function () { if (window.COOK_STICKERS && COOK_STICKERS.show) COOK_STICKERS.show('thumbs', { slot: 1 }); });
      await T.page.waitForTimeout(400);
      r = await T.page.evaluate(function () { var s = document.querySelector('.ck-stick'), k = s.querySelector('.cook-sticker'), q = k ? k.getBoundingClientRect() : null, c = document.querySelector('.ck-close .ck-chip').getBoundingClientRect(), v = COOK.live().view;
        return { hidden: s.hidden, w: q ? q.width : 0, x: q ? q.left : 0, bottom: q ? q.bottom : 0, closeL: c.left, row: (36 + v.oy) * v.css, dpr: devicePixelRatio }; });
      check(!r.hidden && r.w >= (Z[0] <= 412 && Z[1] >= 700 ? 120 : 64) && r.w <= 130 && r.x + r.w <= r.closeL && r.bottom + 8 <= r.row + 0.5, 'B8 ' + tag + ': a sticker shows, ' + r.w.toFixed(1) + ' CSS px (tall phones: 96 or 85 before; short ones: hidden before), clear of the close chip, ending 8 px above stage row 36');
      /* Playwright's DPR emulation lays out in 1/64 CSS px, so at 2.625 the measured box is off by about 0.001 device px a
         sticker px; the real render path (--force-device-scale-factor) gives exact blocks (js/cook.js fit) */
      check(Math.abs(r.w * r.dpr / 32 - Math.round(r.w * r.dpr / 32)) < (Z[2] === 2.625 ? 0.01 : 1e-6), 'B8 ' + tag + ': a whole number of device px per sticker px (' + (r.w * r.dpr / 32) + ')');
      check(T.errs.length === 0, 'B8 ' + tag + ': no errors ' + js(T.errs));
      await T.ctx.close();
    }
    T = await open(b, '?reduced=1');
    l = await live(T.page); check(l.screen === 'book' && l.book.open === 3 && l.reduced, 'B8 reduced motion: the book is simply open');
    await T.page.evaluate(function () { COOK.pick('gyeran'); COOK.auto(true); });
    await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 30000 });
    l = await live(T.page); s = await bk(T.page);
    check(l.stats.slides === 0 && l.stats.shake === 0 && l.stats.parts === 0 && s.rows.every(function (x) { return !/>/.test(x); }), 'B8 reduced motion: no slide, no shake, no particles through a whole dish');
    await T.ctx.close();

    /* ---------- B9 (11-24 r5, owner: "버튼이 막 있어서 게임 같지 않다"): gestures, not buttons ---------- */
    T = await open(b, '');
    await T.page.evaluate(function () {   /* count what reaches the stickers */
      window.__cues = []; var S = window.COOK_STICKERS, c0 = S.cue; S.cue = function (act, d) { window.__cues.push(act); return c0.apply(S, arguments); };
    });
    await T.page.evaluate(function () { COOK.pick('gyeran'); });
    await T.page.waitForTimeout(600);
    r = await T.page.evaluate(function () {
      var v = document.querySelector('.ck-verb'), q = v.getBoundingClientRect(), cs = getComputedStyle(v), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return { op: cs.opacity, pe: cs.pointerEvents, hit: e ? (e.closest('.ck-verb') ? 'verb' : e.closest('.ck-stage') ? 'stage' : 'other') : null, label: v.getAttribute('aria-label'), focusable: v.tabIndex >= 0 && !v.hidden };
    });
    check(r.op === '0' && r.pe === 'none' && r.hit === 'stage' && r.label === '달걀 깨기' && r.focusable, 'B9 on touch the verb chip is unseen and untouchable (a touch there reaches the food); it keeps its name and stays in the tab order (' + js(r) + ')');
    await T.page.waitForTimeout(6200);
    l = await live(T.page); r = await T.page.evaluate(function () { return getComputedStyle(document.querySelector('.ck-verb')).opacity; });
    check(l.stats.idle >= 1 && r === '0', 'B9 5 s idle brings the ghost hand, never the chip (idle hands ' + l.stats.idle + ', opacity ' + r + ')');
    await T.page.keyboard.press('Tab'); await T.page.keyboard.press('Tab');
    r = await T.page.evaluate(function () { var v = document.querySelector('.ck-verb'); return [document.activeElement === v, getComputedStyle(v).opacity]; });
    check(r[0] && r[1] === '1', 'B9 by keyboard the chip is reached and seen');
    for (var kk = 0; kk < 40; kk++) { l = await live(T.page); if (l.screen === 'reveal') break; await T.page.keyboard.press('Enter'); await T.page.waitForTimeout(330); }
    await T.page.waitForFunction(function () { var q = COOK.live(); return q.screen === 'reveal' && q.chip; }, null, { timeout: 8000 }).catch(function () {});
    await T.page.waitForTimeout(400);
    r = await T.page.evaluate(function () { return window.__cues; });
    check(js(r) === js(['done']), 'B9 a whole dish cues the reaction stickers once, at the plate (' + r.join(',') + ')');
    r = await T.page.evaluate(function () { var c = document.querySelector('.ck-call'); return [getComputedStyle(c).opacity, document.activeElement === c]; });
    check(r[0] === '1' && r[1], 'B9 by keyboard the plate gives the framed end buttons, the first one focused');
    await T.page.mouse.move(5, 300); await T.page.mouse.click(5, 300);   /* a pointer press: keyboard mode off */
    l = await live(T.page);
    r = await T.page.evaluate(function () { var c = document.querySelector('.ck-call'), t = document.querySelector('.ck-table'); return [getComputedStyle(c).opacity, getComputedStyle(c).pointerEvents, getComputedStyle(t).opacity]; });
    check(js(r) === js(['0', 'none', '0']) && l.spots.length === 2 && l.spots[0].m === 'call' && l.spots[1].m === 'table', 'B9 by touch the framed buttons are gone and the octopus and the table are drawn under the dish (' + js(r) + ')');
    check(l.spots.every(function (o) { return o.x >= 24 && o.x <= 336 && o.y < 740 - 16; }) && l.dish.y < l.spots[0].y, 'B9 the two places are on screen, below the dish, inside the edge band');
    await T.page.evaluate(function () { window.__sv = []; });
    await T.page.mouse.move(l.dish.x, l.dish.y); await T.page.mouse.down();
    await T.page.mouse.move(l.dish.x + 10, l.dish.y + 60, { steps: 4 }); await T.page.mouse.up(); await T.page.waitForTimeout(150);
    l = await live(T.page);
    check(l.screen === 'reveal' && !l.holding, 'B9 the dish let go between the places goes back; nothing is served');
    await T.page.mouse.move(l.dish.x, l.dish.y); await T.page.mouse.down();
    var tg = l.spots[1];
    await T.page.mouse.move((l.dish.x + tg.x) / 2, (l.dish.y + tg.y) / 2, { steps: 4 });
    var mid = await live(T.page);
    await T.page.mouse.move(tg.x, tg.y, { steps: 4 }); await T.page.mouse.up(); await T.page.waitForTimeout(150);
    l = await live(T.page); s = await store(T.page);
    check(mid.holding && l.screen === 'closed', 'B9 the dish dragged onto the table: held on the way, then served and the kitchen closes');
    check(s.seen.indexOf('serve') >= 0, 'B9 the first-time hand on the plate counts as seen once a dish was served');
    check(T.errs.length === 0, 'B9 no errors ' + js(T.errs));
    await T.ctx.close();
    T = await open(b, '?recipe=cake');
    for (kk = 0; kk < 6; kk++) { l = await live(T.page); if (l.si === 1 && l.phase === 'step') break; await T.page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await T.page.waitForTimeout(450); }
    await T.page.waitForFunction(function () { var q = COOK.live(); return q.si === 1 && q.phase === 'step'; }, null, { timeout: 5000 }).catch(function () {});
    var need0 = (await live(T.page)).st.need;
    await T.page.waitForTimeout(16000);
    l = await live(T.page);
    check(l.kind === 'stir' && l.st.ease === true && l.st.need < need0 && l.stats.ease === 1 && l.hint === 'idle' && l.progress === 0, 'B9 15 s without progress: the stir asks for fewer turns (' + need0 + ' -> ' + l.st.need + '), the hand shows again, nothing is skipped');
    check(T.errs.length === 0 && l.err === 0, 'B9 no errors (ease) ' + js(T.errs));
    await T.ctx.close();
  } catch (e) { fails++; console.error('  FAIL (threw) ' + (e && e.stack || e)); }
  await b.close();
  console.log('\ntest-cook-book-live: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAILED' : ''));
  process.exit(fails ? 1 : 0);
})();
