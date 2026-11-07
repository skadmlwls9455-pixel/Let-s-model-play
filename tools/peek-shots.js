#!/usr/bin/env node
/* tools/peek-shots.js — 바깥 기웃 증거 (docs/SCENE.md "바깥 기웃"). SwiftShader 로 WebGL 강제 (exterior-shots 와 같은 인자), 360×326 장면 @2x.
 *   node tools/peek-shots.js [palette]   # 기본 apollo
 * → tests/evidence/look/peek-strip.png  : 출발 의식 뒤 기웃 3번 (sea/read+first → hands/builtin → wild/failed), 기웃마다 4프레임
 *                                         (걷는 중 · 도착 0.1 s · 0.55 s · 1.05 s) = 12프레임, 문어를 따라가는 120×120 CSS px 크롭
 *   tests/evidence/look/peek-spots.png  : 자리마다 한 장 (갈래 9 + 특별한 방 3) 4열 × 3행 — 순서는 콘솔 출력
 * 앱(app.js) 없이 독립 하네스: three · palettes · scene3d 만 로드 (exterior-shots 와 같음). 계절 = 실제 월(auto), 낮 14시, 맑음.
 * 크롭 원점은 캔버스 원점 + 아트 픽셀(p=2 → 2 CSS px) 배수 → 통 픽셀.
 * 검사: 기웃마다 문어가 보이고 바깥 · 자리마다 위치가 다름 · 상태별 자세/표정이 다름 · 기웃 Promise 풀림 · leaveOutside 뒤 returnCeremony 가 다락에서 끝남 ·
 *       모션 감소 기웃 ≤ 0.5 s · 바깥 드로우콜 ≤ 150 · 콘솔/페이지 에러 0. 하나라도 어기면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var PALETTE = process.argv[2] ? String(process.argv[2]).replace(/[^A-Za-z0-9_]/g, '') : 'apollo';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/look');
fs.mkdirSync(OUT, { recursive: true });
var W = 360, H = 326, DPR = 2, P = 2, CROP = 120, DT = 1 / 12;

/* 최소 PNG 인코더 + 격자 합성 (exterior-shots.js 와 같은 인코더) */
var CRC = (function () { var t = new Int32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { var c = -1; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type, 'ascii'), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function grid(frames, cols) {
  var imgs = frames.map(function (b) { var tmp = path.join(os.tmpdir(), 'peek-frame-' + process.pid + '.png'); fs.writeFileSync(tmp, b); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; });
  var w = imgs[0].w, h = imgs[0].h, gap = 2, rows = Math.ceil(imgs.length / cols), Wd = w * cols + gap * (cols - 1), Hd = h * rows + gap * (rows - 1), out = Buffer.alloc(Wd * Hd * 4);
  for (var i = 0; i < out.length; i += 4) { out[i] = 27; out[i + 1] = 21; out[i + 2] = 34; out[i + 3] = 255; }
  for (var f = 0; f < imgs.length; f++) {
    var ox = (f % cols) * (w + gap), oy = Math.floor(f / cols) * (h + gap);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var si = (y * w + x) * imgs[f].bpp, di = ((oy + y) * Wd + ox + x) * 4;
      out[di] = imgs[f].px[si]; out[di + 1] = imgs[f].px[si + 1]; out[di + 2] = imgs[f].px[si + 2]; out[di + 3] = 255;
    }
  }
  return encodePNG(Wd, Hd, out);
}

function harness() {
  var u = function (p) { return 'file://' + path.join(ROOT, p); };
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1b1522}#scene{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#1b1522;display:flex;align-items:center;justify-content:center}#scene canvas{display:block;image-rendering:pixelated}</style></head><body><div id="scene"></div>' +
    '<script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  var f = path.join(os.tmpdir(), 'ppol-peek-shots-' + process.pid + '.html'); fs.writeFileSync(f, html); return f;
}

(async function () {
  var file = harness();
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  var ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [], infos = [], bad = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); if (/\[scene3d\]/.test(t)) infos.push(t); });
  await page.goto('file://' + file);
  var ok = await page.evaluate(function (pal) {
    if (!window.SCENE3D || !SCENE3D.supported()) return 'no webgl';
    window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 4, items: ['moss', 'crate', 'candle', 'blanket', 'board'], weather: 'clear', hour: 14, palette: pal, look: { pixelSize: 2 } });
    return typeof SC.peekOutside === 'function' && typeof SC.leaveOutside === 'function' && typeof SC.extSpot === 'function' ? 'ok' : 'no peek API';
  }, PALETTE);
  if (ok !== 'ok') { console.error('3D 하네스 실패: ' + ok); process.exit(1); }
  await page.waitForTimeout(500);
  await page.evaluate(function () { SC.pause(); SC.setSeason('auto'); SC.setWeather('clear'); SC.setTime(14, true); });
  var season = await page.evaluate(function () { return SC.season(); });
  console.log('season (auto, real month): ' + season);
  async function step(sec) { var n = Math.round(sec / DT); for (var i = 0; i < n; i++) await page.evaluate(function (d) { SC.debugStep(d); }, DT); }
  var box = await page.locator('#scene').boundingBox(), cbox = await page.locator('#scene canvas').boundingBox();
  async function clip() {   /* 문어 머리 꼭대기 + 22 CSS px = 몸 가운데쯤 → 크롭 중심 */
    var c = await page.evaluate(function () { var p = SC.octScreenPos(), r = document.querySelector('#scene').getBoundingClientRect(); return { x: p.x - r.left, y: p.y - r.top + 22 }; });
    var cx = c.x + box.x - cbox.x, cy = c.y + box.y - cbox.y;
    var x = Math.max(0, Math.min(cbox.width - CROP, Math.floor((cx - CROP / 2) / P) * P)), y = Math.max(0, Math.min(cbox.height - CROP, Math.floor((cy - CROP / 2) / P) * P));
    return { x: cbox.x + x, y: cbox.y + y, width: CROP, height: CROP };
  }
  function state() { return page.evaluate(function () { var m = SC.motion(), k = SC.peek(); return { place: m.place, vis: m.octVisible, cer: m.ceremony, at: m.gait.at, moving: m.gait.moving, expr: m.expr, tilt: m.tilt, sq: m.squashY, hop: m.hop, peek: k, calls: SC.stats().calls }; }); }
  function tag(s) { return s.peek.key + '/' + (s.peek.hold ? 'hold t' + s.peek.t : 'walk') + ' ' + s.expr + ' lean' + s.peek.lean + (s.peek.sit ? ' sit' : '') + (s.peek.arm ? ' arm' + s.peek.arm : '') + (s.peek.mail ? ' MAIL' : '') + (s.peek.rustle ? ' RUSTLE' : '') + ' @' + s.at.map(function (v) { return v.toFixed(2); }).join(','); }
  var maxCalls = 0;

  /* 0. 출발 의식 (다락 → 바깥, 문어 무대 밖) */
  await page.evaluate(function () { SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('door'); window.__dep = false; SC.departCeremony(function () { window.__dep = true; }); });
  for (var k = 0; k < 120 && !(await page.evaluate(function () { return window.__dep; })); k++) await step(0.25);
  var s0 = await state();
  console.log('after depart: place ' + s0.place + ' · octVisible ' + s0.vis);
  if (s0.place !== 'exterior' || s0.vis) bad.push('depart did not leave octopus off-stage outside');

  /* 1. 스트립: 기웃 3번 × 4프레임 */
  var SEQ = [{ corner: 'sea', status: 'read', first: true, emoji: '🐙' }, { corner: 'hands', status: 'builtin', emoji: '🔑' }, { corner: 'wild', status: 'failed', emoji: '❔' }];
  var frames = [], log = [], holds = [];
  for (var q = 0; q < SEQ.length; q++) {
    await page.evaluate(function (o) { window.__pk = false; SC.peekOutside(o, function () { window.__pk = true; }); }, SEQ[q]);
    await step(0.9);   /* 걷는 중 */
    var sw = await state(); frames.push(await page.screenshot({ clip: await clip() })); log.push(tag(sw));
    if (!sw.vis || sw.place !== 'exterior') bad.push(SEQ[q].corner + ': octopus not visible outside while walking');
    for (k = 0; k < 120; k++) { var hs = await state(); if (hs.peek.hold) break; await step(DT); }
    var hstates = [];
    for (var j = 0, marks = [0.1, 0.55, 1.05]; j < marks.length; j++) {
      for (k = 0; k < 40; k++) { var cs = await state(); if (!cs.peek.hold || cs.peek.t >= marks[j] - 1e-3) break; await step(DT); }
      var st = await state(); maxCalls = Math.max(maxCalls, st.calls); hstates.push(st);
      frames.push(await page.screenshot({ clip: await clip() })); log.push(tag(st));
    }
    holds.push(hstates);
    for (k = 0; k < 60 && !(await page.evaluate(function () { return window.__pk; })); k++) await step(DT);
    if (!(await page.evaluate(function () { return window.__pk; }))) bad.push(SEQ[q].corner + ': peekOutside did not resolve');
  }
  fs.writeFileSync(path.join(OUT, 'peek-strip.png'), grid(frames, frames.length));
  console.log('  🎞 tests/evidence/look/peek-strip.png (12 frames, ' + CROP + '×' + CROP + ' CSS px @' + DPR + 'x):');
  log.forEach(function (l, i) { console.log('     ' + (i + 1) + '. ' + l); });
  /* 자세 검사: 자리마다 위치 다름 · read=happy, builtin=curious, failed=calm · failed 으쓱(다리 들림) */
  var pos = holds.map(function (h) { return h[1].at; });
  for (var a = 0; a < pos.length; a++) for (var b = a + 1; b < pos.length; b++) if (Math.hypot(pos[a][0] - pos[b][0], pos[a][2] - pos[b][2]) < 0.6) bad.push('spots too close: ' + a + ',' + b);
  if (holds[0][2].expr !== 'happy') bad.push('read/first should end happy, got ' + holds[0][2].expr);
  if (holds[0][0].expr !== 'curious') bad.push('read/first should start curious, got ' + holds[0][0].expr);
  if (holds[1][1].expr !== 'curious') bad.push('builtin should be curious, got ' + holds[1][1].expr);
  if (holds[2][1].expr !== 'calm') bad.push('failed should be calm, got ' + holds[2][1].expr);
  if (!holds[2].some(function (h) { return h.peek.arm > 0.3; })) bad.push('failed: no shrug');

  /* 2. 퇴장 → 귀가 의식 (그대로 이어져야) */
  await page.evaluate(function () { window.__lv = false; SC.leaveOutside(function () { window.__lv = true; }); });
  for (k = 0; k < 120 && !(await page.evaluate(function () { return window.__lv; })); k++) await step(0.25);
  var sl = await state();
  console.log('leaveOutside: done ' + (await page.evaluate(function () { return window.__lv; })) + ' · octVisible ' + sl.vis + ' · at ' + sl.at.map(function (v) { return v.toFixed(2); }).join(','));
  if (sl.vis) bad.push('leaveOutside: octopus still visible');
  await page.evaluate(function () { window.__ret = false; SC.returnCeremony(function () { window.__ret = true; }); });
  for (k = 0; k < 120 && !(await page.evaluate(function () { return window.__ret; })); k++) await step(0.25);
  var sr = await page.evaluate(function () { return { done: window.__ret, place: SC.place(), vis: SC.motion().octVisible }; });
  console.log('returnCeremony after leave: ' + JSON.stringify(sr));
  if (!sr.done || sr.place !== 'attic' || !sr.vis) bad.push('return after leave failed ' + JSON.stringify(sr));

  /* 3. 자리마다 한 장 (4열 × 3행) */
  await page.evaluate(function () { SC.setOctState('away'); SC.setPlace('exterior', { instant: true }); });
  var SPOTS = [['sea', 'read'], ['sky', 'builtin'], ['sounds', 'builtin'], ['hands', 'builtin'], ['signs', 'read'], ['numbers', 'builtin'], ['home', 'builtin'], ['mind', 'simulated'], ['wild', 'failed'], ['slow_room', 'none'], ['letter_room', 'builtin'], ['door_out', 'builtin']];
  var shots = [], slog = [];
  for (var i = 0; i < SPOTS.length; i++) {
    var key = SPOTS[i][0], room = /_/.test(key);
    await page.evaluate(function (o) { window.__pk = false; SC.peekOutside(o, function () { window.__pk = true; }); }, room ? { roomId: key, status: SPOTS[i][1] } : { corner: key, status: SPOTS[i][1] });
    for (k = 0; k < 200; k++) { var ss = await state(); if (ss.peek.hold && ss.peek.t >= 0.5) break; await step(DT); }
    var sh = await state(); maxCalls = Math.max(maxCalls, sh.calls);
    shots.push(await page.screenshot({ clip: await clip() })); slog.push((i + 1) + '. ' + SPOTS[i][1] + ' ' + tag(sh));
    if (!sh.peek.hold || sh.peek.key !== key) bad.push(key + ': not holding at its spot');
    for (k = 0; k < 40 && !(await page.evaluate(function () { return window.__pk; })); k++) await step(DT);
  }
  fs.writeFileSync(path.join(OUT, 'peek-spots.png'), grid(shots, 4));
  console.log('  📷 tests/evidence/look/peek-spots.png (4 × 3, row-major):');
  slog.forEach(function (l) { console.log('     ' + l); });
  var spotTable = await page.evaluate(function () { return SC.EXT_SPOTS.map(function (k) { var s = SC.extSpot(k); return k + ' (' + s.x + ', ' + s.z + ') ' + Math.round(s.face * 180 / Math.PI) + '° ' + s.prop; }); });
  console.log('extSpot: ' + spotTable.join(' · '));

  /* 4. 모션 감소: 자리로 순간이동 · 0.4 s */
  var red = await page.evaluate(function () {
    SC.setReducedMotion(true); var d = false, t = 0; SC.peekOutside({ corner: 'sky', status: 'read' }, function () { d = true; });
    SC.debugStep(0.05); var m = SC.motion(), p = SC.peek(), at = m.gait.at;
    while (!d && t < 2) { SC.debugStep(0.05); t += 0.05; }
    var r = { holdAtOnce: p.hold, expr: m.expr, at: at, done: d, t: +t.toFixed(2) }; SC.setReducedMotion(false); return r;
  });
  console.log('reduced motion peek: ' + JSON.stringify(red));
  if (!red.holdAtOnce || !red.done || red.t > 0.5) bad.push('reduced-motion peek not instant/0.4 s: ' + JSON.stringify(red));
  await page.evaluate(function () { SC.leaveOutside(); });
  await step(0.2);
  console.log('max draw calls while peeking (exterior): ' + maxCalls);
  if (maxCalls > 150) bad.push('draw calls ' + maxCalls + ' > 150');
  infos.forEach(function (t) { console.log('  ' + t); });
  console.log('errors:', errs.length ? errs : 'none');
  if (bad.length) console.log('FAIL:', bad);
  await browser.close();
  try { fs.unlinkSync(file); } catch (e) { /* noop */ }
  process.exit(errs.length || bad.length ? 1 : 0);
})();
