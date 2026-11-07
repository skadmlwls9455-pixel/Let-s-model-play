#!/usr/bin/env node
/* tools/walk-strip.js — 뒤뚱 걸음 증거 (DESIGN §7.1 "걸음", docs/SCENE.md "움직임"). SwiftShader (look-shots 와 같은 인자), 360×326 장면 @2x, p=2.
 *   node tools/walk-strip.js [palette]   # 기본 apollo
 * → tests/evidence/look/walk-strip.png       다락: window → crate 걷기(1.2 m/s), 정상 걸음에 들어선 뒤 12프레임 × 1/12 s (= 한 발 0.5 s × 좌우 = 한 주기)
 *   tests/evidence/look/walk-strip-smooth.png 같은 구간, 굴림을 매끈하게(gaitStyle('smooth')) — 3단 스텝과 비교용
 *   tests/evidence/look/walk-strip-ext.png   바깥 길(출발 의식, 1.8 m/s) 12프레임 × 1/12 s
 * 크롭 120×120 CSS px 는 문어의 **바닥 점**(octG 월드 위치, 이미 픽셀 격자에 스냅됨)을 따라가고, 원점은 캔버스 원점 + 아트 픽셀(2 CSS px) 배수 → 통통·기울임이 크롭 안에서 보인다.
 * 앱(app.js) 없이 독립 하네스 (exterior-shots.js 와 같은 방식). 검사: 굴림 부호가 걸음마다 번갈아 · 세로 0/1px · 다리 위상 · 모션 감소에서 굴림/통통/눌림 0 · 초상 뒤 걸음 변환 복원 · 콘솔/페이지 에러 0. 어기면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var PALETTE = process.argv[2] ? String(process.argv[2]).replace(/[^A-Za-z0-9_]/g, '') : 'apollo';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/look');
fs.mkdirSync(OUT, { recursive: true });
var W = 360, H = 326, DPR = 2, P = 2, CROP = 120, FRAMES = 12, DT = 1 / 12;

/* 최소 PNG 인코더 + 가로 스트립 (look-strip.js 와 같음) */
var CRC = (function () { var t = new Int32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { var c = -1; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type, 'ascii'), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function strip(frames) {
  var imgs = frames.map(function (b) { var tmp = path.join(os.tmpdir(), 'walk-frame-' + process.pid + '.png'); fs.writeFileSync(tmp, b); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; });
  var w = imgs[0].w, h = imgs[0].h, gap = 2, Wd = w * imgs.length + gap * (imgs.length - 1), out = Buffer.alloc(Wd * h * 4);
  for (var f = 0; f < imgs.length; f++) for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var si = (y * w + x) * imgs[f].bpp, di = (y * Wd + f * (w + gap) + x) * 4;
    out[di] = imgs[f].px[si]; out[di + 1] = imgs[f].px[si + 1]; out[di + 2] = imgs[f].px[si + 2]; out[di + 3] = 255;
  }
  return encodePNG(Wd, h, out);
}
function harness() {
  var u = function (p) { return 'file://' + path.join(ROOT, p); };
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1b1522}#scene{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#1b1522;display:flex;align-items:center;justify-content:center}#scene canvas{display:block;image-rendering:pixelated}</style></head><body><div id="scene"></div>' +
    '<script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  var f = path.join(os.tmpdir(), 'ppol-walk-strip-' + process.pid + '.html'); fs.writeFileSync(f, html); return f;
}

(async function () {
  var file = harness();
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  var ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [], bad = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); });
  await page.goto('file://' + file);
  var ok = await page.evaluate(function (pal) {
    if (!window.SCENE3D || !SCENE3D.supported()) return 'no webgl';
    window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 8, items: ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'], weather: 'clear', hour: 14, palette: pal, look: { pixelSize: 2 } });
    return 'ok';
  }, PALETTE);
  if (ok !== 'ok') { console.error('3D 하네스 실패: ' + ok); process.exit(1); }
  await page.waitForTimeout(600);
  await page.evaluate(function () { SC.pause(); SC.setSeason('autumn'); SC.setTime(14, true); SC.setWeather('clear'); });
  async function step(sec, dt) { dt = dt || 0.1; var n = Math.round(sec / dt); for (var i = 0; i < n; i++) await page.evaluate(function (d) { SC.debugStep(d); }, dt); }
  var box = await page.locator('#scene').boundingBox(), cbox = await page.locator('#scene canvas').boundingBox();
  async function clip() {   /* 문어 바닥 점 + 머리 쪽으로 30 CSS px 위 = 크롭 중심 */
    var c = await page.evaluate(function () { var a = SC.motion().gait.at; return SC.screenOf(a[0], a[1], a[2]); });
    var cx = c.x + box.x - cbox.x, cy = c.y - 30 + box.y - cbox.y;
    var x = Math.max(0, Math.min(cbox.width - CROP, Math.floor((cx - CROP / 2) / P) * P)), y = Math.max(0, Math.min(cbox.height - CROP, Math.floor((cy - CROP / 2) / P) * P));
    return { x: cbox.x + x, y: cbox.y + y, width: CROP, height: CROP };
  }
  async function capture(name) {
    var frames = [], log = [], g = [];
    for (var f = 0; f < FRAMES; f++) {
      await page.evaluate(function (d) { SC.debugStep(d); }, DT);
      frames.push(await page.screenshot({ clip: await clip() }));
      var m = await page.evaluate(function () { var m = SC.motion(); return { g: m.gait, sy: m.squashY, place: m.place }; });
      g.push(m); log.push('s' + m.g.step + ' r' + m.g.roll + ' y' + m.g.yaw + ' b' + m.g.bobPx + ' q' + m.sy);
    }
    var out = path.join(OUT, name + '.png'); fs.writeFileSync(out, strip(frames));
    console.log('  🎞 ' + path.relative(ROOT, out) + '  (' + FRAMES + ' × ' + DT.toFixed(3) + ' s, crop ' + CROP + '×' + CROP + ' CSS px @' + DPR + 'x, ' + g[0].g.style + ')');
    console.log('     step/roll°/yaw°/bob px/squashY: ' + log.join(' | '));
    /* 검사: 걷는 중 · 굴림 +/− 둘 다 · 통통 0/1px 둘 다 · 걸음 ≥ 2 번 바뀜 */
    var rolls = g.map(function (m) { return m.g.roll; }), bobs = g.map(function (m) { return m.g.bobPx; }), steps = g.map(function (m) { return m.g.step; });
    if (!g.every(function (m) { return m.g.moving; })) bad.push(name + ': not walking in every frame');
    if (!(Math.max.apply(null, rolls) > 3 && Math.min.apply(null, rolls) < -3)) bad.push(name + ': roll does not alternate ' + rolls);
    if (bobs.indexOf(0) < 0 || bobs.indexOf(1) < 0 || bobs.some(function (b) { return b < 0 || b > 1; })) bad.push(name + ': bob not 0/1 px ' + bobs);
    if (steps[steps.length - 1] - steps[0] < 1) bad.push(name + ': fewer than 2 steps');
    return g;
  }

  /* 1. 다락: window → crate (3.4 m, 2.8 s @ 1.2 m/s). 예비 동작 0.12 s + 첫 걸음 0.5 s 지난 뒤부터 */
  async function attic(style, name) {
    await page.evaluate(function (s) { SC.gaitStyle(s); SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('window'); }, style);
    await step(0.5);
    var a0 = await page.evaluate(function () { SC.setOctState('walk'); SC.moveTo('crate'); SC.debugStep(1 / 30); return SC.motion(); });
    console.log('start (antic): ' + JSON.stringify({ antic: a0.gait.antic, lean: a0.gait.lean, squashY: a0.squashY, moving: a0.gait.moving }));
    if (style === 'stepped' && !(a0.gait.antic && a0.gait.lean < 0 && a0.squashY < 0.95)) bad.push('no anticipation on start: ' + JSON.stringify(a0.gait));
    await step(0.66, 1 / 12);
    return capture(name);
  }
  await attic('smooth', 'walk-strip-smooth');
  await attic('stepped', 'walk-strip');
  /* 초상: 걷는 중에 찍어도 걸음 변환이 그대로 돌아와야 한다 */
  var pr = await page.evaluate(function () { var b = SC.motion(); SC.portrait('idle'); SC.portrait('happy', { bg: 'navy' }); var a = SC.motion(); return { before: [b.tilt, b.squashY, b.hop], after: [a.tilt, a.squashY, a.hop] }; });
  console.log('portrait mid-walk keeps walk pose: ' + JSON.stringify(pr));
  if (JSON.stringify(pr.before) !== JSON.stringify(pr.after)) bad.push('portrait changed walk pose');
  /* 멈춤: 정착 (굴림이 0 을 넘었다 돌아오고 1px 통통 한 번) */
  for (var k = 0; k < 60; k++) { var mv = await page.evaluate(function () { SC.debugStep(1 / 12); return SC.motion().gait.moving; }); if (!mv) break; }
  var settle = [];
  for (k = 0; k < 6; k++) settle.push(await page.evaluate(function () { SC.debugStep(1 / 12); var m = SC.motion(); return m.gait.roll + '°/' + m.gait.bobPx + 'px'; }));
  console.log('settle after stop (roll/bob per 1/12 s): ' + settle.join(' '));

  /* 2. 바깥 길: 출발 의식, 계단 폴짝 뒤 길 걷기 두 걸음째부터 */
  await page.evaluate(function () { SC.gaitStyle('stepped'); SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('door'); });
  await step(0.5);
  await page.evaluate(function () { SC.departCeremony(function () {}); });
  var ready = false;
  for (k = 0; k < 120 && !ready; k++) ready = await page.evaluate(function () { SC.debugStep(1 / 12); var m = SC.motion(); return m.place === 'exterior' && !m.trans && m.gait.moving && m.gait.at[1] < 0.05; });
  if (!ready) bad.push('exterior path walk not reached');
  /* 출구 앞 0.5 m 에서 멈추고 손을 흔들므로 길 걷기가 짧다: 걷기가 시작되면 바로 찍는다 */
  await capture('walk-strip-ext');

  /* 3. 모션 감소: 굴림·통통·눌림 없음, 이동 즉시 */
  var red = await page.evaluate(function () {
    SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('window'); SC.setReducedMotion(true); SC.setOctState('walk');
    var r = []; SC.moveTo('crate'); for (var i = 0; i < 6; i++) { SC.debugStep(1 / 12); var m = SC.motion(); r.push([m.gait.roll, m.gait.bobPx, m.squashY, m.tilt]); }
    SC.setReducedMotion(false); return r;
  });
  console.log('reduced motion (roll/bob/squashY/tilt): ' + JSON.stringify(red));
  if (red.some(function (v) { return v[0] !== 0 || v[1] !== 0 || v[2] !== 1 || v[3] !== 0; })) bad.push('reduced motion still waddles');
  console.log('errors:', errs.length ? errs : 'none');
  if (bad.length) console.log('FAIL:', bad);
  await browser.close();
  try { fs.unlinkSync(file); } catch (e) { /* noop */ }
  process.exit(errs.length || bad.length ? 1 : 0);
})();
