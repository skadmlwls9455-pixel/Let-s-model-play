#!/usr/bin/env node
/* tools/test-cook-dishes-live.js -- round 6 (11-18): the two new dishes in a real browser (Playwright, Chromium).
 *   NODE_PATH=$(npm root -g) node tools/test-cook-dishes-live.js
 * D1 per recipe (?recipe=): stations and slides per frame (jumeokbap counter -> stove carrying 'pan', stove -> plate 'cake';
 *    kkochi no slide between its two board steps, board -> plate 'skewer'), zero visible text on every frame, the dialog's
 *    aria-label, haptic counts per dish (jumeokbap tap 10 flip 1 cut 0, kkochi tap 9 flip 0 cut 2), 0 errors.
 * D2 again repeats the recipe and slides plate -> its first station.
 * D3 begin's pot rules: an empty pot of another dish moves to potOld byte-identical and the picked dish starts (opts.recipe);
 *    a pot with a finished step wins over a requested recipe and a reload resumes it.
 * D4 the embed posts exactly one 'result' message with exactly { ppolCook, v, id, recipe, seed, look, day }.
 * D5 kkochi's counted taps play 'place' (never 'tap'); jumeokbap's play 'tap'.
 * D6 (only once K1 is merged: COOK_ART.bell exists) the bell shows during jumeokbap's golden flip.
 */
'use strict';
var path = require('path'), fs = require('fs'), os = require('os');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var passes = 0, fails = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function js(o) { return JSON.stringify(o); }
var REC = function () {   /* every frame: screen / station / slide, and whether the dialog shows any characters */
  window.__cdRec = []; window.__cdSnd = [];
  window.AUDIO = { on: function (n, d) { if (n === 'cook' && d) window.__cdSnd.push(d.act); }, init: function () {} };
  function tick() {
    try {
      if (window.COOK && COOK.live) {
        var l = COOK.live(), d = document.getElementById('cook-dlg'), txt = '';
        if (d && d.open) { var c = d.cloneNode(true), s = c.querySelector('.ck-say'); if (s) s.remove(); txt = (c.textContent || '').replace(/\s+/g, ''); }
        var last = window.__cdRec[window.__cdRec.length - 1], row = { s: l.screen, k: l.kind, st: l.station, sl: l.slide ? l.slide.from + '>' + l.slide.to + ':' + l.slide.carry : null, txt: txt, titles: d ? d.querySelectorAll('[title]').length : 0 };
        if (!last || js2(last) !== js2(row)) window.__cdRec.push(row);
      }
    } catch (e) { window.__cdErr = (window.__cdErr || 0) + 1; }
    requestAnimationFrame(tick);
  }
  function js2(o) { return JSON.stringify(o); }
  requestAnimationFrame(tick);
};
async function page0(b, q, store) {
  var ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(REC);
  if (store !== undefined) await page.addInitScript({ content: 'if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem("ppolppol_cook_v0", ' + js(store) + '); }' });
  await page.goto('file://' + ROOT + '/cook.html' + q);
  await page.waitForFunction(function () { return window.COOK && COOK.live().screen === 'step'; }, null, { timeout: 15000 });
  return { ctx: ctx, page: page, errs: errs };
}
async function toReveal(page) {
  await page.evaluate(function () { COOK.auto(true); });
  await page.waitForFunction(function () { var l = COOK.live(); return l.screen === 'reveal' && !l.slide && l.chip; }, null, { timeout: 30000 });
  await page.waitForTimeout(700);   /* the again chip acts from 900 ms after the reveal */
}
function store(page) { return page.evaluate(function () { return localStorage.getItem('ppolppol_cook_v0'); }); }

(async function () {
  var b = await chromium.launch();
  try {
    /* D1 + D5 */
    var WANT = {
      jumeokbap: { st: ['counter', 'stove', 'plate'], sl: ['counter>stove:pan', 'stove>plate:cake'], buzz: { tap: 10, flip: 1, cut: 0 }, label: '주먹밥', act: 'tap' },
      kkochi: { st: ['board', 'plate'], sl: ['board>plate:skewer'], buzz: { tap: 9, flip: 0, cut: 2 }, label: '과일 꼬치', act: 'place' }
    };
    for (var id of Object.keys(WANT)) {
      var w = WANT[id], P = await page0(b, '?recipe=' + id + '&seed=7'), pg = P.page;
      var l0 = await pg.evaluate(function () { return { r: COOK.live().recipe, label: document.getElementById('cook-dlg').getAttribute('aria-label') }; });
      check(l0.r === id && l0.label === w.label, 'D1 ' + id + ': ?recipe= opens straight into it, dialog aria-label ' + l0.label);
      await toReveal(pg);
      var rec = await pg.evaluate(function () { return window.__cdRec; }), live = await pg.evaluate(function () { var l = COOK.live(); return { buzz: l.stats.buzz, err: l.err, said: l.said }; });
      var sts = [], sls = [];
      rec.forEach(function (r) { if (r.st && sts[sts.length - 1] !== r.st) sts.push(r.st); if (r.sl && sls.indexOf(r.sl) < 0) sls.push(r.sl); });
      check(js(sts) === js(w.st), 'D1 ' + id + ': stations ' + sts.join(' > '));
      check(js(sls) === js(w.sl), 'D1 ' + id + ': slides ' + sls.join(', '));
      check(rec.every(function (r) { return r.txt === '' && r.titles === 0; }), 'D1 ' + id + ': zero visible characters and no title on all ' + rec.length + ' frames');
      check(js(live.buzz) === js(w.buzz), 'D1 ' + id + ': haptics ' + js(live.buzz));
      check(live.err === 0 && P.errs.length === 0, 'D1 ' + id + ': no errors (' + live.err + ', ' + P.errs.join(' | ') + ')');
      var said = live.said.join(' ');
      check(said.indexOf(w.label + '.') >= 0, 'D1 ' + id + ': the plate line is read (' + said.slice(-40) + ')');
      var snd = await pg.evaluate(function () { return window.__cdSnd; });
      check(snd.filter(function (a) { return a === w.act; }).length === 9 && snd.indexOf(w.act === 'tap' ? 'place' : 'tap') < 0, 'D5 ' + id + ": the 9 counted taps play '" + w.act + "'");
      var st = JSON.parse(await store(pg));
      check(st.pot === null && st.book.length === 1 && st.book[0].recipe === id, 'D1 ' + id + ': one book line, no pot');
      /* D2 again */
      /* 11-21 round 7: no 'again': the table button closes the kitchen, the door opens the same dish (?recipe=) anew */
      await pg.waitForTimeout(300);
      await pg.evaluate(function () { document.querySelector('.ck-table').click(); });
      await pg.waitForTimeout(150);
      var shut = await pg.evaluate(function () { return COOK.live().screen; });
      await pg.evaluate(function () { window.__cdRec = []; document.getElementById('ck-door').click(); });
      await pg.waitForTimeout(150);
      var ag = await pg.evaluate(function () { var l = COOK.live(); return { r: l.recipe, s: l.screen, si: l.si, rec: window.__cdRec.map(function (x) { return x.sl; }).filter(Boolean) }; });
      check(shut === 'closed' && ag.r === id && ag.s === 'step' && ag.si === 0, 'D2 ' + id + ': the table button closes; opening again starts the same dish');
      check(ag.rec.length === 0, 'D2 ' + id + ': the new dish opens on its first station without a slide (' + ag.rec[0] + ')');
      await P.ctx.close();
    }
    /* D3 begin's pot rules */
    var P3 = await page0(b, '?seed=5&book=0');   /* 11-21 round 7: book=0 keeps the old open (no dish asked for = the book otherwise) */
    var st0 = await store(P3.page), pot0 = JSON.parse(st0).pot;
    check(pot0 && pot0.recipe === 'jeon' && pot0.si === 0, 'D3: the old open (?book=0, no ?recipe=) starts jeon and writes an empty pot (si 0)');
    await P3.page.evaluate(function () { COOK.close(); });
    await P3.page.waitForTimeout(100);
    var potText = js(JSON.parse(await store(P3.page)).pot);
    await P3.page.evaluate(function () { COOK.open({ recipe: 'kkochi', storeKey: 'ppolppol_cook_v0' }); });
    var after = JSON.parse(await store(P3.page)), lv = await P3.page.evaluate(function () { return COOK.live().recipe; });
    check(lv === 'kkochi' && after.pot.recipe === 'kkochi', "D3: opts.recipe 'kkochi' with an empty jeon pot starts kkochi");
    check(after.potOld && js(after.potOld[0]) === potText, 'D3: the empty jeon pot is in potOld byte-identical');
    /* finish kkochi's first step, then ask for jumeokbap: the pot with progress wins */
    await P3.page.evaluate(function () { COOK.auto(true); });
    await P3.page.waitForFunction(function () { return COOK.live().si === 1; }, null, { timeout: 15000 });
    await P3.page.evaluate(function () { COOK.auto(false); COOK.close(); });
    var mid = JSON.parse(await store(P3.page));
    check(mid.pot && mid.pot.recipe === 'kkochi' && mid.pot.si === 1, 'D3: kkochi pot saved after its first step (si 1)');
    await P3.page.goto('file://' + ROOT + '/cook.html?recipe=jumeokbap');
    await P3.page.waitForFunction(function () { return window.COOK && COOK.live().screen === 'step'; }, null, { timeout: 15000 });
    var res3 = await P3.page.evaluate(function () { var l = COOK.live(); return { r: l.recipe, si: l.si, kind: l.kind, st: l.station }; });
    check(res3.r === 'kkochi' && res3.si === 1 && res3.kind === 'tap' && res3.st === 'board', 'D3: a reload with ?recipe=jumeokbap resumes the kkochi pot with progress (' + js(res3) + ')');
    var end3 = JSON.parse(await store(P3.page));
    check(js(end3.potOld[0]) === potText && end3.potOld.length === 1, 'D3: nothing else was set aside');
    check(P3.errs.length === 0, 'D3: no errors (' + P3.errs.join(' | ') + ')');
    await P3.ctx.close();
    /* D4 embed result */
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-live-')), host = path.join(dir, 'host.html');
    fs.writeFileSync(host, '<!doctype html><meta charset="utf-8"><body style="margin:0"><script>window.__msgs=[];addEventListener("message",function(e){window.__msgs.push(e.data);});</script>' +
      '<iframe id="f" style="width:360px;height:740px;border:0" src="file://' + ROOT + '/cook.html?embed=1&recipe=kkochi&seed=3"></iframe>');
    var ctx4 = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 }), p4 = await ctx4.newPage(), e4 = [];
    p4.on('pageerror', function (e) { e4.push(e.message); });
    await p4.goto('file://' + host);
    await p4.waitForFunction(function () { return window.__msgs.some(function (m) { return m && m.ppolCook === 'ready'; }); }, null, { timeout: 15000 });
    var fr = p4.frames().find(function (f) { return /cook\.html/.test(f.url()); });
    await fr.evaluate(function () { COOK.auto(true); });
    await fr.waitForFunction(function () { return COOK.live().screen === 'reveal' && COOK.live().chip; }, null, { timeout: 30000 });
    await p4.waitForTimeout(400);
    var msgs = await p4.evaluate(function () { return window.__msgs.filter(function (m) { return m && m.ppolCook === 'result'; }); });
    var lv4 = await fr.evaluate(function () { var l = COOK.live(); return { id: l.id, seed: l.seed, look: l.look }; });
    check(msgs.length === 1, 'D4: exactly one result message (' + msgs.length + ')');
    var m = msgs[0] || {};
    check(js(Object.keys(m).sort()) === js(['day', 'id', 'look', 'ppolCook', 'recipe', 'seed', 'v']), 'D4: exactly the fields ppolCook v id recipe seed look day (' + Object.keys(m).join(',') + ')');
    check(m.v === 1 && m.recipe === 'kkochi' && m.id === lv4.id && m.seed === 3 && js(m.look) === js(lv4.look) && /^\d{4}-\d{2}-\d{2}$/.test(m.day), 'D4: the values match the dish (' + js(m) + ')');
    check(e4.length === 0, 'D4: no errors');
    await ctx4.close();
    fs.rmSync(dir, { recursive: true, force: true });
    /* D6 the bell (K1) during jumeokbap's flip */
    var P6 = await page0(b, '?recipe=jumeokbap&seed=2'), hasBell = await P6.page.evaluate(function () { return typeof COOK_ART.bell === 'function'; });
    if (!hasBell) { console.log('   D6 skipped: COOK_ART.bell is K1\'s (not merged on this branch)'); }
    else {
      await P6.page.evaluate(function () { COOK.auto(true); });
      await P6.page.waitForFunction(function () { return COOK.live().kind === 'flip'; }, null, { timeout: 15000 });
      await P6.page.evaluate(function () { COOK.auto(false); });
      await P6.page.waitForTimeout(300);   /* 11-18 lead: auto lets go on its next frame; a press in the same tick was dropped (band never rose) */
      await P6.page.evaluate(function () { document.querySelector('.ck-verb').click(); });   /* heat on, then wait for golden */
      await P6.page.waitForFunction(function () { return COOK.live().band === 1; }, null, { timeout: 8000 });
      await P6.page.waitForTimeout(200);
      var snd6 = await P6.page.evaluate(function () { return window.__cdSnd.filter(function (a) { return a === 'ding'; }).length; });
      check(snd6 === 1, 'D6: one ding at golden in jumeokbap (' + snd6 + ')');
    }
    await P6.ctx.close();
  } catch (e) { fails++; console.error('  FAIL (threw) ' + (e && e.stack || e)); }
  await b.close();
  console.log('test-cook-dishes-live: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
  process.exit(fails ? 1 : 0);
})();
