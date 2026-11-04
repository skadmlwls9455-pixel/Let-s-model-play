#!/usr/bin/env node
/* tools/test-audio.js — 소리 연결 검사 (js/audio.js · js/app.js 훅 · 상태 줄 토글 · 방 보기 크기). node + Playwright. 실패하면 exit 1.
 *   node tools/test-audio.js
 *   SHOTS=/path node tools/test-audio.js   # 스크린샷 폴더 (toggle-off.png · toggle-on.png · room-sheet-sound.png, 폰 360×740 @2x)
 * http: node http 로 저장소 루트를 빈 포트에 띄워서 연다 (manifest·소리 파일 fetch 는 http(s) 에서만 된다).
 *  1. 기본은 꺼짐 · 켜기 전엔 audio/ 요청 0 · 스크린샷(꺼짐)
 *  2. 토글 → AudioContext running · audio_on · 시계(훅 14시)×날씨(등불 0 = 비) → theme_day_rain · 환경음 amb_rain
 *  3. 이벤트 재생(APP.importEvents): 출발 → depart_windup·depart_leave + 덕킹 · 기웃 failed → peek_failed (성공음 없음) + 바다 장소 테마
 *     · 귀가 → return_home · 마무리 폴짝 → mood_poljjak · 잠 → sleep_settle → special_lullaby
 *  3b. 집에 있는 날 + 창가 + 비 → stay_settle · special_window_rain · 빗방울 세기 · 졸림 → 자장가
 *  4. 방 보기: 음악·효과음 슬라이더 (저장) · 스크린샷
 *  5. 끄기 → 새로고침해도 꺼짐 (요청 0) · 켜 둔 채 새로고침 → 첫 탭에서 다시 흐름
 *  6. 밤 21시 + 맑음 → theme_night_clear · 마스터 -3 dB · 탭 숨김 suspend · 방 완성 일시정지 · 날씨/시간대 전환
 *  7. file:// → 토글을 켜도 페이지 오류 0 · 소리 없음 안내
 * 모든 페이지: 콘솔 오류 0 (바깥 글꼴 같은 외부 요청 실패만 무시), audio/ 응답은 전부 200.
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/audio/';
fs.mkdirSync(SHOTS, { recursive: true });
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

var passes = 0, fails = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ok   ' + msg); } else { fails++; console.error('  FAIL ' + msg); } }

function serve() {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var u = decodeURIComponent(String(req.url || '/').split('?')[0]);
      if (u === '/') u = '/index.html';
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

/* 콘솔 오류·페이지 오류·audio/ 요청을 모은다. 바깥(다른 원점) 요청 실패만 무시 — 글꼴 CDN 등은 샌드박스에서 막혀 있다 */
function watch(page, origin) {
  var bag = { errors: [], audioReq: [], audioBad: [] };
  page.on('pageerror', function (e) { bag.errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    var t = m.text(), loc = (m.location() && m.location().url) || '';
    if (/Failed to load resource|net::ERR_/.test(t) && loc && origin && loc.indexOf(origin) !== 0) return;
    if (/fonts\.g(oogleapis|static)|cdnjs\.cloudflare/.test(t + ' ' + loc)) return;
    bag.errors.push('console.error: ' + t + (loc ? ' @' + loc : ''));
  });
  page.on('request', function (r) { if (/\/audio\//.test(r.url())) bag.audioReq.push(r.url()); });
  page.on('response', function (r) { if (/\/audio\//.test(r.url()) && r.status() !== 200) bag.audioBad.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', function (r) { if (/\/audio\//.test(r.url())) bag.audioBad.push('failed ' + r.url()); });
  return bag;
}
async function newPage(browser, look, origin) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' });
  if (look) await ctx.addInitScript('window.__ppolLook = ' + JSON.stringify(look) + ';');
  var page = await ctx.newPage();
  return { ctx: ctx, page: page, bag: watch(page, origin) };
}
async function nameIt(page) {
  await page.waitForSelector('#name-dialog[open]', { timeout: 15000 });
  await page.fill('#name-in', '뚜루');
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(300);
}
function st(page) { return page.evaluate(function () { return window.AUDIO ? AUDIO.state() : null; }); }
function playedIds(s) { return (s && s.played || []).map(function (p) { return p.id; }); }
async function waitState(page, fnSrc, arg, ms) {
  return page.waitForFunction(fnSrc, arg, { timeout: ms || 15000, polling: 100 }).then(function () { return true; }, function () { return false; });
}
function reportErrors(bag, label) {
  ok(bag.errors.length === 0, label + ': 콘솔·페이지 오류 0' + (bag.errors.length ? ' — ' + bag.errors.slice(0, 4).join(' | ') : ''));
  ok(bag.audioBad.length === 0, label + ': audio/ 응답 전부 200' + (bag.audioBad.length ? ' — ' + bag.audioBad.slice(0, 3).join(' | ') : ''));
}

/* 이벤트 재생: 바다(조개) 기웃 = 실패, 하늘(별) 기웃 = 읽음·처음 */
var TRIP = [
  { type: 'depart', t: 0, hint: '' },
  { type: 'peek', t: 1000, ms: 3000, status: 'failed', first: true, target: { kind: 'room', id: 'shell', title: '조개' }, note: '문이 닫혀 있었어' },
  { type: 'peek', t: 2000, ms: 3000, status: 'read', first: true, target: { kind: 'room', id: 'star', title: '별' } },
  { type: 'return', t: 3000, reason: 'enough' },
  { type: 'remember', t: 3100, stopIdx: 1, line: '별을 오래 봤어' },
  { type: 'hang_poster', t: 3200, posterId: null },
  { type: 'wrap_up', t: 3300, reaction: '폴짝' }
];

async function scenarioHttp(browser, base) {
  console.log('\n== 1. http: 기본은 꺼짐 · 켜기 전 요청 0');
  var s = await newPage(browser, { hour: 14 }, base);
  var page = s.page;
  await page.goto(base + '/index.html?slow=0.5');
  await nameIt(page);
  var off = await page.evaluate(function () { var b = document.getElementById('btn-sound'); return { has: !!window.AUDIO, en: AUDIO.enabled(), pressed: b && b.getAttribute('aria-pressed'), label: b && b.getAttribute('aria-label'), ls: localStorage.getItem('ppolppol_audio'), st: AUDIO.state() }; });
  ok(off.has && off.en === false && off.st.ctx === 'none', '처음엔 꺼짐, AudioContext 없음');
  ok(off.pressed === 'false' && off.label === '소리 켜기', '토글: aria-pressed=false · "소리 켜기"');
  var box = await page.evaluate(function () { var r = document.getElementById('btn-sound').getBoundingClientRect(), st2 = document.getElementById('status').getBoundingClientRect(); return { w: r.width, h: r.height, right: r.right, vw: innerWidth, sth: st2.height }; });
  ok(box.w >= 44 && box.h >= 44 && box.right <= box.vw, '토글 누르는 곳 ≥ 44×44, 화면 안 (' + box.w + '×' + box.h + ', 상태 줄 ' + box.sth + 'px)');
  await page.mouse.click(180, 400);   /* 장면 아무 데나 탭 (꺼져 있으면 아무 일 없음) */
  await page.waitForTimeout(800);
  ok(s.bag.audioReq.length === 0, '켜기 전 audio/ 요청 0 (' + s.bag.audioReq.length + ')');
  await page.screenshot({ path: path.join(SHOTS, 'toggle-off.png') });

  console.log('\n== 2. 켜기 → AudioContext running · audio_on · 집 테마(낮 14시 × 비)');
  await page.click('#btn-sound');
  var started = await waitState(page, function () { var x = AUDIO.state(); return x.started && x.ctx === 'running'; });
  var a = await st(page);
  ok(started, 'AudioContext running (' + (a && a.ctx) + ')');
  var lab = await page.evaluate(function () { var b = document.getElementById('btn-sound'); return { p: b.getAttribute('aria-pressed'), l: b.getAttribute('aria-label'), ls: JSON.parse(localStorage.getItem('ppolppol_audio') || 'null') }; });
  ok(lab.p === 'true' && lab.l === '소리 끄기' && lab.ls && lab.ls.on === true, '토글: aria-pressed=true · "소리 끄기" · ppolppol_audio.on 저장');
  await waitState(page, function () { return AUDIO.state().bgm === 'theme_day_rain'; }, null, 15000);
  a = await st(page);
  console.log('   state:', JSON.stringify({ bgm: a.bgm, amb: a.amb, band: a.band, weather: a.weather, fmt: a.fmt, master: a.master, played: playedIds(a) }));
  ok(playedIds(a).indexOf('audio_on') >= 0, '켤 때 audio_on 한 번');
  ok(a.band === 'day' && a.weather === 'rain' && a.bgm === 'theme_day_rain', '집 BGM = home_bgm.day.rain → theme_day_rain');
  ok(a.amb.indexOf('amb_rain') >= 0 && a.amb.indexOf('layer_drips') >= 0, '환경음 = amb_rain + layer_drips (' + a.amb.join(',') + ')');
  ok(a.fmt === 'ogg' && s.bag.audioReq.every(function (u) { return /\.(json|ogg)$/.test(u); }), 'Opus(.ogg) 선택 · 필요한 것만 (' + s.bag.audioReq.length + '개 요청)');
  ok(Math.abs(a.master - 1) < 0.05, '낮 마스터 1.0 (' + a.master + ')');
  await page.screenshot({ path: path.join(SHOTS, 'toggle-on.png') });

  console.log('\n== 3. 이벤트 재생: 출발 · 기웃(실패) · 귀가 · 마무리 · 잠');
  await page.evaluate(function () {
    window.__minDuck = 1; window.__duckIv = setInterval(function () { var d = AUDIO.state().duck; if (d < window.__minDuck) window.__minDuck = d; }, 30);
  });
  var mode = await page.evaluate(function () { return APP.sceneMode; });
  await page.evaluate(function (evs) { APP.importEvents(JSON.stringify(evs)); }, TRIP);
  var dep = await waitState(page, function () { var p = AUDIO.state().played.map(function (x) { return x.id; }); return p.indexOf('depart_windup') >= 0 && p.some(function (id) { return /^depart_leave_/.test(id); }); }, null, 15000);
  ok(dep, '출발: depart_windup → depart_leave_* (' + mode + ')');
  await page.waitForTimeout(700);
  var d1 = await page.evaluate(function () { return { min: window.__minDuck, last: AUDIO.state().lastDuck, rain: AUDIO.state().played.some(function (x) { return /^depart_rain_extra_/.test(x.id); }) }; });
  ok(d1.last.db === -2 && d1.min < 0.95, '출발 징글이 BGM 을 덕킹 (duck_db -2 → 최저 ' + d1.min + ')');
  ok(d1.rain, '비 오는 날 출발: depart_rain_extra');
  var awayOk = await waitState(page, function () { var x = AUDIO.state(); return x.away || x.departing; }, null, 15000);
  ok(awayOk, '나가 있는 동안 away');
  var pf = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return /^peek_failed_/.test(x.id); }); }, null, 40000);
  var b = await st(page), ids = playedIds(b), iFail = ids.findIndex(function (id) { return /^peek_failed_/.test(id); });
  ok(pf, '기웃 failed → peek_failed_*');
  ok(iFail >= 0 && !ids.slice(0, iFail + 1).some(function (id) { return /^(peek_read_|first_place|rare_sparkle)/.test(id); }), '정직: 실패 기웃엔 성공음·처음 징글 없음 (처음이어도)');
  var sea = await waitState(page, function () { var x = AUDIO.state(); return x.bgm === 'place_sea' || x.pending === 'place_sea'; }, null, 12000);
  b = await st(page);
  ok(sea && b.place === 'sea', '실패한 곳이어도 장소 테마는 그 코너 → place_sea (bgm=' + b.bgm + ', pending=' + b.pending + ')');
  var seaOn = await waitState(page, function () { return AUDIO.state().bgm === 'place_sea'; }, null, 12000);
  ok(seaOn, '다음 마디선에서 place_sea 로 전환');
  var rd = await waitState(page, function () { var p = AUDIO.state().played.map(function (x) { return x.id; }); return p.some(function (id) { return /^peek_read_/.test(id); }) && p.indexOf('first_place') >= 0; }, null, 40000);
  ok(rd, '기웃 read + 처음 → peek_read_* + first_place');
  var ret = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return /^return_home_/.test(x.id); }); }, null, 60000);
  ok(ret, '귀가 → return_home_*');
  var mood = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return x.id === 'mood_poljjak'; }); }, null, 60000);
  ok(mood, '마무리 폴짝 → mood_poljjak');
  var lan = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return x.id === 'lantern_1'; }); }, null, 30000);
  ok(lan, '등불 1칸 → lantern_1');
  var sl = await waitState(page, function () { var x = AUDIO.state(); return x.sleeping && x.bgm === 'special_lullaby'; }, null, 60000);
  b = await st(page);
  console.log('   after:', JSON.stringify({ bgm: b.bgm, phase: b.sleepPhase, amb: b.amb, played: playedIds(b).slice(-16), cached: b.cached, MB: b.cacheMB }));
  ok(sl && playedIds(b).indexOf('sleep_settle') >= 0 && b.sleepPhase === 'lullaby', '잠 → sleep_settle → special_lullaby');
  ok(b.amb.indexOf('amb_lantern_low') >= 0, '등불 1칸 → 환경음에 등불 온기 (amb_lantern_low)');
  ok(playedIds(b).filter(function (id) { return /^voice_[au]_/.test(id); }).length >= 3, '바깥 말풍선 → 말풍선 목소리 블립 (voice_*)');
  ok(playedIds(b).filter(function (id) { return /^depart_leave_/.test(id); }).length === 1, '나가는 징글은 한 번만');
  await page.evaluate(function () { clearInterval(window.__duckIv); });

  console.log('\n== 4. 방 보기: 음악 · 효과음');
  await page.click('#btn-look');
  await page.waitForSelector('#room-sheet[open]');
  var sheet = await page.evaluate(function () { var m = document.getElementById('set-music'), f = document.getElementById('set-sfx'), n = document.getElementById('rs-sound-note'); return { m: m && m.value, f: f && f.value, note: n && n.textContent, h: document.getElementById('rs-sound') && document.getElementById('rs-sound').textContent }; });
  ok(sheet.h === '소리' && sheet.m === '80' && sheet.f === '80', '방 보기 › 소리: 음악 80 · 효과음 80');
  await page.evaluate(function () { var el = document.getElementById('rs-sound'); el.scrollIntoView({ block: 'start' }); document.getElementById('room-sheet').scrollTop -= 8; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, 'room-sheet-sound.png') });
  var sl2 = await page.$('#set-music'), bb = await sl2.boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height / 2);
  await page.waitForTimeout(200);
  var vol = await page.evaluate(function () { return { st: AUDIO.state().music, ls: JSON.parse(localStorage.getItem('ppolppol_audio')).music, v: document.getElementById('set-music').value }; });
  ok(vol.st > 0.4 && vol.st < 0.6 && Math.abs(vol.ls - vol.st) < 1e-9, '음악 슬라이더 → AUDIO 크기 · 저장 (' + vol.v + ' → ' + vol.st + ')');
  await page.click('#rs-close');
  await page.waitForSelector('#room-sheet[open]', { state: 'hidden' });

  console.log('\n== 5. 끄기 · 새로고침');
  await page.click('#btn-sound');
  var o2 = await page.evaluate(function () { var b2 = document.getElementById('btn-sound'); return { p: b2.getAttribute('aria-pressed'), l: b2.getAttribute('aria-label'), ls: JSON.parse(localStorage.getItem('ppolppol_audio')), st: AUDIO.state() }; });
  ok(o2.p === 'false' && o2.l === '소리 켜기' && o2.ls.on === false && o2.st.enabled === false && o2.st.bgm === null, '끄기: 토글 꺼짐 · 저장 · BGM 멈춤');
  reportErrors(s.bag, 'http');
  s.bag.audioReq.length = 0;
  await page.reload();
  await page.waitForSelector('#btn-go');
  await page.waitForTimeout(600);
  await page.mouse.click(180, 400);
  await page.waitForTimeout(900);
  var o3 = await page.evaluate(function () { var b3 = document.getElementById('btn-sound'); return { p: b3.getAttribute('aria-pressed'), st: AUDIO.state() }; });
  ok(o3.p === 'false' && o3.st.enabled === false && o3.st.ctx === 'none' && s.bag.audioReq.length === 0, '새로고침 뒤에도 꺼짐 · 탭해도 요청 0 (' + s.bag.audioReq.length + ')');
  await page.click('#btn-sound');
  await waitState(page, function () { return AUDIO.state().started; }, null, 10000);
  s.bag.audioReq.length = 0;
  await page.reload();
  await page.waitForSelector('#btn-go');
  await page.waitForTimeout(600);
  var o4 = await page.evaluate(function () { return { p: document.getElementById('btn-sound').getAttribute('aria-pressed'), st: AUDIO.state() }; });
  ok(o4.p === 'true' && o4.st.enabled && !o4.st.started && s.bag.audioReq.length === 0, '켜 둔 채 새로고침: 토글 켜짐 · 사용자 동작 전엔 요청·소리 없음');
  await page.mouse.click(180, 400);
  var back = await waitState(page, function () { var x = AUDIO.state(); return x.started && x.ctx === 'running' && !!(x.bgm || x.pending); }, null, 15000);
  var o5 = await st(page);
  ok(back && playedIds(o5).indexOf('audio_on') < 0, '첫 탭에서 다시 흐름 (audio_on 은 토글할 때만) — bgm ' + (o5.bgm || o5.pending));
  reportErrors(s.bag, 'http 새로고침');
  await s.ctx.close();
}

async function scenarioNight(browser, base) {
  console.log('\n== 6. 밤 21시 + 맑음 → theme_night_clear · 마스터 -3 dB');
  var s = await newPage(browser, { hour: 21, weather: 'clear' }, base);
  var page = s.page;
  await page.goto(base + '/index.html');
  await nameIt(page);
  await page.click('#btn-sound');
  await waitState(page, function () { return AUDIO.state().bgm === 'theme_night_clear'; }, null, 15000);
  await page.waitForTimeout(800);
  var a = await st(page);
  console.log('   state:', JSON.stringify({ bgm: a.bgm, amb: a.amb, band: a.band, weather: a.weather, master: a.master, season: a.season }));
  ok(a.band === 'night' && a.bgm === 'theme_night_clear', '밤 + 맑음 → theme_night_clear');
  ok(Math.abs(a.master - Math.pow(10, -3 / 20)) < 0.03, '밤 마스터 -3 dB (' + a.master + ')');
  ok(a.amb.indexOf('amb_clear_night') >= 0 && a.amb.indexOf('layer_sparkle') >= 0, '밤 맑음 환경음 amb_clear_night + layer_sparkle (' + a.amb.join(',') + ')');
  /* 탭 숨김 → suspend · 다시 보이면 resume (document.hidden 흉내) */
  var vis = await page.evaluate(function () {
    return new Promise(function (res) {
      Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
      document.dispatchEvent(new Event('visibilitychange'));
      setTimeout(function () {
        var h = AUDIO.state().ctx;
        Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } });
        document.dispatchEvent(new Event('visibilitychange'));
        setTimeout(function () { res({ hidden: h, shown: AUDIO.state().ctx }); }, 400);
      }, 400);
    });
  });
  ok(vis.hidden === 'suspended' && vis.shown === 'running', '탭 숨김 → suspended, 보이면 → running (' + JSON.stringify(vis) + ')');
  /* 방 완성 (등불 8칸): BGM 일시정지 → room_complete → 같은 곡을 처음부터 */
  await page.evaluate(function () { window.__paused = false; window.__pIv = setInterval(function () { if (AUDIO.state().paused) window.__paused = true; }, 30); AUDIO.on('lantern', { n: 8 }); });
  var rc = await waitState(page, function () { return window.__paused && AUDIO.state().played.some(function (x) { return x.id === 'room_complete'; }); }, null, 10000);
  ok(rc, '등불 8칸 → room_complete + BGM 일시정지 (pause_bgm)');
  var rs = await waitState(page, function () { var x = AUDIO.state(); return !x.paused && x.bgm === 'theme_night_clear' && x.duck > 0.9; }, null, 15000);
  ok(rs, '팡파르 뒤 같은 곡이 다시 (덕킹 풀림)');
  await page.evaluate(function () { clearInterval(window.__pIv); });
  /* 날씨: 맑음 → 비 = weather_shift + 환경음 크로스페이드 + 같은 곡 비 옷 */
  await page.evaluate(function () { window.__ppolLook.weather = 'rain'; });
  var wxs = await waitState(page, function () { var x = AUDIO.state(); return x.played.some(function (p) { return p.id === 'weather_shift'; }) && x.amb.indexOf('amb_rain') >= 0; }, null, 15000);
  ok(wxs, '날씨 바뀜 → weather_shift + amb_rain');
  var wxb = await waitState(page, function () { return AUDIO.state().bgm === 'theme_night_rain'; }, null, 15000);
  ok(wxb, '같은 곡 다른 옷: theme_night_clear → theme_night_rain (마디선)');
  /* 시간대: 밤 → 새벽 = 프레이즈 끝 → 페이드 → chime_dawn → theme_dawn_rain, 마스터 1.0 */
  await page.evaluate(function () { window.__ppolLook.hour = 7; });
  var bc = await waitState(page, function () { var x = AUDIO.state(); return x.bgm === 'theme_dawn_rain' && x.played.some(function (p) { return p.id === 'chime_dawn'; }); }, null, 50000);
  var a2 = await st(page);
  ok(bc && Math.abs(a2.master - 1) < 0.05, '시간대 바뀜 → chime_dawn → theme_dawn_rain · 마스터 1.0 (' + a2.bgm + ', ' + a2.master + ')');
  reportErrors(s.bag, 'night');
  await s.ctx.close();
}

async function scenarioStay(browser, base) {
  console.log('\n== 3b. 집에 있는 날 (창가 + 비): 움츠림 → stay_settle · 창가 비 BGM · 빗방울 세기 · 졸림 → 자장가');
  var s = await newPage(browser, { hour: 10 }, base);
  var page = s.page;
  await page.goto(base + '/index.html?slow=0.5');
  await nameIt(page);
  await page.click('#btn-sound');
  await waitState(page, function () { return AUDIO.state().bgm === 'theme_day_rain'; }, null, 15000);
  await page.evaluate(function () {
    window.__seen = {}; window.__sIv = setInterval(function () { var x = AUDIO.state(); if (x.bgm) window.__seen[x.bgm] = 1; if (x.pending) window.__seen[x.pending] = 1; }, 40);
    APP.importEvents(JSON.stringify([{ type: 'stay_home', t: 0, activity: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', anchor: 'window' }, { type: 'wrap_up', t: 1500, reaction: '졸림' }]));
  });
  var sl = await waitState(page, function () { var x = AUDIO.state(); return x.sleeping && x.bgm === 'special_lullaby'; }, null, 40000);
  var a = await st(page), ids = playedIds(a), seen = await page.evaluate(function () { clearInterval(window.__sIv); return Object.keys(window.__seen); });
  console.log('   played:', JSON.stringify(ids), ' bgm seen:', JSON.stringify(seen));
  ok(ids.indexOf('depart_windup') >= 0 && ids.some(function (id) { return /^stay_settle_/.test(id); }) && !ids.some(function (id) { return /^depart_leave_/.test(id); }), '같은 움츠림, 다른 결말: depart_windup → stay_settle (나가는 소리 없음)');
  ok(seen.indexOf('special_window_rain') >= 0, '집에 있는 날 + 창가 + 비 → special_window_rain');
  ok(ids.filter(function (id) { return /^stay_count_drops_/.test(id); }).length === 4, '빗방울 세기 → stay_count_drops 1~4');
  ok(ids.indexOf('mood_jollim') >= 0 && sl, '졸림 → mood_jollim → 잠 → special_lullaby');
  reportErrors(s.bag, 'stay');
  await s.ctx.close();
}

async function scenarioFile(browser) {
  console.log('\n== 7. file:// → 토글을 켜도 오류 0 · 소리 없음 안내');
  var s = await newPage(browser, null, 'file://');
  var page = s.page;
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await nameIt(page);
  await page.click('#btn-sound');
  await page.waitForTimeout(600);
  var a = await page.evaluate(function () { var b = document.getElementById('btn-sound'); return { p: b.getAttribute('aria-pressed'), st: AUDIO.state(), toast: document.getElementById('toast').textContent }; });
  ok(a.p === 'true' && a.st.enabled && !a.st.available && a.st.reason === 'file' && a.st.ctx === 'none', 'file://: 토글은 켜짐(기억) · 소리 없음 (reason=file, AudioContext 안 만듦)');
  ok(/웹 주소/.test(a.toast), 'file://: 한 줄 안내 토스트 ("' + a.toast + '")');
  await page.click('#btn-look');
  await page.waitForSelector('#room-sheet[open]');
  var note = await page.textContent('#rs-sound-note');
  ok(/file:\/\//.test(note) && /웹 주소/.test(note), '방 보기 › 소리 안내: "' + note + '"');
  await page.click('#rs-close');
  /* 이벤트가 와도 조용히 (오류 없음) */
  await page.evaluate(function () { AUDIO.on('state', { state: 'anticipate' }); AUDIO.on('peek', { status: 'failed', corner: 'sea' }); AUDIO.on('lantern', { n: 3 }); AUDIO.on('bubble', { text: '닫혀 있었어', kind: 'say' }); AUDIO.on('nope'); });
  await page.waitForTimeout(300);
  ok(s.bag.audioReq.length === 0, 'file://: audio/ 요청 0');
  reportErrors(s.bag, 'file');
  await s.ctx.close();
}

(async function main() {
  var srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  console.log('test-audio: ' + base + ' · shots → ' + SHOTS);
  var browser = await chromium.launch();
  try {
    await scenarioHttp(browser, base);
    await scenarioStay(browser, base);
    await scenarioNight(browser, base);
    await scenarioFile(browser);
  } catch (e) {
    fails++; console.error('\nCRASH: ' + (e && e.stack || e));
  } finally {
    await browser.close();
    srv.close();
  }
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
