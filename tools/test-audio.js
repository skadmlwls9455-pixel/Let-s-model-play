#!/usr/bin/env node
/* tools/test-audio.js — 소리 연결 검사 (js/audio.js · js/app.js 훅 · 장면 오른쪽 위 토글 · 설정 시트의 소리 칸). node + Playwright. 실패하면 exit 1.
 *   node tools/test-audio.js
 *   SHOTS=/path node tools/test-audio.js   # 스크린샷 폴더 (toggle-off.png · toggle-on.png · settings-sound.png, 폰 360×740 @2x)
 * http: node http 로 저장소 루트를 빈 포트에 띄워서 연다 (manifest·소리 파일 fetch 는 http(s) 에서만 된다).
 *  1. 기본은 꺼짐 · 켜기 전엔 audio/ 요청 0 · 스크린샷(꺼짐)
 *  2. 토글 → AudioContext running · audio_on · 시계(훅 14시)×날씨(등불 0 = 비) → theme_day_rain · 환경음 amb_rain
 *  3. 이벤트 재생(APP.importEvents): 출발 → depart_windup·depart_leave + 덕킹 · 기웃 failed → peek_failed (성공음 없음) + 바다 장소 테마
 *     · 귀가 → return_home · 마무리 폴짝 → mood_poljjak · 잠 (낮 + 폴짝) → sleep_settle 만, 집 테마 그대로 (D-1: 자장가 없음)
 *  3b. 집에 있는 날 + 창가 + 비 → stay_settle · special_window_rain · 빗방울 세기 · 낮 + 졸림 → 자장가
 *  4. 설정 시트(옛 방 보기도 받는다): 여닫을 때 sheet_open·sheet_close (탭 소리 겹침 없음) · 음악·효과음 슬라이더 (저장) · 소리 안내 문구 · 스크린샷
 *     · 추억 앨범 시트도 같은 소리 (앨범 아이콘은 장면 안이라 탭 소리 없음)
 *  5. 끄기 → 새로고침해도 꺼짐 (요청 0) · 켜 둔 채 새로고침 → 첫 탭에서 다시 흐름
 *  6. 밤 21시 + 맑음 → theme_night_clear · 마스터 -3 dB · 탭 숨김 suspend · 방 완성 일시정지 · 날씨/시간대 전환 · 집에 있는 날 자리 규칙
 *  7. file:// → 토글을 켜도 페이지 오류 0 · 소리 없음 안내
 *  8. 방 완성 팡파르 중 끄고 켜기 → BGM 덕킹 풀림 · 못 받는 집 테마는 매초 다시 받지 않는다
 *  9. D-1 자장가 규칙 (훅 이벤트로): 낮 + 덤덤 / 낮 + 반응 없음 → 자장가 없음 · 낮 + 졸림 → 자장가 · 밤 → 자장가 · 반응 키 없으면 마무리 줄의 반응
 *     · 문 이벤트 door{act:'open'} → 끼익 (한 벌에 door_open 이 없으면 audio.js 가 만든 door_creak_open — 시트 소리 아님, 크기는 export 잣대) · close → 짧은 끼익
 *     · 모르는 act·이름은 조용히 · 놀이방 문(#btn-door)을 누르면 끼익 한 번 + 달리기 창
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
    if (/Failed to load resource/.test(t) && /\/api\//.test(loc)) return;   /* 달리기 순위 API (놀이방 문 → 달리기 창) — 이 정적 서버엔 없다 */
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
/* 설정 시트(7물결: 방 보기를 없애고 장면 오른쪽 위 ⚙) 여는 버튼. 아직 옛 화면이면 방 보기 버튼 */
var SETTINGS_BTN = ['#btn-settings', '#btn-set', '#btn-config', '#scene-ctl button[aria-label*="설정"]', 'button[aria-label*="설정"]', '#btn-look'];
async function settingsBtn(page) {
  return page.evaluate(function (sels) {
    for (var i = 0; i < sels.length; i++) { var b = document.querySelector(sels[i]); if (b && !b.hidden && b.offsetParent !== null) return sels[i]; }
    return null;
  }, SETTINGS_BTN);
}
/* 소리 칸(#set-music)이 든 시트를 연다 → 그 시트 id */
async function openSettings(page) {
  var sel = await settingsBtn(page);
  if (!sel) return { sel: null, id: null };
  await page.click(sel);
  await page.waitForSelector('#set-music', { state: 'visible', timeout: 8000 }).catch(function () {});
  var id = await page.evaluate(function () { var m = document.getElementById('set-music'), d = m && m.closest('dialog'); return d && d.open ? d.id : null; });
  return { sel: sel, id: id };
}
/* 시트 안의 닫기 버튼 (…-close 또는 '닫기') 을 누른다 */
async function closeSheet(page, id) {
  var cs = await page.evaluate(function (did) {
    var d = document.getElementById(did); if (!d) return null;
    var bs = [].filter.call(d.querySelectorAll('button'), function (b) { return b.offsetParent !== null && (/(^|-)close$/.test(b.id) || b.textContent.trim() === '닫기'); });
    var b = bs[bs.length - 1]; if (!b) return null;
    if (!b.id) b.id = '__close_' + did;
    return '#' + b.id;
  }, id);
  if (cs) await page.click(cs); else await page.evaluate(function (did) { document.getElementById(did).close(); }, id);
  await page.waitForSelector('#' + id + '[open]', { state: 'hidden', timeout: 5000 }).catch(function () {});
}
/* t0(ctx 시각) 뒤에 울린 소리 id */
async function playedSince(page, t0) {
  return page.evaluate(function (t) { return AUDIO.state().played.filter(function (p) { return p.t >= t - 0.02; }).map(function (p) { return p.id; }); }, t0);
}
function reportErrors(bag, label) {
  ok(bag.errors.length === 0, label + ': 콘솔·페이지 오류 0' + (bag.errors.length ? ' — ' + bag.errors.slice(0, 4).join(' | ') : ''));
  ok(bag.audioBad.length === 0, label + ': audio/ 응답 전부 200' + (bag.audioBad.length ? ' — ' + bag.audioBad.slice(0, 3).join(' | ') : ''));
}

/* 이벤트 재생: 바다(조개) 기웃 = 실패, 하늘(별) 기웃 = 읽음·처음.
   '읽음'은 출처(ko.wikipedia.org 문서 주소)가 있어야 두뇌(replay)가 받아 준다 — 없으면 읽음이 아니라서 peek_read_* 가 안 난다 */
var TRIP = [
  { type: 'depart', t: 0, hint: '' },
  { type: 'peek', t: 1000, ms: 3000, status: 'failed', first: true, target: { kind: 'room', id: 'shell', title: '조개' }, note: '문이 닫혀 있었어' },
  { type: 'peek', t: 2000, ms: 3000, status: 'read', first: true, target: { kind: 'room', id: 'star', title: '별' }, source: { url: 'https://ko.wikipedia.org/wiki/%EB%B3%84', extract: '별은 스스로 빛을 내는 천체다.' } },
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
    window.__lullSeen = false; window.__lullIv = setInterval(function () { var x = AUDIO.state(); if (x.bgm === 'special_lullaby' || x.pending === 'special_lullaby' || x.sleepPhase === 'lullaby') window.__lullSeen = true; }, 30);
  });
  var mode = await page.evaluate(function () { return APP.sceneMode; });
  await page.evaluate(function (evs) { APP.importEvents(JSON.stringify(evs)); }, TRIP);
  var dep = await waitState(page, function () { var p = AUDIO.state().played.map(function (x) { return x.id; }); return p.indexOf('depart_windup') >= 0 && p.some(function (id) { return /^depart_leave_/.test(id); }); }, null, 15000);
  ok(dep, '출발: depart_windup → depart_leave_* (' + mode + ')');
  /* 나감 소리는 움츠림 뒤에 줄을 선다 (움츠림을 처음 받느라 늦었으면 그만큼 뒤) → 덕킹이 걸린 다음에 본다 */
  await waitState(page, function () { var x = AUDIO.state(); return x.lastDuck.db === -2 && x.time > x.lastDuck.at + 0.4; }, null, 6000);
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
  /* 빠른 재생(?slow=0.5)에선 둘째 기웃이 첫 마디선보다 먼저 올 수 있다 → 그땐 마지막 코너(하늘)가 이긴다. 바깥에 있는 동안 장소 테마로 바뀌기만 확인 (정확한 마디선 전환은 6번에서) */
  var placeOn = await waitState(page, function () { var x = AUDIO.state(); return (x.away || x.departing) && /^place_(sea|sky)$/.test(x.bgm || ''); }, null, 15000);
  b = await st(page);
  ok(placeOn, '나가 있는 동안 장소 테마로 전환 (' + b.bgm + ')');
  var rd = await waitState(page, function () { var p = AUDIO.state().played.map(function (x) { return x.id; }); return p.some(function (id) { return /^peek_read_/.test(id); }); }, null, 40000);
  ok(rd, '기웃 read → peek_read_*');
  ok(await page.evaluate(function () { return AUDIO.state().played.every(function (x) { return x.id !== 'first_place'; }); }), "처음 온 곳이어도 'first_place' 징글은 안 울림 (11-05 주인 요청으로 뺌)");
  var ret = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return /^return_home_/.test(x.id); }); }, null, 60000);
  ok(ret, '귀가 → return_home_*');
  var mood = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return x.id === 'mood_poljjak'; }); }, null, 60000);
  ok(mood, '마무리 폴짝 → mood_poljjak');
  var lan = await waitState(page, function () { return AUDIO.state().played.some(function (x) { return x.id === 'lantern_1'; }); }, null, 30000);
  ok(lan, '등불 1칸 → lantern_1');
  var sl = await waitState(page, function () { var x = AUDIO.state(); return x.sleeping && x.played.some(function (p) { return p.id === 'sleep_settle'; }); }, null, 60000);
  await page.waitForTimeout(2500);   /* 예전엔 settle 뒤 1.4 s 에 자장가가 걸렸다 */
  b = await st(page);
  var lullSeen = await page.evaluate(function () { clearInterval(window.__lullIv); return window.__lullSeen; });
  console.log('   after:', JSON.stringify({ bgm: b.bgm, pending: b.pending, want: b.want, phase: b.sleepPhase, amb: b.amb, played: playedIds(b).slice(-16), cached: b.cached, MB: b.cacheMB }));
  ok(sl && b.sleepPhase === 'home' && !lullSeen && b.want === 'theme_day_rain', 'D-1: 낮 14시 + 폴짝 → 잠들기 소리(sleep_settle)만, 집 테마 그대로 · 자장가 없음 (bgm ' + (b.bgm || b.pending) + ')');
  ok(b.amb.indexOf('amb_lantern_low') >= 0, '등불 1칸 → 환경음에 등불 온기 (amb_lantern_low)');
  ok(playedIds(b).filter(function (id) { return /^voice_[au]_/.test(id); }).length >= 3, '바깥 말풍선 → 말풍선 목소리 블립 (voice_*)');
  ok(playedIds(b).filter(function (id) { return /^depart_leave_/.test(id); }).length === 1 && playedIds(b).filter(function (id) { return id === 'depart_windup'; }).length === 1, '나가는·움츠림 징글은 한 번씩만');
  /* 이벤트 징글은 서로 겹치지 않는다 (매니페스트 길이 기준, 비 오는 날 나감 덧층·시간대 종만 예외) */
  var MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'manifest.json'), 'utf8')), DUR = {};
  MAN.sounds.forEach(function (x) { if (x.kind === 'jingle' && !/^(depart_rain_extra|chime)/.test(x.group || x.id)) DUR[x.id] = x.duration; });
  var jg = b.played.filter(function (x) { return DUR[x.id]; }).sort(function (x, y) { return x.t - y.t; }), lap = [];
  for (var k = 1; k < jg.length; k++) if (jg[k].t < jg[k - 1].t + DUR[jg[k - 1].id] - 0.03) lap.push(jg[k - 1].id + '@' + jg[k - 1].t + '+' + jg[k].id + '@' + jg[k].t);
  ok(jg.length >= 5 && !lap.length, '이벤트 징글 ' + jg.length + '개가 겹치지 않고 줄을 섬' + (lap.length ? ' — ' + lap.join(', ') : ''));
  await page.evaluate(function () { clearInterval(window.__duckIv); });

  console.log('\n== 4. 설정 시트: 여닫기 소리 · 음악 · 효과음');
  var t4 = (await st(page)).time;
  var sheet = await openSettings(page);
  ok(!!sheet.id, '설정 시트 열림 (' + sheet.sel + ' → #' + sheet.id + ')');
  await page.waitForTimeout(450);
  var p4 = await playedSince(page, t4);
  ok(p4.filter(function (id) { return /^sheet_open_/.test(id); }).length === 1 && !p4.some(function (id) { return /^ui_tap_/.test(id); }), '시트 열기 → sheet_open 한 번 · 탭 소리 겹침 없음 (' + p4.join(',') + ')');
  var info = await page.evaluate(function () { var m = document.getElementById('set-music'), f = document.getElementById('set-sfx'), n = document.getElementById('rs-sound-note'), hh = document.getElementById('rs-sound'); return { m: m && m.value, f: f && f.value, note: n && n.textContent, h: hh && hh.textContent }; });
  ok(info.h === '소리' && info.m === '80' && info.f === '80', '설정 › 소리: 음악 80 · 효과음 80');
  ok(/오른쪽 위 스피커/.test(info.note || '') && !/등불 옆/.test(info.note || ''), '소리 안내가 지금 스피커 자리(장면 오른쪽 위)를 말함: "' + info.note + '"');
  await page.evaluate(function () { var el = document.getElementById('rs-sound'); el.scrollIntoView({ block: 'start' }); var d = el.closest('dialog'); if (d) d.scrollTop -= 8; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, 'settings-sound.png') });
  var sl2 = await page.$('#set-music'), bb = await sl2.boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height / 2);
  await page.waitForTimeout(200);
  var vol = await page.evaluate(function () { return { st: AUDIO.state().music, ls: JSON.parse(localStorage.getItem('ppolppol_audio')).music, v: document.getElementById('set-music').value }; });
  ok(vol.st > 0.4 && vol.st < 0.6 && Math.abs(vol.ls - vol.st) < 1e-9, '음악 슬라이더 → AUDIO 크기 · 저장 (' + vol.v + ' → ' + vol.st + ')');
  await page.waitForTimeout(300);
  t4 = (await st(page)).time;
  if (sheet.id) await closeSheet(page, sheet.id);
  await page.waitForTimeout(400);
  p4 = await playedSince(page, t4);
  ok(p4.filter(function (id) { return /^sheet_close_/.test(id); }).length === 1 && !p4.some(function (id) { return /^ui_tap_/.test(id); }), '시트 닫기 → sheet_close 한 번 · 탭 소리 겹침 없음 (' + p4.join(',') + ')');
  /* 추억 앨범: 장면 오른쪽 위 아이콘 (장면 안 버튼은 탭 소리를 안 낸다) → 시트가 여닫는 소리를 낸다. 아이콘이 아직 숨어 있으면(포스터 없음) 시트를 바로 연다 */
  t4 = (await st(page)).time;
  var albumBtn = await page.evaluate(function () { var b = document.getElementById('btn-album'); return !!(b && !b.hidden && b.offsetParent !== null); });
  if (albumBtn) await page.click('#btn-album'); else await page.evaluate(function () { document.getElementById('album-sheet').showModal(); });
  await page.waitForSelector('#album-sheet[open]', { timeout: 5000 });
  await page.waitForTimeout(450);
  var p4a = await playedSince(page, t4);
  t4 = (await st(page)).time;
  await closeSheet(page, 'album-sheet');
  await page.waitForTimeout(400);
  var p4b = await playedSince(page, t4);
  ok(p4a.filter(function (id) { return /^sheet_open_/.test(id); }).length === 1 && p4b.filter(function (id) { return /^sheet_close_/.test(id); }).length === 1 && !p4a.concat(p4b).some(function (id) { return /^ui_tap_/.test(id); }),
    '추억 앨범 ' + (albumBtn ? '아이콘' : '시트(아이콘 숨음)') + ' 열기 → sheet_open · 닫기 → sheet_close (' + p4a.join(',') + ' / ' + p4b.join(',') + ')');
  /* 닫기 버튼 말고 Esc 로 닫아도 같은 소리 (시트가 닫히는 것을 듣는다) */
  await page.evaluate(function () { document.getElementById('album-sheet').showModal(); });
  await page.waitForTimeout(400);
  t4 = (await st(page)).time;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  var p4c = await playedSince(page, t4);
  ok(p4c.filter(function (id) { return /^sheet_close_/.test(id); }).length === 1, 'Esc 로 닫아도 sheet_close (' + p4c.join(',') + ')');

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
  var o4 = await page.evaluate(function () { var b4 = document.getElementById('btn-sound'); return { p: b4.getAttribute('aria-pressed'), l: b4.getAttribute('aria-label'), st: AUDIO.state() }; });
  /* 기억은 켜짐이지만 아직 아무것도 안 들린다 → 토글은 들리는 대로 '소리 켜기' (누르면 켜진다 — "소리 끄기"가 소리를 켜지 않게) */
  ok(o4.p === 'false' && o4.l === '소리 켜기' && o4.st.enabled && !o4.st.started && s.bag.audioReq.length === 0, '켜 둔 채 새로고침: 기억은 켜짐 · 토글은 "소리 켜기"(아직 안 들림) · 사용자 동작 전엔 요청·소리 없음');
  await page.mouse.click(180, 400);
  var back = await waitState(page, function () { var x = AUDIO.state(); return x.started && x.ctx === 'running' && !!(x.bgm || x.pending); }, null, 15000);
  var o5 = await st(page);
  var p5 = await page.evaluate(function () { return document.getElementById('btn-sound').getAttribute('aria-pressed'); });
  ok(back && playedIds(o5).indexOf('audio_on') < 0 && p5 === 'true', '첫 탭에서 다시 흐름 (audio_on 은 토글할 때만) · 토글 눌림 — bgm ' + (o5.bgm || o5.pending));
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
  /* 기웃 → 장소 테마: 다음 마디선(밤 맑음 64 BPM = 3.75 s)에서 1마디 크로스페이드. 게임 상태와 무관한 오디오 이벤트만 흉내 */
  var pk = await page.evaluate(function () {
    AUDIO.on('ceremony', { kind: 'depart' }); AUDIO.on('state', { state: 'away' });
    var x = AUDIO.state(); window.__peekAt = x.time;
    AUDIO.on('peek', { status: 'failed', corner: 'sea', roomId: 'shell', first: true });
    return { trimAway: x.away, want: AUDIO.state().want };
  });
  var seaOn = await waitState(page, function () { return AUDIO.state().bgm === 'place_sea'; }, null, 8000);
  var a3 = await page.evaluate(function () { var x = AUDIO.state(); return { bgm: x.bgm, dt: x.time - window.__peekAt, played: x.played.map(function (p) { return p.id; }) }; });
  ok(pk.want === 'place_sea' && seaOn && a3.dt < 3.75 + 1.5, '기웃 failed → peek_failed + 다음 마디선에서 place_sea (' + a3.dt.toFixed(2) + ' s 뒤)');
  ok(a3.played.some(function (id) { return /^peek_failed_/.test(id); }) && a3.played.indexOf('first_place') < 0, '정직: failed 는 처음이어도 first_place 없음');
  await page.evaluate(function () { AUDIO.on('ceremony', { kind: 'return' }); AUDIO.on('state', { state: 'idle' }); });
  var home = await waitState(page, function () { var x = AUDIO.state(); return x.played.some(function (p) { return /^return_home_/.test(p.id); }) && (x.pending === 'theme_night_clear' || x.bgm === 'theme_night_clear'); }, null, 8000);
  ok(home, '귀가 → return_home + 집 테마 예약 (장소 최소 8마디 뒤)');
  await waitState(page, function () { return AUDIO.state().bgm === 'theme_night_clear'; }, null, 40000);
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
  /* 집에 있는 날 자리: app.js 와 같은 규칙 — 등불 2칸 전 상자(crate)는 창가로 → 비면 창가 비 BGM, 담요는 집 테마 그대로 */
  var anc = await page.evaluate(function () {
    AUDIO.on('row', { ev: { type: 'stay_home', anchor: 'crate', activity: 'reread_poster' }, trip: {} });
    var w1 = AUDIO.state().want; AUDIO.on('busy', { on: false });
    AUDIO.on('row', { ev: { type: 'stay_home', anchor: 'blanket', activity: 'nap' }, trip: {} });
    var w2 = AUDIO.state().want; AUDIO.on('busy', { on: false });
    return { w1: w1, w2: w2, lantern: AUDIO.state().lantern };
  });
  ok(anc.w1 === 'special_window_rain' && anc.w2 === 'theme_dawn_rain', '집에 있는 날 자리: 등불 ' + anc.lantern + '칸 상자 → 창가 비 (' + anc.w1 + ') · 담요 → 집 테마 (' + anc.w2 + ')');
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

async function scenarioToggle(browser, base) {
  console.log('\n== 8. 방 완성 팡파르 중 끄고 켜기 · 못 받는 파일');
  var s = await newPage(browser, { hour: 14 }, base);
  var page = s.page;
  await page.goto(base + '/index.html');
  await nameIt(page);
  await page.click('#btn-sound');
  await waitState(page, function () { return AUDIO.state().bgm === 'theme_day_rain'; }, null, 15000);
  await page.evaluate(function () { AUDIO.on('lantern', { n: 8 }); });
  var pz = await waitState(page, function () { var x = AUDIO.state(); return x.paused && x.duck < 0.05; }, null, 8000);
  await page.click('#btn-sound');
  await page.waitForTimeout(400);
  await page.click('#btn-sound');
  var un = await waitState(page, function () { var x = AUDIO.state(); return x.started && x.bgm === 'theme_day_rain' && x.duck > 0.95; }, null, 10000);
  var a = await st(page);
  ok(pz && un, '팡파르(BGM 멈춤) 중 끄고 켜기 → 다시 켜면 덕킹 풀림 (duck ' + a.duck + ', bgm ' + a.bgm + ')');
  reportErrors(s.bag, 'toggle');
  await s.ctx.close();
  /* 집 테마 파일이 없다(404): 한 번(ogg → m4a) 받아 보고, 매초 다시 받지 않는다 · 환경음은 그대로 */
  s = await newPage(browser, { hour: 14 }, base);
  page = s.page;
  await s.ctx.route(/\/audio\/.*theme_day_rain\.(ogg|m4a)$/, function (r) { return r.fulfill({ status: 404, body: '404' }); });
  await page.goto(base + '/index.html');
  await nameIt(page);
  await page.click('#btn-sound');
  await page.waitForTimeout(6000);
  var n = s.bag.audioReq.filter(function (u) { return /theme_day_rain/.test(u); }).length, m = await st(page);
  ok(n >= 1 && n <= 2 && m.bgm === null && m.amb.indexOf('amb_rain') >= 0, '없는 집 테마: 6초 동안 ' + n + '번만 받아 봄 (매초 다시 받지 않음) · 환경음은 그대로 (' + m.amb.join(',') + ')');
  ok(s.bag.errors.filter(function (e) { return /pageerror/.test(e); }).length === 0, '없는 파일: 페이지 오류 0');
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
  var fsh = await openSettings(page);
  var note = await page.textContent('#rs-sound-note').catch(function () { return ''; });
  ok(/file:\/\//.test(note) && /웹 주소/.test(note), '설정 › 소리 안내 (' + fsh.sel + '): "' + note + '"');
  if (fsh.id) await closeSheet(page, fsh.id);
  /* 이벤트가 와도 조용히 (오류 없음) */
  await page.evaluate(function () { AUDIO.on('state', { state: 'anticipate' }); AUDIO.on('peek', { status: 'failed', corner: 'sea' }); AUDIO.on('lantern', { n: 3 }); AUDIO.on('bubble', { text: '닫혀 있었어', kind: 'say' }); AUDIO.on('nope'); });
  await page.waitForTimeout(300);
  ok(s.bag.audioReq.length === 0, 'file://: audio/ 요청 0');
  reportErrors(s.bag, 'file');
  await s.ctx.close();
}

async function scenarioRules(browser, base) {
  console.log('\n== 9. D-1 자장가 규칙 · 문 소리 (훅 이벤트)');
  /* __ppolLook 이 있으면 문어가 돌아다니지 않는다 (app 이 state 이벤트를 따로 보내지 않게) */
  var s = await newPage(browser, { hour: 14 }, base);
  var page = s.page;
  /* 짧은 버퍼(2 s 미만)가 울릴 때마다 길이·피크·소리 나는 구간 RMS (audio/src/export.py 와 같은 잣대: 10 ms 창, 최대 −50 dB 위) */
  await page.addInitScript(function () {
    window.__bufs = [];
    var st0 = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () {
      var b = this.buffer;
      if (b && b.duration < 2) {
        var x = b.getChannelData(0), pk = 0, win = Math.round(0.01 * b.sampleRate), e = [], mx = 0, m = 0, k = 0, i, j;
        for (i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
        for (i = 0; (i + 1) * win <= x.length; i++) { var q = 0; for (j = i * win; j < (i + 1) * win; j++) q += x[j] * x[j]; e.push(q / win); mx = Math.max(mx, q / win); }
        e.forEach(function (v) { if (v > mx * 1e-5) { m += v; k++; } });
        window.__bufs.push({ dur: Math.round(b.duration * 1000) / 1000, peakDb: Math.round(200 * Math.log10(pk + 1e-12)) / 10, rmsDb: Math.round(100 * Math.log10(m / (k || 1) + 1e-20)) / 10 });
      }
      return st0.apply(this, arguments);
    };
  });
  await page.goto(base + '/index.html');
  await nameIt(page);
  await page.click('#btn-sound');
  await waitState(page, function () { return AUDIO.state().bgm === 'theme_day_rain'; }, null, 15000);
  await page.waitForTimeout(600);
  var MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'manifest.json'), 'utf8'));
  /* 문 소리: 한 벌에 map.interaction.door_open(또는 ui.door_open)이 있으면 그 파일, 없으면 js/audio.js 가 만든 끼익 door_creak_open — 시트 소리는 아니다 */
  function doorFor(act) {
    var key = ((MAN.map.interaction || {})['door_' + act]) || ((MAN.map.ui || {})['door_' + act]);
    var ids = key ? MAN.sounds.filter(function (x) { return x.id === key || x.group === key; }).map(function (x) { return x.id; }) : [];
    return ids.length ? { key: key, ids: ids, made: false } : { key: 'door_creak_' + act + ' (audio.js 가 만듦)', ids: ['door_creak_' + act], made: true };
  }
  var dOpen = doorFor('open'), dClose = doorFor('close'), doorIds = dOpen.ids;

  /* 문: 열기 → 끼익 (시트 소리 아님) · 닫기 → 닫는 끼익 · 모르는 act · 모르는 이름은 조용히 */
  var t = (await st(page)).time;
  await page.evaluate(function () { window.__bufs.length = 0; AUDIO.on('door', { act: 'open' }); });
  await waitState(page, function (t1) { return AUDIO.state().played.some(function (p) { return p.t >= t1 - 0.02; }); }, t, 4000);   /* 처음 쓰는 소리는 받고 풀어야 기록된다 */
  await page.waitForTimeout(300);
  var pd = await playedSince(page, t), bo = (await page.evaluate(function () { return window.__bufs.slice(); }))[0] || {};
  ok(pd.length === 1 && doorIds.indexOf(pd[0]) >= 0 && !/^sheet_/.test(pd[0]), "door{act:'open'} → " + dOpen.key + ' — 시트 소리 아님 (' + pd.join(',') + ')');
  if (dOpen.made) {
    ok(bo.dur >= 0.3 && bo.dur <= 0.65 && Math.abs(bo.rmsDb + 34) <= 1.5 && bo.peakDb <= -3,
      '만든 끼익: 0.3~0.65 s · 소리 나는 구간 RMS ≈ −34 dBFS (BGM −20 + rel −14, sheet_open 과 같은 잣대) · 피크 −3 dBFS 아래 (' + bo.dur + ' s, ' + bo.rmsDb + ' dB, 피크 ' + bo.peakDb + ')');
    ok(s.bag.audioReq.filter(function (u) { return /door_creak/.test(u); }).length === 0, '만든 끼익: audio/ 파일 요청 없음');
  }
  await page.waitForTimeout(400);
  t = (await st(page)).time;
  await page.evaluate(function () { window.__bufs.length = 0; AUDIO.on('door', { act: 'close' }); });
  await waitState(page, function (t1) { return AUDIO.state().played.some(function (p) { return p.t >= t1 - 0.02; }); }, t, 4000);
  await page.waitForTimeout(300);
  pd = await playedSince(page, t);
  var bc = (await page.evaluate(function () { return window.__bufs.slice(); }))[0] || {};
  ok(pd.length === 1 && dClose.ids.indexOf(pd[0]) >= 0 && (!dClose.made || (bc.dur > 0 && bc.dur < bo.dur && Math.abs(bc.rmsDb + 35) <= 1.5)),
    "door{act:'close'} → " + dClose.key + (dClose.made ? ' · 여는 것보다 짧고 −35 dBFS (' + bc.dur + ' s, ' + bc.rmsDb + ' dB)' : '') + ' (' + pd.join(',') + ')');
  await page.waitForTimeout(300);
  t = (await st(page)).time;
  await page.evaluate(function () { AUDIO.on('door', { act: 'knock' }); AUDIO.on('door'); AUDIO.on('nope', { act: 'open' }); });
  await page.waitForTimeout(400);
  pd = await playedSince(page, t);
  ok(pd.length === 0, "모르는 act · act 없음 · 모르는 이름 → 조용히 (" + pd.join(',') + ')');
  /* 장면의 놀이방 문(#btn-door, 7물결 임시 문)을 실제로 누르면: 문 소리 한 번 · 탭 소리 없음 (장면 안) · 달리기 창은 시트가 아니라 여는 소리가 겹치지 않는다 */
  var hasDoor = await page.evaluate(function () { var b = document.getElementById('btn-door'); return !!(b && !b.hidden && b.offsetParent !== null); });
  if (hasDoor) {
    await page.waitForTimeout(300);
    t = (await st(page)).time;
    await page.click('#btn-door');
    await waitState(page, function (t1) { return AUDIO.state().played.some(function (p) { return p.t >= t1 - 0.02; }); }, t, 4000);
    await page.waitForTimeout(400);
    pd = await playedSince(page, t);
    var rOpen = await page.evaluate(function () { var d = document.getElementById('runner-dlg'); return !!(d && d.open); });
    ok(pd.filter(function (id) { return doorIds.indexOf(id) >= 0; }).length === 1 && !pd.some(function (id) { return /^ui_tap_/.test(id); }) && rOpen, '놀이방 문 누르기 → 문 소리 한 번 · 탭 소리 없음 · 달리기 창 열림 (' + pd.join(',') + ')');
    await page.evaluate(function () { var d = document.getElementById('runner-dlg'); if (d && d.open) d.close(); });
    await page.waitForTimeout(300);
  } else console.log('   (놀이방 문 #btn-door 없음 — 훅 이벤트만 봄)');

  /* 잠 하나: 깨워서 앞 경우의 자장가가 다 빠진 뒤 잠들게 하고, 잠들기 소리(앞 징글 뒤에 줄 선다)가 난 뒤 1.5 s 더 자장가가 걸리는지 본다 */
  async function sleepCase(fn, label, want) {
    await page.evaluate(function () { AUDIO.on('state', { state: 'idle' }); });
    await waitState(page, function () { var x = AUDIO.state(); return !x.sleeping && x.bgm !== 'special_lullaby' && x.pending !== 'special_lullaby'; }, null, 12000);
    await page.waitForTimeout(300);
    var t0 = await page.evaluate(function (src) {
      window.__lull = false; clearInterval(window.__lIv);
      window.__lIv = setInterval(function () { var x = AUDIO.state(); if (x.bgm === 'special_lullaby' || x.pending === 'special_lullaby' || x.sleepPhase === 'lullaby') window.__lull = true; }, 30);
      var t1 = AUDIO.state().time;
      (new Function(src))();
      return t1;
    }, fn);
    var settled = await waitState(page, function (t1) { return AUDIO.state().played.some(function (p) { return p.id === 'sleep_settle' && p.t >= t1 - 0.02; }); }, t0, 8000);
    var hit = want ? await waitState(page, function () { var x = AUDIO.state(); return x.sleepPhase === 'lullaby' && x.bgm === 'special_lullaby'; }, null, 15000) : (await page.waitForTimeout(1500), false);
    var r = await page.evaluate(function () { clearInterval(window.__lIv); var x = AUDIO.state(); return { lull: window.__lull, phase: x.sleepPhase, bgm: x.bgm, want: x.want, band: x.band }; });
    if (want) ok(hit && settled, label + ' → sleep_settle → special_lullaby (' + r.band + ', ' + r.phase + ')');
    else ok(!r.lull && r.phase === 'home' && settled && /^theme_/.test(r.want || ''), label + ' → 잠들기 소리만, 집 테마 그대로 (' + r.band + ', ' + r.phase + ', want ' + r.want + ')');
  }
  await sleepCase("AUDIO.on('state', { state: 'sleep', reaction: '덤덤' });", '낮 14시 + 덤덤', false);
  await sleepCase("AUDIO.on('state', { state: 'sleep', reaction: null });", '낮 14시 + 반응 없음(null)', false);
  await sleepCase("AUDIO.on('state', { state: 'sleep', reaction: '졸림' });", '낮 14시 + 졸림', true);
  /* 앱이 반응을 안 실어 보내면(키 없음) 이번 차례 마무리 줄의 반응으로 · 새 차례(busy on)가 시작되면 잊는다 */
  await sleepCase("AUDIO.on('busy', { on: true }); AUDIO.on('row', { ev: { type: 'wrap_up', reaction: '졸림' }, trip: {} }); AUDIO.on('state', { state: 'sleep' });", '낮 + 키 없음 + 마무리 줄 졸림', true);
  await sleepCase("AUDIO.on('row', { ev: { type: 'wrap_up', reaction: '졸림' }, trip: {} }); AUDIO.on('busy', { on: true }); AUDIO.on('state', { state: 'sleep' });", '낮 + 키 없음 + 지난 차례 졸림(새 차례로 잊음)', false);
  await page.evaluate(function () { AUDIO.on('state', { state: 'idle' }); window.__ppolLook.hour = 21; });
  await waitState(page, function () { return AUDIO.state().band === 'night'; }, null, 5000);
  await sleepCase("AUDIO.on('state', { state: 'sleep', reaction: '덤덤' });", '밤 21시 + 덤덤', true);
  reportErrors(s.bag, 'rules');
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
    await scenarioToggle(browser, base);
    await scenarioRules(browser, base);
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
