#!/usr/bin/env node
/* tools/exterior-shots.js — 바깥·계절·전환 증거 (DESIGN §15.3, docs/SCENE.md "바깥·계절·전환"). SwiftShader 로 WebGL 강제 (look-shots 와 같은 인자), 360×326 장면 @2x.
 *   node tools/exterior-shots.js [palette]   # 기본 apollo
 * → tests/evidence/look/ext-{spring,summer,autumn,winter}-day.png · ext-winter-night.png · ext-summer-night.png
 *   + ext-depart-strip.png · ext-return-strip.png (10프레임 × 0.3 s, 문어를 따라가는 120×120 CSS px 크롭 — 크롭 원점은 캔버스 원점 + 아트 픽셀(p=2 → 2 CSS px) 배수)
 * 앱(app.js) 없이 독립 하네스: three · palettes · scene3d 만 로드하고 SCENE3D.init 을 직접 부른다 (다른 작업 중인 app.js 와 무관하게 결정적).
 * 루프를 멈추고 debugStep 으로 진행 — frame() 은 dt 를 0.1 s 로 자르므로 0.3 s 한 칸 = debugStep(0.1) × 3.
 * 검사: 샷마다 고유 색 ≤ 62 · 두 장소 드로우콜 ≤ 150 · 콘솔/페이지 에러 0. 하나라도 어기면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var PALETTE = process.argv[2] ? String(process.argv[2]).replace(/[^A-Za-z0-9_]/g, '') : 'apollo';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/look');
fs.mkdirSync(OUT, { recursive: true });
var W = 360, H = 326, DPR = 2, P = 2, CROP = 120, FRAMES = 10, STEP = 0.3;

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
  var imgs = frames.map(function (b) { var tmp = path.join(os.tmpdir(), 'ext-frame-' + process.pid + '.png'); fs.writeFileSync(tmp, b); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; });
  var w = imgs[0].w, h = imgs[0].h, gap = 2, Wd = w * imgs.length + gap * (imgs.length - 1), out = Buffer.alloc(Wd * h * 4);
  for (var f = 0; f < imgs.length; f++) for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var si = (y * w + x) * imgs[f].bpp, di = (y * Wd + f * (w + gap) + x) * 4;
    out[di] = imgs[f].px[si]; out[di + 1] = imgs[f].px[si + 1]; out[di + 2] = imgs[f].px[si + 2]; out[di + 3] = 255;
  }
  return encodePNG(Wd, h, out);
}

/* 독립 하네스 HTML (임시 파일, file:// 로 프로젝트 스크립트를 읽는다) */
function harness() {
  var u = function (p) { return 'file://' + path.join(ROOT, p); };
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1b1522}#scene{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#1b1522;display:flex;align-items:center;justify-content:center}#scene canvas{display:block;image-rendering:pixelated}</style></head><body><div id="scene"></div>' +
    '<script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  var f = path.join(os.tmpdir(), 'ppol-exterior-shots-' + process.pid + '.html'); fs.writeFileSync(f, html); return f;
}

(async function () {
  var file = harness();
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  var ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [], infos = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); if (/\[scene3d\]/.test(t)) infos.push(t); });
  await page.addInitScript(function () { window.__ppolLook = { season: 'autumn' }; });   /* 훅 확인: init 때 장면이 직접 읽는다 */
  await page.goto('file://' + file);
  var ok = await page.evaluate(function (pal) {
    if (!window.SCENE3D || !SCENE3D.supported()) return 'no webgl';
    window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 8, items: ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'], weather: 'clear', hour: 14, palette: pal, look: { pixelSize: 2 } });
    return 'ok';
  }, PALETTE);
  if (ok !== 'ok') { console.error('3D 하네스 실패: ' + ok); process.exit(1); }
  var hookSeason = await page.evaluate(function () { return SC.season(); });
  console.log('__ppolLook.season honoured: ' + (hookSeason === 'autumn' ? 'yes' : 'NO (' + hookSeason + ')'));
  if (hookSeason !== 'autumn') errs.push('season hook ignored: ' + hookSeason);
  await page.waitForTimeout(600);
  await page.evaluate(function () { SC.pause(); });
  async function step(sec) { var n = Math.round(sec / 0.1); for (var i = 0; i < n; i++) await page.evaluate(function () { SC.debugStep(0.1); }); }

  /* 바깥 계절 샷 */
  var bad = [], calls = {};
  async function shot(name, o) {
    await page.evaluate(function (a) {
      SC.setPlace(a.place || 'exterior', { instant: true }); SC.setSeason(a.season); SC.setWeather(a.weather); SC.setTime(a.hour, true); SC.setLantern(8); SC.setOctState(a.octState || 'idle');
    }, o);
    await step(1.2);
    var f = path.join(OUT, name + '.png');
    await page.locator('#scene').screenshot({ path: f });
    var m = LM.metrics(f, { px: P * DPR }), s = await page.evaluate(function () { return SC.stats(); });
    calls[name] = s.calls;
    if (m.colours > 62) bad.push(name + ' colours ' + m.colours + ' > 62');
    if (s.calls > 150) bad.push(name + ' draw calls ' + s.calls + ' > 150');
    console.log('  📷 ' + path.relative(ROOT, f) + '  (' + o.season + ', ' + o.weather + ', hour ' + o.hour + ') → colours ' + m.colours + ' · edge ' + m.edgePct + '% · luma ' + m.meanLuma + ' · speckles ' + m.speckles + ' · calls ' + s.calls + ' · place ' + s.place + ' · season ' + s.season);
  }
  /* 문어를 마당(길가)에 세워 크기 비교가 되게 */
  await shot('ext-spring-day', { season: 'spring', weather: 'clear', hour: 14 });
  await shot('ext-summer-day', { season: 'summer', weather: 'clear', hour: 14 });
  await shot('ext-autumn-day', { season: 'autumn', weather: 'clear', hour: 14 });
  await shot('ext-winter-day', { season: 'winter', weather: 'snow', hour: 14 });
  await shot('ext-winter-night', { season: 'winter', weather: 'snow', hour: 22 });
  await shot('ext-summer-night', { season: 'summer', weather: 'clear', hour: 22 });

  /* 스트립: 문어를 따라가는 크롭 (숨어 있으면 현관문 쪽) */
  var box = await page.locator('#scene').boundingBox(), cbox = await page.locator('#scene canvas').boundingBox();
  async function clip() {
    var c = await page.evaluate(function () {
      var m = SC.motion(), a = SC.extAnchors;
      if (!m.octVisible) return m.place === 'exterior' ? SC.screenOf(a.landing[0], a.landing[1] + 0.3, a.landing[2]) : SC.screenOf(1.95, 0.5, -2.05);
      var p = SC.octScreenPos(), r = document.querySelector('#scene').getBoundingClientRect(); return { x: p.x - r.left, y: p.y - r.top + 22 };
    });
    var cx = c.x + box.x - cbox.x, cy = c.y + box.y - cbox.y;
    var x = Math.max(0, Math.min(cbox.width - CROP, Math.floor((cx - CROP / 2) / P) * P)), y = Math.max(0, Math.min(cbox.height - CROP, Math.floor((cy - CROP / 2) / P) * P));
    return { x: cbox.x + x, y: cbox.y + y, width: CROP, height: CROP };
  }
  async function ceremony(name, setup, start, lead) {
    await page.evaluate(setup);
    await step(0.6);
    var done = await page.evaluate(function (s) { window.__cerDone = false; SC[s](function () { window.__cerDone = true; }); return true; }, start);
    if (lead) await step(lead);
    var frames = [], log = [];
    for (var f = 0; f < FRAMES; f++) {
      await step(STEP);
      frames.push(await page.screenshot({ clip: await clip() }));
      log.push(await page.evaluate(function () { var m = SC.motion(); return m.place[0] + (m.trans ? '~' : '') + (m.octVisible ? 'O' : '-') + (m.door > 0.1 ? 'D' : ''); }));
    }
    var file = path.join(OUT, 'ext-' + name + '-strip.png'); fs.writeFileSync(file, strip(frames));
    for (var k = 0; k < 40 && !(await page.evaluate(function () { return window.__cerDone; })); k++) await step(0.1);
    var after = await page.evaluate(function () { return { done: window.__cerDone, place: SC.place(), motion: SC.motion() }; });
    if (!after.done) bad.push(name + ' ceremony did not finish');
    console.log('  🎞 ' + path.relative(ROOT, file) + '  (' + FRAMES + ' × ' + STEP + ' s, lead ' + (lead || 0) + ' s) frames [place~trans O=oct D=door]: ' + log.join(' ') + ' → done ' + after.done + ', place ' + after.place);
    return after;
  }
  var dep = await ceremony('depart', function () { SC.setPlace('attic', { instant: true }); SC.setSeason('autumn'); SC.setWeather('clear'); SC.setTime(14, true); SC.setOctState('idle'); SC.jumpTo('door'); }, 'departCeremony', 0);
  if (dep.place !== 'exterior') bad.push('depart: exterior should stay active, got ' + dep.place);
  var ret = await ceremony('return', function () { SC.setOctState('away'); }, 'returnCeremony', 0.6);
  if (ret.place !== 'attic') bad.push('return: should end in attic, got ' + ret.place);

  /* 드로우콜 두 장소 (전환 없는 정지 프레임) */
  await page.evaluate(function () { SC.setPlace('attic', { instant: true }); SC.setWeather('rain'); SC.setTime(14, true); });
  await step(0.5);
  var sa = await page.evaluate(function () { return SC.stats(); });
  await page.evaluate(function () { SC.setPlace('exterior', { instant: true }); SC.setSeason('winter'); SC.setWeather('rain'); SC.setTime(22, true); });
  await step(0.5);
  var se = await page.evaluate(function () { return SC.stats(); });
  console.log('draw calls: attic ' + sa.callsAttic + ' · exterior ' + se.callsExt + ' (winter night snow) · ext props ' + se.extProps + ' · per shot ' + JSON.stringify(calls));
  if (sa.callsAttic > 150 || se.callsExt > 150) bad.push('draw calls over 150');
  /* 모션 감소: 의식이 즉시 끝나야 한다 */
  var red = await page.evaluate(function () { SC.setReducedMotion(true); SC.setPlace('attic', { instant: true }); var d = false; SC.departCeremony(function () { d = true; }); SC.debugStep(0.05); var r = { done: d, place: SC.place() }; SC.setReducedMotion(false); return r; });
  console.log('reduced motion depart: ' + JSON.stringify(red));
  if (!red.done || red.place !== 'exterior') bad.push('reduced-motion depart not instant: ' + JSON.stringify(red));
  infos.forEach(function (t) { console.log('  ' + t); });
  console.log('errors:', errs.length ? errs : 'none');
  if (bad.length) console.log('FAIL:', bad);
  await browser.close();
  try { fs.unlinkSync(file); } catch (e) { /* noop */ }
  process.exit(errs.length || bad.length ? 1 : 0);
})();
