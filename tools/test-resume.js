#!/usr/bin/env node
/* tools/test-resume.js — running 여행 복구(§3-6, §8) 결정적 테스트 (Playwright). 실패하면 exit 1.
 *   node tools/test-resume.js            # 10회 × 6시점 (즉시 / 300ms 뒤 / 첫 기웃 행 뒤 / 빈 스냅숏 / 집에 있는 날 / 빈 차례) 새로고침
 *   ITER=3 node tools/test-resume.js
 *   TODAY=2026-11-06 node tools/test-resume.js   # app 의 '오늘'을 그 날짜로 (window.__ppolTest.today) → 그날 시드로 외출/집이 바뀐다
 * 각 시점: #btn-go 누름 → localStorage 에 status 'running' 여행이 이미 있어야 함 → reload →
 *   모든 여행 done · 복구 한 줄은 복구된 여행의 종류(localStorage ppolppol_v2 에서 읽음)대로:
 *     out → '귀가 · 네가 없는 동안 다녀왔어', home → '집 · 네가 없는 동안 집에 있었어', empty(빈 차례뿐) → 복구 줄 없음
 *   · 문어 상태 유효 · pageerror 0.
 * 종류: 즉시 / 300ms / 빈 스냅숏은 그날 시드가 정한다(외출일 수도 집일 수도). 첫 기웃 행은 외출이어야 생기므로
 *   window.__ppolTest.forceKind='out' 로 외출을 강제하고, 집 / 빈 차례 시점은 'home' / 'empty' 로 강제한다 (brain.js 테스트 훅, 난수 순서는 그대로).
 * 'empty-snapshot': 관찰된 크로미움 경합(다른 크로미움 인스턴스와 동시 실행 시 새로고침 직후 문서가 이 원점의 localStorage 를
 *   통째로 비어 있는 것으로 봄, 기록은 그 문서에 영영 오지 않음)을 결정적으로 재현 — reload 되는 문서 시작 시 localStorage.clear().
 *   app.js 는 같은 탭 미러(window.name)에서 복구해 즉시 귀가해야 하고, localStorage 를 다시 채워야 한다.
 */
'use strict';
var path = require('path');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var ITER = parseInt(process.env.ITER || '10', 10);
var KEY = 'ppolppol_v2';
var TODAY = /^\d{4}-\d{2}-\d{2}$/.test(process.env.TODAY || '') ? process.env.TODAY : null;
var FORCE = { peek: 'out', home: 'home', empty: 'empty' };   /* 시점 → 강제할 종류 (없으면 그날 시드대로) */
var AWAY_OUT = '네가 없는 동안 다녀왔어', AWAY_HOME = '네가 없는 동안 집에 있었어';
var fails = 0, passes = 0, kindsSeen = [];
function ok(cond, msg) { if (cond) { passes++; } else { fails++; console.error('  FAIL ' + msg); } return !!cond; }

var WIKI_OK = { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 햇빛과 추위를 막는다.', links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };

async function newPage(browser) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR' });
  var page = await ctx.newPage();
  var bag = [];
  page.on('pageerror', function (e) { bag.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::|fonts\.g/.test(m.text())) bag.push('console.error: ' + m.text()); });
  await page.route('https://ko.wikipedia.org/**', function (route) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WIKI_OK) }); });
  return { ctx: ctx, page: page, bag: bag };
}
function stored(page) {
  return page.evaluate(function (k) {
    var s = JSON.parse(localStorage.getItem(k) || 'null');
    return s ? s.trips.map(function (t) { return t.id + ':' + t.status + ':' + ((t.events || []).length) + ':' + (t.kind || '-'); }) : null;
  }, KEY);
}

async function one(browser, when, i) {
  var s = await newPage(browser), page = s.page, force = FORCE[when] || null, label = '[' + when + ' #' + i + (TODAY ? ' ' + TODAY : '') + ']';
  var hook = {}; if (force) hook.forceKind = force; if (TODAY) hook.today = TODAY;
  if (force || TODAY) await page.addInitScript({ content: 'window.__ppolTest = ' + JSON.stringify(hook) + ';' });   /* 새로고침 뒤 문서에도 그대로 (복구 때 다시 짜는 계획도 같은 종류) */
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit], #name-form [type=submit]').catch(function () { return page.press('#name-in', 'Enter'); });
  await page.waitForFunction(function () { return !document.getElementById('name-dialog').open; });
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  if (when === '300ms' || when === 'empty-snapshot' || when === 'home' || when === 'empty') await page.waitForTimeout(300);
  else if (when === 'peek') await page.waitForFunction(function () { return Array.prototype.some.call(document.querySelectorAll('#log .lrow .ltool'), function (e) { return e.textContent === '기웃'; }); }, null, { timeout: 30000 });
  var before = await stored(page);
  ok(before && before.some(function (x) { return x.indexOf(':running:') > 0; }), label + ' reload 전 localStorage 에 running 여행 (' + JSON.stringify(before) + ')');
  if (when === 'empty-snapshot') await page.addInitScript({ content: "try { localStorage.clear(); } catch (e) {}" });   /* 다음 문서 시작 시 원점 저장소가 빈 것으로 보이게 (관찰된 경합 재현) */
  await page.reload();
  await page.waitForSelector('#btn-go:not([disabled])');
  var done = await page.waitForFunction(function () { return APP.state.trips.length > 0 && APP.state.trips.every(function (t) { return t.status === 'done'; }); }, null, { timeout: 15000 }).then(function () { return true; }, function () { return false; });
  var r = await page.evaluate(function (k) {
    var sv = null; try { sv = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
    var away = [].filter.call(document.querySelectorAll('#log .lrow'), function (row) { return row.textContent.indexOf('네가 없는 동안') >= 0; }).map(function (row) { var tl = row.querySelector('.ltool'), tx = row.querySelector('.ltext'); return (tl ? tl.textContent : '?') + ' · ' + (tx ? tx.textContent : row.textContent); });
    return { n: APP.state.trips.length, st: APP.state.trips.map(function (t) { return t.status + '/' + t.kind + '/' + (t.events || []).length; }), lantern: APP.state.room.lantern, invites: APP.state.octopus.invites, log: document.getElementById('log').textContent, oct: document.getElementById('oct').className, busy: document.getElementById('btn-go').disabled,
      kind: sv && sv.trips && sv.trips[0] ? sv.trips[0].kind : null, appKind: APP.state.trips[0] ? APP.state.trips[0].kind : null, away: away };
  }, KEY);
  ok(done, label + ' 모든 여행 done (' + JSON.stringify(r.st) + ')');
  ok(r.n === 1 && r.invites === 1 && r.lantern === 1, label + ' 여행 1 · 초대 1 · 등불 1 (' + JSON.stringify({ n: r.n, inv: r.invites, l: r.lantern }) + ')');
  /* 복구 한 줄은 복구된 여행이 실제로 한 일대로 (정직 표기: 집에 있었는데 '다녀왔어' 라고 하지 않는다) */
  ok(['out', 'home', 'empty'].indexOf(r.kind) >= 0 && r.kind === r.appKind && (!force || r.kind === force), label + ' 복구된 여행 종류 (저장 ' + r.kind + ' · 앱 ' + r.appKind + (force ? ' · 강제 ' + force : ' · 그날 시드') + ')');
  kindsSeen.push(when + '=' + r.kind);
  var wantAway = { out: ['귀가 · ' + AWAY_OUT], home: ['집 · ' + AWAY_HOME], empty: [] }[r.kind] || ['?'];
  ok(JSON.stringify(r.away) === JSON.stringify(wantAway), label + ' 복구 줄 (' + r.kind + '): ' + JSON.stringify(r.away) + ' — 기대 ' + JSON.stringify(wantAway) + ' (tail: ' + JSON.stringify(r.log.slice(-80)) + ')');
  ok(/st-(sleep|idle)/.test(r.oct) && !r.busy, label + ' 문어 상태 유효 · 버튼 활성 (' + r.oct.trim() + ')');
  /* 복구 뒤 한 번 더 초대해도 정상 */
  await page.click('#btn-go');
  await page.waitForSelector('#btn-skip:not([hidden])'); await page.click('#btn-skip', { timeout: 5000 }).catch(function () {});   /* 빈 차례는 금방 끝나 건너뛰기가 먼저 사라질 수 있다 — 아래 '저장 2건 done' 이 판정 */
  await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.disabled; }, null, { timeout: 30000 });
  var after = await stored(page);
  ok(after && after.length === 2 && after.every(function (x) { return x.indexOf(':done:') > 0; }), label + ' 복구 뒤 초대 → 저장 2건 모두 done (' + JSON.stringify(after) + ')');
  ok(s.bag.length === 0, label + ' pageerror/console.error 0' + (s.bag.length ? ': ' + s.bag.join(' | ') : ''));
  await s.ctx.close();
}

(async function main() {
  var browser = await chromium.launch();
  try {
    for (var i = 1; i <= ITER; i++) {
      for (var when of ['immediate', '300ms', 'peek', 'empty-snapshot', 'home', 'empty']) await one(browser, when, i);
      console.log('  iter ' + i + '/' + ITER + ' done (fails so far: ' + fails + ') · 복구된 종류 ' + kindsSeen.join(' '));
      kindsSeen = [];
    }
  } catch (e) { fails++; console.error('  CRASH', e); }
  await browser.close();
  console.log('\ntest-resume: ' + passes + ' ok, ' + fails + ' fail');
  process.exit(fails ? 1 : 0);
})();
