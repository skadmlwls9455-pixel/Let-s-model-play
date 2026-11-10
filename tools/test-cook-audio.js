#!/usr/bin/env node
/* tools/test-cook-audio.js — 부엌 소리: js/audio.js 의 'cook' 갈래 · foley/ (진짜 녹음 층) · cook.html ?sound=1 · credits.html. Playwright + Chromium, 진짜 Web Audio.
 *   NODE_PATH=$(npm root -g) node tools/test-cook-audio.js
 *   ONLY=A,G NODE_PATH=$(npm root -g) node tools/test-cook-audio.js   그 시나리오만
 *   SHOTS=/path   캡처 폴더 (기본: <os tmp>/cook-audio-shots)
 * http: node http 로 저장소 뿌리를 빈 포트에 (manifest·소리 파일 fetch 는 http(s) 에서만 된다). E 만 file://.
 * 실제 출력은 엿듣는다: AudioContext.destination 으로 가는 연결마다 AnalyserNode 하나에도 잇는다 (게임 코드는 그대로).
 *  A. ?sound=1 → 이 페이지에서만 켜짐 (저장 안 함), 첫 탭 전엔 AudioContext 없음 · 소리 없음 (목록 둘과 첫 소리 바이트만 미리) / 첫 탭에 켜짐 ·
 *     해초전 한 판 (손가락 길): pick → 톡톡 9번 (변형이 연달아 같지 않음 · 빠르기가 i 따라 오르고 9번째 +3 반음) → step → 불 켜기 = heat_on +
 *     지글 0 루프 1 s 페이드인 → 3 s 노릇 = 지글 1 로 0.15 s 크로스페이드 + 치익(+4 dB) → 6 s 바삭 = 지글 2 → 위로 쓸기 = 뒤집기 한 번 + quiet 에
 *     루프 멈춤, 그 단계의 톡은 철퍽 뒤 → 썰기 2번 (변형 다름) → 접시 (+0.4 s) + 김 (+0.15 s) · 부엌 덕킹: 열려 있으면 음악 -6 dB, 지글 동안
 *     -10 dB, 닫으면 풀림 · 진짜 출력: 지글 동안 소리, 멈춘 뒤 조용 (음악 0)
 *  B. ?reduced=1 + 단추 길 (COOK.auto): 뒤집기는 휙을 건너뛴다 (off 0.21) · 접시는 공개와 같이 · 톡톡 i 0 · 3 · 6 의 빠르기 ·
 *     단추를 많이 눌러도 (33번) 들린 톡 변형이 연달아 같지 않다 (한 번 누름에 tap 셋 — 버려진 둘이 '직전 것' 으로 남지 않는다)
 *  C. 소리 꺼짐 (기본): 손가락으로 한 판 내내 AudioContext 없음 · 재생 0 · audio/ · foley/ 요청 0
 *  D. 파일이 없다: foley/manifest.json 404 · foley/cook/* 404 → 조용히, 페이지 오류 0, 부엌 오류 0, 한 판 끝까지
 *  E. file:// + ?sound=1 → 조용히 (reason 'file' · 저장 안 함) · 오류 0
 *  F. 탭 숨김: 지글 중 숨김 → quiet 로 멈춤 → 돌아오면 heat_on 없이 0.3 s 로 다시 (resume)
 *  H. 첫 손길이 바로 불 켜기 (그 탭이 잠금을 푼다): 기억해 둔 불로 heat_on + 지글 0 부터
 *  I. 첫 손길이 바로 팬 (그 탭이 잠금을 푼다): 팬 들기 소리가 사라지지 않는다 (미리 받아 둔 목록 · 바이트), 목록이 늦게 와도 (기억해 둔 act)
 *  J. 못 받은 변형: cook_flip_1 이 404 → 뒤집기마다 cook_flip_2 (조용한 뒤집기 없음), cook_flip_1 은 다시 받지 않는다
 *  K. 효과음 0: 부엌 덕킹 없음 (들리지 않는 지글 때문에 음악이 줄지 않게)
 *  L. 페이드 (OfflineAudioContext, js/audio.js 의 fadeIn · fadeOut 그대로): 페이드인 도중의 quiet · 크로스페이드가 지금 크기에서 부드럽게 내린다
 *     (cancelAndHoldAtTime 이 있든 없든)
 *  G. 크레딧: cook.html 조리대에만 '만든 것들' (단계 중엔 없음, 닫힌 화면에도) → credits.html (CC BY 두 줄이 foley/CREDITS.md 와 글자 그대로 ·
 *     CC0 페이지 모두 · 글꼴 · three.js 라이선스 파일 · 320 px 가로 넘침 없음 · 이모지·기호 없음 · 돌아가기) · 본 게임 설정 시트 맨 아래 '만든 것들'
 *     · 본 게임에서 소리를 켜도 부엌 act 가 없으면 foley/ 요청 0 (부엌 층은 필요할 때만)
 * 콘솔 오류 · 페이지 오류 0 (D 의 일부러 없앤 파일에 대한 브라우저 자신의 'Failed to load resource' 줄만 뺀다). 실패하면 exit 1.
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'cook-audio-shots');
var ONLY = String(process.env.ONLY || '').toUpperCase().split(/[,\s]+/).filter(Boolean);
var KEY = 'ppolppol_cook_v0';
var SEEN_ALL = JSON.stringify({ v: 1, day: '', dayN: 0, seen: ['tap', 'flip', 'slice'], pot: null, book: [] });
var SEMI3 = Math.pow(2, 3 / 12);
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
var passes = 0, fails = 0;
function ok(c, m) { if (c) { passes++; console.log('  ok   ' + m); } else { fails++; console.error('  FAIL ' + m); } }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function line(a, b, n) { var out = []; for (var i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
function ids(st, re) { return (st.played || []).filter(function (p) { return re.test(p.id); }); }
fs.mkdirSync(SHOTS, { recursive: true });

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

/* 출력 엿듣기 (페이지보다 먼저): destination 으로 가는 연결마다 같은 AnalyserNode 에도 잇는다 */
function probeInit() {
  var orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst) {
    var r = orig.apply(this, arguments);
    try {
      if (typeof AudioDestinationNode !== 'undefined' && dst instanceof AudioDestinationNode) {
        var c = this.context;
        if (!c.__probe) { c.__probe = c.createAnalyser(); c.__probe.fftSize = 2048; window.__probeCtx = c; }
        orig.call(this, c.__probe);
      }
    } catch (e) { /* the probe only listens */ }
    return r;
  };
  window.__rms = function () {
    var c = window.__probeCtx; if (!c || !c.__probe) return -1;
    var a = new Float32Array(c.__probe.fftSize), s = 0; c.__probe.getFloatTimeDomainData(a);
    for (var i = 0; i < a.length; i++) s += a[i] * a[i];
    return Math.sqrt(s / a.length);
  };
}
async function rmsOver(page, ms) {
  var v = [];
  for (var t = 0; t < ms; t += 50) { v.push(await page.evaluate(function () { return window.__rms ? window.__rms() : -1; })); await wait(50); }
  return { max: Math.max.apply(null, v), min: Math.min.apply(null, v) };
}

function watch(page, allow) {
  var bag = { errors: [], net: [], bad: [] };
  page.on('pageerror', function (e) { bag.errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    var t = m.text(), loc = (m.location() && m.location().url) || '';
    if (allow && /Failed to load resource/.test(t) && allow.test(loc)) return;   /* D: 일부러 없앤 파일 — 브라우저 자신의 네트워크 줄 */
    bag.errors.push('console.error: ' + t + (loc ? ' @' + loc : ''));
  });
  page.on('request', function (r) { if (/\/(audio|foley)\//.test(r.url())) bag.net.push(r.url()); });
  page.on('response', function (r) { if (/\/(audio|foley)\//.test(r.url()) && r.status() !== 200 && !(allow && allow.test(r.url()))) bag.bad.push(r.status() + ' ' + r.url()); });
  return bag;
}

/* 부엌 한 장: 폰 360 × 740 @2 · 터치 (CDP — 진짜 터치라 첫 사용자 동작이 된다) */
async function kitchen(browser, o) {
  o = o || {};
  var ctx = await browser.newContext({ viewport: o.vp || { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ko-KR', colorScheme: 'light',
    reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript('(' + probeInit.toString() + ')();');
  await ctx.addInitScript(function (a) {   /* 탭마다 한 번만 심는다 (새로고침은 페이지가 쓴 것을 둔다) */
    try {
      if (sessionStorage.getItem('__ckaSeeded')) return;
      sessionStorage.setItem('__ckaSeeded', '1');
      localStorage.setItem(a.key, a.cook);
      if (a.audio === null) localStorage.removeItem('ppolppol_audio'); else localStorage.setItem('ppolppol_audio', a.audio);
    } catch (e) { /* none */ }
  }, { key: KEY, cook: SEEN_ALL, audio: o.audio ? JSON.stringify(o.audio) : null });
  if (o.route) await o.route(ctx);
  var page = await ctx.newPage(), bag = watch(page, o.allow);
  var cdp = await ctx.newCDPSession(page);
  await page.goto(o.url);
  await page.waitForFunction(function () { return window.COOK && COOK.isOpen() && window.AUDIO && typeof AUDIO.state === 'function'; }, null, { timeout: 15000 });
  var K = { ctx: ctx, page: page, cdp: cdp, bag: bag };
  K.live = function () { return page.evaluate(function () { return COOK.live(); }); };
  K.st = function () { return page.evaluate(function () { return AUDIO.state(); }); };
  K.rect = function (sel) { return page.evaluate(function (s) { var e = document.querySelector(s); if (!e) return null; var r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel); };
  K.pt = async function (lx, ly) { var r = await K.rect('.ck-cv'); return [r.x + lx * r.w / 288, r.y + ly * r.h / 320]; };
  K.touch = function (type, p) { return cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1 }] : [] }); };
  K.tapAt = async function (p) { await K.touch('touchStart', p); await wait(40); await K.touch('touchEnd'); await wait(30); };
  K.tap = async function (lx, ly) { await K.tapAt(await K.pt(lx, ly)); };
  K.tapEl = async function (sel) { var r = await K.rect(sel); await K.tapAt([r.x + r.w / 2, r.y + r.h / 2]); };
  K.drag = async function (pts) {
    var c = []; for (var i = 0; i < pts.length; i++) c.push(await K.pt(pts[i][0], pts[i][1]));
    await K.touch('touchStart', c[0]);
    for (var j = 1; j < c.length; j++) { await wait(20); await K.touch('touchMove', c[j]); }
    await wait(20); await K.touch('touchEnd'); await wait(30);
  };
  K.until = async function (fn, ms, label) {
    var t0 = Date.now();
    while (Date.now() - t0 < (ms || 8000)) { var l = await K.live(); if (fn(l)) return l; await wait(50); }
    throw new Error('timeout: ' + label + ' ' + JSON.stringify(await K.live()).slice(0, 240));
  };
  K.waitSt = async function (fn, ms) {
    var t0 = Date.now();
    while (Date.now() - t0 < (ms || 8000)) { var s = await K.st(); if (fn(s)) return s; await wait(50); }
    return null;
  };
  /* 부엌 act 가 들어온 ctx 시각을 적는다 (cook.js 는 부를 때마다 AUDIO.on 을 새로 찾는다) */
  K.spy = function () {
    return page.evaluate(function () {
      window.__acts = [];
      var on = AUDIO.on;
      AUDIO.on = function (n, d) { if (n === 'cook') window.__acts.push({ act: d && d.act, band: d && d.band, i: d && d.i, t: AUDIO.state().time }); return on.apply(this, arguments); };
    });
  };
  K.acts = function () { return page.evaluate(function () { return window.__acts || []; }); };
  K.unlock = async function () {   /* 부엌과 상관없는 곳(조리대 위 벽)을 한 번 톡 = 첫 사용자 동작 */
    await K.tapAt([180, 40]);
    return K.waitSt(function (x) { return x.started && x.ctx === 'running' && x.cook && x.cook.ready; }, 15000);
  };
  K.close = function () { return ctx.close(); };
  return K;
}
function noErrors(K, label) {
  ok(K.bag.errors.length === 0, label + ': 콘솔 · 페이지 오류 0' + (K.bag.errors.length ? ' — ' + K.bag.errors.slice(0, 3).join(' | ') : ''));
  ok(K.bag.bad.length === 0, label + ': audio/ · foley/ 응답 전부 200' + (K.bag.bad.length ? ' — ' + K.bag.bad.slice(0, 3).join(' | ') : ''));
}
async function playTapMarks(K) {
  await K.until(function (x) { return x.kind === 'tap' && x.phase === 'step'; }, 5000, 'tap step');
  await wait(800);
  var l = await K.live(), off = [[-3, 2], [2, -2], [0, 3]];
  for (var i = 0; i < l.st.marks.length; i++) for (var k = 0; k < 3; k++) { var m = l.st.marks[i]; await K.tap(m.x + off[k][0], m.y + off[k][1]); await wait(170); }
}
async function playSlice(K) {
  await K.until(function (x) { return x.kind === 'slice' && x.phase === 'step'; }, 5000, 'slice step');
  await wait(800);
  for (var i = 0; i < 2; i++) {
    var ln = (await K.live()).st.lines[i];
    await K.drag(line([ln.ax - 10 * ln.ux, ln.ay - 10 * ln.uy], [ln.bx + 10 * ln.ux, ln.by + 10 * ln.uy], 20));
    await wait(350);
  }
}

/* ===================================================================================================== */
async function scenarioA(browser, base) {
  console.log('\n== A. cook.html?sound=1 · 해초전 한 판 (손가락) · 진짜 Web Audio');
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&seed=7', audio: { on: false, music: 0, sfx: 0.8 } });
  var p = K.page;
  await wait(400);
  var s0 = await K.waitSt(function (x) { return x.cook.ready && x.cook.pre.length >= 4; }, 8000) || await K.st(), ls0 = await p.evaluate(function () { return JSON.parse(localStorage.getItem('ppolppol_audio') || 'null'); });
  var pre0 = K.bag.net.map(function (u) { return u.replace(/^.*\/(audio|foley)\//, '$1/'); });
  ok(s0.enabled === true && s0.ctx === 'none' && !s0.started && s0.played.length === 0, '?sound=1: 켜진 것으로 · 첫 탭 전엔 AudioContext 도 소리도 없음 (ctx ' + s0.ctx + ')');
  ok(pre0.length >= 3 && pre0.every(function (u) { return /^(audio\/manifest\.json|foley\/manifest\.json|foley\/cook\/cook_(pick|pat|step)[_0-9]*\.ogg)$/.test(u); }),
    '첫 탭 전에 받는 것은 목록 둘과 첫 소리(팬 들기 · 톡톡 · 단계 톡)의 바이트뿐 (' + pre0.join(' ') + ')');
  ok(ls0 && ls0.on === false && ls0.music === 0 && ls0.sfx === 0.8 && s0.cook.pageOn === true, '?sound=1: 이 페이지에서만 켠다 — 저장된 소리 설정은 그대로 (꺼짐) ' + JSON.stringify(ls0));
  var s1 = await K.unlock();
  ok(!!s1, '첫 탭 (조리대 위 벽) → AudioContext running · 부엌 목록(foley/manifest.json) 받음 (부엌이 열려 있으니 켜면서 바로)');
  ok(s1 && s1.bgm && /^theme_/.test(s1.bgm) || (s1 && s1.want && /^theme_/.test(s1.want)), '부엌 페이지도 게임과 같은 집 BGM (' + (s1 && (s1.bgm || s1.want)) + ')');
  await K.spy();
  await K.tapEl('.ck-prop');
  await playTapMarks(K);
  await K.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 5000, 'flip step');
  var s2 = await K.st(), pats = ids(s2, /^cook_pat_\d$/), rates = pats.map(function (x) { return x.rate || 1; });
  console.log('   pats:', pats.map(function (x) { return x.id.slice(-1) + '@' + (x.rate || 1); }).join(' '));
  ok(ids(s2, /^cook_pick_\d$/).length === 1, 'pick → 팬 들기 한 번 (cook_pick_1)');
  ok(pats.length === 9, '톡톡 9번 → 반죽 톡 9번 (' + pats.length + ')');
  ok(pats.every(function (x, j) { return j === 0 || x.id !== pats[j - 1].id; }) && new Set(pats.map(function (x) { return x.id; })).size >= 3, '톡톡 변형: 연달아 같은 것 없음 · 여러 변형 (' + pats.map(function (x) { return x.id.slice(-1); }).join('') + ')');
  ok(rates[0] === 1 && rates.every(function (r, j) { return j === 0 || r > rates[j - 1]; }) && Math.abs(rates[8] - SEMI3) < 0.002, '빠르기가 i 따라 오른다: 1 → ' + rates[8] + ' (+3 반음 = ' + SEMI3.toFixed(3) + ')');
  ok(ids(s2, /^cook_step$/).length === 1 && ids(s2, /^cook_step$/)[0].t >= pats[8].t, '톡톡 단계 끝 → 작은 나무 톡 (cook_step)');
  ok(!s2.cook.loop && s2.cook.bed === 1 && Math.abs(s2.cook.duck - Math.pow(10, -6 / 20)) < 0.04 && Math.abs(s2.cook.ambDuck - Math.pow(10, -9 / 20)) < 0.04,
    '불 켜기 전: 루프 없음 · 부엌이 열려 있어 음악 -6 dB · 비 -9 dB (톡톡이 음악 위로) (' + s2.cook.duck + ', ' + s2.cook.ambDuck + ')');
  /* 불 켜기 → 지글 0 */
  await wait(800);
  await K.tap(144, 176);
  var s3 = await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_0'; }, 4000);
  ok(!!s3, '불 켜기 → 지글 0 루프 (cook_sizzle_0)');
  var heat = s3 ? ids(s3, /^cook_heat_on_\d$/) : [], lg = s3 ? s3.cook.log : [], st0 = lg.filter(function (x) { return x.ev === 'start' && x.id === 'cook_sizzle_0'; })[0];
  ok(heat.length === 1 && st0 && st0.fade === 1 && Math.abs(heat[0].t - st0.t) < 0.06, '불 켜기 = heat_on 한 번 + 지글 0 을 같은 때 1 s 페이드인 (' + (heat[0] && heat[0].id) + ' ' + (heat[0] && heat[0].t) + ' / 루프 ' + (st0 && st0.t) + ')');
  await wait(1300);
  var s4 = await K.st(), r1 = await rmsOver(p, 500);
  console.log('   duck', s4.cook.duck, 'rms(sizzle)', r1.max.toFixed(5), r1.min.toFixed(5));
  ok(s4.cook.bed === 2 && Math.abs(s4.cook.duck - Math.pow(10, -10 / 20)) < 0.04 && Math.abs(s4.cook.ambDuck - Math.pow(10, -13 / 20)) < 0.04,
    '지글 동안 음악 -10 dB · 비 -13 dB (지글이 음악 · 비 아래 깔리지 않게: ' + s4.cook.duck + ', ' + s4.cook.ambDuck + ')');
  ok(r1.min > 0.0008, '진짜 출력: 지글이 들린다 (음악 0 · 출력 RMS ' + r1.min.toFixed(5) + ' 넘음)');
  var s5 = await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_1'; }, 4000);
  var s6 = await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_2'; }, 4500);
  var xf = (s6 || s5 || s4).cook.log.filter(function (x) { return x.ev === 'xfade'; });
  ok(!!s5 && !!s6 && xf.length === 2 && xf[0].id === 'cook_sizzle_1' && xf[1].id === 'cook_sizzle_2' && xf.every(function (x) { return x.fade === 0.15 && x.pop === 4; }), '노릇노릇 · 바삭바삭 → 지글 1 · 지글 2 로 0.15 s 크로스페이드 + 치익 (+4 dB) ' + JSON.stringify(xf));
  ok(xf.length === 2 && xf[0].t - st0.t > 2.6 && xf[0].t - st0.t < 3.6 && xf[1].t - xf[0].t > 2.6 && xf[1].t - xf[0].t < 3.6, '굽기가 바뀌는 때 = 3 s 마다 (' + (xf[0] && (xf[0].t - st0.t).toFixed(2)) + ', ' + (xf[1] && (xf[1].t - xf[0].t).toFixed(2)) + ')');
  /* 위로 쓸기 → 뒤집기 + quiet */
  await K.drag(line([144, 236], [146, 140], 6));
  var s7 = await K.waitSt(function (x) { return ids(x, /^cook_flip_\d$/).length > 0 && !x.cook.loop; }, 3000);
  var flip = s7 ? ids(s7, /^cook_flip_\d$/) : [], stop = s7 ? s7.cook.log.filter(function (x) { return x.ev === 'stop'; }) : [];
  ok(flip.length === 1 && !flip[0].off, '위로 쓸기 → 뒤집기 한 번 (' + (flip[0] && flip[0].id) + ', 휙부터 그대로)');
  ok(stop.length === 1 && stop[0].id === 'cook_sizzle_2' && stop[0].fade === 0.25 && flip[0] && Math.abs(stop[0].t - flip[0].t) < 0.08, '뒤집은 바로 뒤 quiet → 지글 2 를 0.25 s 에 내리고 멈춤 (뒤집기 꼬리가 잦아들게)');
  var acts = await K.acts(), names = acts.map(function (a) { return a.act; }), fi = names.indexOf('flip');
  ok(fi >= 0 && names.slice(fi + 1, fi + 3).indexOf('quiet') >= 0, '순서: flip 바로 뒤 quiet (' + names.slice(Math.max(0, fi - 2), fi + 3).join(' ') + ')');
  await wait(1500);
  var s8 = await K.st(), fst = ids(s8, /^cook_step$/);
  ok(s8.cook.bed === 1 && Math.abs(s8.cook.duck - Math.pow(10, -6 / 20)) < 0.05, 'quiet 뒤 지글 덕킹이 부엌 덕킹(-6 dB)으로 돌아옴 (' + s8.cook.duck + ')');
  ok(fst.length === 2 && flip[0] && fst[1].t - flip[0].t > 0.3 && fst[1].t - flip[0].t < 0.45, '뒤집기 단계의 톡은 철퍽(0.256 s) 뒤에 (+' + (fst[1] && flip[0] ? (fst[1].t - flip[0].t).toFixed(3) : '?') + ' s)');
  await wait(900);
  var r2 = await rmsOver(p, 400);
  console.log('   rms(after)', r2.max.toFixed(6));
  ok(r2.max < r1.min / 4, '진짜 출력: 뒤집기 꼬리가 끝나면 조용 (루프가 정말 멈춤 · RMS ' + r2.max.toFixed(6) + ')');
  /* 썰기 → 접시 */
  await playSlice(K);
  await K.until(function (x) { return x.screen === 'reveal'; }, 5000, 'reveal');
  await wait(1300);
  var s9 = await K.st(), cuts = ids(s9, /^cook_cut_\d$/), plate = ids(s9, /^cook_plate_\d$/), steam = ids(s9, /^cook_steam$/);
  acts = await K.acts();
  var done = acts.filter(function (a) { return a.act === 'done'; })[0];
  ok(cuts.length === 2 && cuts[0].id !== cuts[1].id, '썰기 두 줄 → 사각 두 번, 다른 변형 (' + cuts.map(function (x) { return x.id; }).join(', ') + ')');
  ok(plate.length === 1 && done && plate[0].t - done.t > 0.3 && plate[0].t - done.t < 0.55, '접시 공개 → 접시가 다 오른 때 접시 놓는 소리 (+' + (plate[0] && done ? (plate[0].t - done.t).toFixed(3) : '?') + ' s)');
  ok(steam.length === 1 && plate[0] && Math.abs(steam[0].t - plate[0].t - 0.15) < 0.03, '…그 0.15 s 뒤 작은 김 쉬익 (cook_steam)');
  var all = s9.played.filter(function (x) { return /^cook_/.test(x.id); }).map(function (x) { return x.id.replace(/_\d$/, ''); });
  var seq = all.filter(function (x, j) { return j === 0 || x !== all[j - 1]; });
  ok(seq.join(' ') === 'cook_pick cook_pat cook_step cook_heat_on cook_flip cook_step cook_cut cook_step cook_plate cook_steam', '한 판 소리 차례 (한 번짜리): ' + seq.join(' > '));
  var lv = await K.live();
  ok(lv.err === 0 && lv.done, '부엌 오류 0 · 접시까지');
  ok(s9.requests > 0 && K.bag.net.some(function (u) { return /\/foley\/manifest\.json$/.test(u); }) && K.bag.net.some(function (u) { return /\/foley\/cook\/cook_sizzle_2\.ogg$/.test(u); }), 'Opus(.ogg) 를 먼저 받는다 (' + s9.fmt + ')');
  await p.evaluate(function () { COOK.close(); });
  var s10 = await K.waitSt(function (x) { return x.cook.bed === 0 && x.cook.duck > 0.95 && x.cook.ambDuck > 0.95; }, 4000);
  ok(!!s10, '부엌을 닫으면 음악 · 비가 제 크기로 (' + JSON.stringify(s10 ? [s10.cook.duck, s10.cook.ambDuck] : null) + ')');
  noErrors(K, 'A');
  await K.close();
}

async function scenarioB(browser, base) {
  console.log('\n== B. ?reduced=1 (움직임 줄이기) + 단추 길: 휙을 건너뛴 뒤집기 · 바로 놓이는 접시');
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&reduced=1&seed=8', audio: { on: false, music: 0, sfx: 0.8 }, reduced: true });
  ok(!!(await K.unlock()), '첫 탭 → 켜짐');
  await K.spy();
  await K.page.evaluate(function () { COOK.auto(true); });
  await K.until(function (x) { return x.screen === 'reveal'; }, 20000, 'reveal');
  await wait(900);
  var s = await K.st(), acts = await K.acts(), flip = ids(s, /^cook_flip_\d$/), plate = ids(s, /^cook_plate_\d$/), pats = ids(s, /^cook_pat_\d$/);
  var done = acts.filter(function (a) { return a.act === 'done'; })[0];
  ok(flip.length === 1 && flip[0].off === 0.21, '움직임 줄이기: 뒤집기는 휙을 건너뛰고 철퍽부터 (off ' + (flip[0] && flip[0].off) + ')');
  ok(plate.length === 1 && done && plate[0].t - done.t < 0.08, '움직임 줄이기: 접시가 바로 서니 접시 소리도 바로 (+' + (plate[0] && done ? (plate[0].t - done.t).toFixed(3) : '?') + ' s)');
  var want = [1, Math.pow(2, 1.125 / 12), Math.pow(2, 2.25 / 12)];
  ok(pats.length === 3 && pats.every(function (x, j) { return Math.abs((x.rate || 1) - want[j]) < 0.002; }), '단추 길 톡톡 (한 번에 표시 하나 = i 0 · 3 · 6) 의 빠르기 ' + pats.map(function (x) { return x.rate || 1; }).join(', '));
  var lg = s.cook.log.map(function (x) { return x.ev + ':' + x.id; });
  ok(lg[0] === 'start:cook_sizzle_0' && lg[lg.length - 1] === 'stop:cook_sizzle_0' && ids(s, /^cook_heat_on_\d$/).length === 1, '단추로 불 켜고 바로 뒤집기: heat_on + 지글 0 → 멈춤 ' + lg.join(' '));
  /* 단추를 많이 누른다. 단추 한 번 = 표시 하나 = tap 셋이 한 프레임에 와서 간격 문(80 ms)이 둘을 버린다 — 버려진 고르기가 '직전 것' 으로 남으면
     들린 톡이 연달아 같아진다 (js/audio.js pick · play, 11-10). 톡톡 단계는 세 번 누르면 끝나니, 두 번 누르고 부엌을 닫았다 다시 연다
     (하던 판은 그 단계 처음부터) × PAT_ROUNDS. 들린 것 = AUDIO.state().played */
  var PAT_ROUNDS = 15, heard = pats.map(function (x) { return x.id; }), lastT = pats.length ? pats[pats.length - 1].t : 0;
  await K.until(function (x) { return x.screen === 'counter'; }, 5000, 'counter');   /* COOK.auto 가 접시에서 조리대로 돌아온 뒤 */
  for (var c = 0; c < PAT_ROUNDS; c++) {
    await K.page.evaluate(function () { COOK.close(); });
    await K.until(function (x) { return x.screen === 'closed'; }, 3000, 'closed');
    await K.page.evaluate(function () { document.getElementById('ck-door').click(); });
    await K.until(function (x) { return x.screen === 'counter'; }, 3000, 'counter');
    await K.page.evaluate(function () { document.querySelector('.ck-prop').click(); });
    await K.until(function (x) { return x.kind === 'tap' && x.phase === 'step' && x.st.hits === 0; }, 3000, 'tap step');
    await wait(260);   /* 단계 처음 250 ms 는 단추를 받지 않는다 */
    for (var k = 1; k <= 2; k++) {
      for (var tries = 0; tries < 20; tries++) {   /* 그 누름이 세어질 때까지 (너무 이른 누름은 버려진다) */
        await K.page.evaluate(function () { document.querySelector('.ck-verb').click(); });
        await wait(130);
        var lv = await K.live();
        if (lv.st && lv.st.hits >= 3 * k) break;
      }
    }
    ids(await K.st(), /^cook_pat_\d$/).forEach(function (x) { if (x.t > lastT) { heard.push(x.id); lastT = x.t; } });
  }
  ok(heard.length >= 3 + Math.floor(1.6 * PAT_ROUNDS) && heard.every(function (id, j) { return j === 0 || id !== heard[j - 1]; }),
    '단추를 ' + (3 + 2 * PAT_ROUNDS) + '번 눌러도 들린 톡 변형이 연달아 같지 않다 (들린 톡 ' + heard.length + ': ' + heard.map(function (id) { return id.slice(-1); }).join('') + ')');
  noErrors(K, 'B');
  await K.close();
}

async function scenarioC(browser, base) {
  console.log('\n== C. 소리 꺼짐 (기본): 한 판 내내 조용 · 요청 0');
  var K = await kitchen(browser, { url: base + '/cook.html?seed=9' });
  await K.tapAt([180, 40]);
  await K.tapEl('.ck-prop');
  await playTapMarks(K);
  await K.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 5000, 'flip');
  await wait(800); await K.tap(144, 176); await wait(1200);
  await K.drag(line([144, 236], [146, 140], 6));
  await playSlice(K);
  await K.until(function (x) { return x.screen === 'reveal'; }, 5000, 'reveal');
  await wait(800);
  var s = await K.st(), ls = await K.page.evaluate(function () { return localStorage.getItem('ppolppol_audio'); });
  ok(s.enabled === false && s.ctx === 'none' && !s.started && s.played.length === 0 && !s.cook.ready && !s.cook.loop, '꺼짐: AudioContext 없음 · 재생 0 · 부엌 목록도 안 받음');
  ok(K.bag.net.length === 0, '꺼짐: audio/ · foley/ 요청 0 (' + K.bag.net.length + ')');
  ok(ls === null, '꺼짐: 소리 설정을 쓰지 않는다 (기본 그대로)');
  ok((await K.live()).err === 0, '부엌 오류 0');
  noErrors(K, 'C');
  await K.close();
}

async function scenarioD(browser, base) {
  console.log('\n== D. 파일이 없다: 조용히, 오류 없이, 한 판 끝까지');
  var cases = [
    { tag: 'foley/manifest.json 404', re: /\/foley\/manifest\.json$/, glob: '**/foley/manifest.json' },
    { tag: 'foley/cook/* 404', re: /\/foley\/cook\//, glob: '**/foley/cook/**' }
  ];
  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var K = await kitchen(browser, { url: base + '/cook.html?sound=1&seed=' + (20 + i), audio: { on: false, music: 0, sfx: 0.8 }, allow: c.re,
      route: (function (cc) { return function (ctx) { return ctx.route(cc.glob, function (r) { return r.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' }); }); }; })(c) });
    await K.tapAt([180, 40]);
    var on = await K.waitSt(function (x) { return x.started && x.ctx === 'running'; }, 15000);
    await K.page.evaluate(function () { COOK.auto(true); });
    await K.until(function (x) { return x.screen === 'reveal'; }, 20000, 'reveal');
    await wait(900);
    var s = await K.st(), lv = await K.live(), book = await K.page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k)).book.length; } catch (e) { return -1; } }, KEY);
    ok(!!on && s.started, c.tag + ': 소리는 켜졌고 (집 BGM 은 그대로)');
    ok(s.played.filter(function (x) { return /^cook_/.test(x.id); }).length === 0 && !s.cook.loop, c.tag + ': 부엌 소리는 조용히 건너뜀 (재생 0 · 루프 없음)');
    ok(lv.err === 0 && book === 1, c.tag + ': 부엌은 그대로 끝까지 (부엌 오류 0 · 수첩에 한 줄 ' + book + ')');
    ok(K.bag.net.some(function (u) { return c.re.test(u); }), c.tag + ': (정말 받으려 했고 없었다)');
    noErrors(K, 'D ' + c.tag);
    await K.close();
  }
}

async function scenarioE(browser) {
  console.log('\n== E. file:// + ?sound=1: 조용히 (브라우저가 file:// 의 fetch 를 막는다)');
  var K = await kitchen(browser, { url: 'file://' + path.join(ROOT, 'cook.html') + '?sound=1&seed=10' });
  await K.tapAt([180, 40]);
  await K.page.evaluate(function () { COOK.auto(true); });
  await K.until(function (x) { return x.screen === 'reveal'; }, 20000, 'reveal');
  await wait(600);
  var s = await K.st(), ls = await K.page.evaluate(function () { return JSON.parse(localStorage.getItem('ppolppol_audio') || 'null'); });
  ok(s.reason === 'file' && s.available === false && s.ctx === 'none' && s.played.length === 0, "file://: 이유 'file' · AudioContext 없음 · 재생 0 (" + s.reason + ')');
  ok(s.enabled === true && s.cook.pageOn === true && ls === null, 'file://: ?sound=1 은 이 페이지에서만 (저장된 설정을 쓰지 않는다 · 웹 주소로 열면 들린다)');
  ok((await K.live()).err === 0, '부엌 오류 0');
  ok(K.bag.errors.length === 0, 'E: 콘솔 · 페이지 오류 0' + (K.bag.errors.length ? ' — ' + K.bag.errors.slice(0, 3).join(' | ') : ''));
  await K.close();
}

async function scenarioF(browser, base) {
  console.log('\n== F. 탭 숨김: 지글 중 숨김 → 멈춤 → 돌아오면 불 켜기 소리 없이 다시');
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&recipe=jeon&seed=11', audio: { on: false, music: 0, sfx: 0.8 } });
  ok(!!(await K.unlock()), '첫 탭 → 켜짐');
  await K.until(function (x) { return x.kind === 'tap' && x.phase === 'step'; }, 5000, 'tap');
  await wait(400);
  for (var i = 0; i < 3; i++) { await K.page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await wait(320); }
  await K.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 5000, 'flip');
  await wait(800);
  await K.tap(144, 176);
  ok(!!(await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_0'; }, 4000)), '불 켜기 → 지글 0');
  await wait(600);
  await K.page.evaluate(function () {
    Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'hidden'; } });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await wait(400);
  var s1 = await K.st();
  ok(!s1.cook.loop && s1.cook.log[s1.cook.log.length - 1].ev === 'stop' && s1.ctx !== 'running', '숨김 → quiet: 루프 멈춤 · AudioContext 쉼 (' + s1.ctx + ')');
  await K.page.evaluate(function () { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  var s2 = await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_0' && x.ctx === 'running'; }, 4000);
  var last = s2 && s2.cook.log[s2.cook.log.length - 1];
  ok(!!s2 && last.ev === 'resume' && last.fade === 0.3, '돌아옴 → 같은 굽기 루프를 0.3 s 로 다시 (resume) ' + JSON.stringify(last));
  ok(!!s2 && ids(s2, /^cook_heat_on_\d$/).length === 1, '돌아왔을 땐 불 켜기 소리가 다시 나지 않는다 (heat_on 한 번뿐)');
  await K.page.evaluate(function () { document.querySelector('.ck-verb').click(); });
  var s3 = await K.waitSt(function (x) { return ids(x, /^cook_flip_\d$/).length === 1 && !x.cook.loop; }, 3000);
  ok(!!s3, '뒤집기 → 뒤집기 소리 · 루프 멈춤');
  noErrors(K, 'F');
  await K.close();
}

async function scenarioH(browser, base) {
  console.log('\n== H. 첫 손길이 바로 불 켜기: 그 탭이 소리를 풀고, 불 켜기 소리 + 지글 0 부터');
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&recipe=jeon&seed=13', audio: { on: false, music: 0, sfx: 0.8 } });
  await K.until(function (x) { return x.kind === 'tap' && x.phase === 'step'; }, 5000, 'tap');
  await wait(400);
  for (var i = 0; i < 3; i++) { await K.page.evaluate(function () { document.querySelector('.ck-verb').click(); }); await wait(320); }   /* 스크립트 클릭 = 사용자 동작이 아니다 */
  await K.until(function (x) { return x.kind === 'flip' && x.phase === 'step'; }, 5000, 'flip');
  await wait(800);
  var s0 = await K.st();
  ok(!s0.started && s0.ctx === 'none', '불 켜기 전: 아직 잠김 (사용자 동작 없음)');
  await K.tap(144, 176);   /* 진짜 터치: pointerdown 에 불이 켜지고 (sizzle 0 은 아직 잠김), pointerup 에 소리가 풀린다 */
  var s1 = await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_0'; }, 6000);
  var lg = s1 ? s1.cook.log : [];
  ok(!!s1 && lg.length === 1 && lg[0].ev === 'start' && lg[0].fade === 1 && ids(s1, /^cook_heat_on_\d$/).length === 1, '켜지자마자 그 불: heat_on + 지글 0 을 1 s 페이드인 (기억해 둔 불) ' + JSON.stringify(lg));
  noErrors(K, 'H');
  await K.close();
}

async function scenarioI(browser, base) {
  console.log('\n== I. 첫 손길이 바로 팬: 팬 들기 소리가 사라지지 않는다');
  var A0 = { on: false, music: 0, sfx: 0.8 };
  /* a: 목록과 첫 소리 바이트를 미리 받아 둔 뒤, 첫 손길 = 팬 (그 손길이 잠금을 푼다) */
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&seed=14', audio: A0 });
  var s0 = await K.waitSt(function (x) { return x.cook.ready && x.cook.pre.length >= 4; }, 8000);
  ok(!!s0 && s0.ctx === 'none' && s0.played.length === 0, 'I: 첫 손길 전: 목록 · 첫 소리 바이트만 받아 둠 (' + (s0 && s0.cook.pre.join(',')) + '), AudioContext · 소리 없음');
  await K.tapEl('.ck-prop');
  var s1 = await K.waitSt(function (x) { return ids(x, /^cook_pick_\d$/).length > 0; }, 4000);
  ok(!!s1, 'I: 첫 손길이 팬이어도 팬 들기 소리가 난다');
  noErrors(K, 'I a');
  await K.close();
  /* b: 목록이 늦게 온다 (느린 망): 첫 손길(팬) 때 아직 안 풀렸어도, 풀린 뒤 0.3 s 안이면 그 소리를 낸다 */
  K = await kitchen(browser, { url: base + '/cook.html?sound=1&seed=15', audio: A0,
    route: function (ctx) { return ctx.route('**/audio/manifest.json', async function (r) { await wait(200); await r.continue(); }); } });
  await K.tapEl('.ck-prop');
  var s2 = await K.waitSt(function (x) { return ids(x, /^cook_pick_\d$/).length > 0; }, 5000);
  ok(!!s2, 'I: 목록이 200 ms 늦게 와도 첫 손길의 팬 들기 소리가 난다 (기억해 둔 act)');
  var l2 = await K.live();
  ok(l2.screen === 'step' && l2.err === 0, 'I: 부엌은 그대로 (' + l2.screen + ')');
  noErrors(K, 'I b');
  await K.close();
}

async function scenarioJ(browser, base) {
  console.log('\n== J. 못 받은 변형: cook_flip_1 404 → 뒤집기마다 cook_flip_2, 다시 받지 않는다');
  var re = /\/foley\/cook\/cook_flip_1\./;
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&recipe=jeon&seed=16', audio: { on: false, music: 0, sfx: 0.8 }, allow: re,
    route: function (ctx) { return ctx.route('**/foley/cook/cook_flip_1.*', function (r) { return r.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' }); }); } });
  ok(!!(await K.unlock()), 'J: 첫 탭 → 켜짐');
  await K.page.evaluate(function () { AUDIO.on('cook', { act: 'sizzle', band: 0 }); });   /* 지글이 뒤집기 두 변형을 미리 받는다 (하나는 없다) */
  await wait(900);
  for (var i = 0; i < 6; i++) { await K.page.evaluate(function () { AUDIO.on('cook', { act: 'flip', band: 1 }); }); await wait(420); }
  await wait(300);
  var s = await K.st(), fl = ids(s, /^cook_flip_\d$/), asked = K.bag.net.filter(function (u) { return re.test(u); }).length;
  ok(fl.length === 6 && fl.every(function (x) { return x.id === 'cook_flip_2'; }), 'J: 뒤집기 6번 → 6번 모두 들린다, 있는 변형으로 (' + fl.map(function (x) { return x.id.slice(-1); }).join('') + ')');
  ok(asked <= 2, 'J: 없는 변형은 한 번만 받아 본다 (ogg + m4a = ' + asked + ' 번)');
  noErrors(K, 'J');
  await K.close();
}

async function scenarioK(browser, base) {
  console.log('\n== K. 효과음 0: 부엌 덕킹 없음 · 올리면 다시');
  var K = await kitchen(browser, { url: base + '/cook.html?sound=1&recipe=jeon&seed=17', audio: { on: false, music: 0.8, sfx: 0 } });
  ok(!!(await K.unlock()), 'K: 첫 탭 → 켜짐');
  await K.page.evaluate(function () { AUDIO.on('cook', { act: 'sizzle', band: 0 }); });
  var s0 = await K.waitSt(function (x) { return x.cook.loop === 'cook_sizzle_0'; }, 4000);
  await wait(1300);
  var s1 = await K.st();
  ok(!!s0 && s1.cook.bed === 0 && s1.cook.duck > 0.95 && s1.cook.ambDuck > 0.95, 'K: 효과음 0 → 지글이 돌아도 음악 · 비를 내리지 않는다 (' + s1.cook.duck + ', ' + s1.cook.ambDuck + ')');
  await K.page.evaluate(function () { AUDIO.setVolume('sfx', 0.8); });
  var s2 = await K.waitSt(function (x) { return x.cook.bed === 2 && Math.abs(x.cook.duck - Math.pow(10, -10 / 20)) < 0.04; }, 4000);
  ok(!!s2, 'K: 효과음을 올리면 지글 덕킹 (-10 dB)');
  var ls = await K.page.evaluate(function () { return JSON.parse(localStorage.getItem('ppolppol_audio') || 'null'); });
  ok(ls && ls.on === false && ls.sfx === 0.8, 'K: 크기는 저장해도 ?sound=1 의 켜짐은 저장하지 않는다 ' + JSON.stringify(ls));
  noErrors(K, 'K');
  await K.close();
}

/* js/audio.js 의 fadeIn · levelAt · fadeOut 을 그대로 잘라 OfflineAudioContext 에서 (상수 1 소스 → 출력 = gain) */
function cutFn(src, name) {
  var a = src.indexOf('  function ' + name + '('); if (a < 0) throw new Error('no ' + name);
  var depth = 0, i = src.indexOf('{', a);
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (!depth) break; } }
  return src.slice(a, i + 1);
}
async function scenarioL(browser) {
  console.log('\n== L. 페이드: 페이드인 도중의 quiet · 크로스페이드가 지금 크기에서 부드럽게 (OfflineAudioContext)');
  var src = fs.readFileSync(path.join(ROOT, 'js/audio.js'), 'utf8'), seg = (src.match(/var FADE_SEG = (\d+);/) || [0, '16'])[1];
  var code = ['var FADE_SEG = ' + seg + ';', cutFn(src, 'dbg'), cutFn(src, 'fadeIn'), cutFn(src, 'levelAt'), cutFn(src, 'fadeOut'), 'return { fadeIn: fadeIn, fadeOut: fadeOut };'].join('\n');
  var ctx = await browser.newContext(), page = await ctx.newPage();
  var out = await page.evaluate(async function (code) {
    async function run(noCH, eqp, cutAt, pop) {
      var sr = 48000, c = new OfflineAudioContext(1, sr * 1.6, sr);
      var F = new Function('now', code)(function () { return c.currentTime; });
      var s = c.createConstantSource(), g = c.createGain(); g.gain.value = 0;
      if (noCH) g.gain.cancelAndHoldAtTime = undefined;   /* Firefox: no cancelAndHoldAtTime */
      s.connect(g); g.connect(c.destination); s.start(0);
      var P = pop ? { db: 4, rel: 0.5 } : null, t0 = 0.05, dur = pop ? 0.15 : 1.0;
      F.fadeIn(g, t0, dur, 1, P);
      var n = { g: g, src: { stop: function () {} }, level: 1, dead: false, fi: { t: t0, dur: dur, lv: 1, pop: P } };
      c.suspend(cutAt).then(function () { F.fadeOut(n, c.currentTime, eqp ? 0.15 : 0.25, eqp); c.resume(); });
      var d = (await c.startRendering()).getChannelData(0), jump = 0;
      for (var j = Math.round((cutAt - 0.01) * sr); j < Math.round((cutAt + 0.3) * sr); j++) jump = Math.max(jump, Math.abs(d[j + 1] - d[j]));
      return { noCH: noCH, eqp: eqp, pop: !!pop, cutAt: cutAt, before: d[Math.round((cutAt - 0.003) * sr)], after: d[Math.round((cutAt + 0.003) * sr)], jump: jump, end: d[Math.round((cutAt + 0.3) * sr)] };
    }
    var r = [];
    for (var noCH of [false, true]) for (var eqp of [false, true]) { r.push(await run(noCH, eqp, 0.25, false)); r.push(await run(noCH, eqp, 0.13, true)); r.push(await run(noCH, eqp, 0.4, true)); }
    return r;
  }, code);
  await ctx.close();
  var bad = out.filter(function (x) { return !(x.after >= 0.75 * x.before && x.after <= 1.15 * x.before + 0.02 && x.jump < 0.01 && x.end < 0.05); });
  ok(out.length === 12 && bad.length === 0, 'L: 페이드인 도중 내리기 12가지 (지수 · 등전력, 치익 도중 · 뒤, cancelAndHold 있음 · 없음): 지금 크기에서 이어 내려간다 ' +
    (bad.length ? JSON.stringify(bad.slice(0, 2)) : '(가장 큰 한 샘플 걸음 ' + Math.max.apply(null, out.map(function (x) { return x.jump; })).toFixed(4) + ')'));
}

/* 플레이어 글자 검사 (tools/smoke.js glyphGuardInit 와 같은 허용 글자) — 크레딧 글귀(.cr-line)는 파일 이름의 '_' 만 더 허용 */
var BAD = /[^\sA-Za-z0-9.,!?:;'"()\/%+~\-ᄀ-ᇿ㄰-㆏가-힣·…‘’“”—–]/gu;
function creditLines() {
  var md = fs.readFileSync(path.join(ROOT, 'foley/CREDITS.md'), 'utf8'), sec = md.split(/^## /m).filter(function (s) { return /^꼭 넣을 크레딧/.test(s); })[0] || '';
  return sec.split('\n').filter(function (l) { return /^- "/.test(l); }).map(function (l) { return l.slice(2).trim(); });
}
async function scenarioG(browser, base) {
  console.log("\n== G. 크레딧: 부엌 조리대 · credits.html · 본 게임 설정 맨 아래 '만든 것들'");
  var K = await kitchen(browser, { url: base + '/cook.html?seed=12' });
  var p = K.page;
  function linkNow() {
    return p.evaluate(function () {
      var a = document.querySelector('#cook-dlg .ckh-credits'), st = document.querySelector('.ck-stage');
      if (!a) return null;
      var r = a.getBoundingClientRect(), s = st.getBoundingClientRect(), cs = getComputedStyle(a);
      return { shown: cs.display !== 'none' && r.width > 0, text: a.textContent, href: a.getAttribute('href'), x: r.left, r: r.right, y: r.top, b: r.bottom, h: r.height, vw: innerWidth, vh: innerHeight,
        overStage: r.bottom > s.top && r.top < s.bottom, color: cs.color, size: cs.fontSize };
    });
  }
  var c0 = await linkNow();
  ok(c0 && c0.shown && c0.text === '만든 것들' && c0.href === 'credits.html?from=cook', "조리대: 맨 아래 '만든 것들' 글자 링크 하나 → credits.html " + JSON.stringify(c0 && { href: c0.href, size: c0.size }));
  ok(c0 && c0.h >= 44 && c0.x >= 0 && c0.r <= c0.vw && c0.b <= c0.vh && !c0.overStage, '누르는 곳 44px · 화면 안 · 무대(팬)와 안 겹침 (' + (c0 && Math.round(c0.h)) + 'px)');
  await p.screenshot({ path: path.join(SHOTS, 'counter-credits-360.png') });
  await K.tapEl('.ck-prop');
  await K.until(function (x) { return x.screen === 'step'; }, 3000, 'step');
  var c1 = await linkNow();
  ok(c1 && !c1.shown, '단계 중엔 링크 없음 (부엌을 가리지 않게)');
  await p.evaluate(function () { COOK.close(); });
  await wait(300);
  var c2 = await p.evaluate(function () { var a = document.querySelector('.ck-home > .ckh-credits'), r = a && a.getBoundingClientRect(); return a ? { shown: getComputedStyle(a).display !== 'none' && r.width > 0, href: a.getAttribute('href'), b: r.bottom, vh: innerHeight } : null; });
  ok(c2 && c2.shown && c2.href === 'credits.html?from=cook' && c2.b <= c2.vh, "부엌을 닫은 화면에도 '부엌' 단추 아래 같은 링크");
  await p.evaluate(function () { document.getElementById('ck-door').click(); });
  await wait(300);
  await K.tapEl('#cook-dlg .ckh-credits');
  await p.waitForURL(/credits\.html\?from=cook$/, { timeout: 8000 });
  await p.waitForLoadState('load');
  var cr = await p.evaluate(function (bad) {
    var BADRE = new RegExp(bad, 'gu'), out = [];
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var pe = n.parentElement; if (!pe || pe.closest('script, style')) continue;
      var t = n.nodeValue; if (pe.closest('.cr-line')) t = t.replace(/_/g, '');
      var m = t.match(BADRE); if (m) out.push(m.join(''));
    }
    return { lines: [].map.call(document.querySelectorAll('.cr-line'), function (x) { return x.textContent.replace(/\s+/g, ' ').trim(); }),
      hrefs: [].map.call(document.querySelectorAll('a[href]'), function (a) { return a.getAttribute('href'); }), bad: out, back: document.getElementById('cr-back').getAttribute('href'),
      h1: document.querySelector('h1').textContent, sw: document.documentElement.scrollWidth, iw: innerWidth };
  }, BAD.source);
  var want = creditLines();
  console.log('   credits:', JSON.stringify({ lines: cr.lines.length, hrefs: cr.hrefs.length, back: cr.back }));
  ok(want.length === 2 && cr.lines.length === 2 && cr.lines[0] === want[0] && cr.lines[1] === want[1], 'credits.html: CC BY 두 줄이 foley/CREDITS.md 와 글자 그대로 (DavidW · Vinrax, 바꾼 것까지)');
  ok(['https://opengameart.org/content/kitchen-ambience-sfx', 'https://creativecommons.org/licenses/by/4.0/', 'https://opengameart.org/content/water-sounds', 'https://creativecommons.org/licenses/by/3.0/', 'http://vinraxarts.ru']
    .every(function (u) { return cr.hrefs.indexOf(u) >= 0; }), 'CC BY 줄의 주소는 모두 링크');
  var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'foley/manifest.json'), 'utf8')), pages = {};
  Object.keys(man.credits).forEach(function (k) { var c = man.credits[k]; if (/^CC0/.test(c.license)) pages[c.page] = 1; });
  var miss = Object.keys(pages).filter(function (u) { return cr.hrefs.indexOf(u) < 0; });
  ok(Object.keys(pages).length === 11 && !miss.length, 'CC0 원본 페이지 ' + Object.keys(pages).length + '곳 모두 고마움으로 (빠짐 ' + miss.join(', ') + ')');
  ok(cr.hrefs.indexOf('vendor/fonts/GALMURI-LICENSE.txt') >= 0 && cr.hrefs.indexOf('vendor/THREE-LICENSE.txt') >= 0, '글꼴 Galmuri (OFL) · three.js (MIT) 라이선스 파일 링크');
  ok(cr.back === 'cook.html' && cr.h1 === '만든 것들', "부엌에서 왔으면 '돌아가기' 는 부엌으로");
  ok(cr.bad.length === 0, '이모지 · 장식 기호 없음 (게임 화면과 같은 글자 규칙) ' + cr.bad.join(' '));
  var lic = await Promise.all(['vendor/fonts/GALMURI-LICENSE.txt', 'vendor/THREE-LICENSE.txt'].map(function (u) { return p.evaluate(function (x) { return fetch(x).then(function (r) { return r.status; }); }, u); }));
  ok(lic.every(function (x) { return x === 200; }), '라이선스 파일이 실제로 있다 (' + lic.join(', ') + ')');
  await p.setViewportSize({ width: 320, height: 640 });
  await wait(200);
  var w320 = await p.evaluate(function () { return { sw: document.documentElement.scrollWidth, iw: innerWidth }; });
  ok(w320.sw <= w320.iw, '320 px 폰: 가로 넘침 없음 (' + w320.sw + '/' + w320.iw + ')');
  await p.screenshot({ path: path.join(SHOTS, 'credits-320.png'), fullPage: true });
  await p.setViewportSize({ width: 360, height: 740 });
  await p.click('#cr-back');
  await p.waitForURL(/cook\.html/, { timeout: 8000 });
  ok(/cook\.html\?seed=12$/.test(p.url()), "'돌아가기' → 온 곳(부엌)으로 (" + p.url().replace(base, '') + ')');
  noErrors(K, 'G 부엌 · 크레딧');
  await K.close();

  /* 본 게임: 설정 시트 맨 아래 · 소리를 켜도 부엌 act 가 없으면 foley/ 요청 0 */
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' });
  await ctx.addInitScript('window.__ppolAwakeMs = 0;');
  var page = await ctx.newPage(), bag = watch(page, null);
  await page.goto(base + '/index.html');
  await page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
  var g = await page.evaluate(function () {
    var a = document.getElementById('set-credits'), b = document.getElementById('set-body');
    if (!a) return null;
    a.scrollIntoView({ block: 'center' });
    var r = a.getBoundingClientRect(), cs = getComputedStyle(a);
    return { text: a.textContent, href: a.getAttribute('href'), last: b.lastElementChild === a.parentElement, h: r.height, w: r.width, color: cs.color, size: cs.fontSize };
  });
  ok(g && g.text === '만든 것들' && g.href === 'credits.html' && g.last, "본 게임 설정 시트: 맨 아래 '만든 것들' 글자 링크 하나 → credits.html " + JSON.stringify(g));
  ok(g && g.h >= 44, '설정의 링크: 글자는 작아도 누르는 곳 44px (' + (g && Math.round(g.h)) + 'px)');
  await page.screenshot({ path: path.join(SHOTS, 'settings-credits-360.png') });
  await page.click('#set-sound');
  var on = await page.waitForFunction(function () { var x = AUDIO.state(); return x.started && x.ctx === 'running'; }, null, { timeout: 15000 }).then(function () { return true; }, function () { return false; });
  await wait(3200);
  ok(on && !bag.net.some(function (u) { return /\/foley\//.test(u); }), '본 게임에서 소리를 켜도 부엌이 없으면 foley/ 는 받지 않는다 (부엌 층은 필요할 때만)');
  await page.click('#set-credits');
  await page.waitForURL(/credits\.html$/, { timeout: 8000 });
  var back = await page.evaluate(function () { return document.getElementById('cr-back').getAttribute('href'); });
  ok(back === 'index.html', "게임에서 왔으면 '돌아가기' 는 게임으로 (" + back + ')');
  ok(bag.errors.length === 0, 'G 본 게임: 콘솔 · 페이지 오류 0' + (bag.errors.length ? ' — ' + bag.errors.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}

(async function main() {
  var srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port, t0 = Date.now();
  var browser = await chromium.launch();
  var all = { A: scenarioA, B: scenarioB, C: scenarioC, D: scenarioD, E: scenarioE, F: scenarioF, H: scenarioH, I: scenarioI, J: scenarioJ, K: scenarioK, L: scenarioL, G: scenarioG };
  try {
    for (var k in all) {
      if (ONLY.length && ONLY.indexOf(k) < 0) continue;
      try { await all[k](browser, base); }
      catch (e) { fails++; console.error('  FAIL ' + k + ' threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
    }
  } finally { await browser.close(); srv.close(); }
  console.log('\n' + passes + ' passed, ' + fails + ' failed (' + Math.round((Date.now() - t0) / 1000) + ' s) · 캡처 ' + SHOTS);
  process.exit(fails ? 1 : 0);
})();
