#!/usr/bin/env node
/* tools/shots.js — 스크린샷 10장 (360×740, deviceScaleFactor 2). 리뷰용.
 *   node tools/shots.js                 # → $SHOTS 또는 scratchpad/build/shots/
 *   SHOTS=/path node tools/shots.js
 * 위키 fetch 는 가짜 성공 응답(썸네일 포함)으로 라우팅. 에셋 <img> 가 실제로 로드됐는지도 찍어서 출력한다.
 */
'use strict';
var fs = require('fs'), path = require('path');
var { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '..');
var INDEX = process.env.INDEX || ('file://' + path.join(ROOT, 'index.html'));
var SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/build/shots/';
fs.mkdirSync(SHOTS, { recursive: true });

var WIKI_OK = { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 햇빛과 추위를 막고 신분을 나타내기도 했다.',
  thumbnail: { source: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#5a7"/><circle cx="20" cy="15" r="9" fill="#dc9"/></svg>'), width: 40, height: 30 },
  links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };

async function shot(page, name) { await page.screenshot({ path: path.join(SHOTS, name) }); console.log('  📷 ' + name); }
async function waitIdle(page) { await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.disabled; }, null, { timeout: 40000 }); }
async function inviteSkip(page, hint) {
  await page.fill('#hint-in', hint || '');
  await page.click('#btn-go');
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.waitForTimeout(300);
  await page.click('#btn-skip');
  await waitIdle(page);
}

(async function () {
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage();
  var errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.route('https://ko.wikipedia.org/**', function (route) {
    var t = decodeURIComponent((route.request().url().match(/titles=([^&]+)/) || [])[1] || '모자');
    var body = JSON.parse(JSON.stringify(WIKI_OK)); body.query.pages['1'].title = t; body.query.pages['1'].extract = t + '는 ' + body.query.pages['1'].extract.slice(3);
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  await page.waitForTimeout(600);
  await shot(page, '01-first-run.png');

  /* 외출하는 이름을 고른다 (집에 있는 날도 정당하지만 포스터를 찍으려고) */
  var name = await page.evaluate(async function () {
    var names = ['뚜루', '안개', '삐죠', '구름', '조약돌', '먹물', '단추', '파도', '이끼', '별'];
    var dk = BRAIN.localDateKey(new Date());
    for (var n of names) {
      var t = await BRAIN.plan({ seed: BRAIN.hashSeed(dk, '모자의 역사', 1, n), dateKey: dk, seq: 1, hint: '모자의 역사', name: n, state: { visits: {}, affinity: {}, lantern: 0, recent: [], todayOut: 0 }, now: new Date(), online: false, by: 'demo' });
      if (t.kind === 'out' && t.receipt && t.receipt.stops.length >= 2) return n;
    }
    return names[0];
  });
  await page.fill('#name-in', name);
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(900);
  await shot(page, '02-idle-light.png');

  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await page.waitForSelector('#oct.st-away', { timeout: 15000 });
  await page.waitForSelector('#log .lrow.typing', { timeout: 10000 }).catch(function () {});
  await page.waitForTimeout(400);
  await shot(page, '03-away.png');
  await page.click('#btn-skip');
  await waitIdle(page);
  await page.waitForTimeout(700);
  await shot(page, '04-returned-poster.png');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await shot(page, '05-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });

  await page.click('#album .pcard');
  await page.waitForSelector('#poster-dialog[open]');
  await page.waitForTimeout(500);
  await shot(page, '06-poster-front.png');
  await page.click('#pd-flip');
  await page.waitForTimeout(900);
  await shot(page, '07-receipt-back.png');
  await page.click('#pd-close');

  /* 몇 번 더 다녀와서 방과 앨범을 채운다 */
  for (var i = 0; i < 4; i++) await inviteSkip(page, ['', '단추', '', 'https://example.org/post'][i]);

  await page.click('#btn-look');
  await page.waitForSelector('#room-sheet[open]');
  await page.waitForTimeout(400);
  await shot(page, '08-room-sheet.png');
  await page.click('#rs-close');

  await page.evaluate(function () { document.getElementById('album-sec').scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  await shot(page, '09-album.png');

  await page.click('#demo summary');
  await page.evaluate(function () { document.getElementById('demo').scrollIntoView({ block: 'end' }); });
  await page.waitForTimeout(300);
  await shot(page, '10-demo-open.png');

  var info = await page.evaluate(function () {
    return {
      lantern: APP.state.room.lantern, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites,
      kinds: APP.state.trips.map(function (t) { return t.kind; }),
      souvenirs: APP.state.room.souvenirs.map(function (s) { return s.id; }),
      imgs: Array.prototype.map.call(document.querySelectorAll('#layers img, #souvenir-row img'), function (i) { return i.getAttribute('src').replace(/^data:.*/, 'data:…') + ' ok=' + (i.complete && i.naturalWidth > 0); }),
      scrollWidth: document.documentElement.scrollWidth
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
