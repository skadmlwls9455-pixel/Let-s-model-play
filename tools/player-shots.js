#!/usr/bin/env node
/* tools/player-shots.js — 내 캐릭터 증거 (docs/SCENE.md "내 캐릭터" · docs/PLAYER_PARTS.md §5). SwiftShader 로 WebGL 강제, 360×326 장면 @2x, p=2 (exterior-shots 와 같은 독립 하네스).
 *   node tools/player-shots.js [palette]   # 기본 apollo
 * → tests/evidence/player/pl-attic-day.png (다락 쉬는 자리) · pl-attic-close.png (2× 확대 크롭) · pl-face-close.png (2× 얼굴 크롭 — 사람 얼굴 자기 점검) · pl-blink.png (감은 눈 1프레임) · pl-attic-night.png (밤 자체광)
 *   · pl-walk-strip.png (문 톡 → 문 앞까지 걷기 → 문 열림, 0.1 s × 24 칸, 캐릭터를 따라가는 96×96 CSS px 크롭) · pl-attic-door.png (문 앞에 서서 문을 본다 — 문짝에 안 가린다) · pl-play-day.png (놀이방 쉬는 자리) · pl-play-close.png
 *   · pl-parts-sheet.png (파츠 시트: 줄 = 범주 7(머리 · 머리 색 · 눈 · 눈 색 · 옷 · 신발 · 악세사리, UI 순서) · 칸 = 옵션(기본 cfg 에서 하나씩 바꿈), 놀이방 2× 96×96 크롭 — 머리 줄은 옆 45° 뒤쪽 각도(뒷머리 길이가 보이게), 얼굴 범주는 머리 중심, 옷은 몸통, 신발은 발 중심; 60 KB 를 넘으면 pl-parts-<범주>.png 7장)
 *   · pl-hair-turn.png (머리 6종 × 8방향 1×) · pl-hair-turn-2x.png (머리 6종 × 4방향 2×, 머리 중심) · pl-portrait.png (playerPortrait 64×64 × 머리 6종, navy 배경)
 * 검사: 샷마다 고유 색 ≤ 62(시트 칸마다 ≤ 62, 합친 시트 ≤ 96) · 다락 드로우콜 ≤ 150 · 놀이방 ≤ 60 · 셰이더 프로그램 수가 부팅과 같음(내 캐릭터 툰은 문어 툰과 프로그램을 나눠 쓴다) · 모든 파츠 조합에서 드로우콜이 기본값과 같음(메시 수 불변)
 *   · setPlayer 전 옵션 뒤 renderer.info.memory.geometries ≤ 시작 + 7(옛 지오메트리 dispose) · 모르는 id → 기본값 · 얼굴 색 집계(살결 #e7d5b3 ≠ 흰자 #ebede9, 금발이 올리브 #d0da91 로 뜨지 않음) · 깜빡임 프레임에 흰자가 줄고 눈썹 색이 늚
 *   · walkFirst 로 문이 걷기 뒤에 열림 · 콘솔/페이지 에러 0. 어기면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var PALETTE = process.argv[2] ? String(process.argv[2]).replace(/[^A-Za-z0-9_]/g, '') : 'apollo';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/player');
fs.mkdirSync(OUT, { recursive: true });
var W = 360, H = 326, DPR = 2, CROP = 96, FRAMES = 24, STEP = 0.1, PL_H = 1.22, HEAD_Y = 0.87;
var CATS = ['hair', 'hairColor', 'eyes', 'eyeColor', 'outfit', 'shoes', 'acc'];   /* 파츠 시트 줄 순서 = 설정 시트 UI 순서 */
var CAT_CY = { hair: 0.72, hairColor: 0.95, eyes: 0.95, eyeColor: 0.95, acc: 0.95, outfit: 0.45, shoes: 0.35 };   /* 2× 크롭(0.89 m)은 키 1.22~1.38 을 다 못 담는다 — 범주마다 보여야 할 곳을 가운데에 (머리 모양은 뒷머리 길이가 갈라 조금 아래) */
var SKIN = 0xe7d5b3, WHITE = 0xebede9, OLIVE = 0xd0da91, BROW = 0xbe772b;   /* 실광 모델 칸 (docs/PLAYER_PARTS.md §0.1·§2.2): 살결 · 흰자 · v0 금발이 뜨던 올리브 · 금발의 감은 눈 선 색(#b8742e 의 앞면 — 눈썹은 피드백 6 으로 없음) */

var CRC = (function () { var t = new Int32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { var c = -1; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type, 'ascii'), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function decodeBuf(b) { var tmp = path.join(os.tmpdir(), 'pl-frame-' + process.pid + '.png'); fs.writeFileSync(tmp, b); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; }
function grid(rows, gap) {   /* rows = [[png buffer | null, …], …] → 격자 PNG (칸 사이 gap px, 빈 칸은 배경 #1b1522). strip() 의 2차원 판 */
  gap = gap == null ? 4 : gap;
  var imgs = rows.map(function (r) { return r.map(function (b) { return b ? decodeBuf(b) : null; }); });
  var first = imgs.flat().filter(Boolean)[0], w = first.w, h = first.h, cols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  var Wd = w * cols + gap * (cols - 1), Hd = h * rows.length + gap * (rows.length - 1), out = Buffer.alloc(Wd * Hd * 4);
  for (var i = 0; i < Wd * Hd; i++) { out[i * 4] = 0x1b; out[i * 4 + 1] = 0x15; out[i * 4 + 2] = 0x22; out[i * 4 + 3] = 255; }
  imgs.forEach(function (r, ry) { r.forEach(function (im, cx) { if (!im) return; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var si = (y * im.w + x) * im.bpp, di = ((ry * (h + gap) + y) * Wd + cx * (w + gap) + x) * 4;
    out[di] = im.px[si]; out[di + 1] = im.px[si + 1]; out[di + 2] = im.px[si + 2]; out[di + 3] = 255; } }); });
  return encodePNG(Wd, Hd, out);
}
function strip(frames) { return grid([frames], 2); }
function census(im) { var m = {}; for (var i = 0; i < im.w * im.h; i++) { var k = (im.px[i * im.bpp] << 16) | (im.px[i * im.bpp + 1] << 8) | im.px[i * im.bpp + 2]; m[k] = (m[k] || 0) + 1; } return m; }
function uniqIm(im) { return Object.keys(census(im)).length; }
function uniq(file) { return uniqIm(LM.decodePNG(file)); }
function hex(k) { return '#' + ('000000' + k.toString(16)).slice(-6); }
function top(m, n) { return Object.keys(m).map(function (k) { return [+k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n).map(function (e) { return hex(e[0]) + ':' + e[1]; }).join(' '); }

function harness() {
  var u = function (p) { return 'file://' + path.join(ROOT, p); };
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1b1522}#scene{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#1b1522;display:flex;align-items:center;justify-content:center}#scene canvas{display:block;image-rendering:pixelated}</style></head><body><div id="scene"></div>' +
    '<script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  var f = path.join(os.tmpdir(), 'ppol-player-shots-' + process.pid + '.html'); fs.writeFileSync(f, html); return f;
}

(async function () {
  var file = harness(), fails = [];
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  var ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); });
  await page.goto('file://' + file);
  var ok = await page.evaluate(function (pal) {
    if (!window.SCENE3D || !SCENE3D.supported()) return 'no webgl';
    window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 8, items: ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'], weather: 'clear', hour: 14, palette: pal, look: { pixelSize: 2 }, player: SCENE3D.PLAYER_DEFAULT });
    return 'ok';
  }, PALETTE);
  if (ok !== 'ok') { console.error(ok); process.exit(1); }
  await page.waitForTimeout(600);
  await page.evaluate(function () { SC.pause(); SC.setOctState('idle'); SC.jumpTo('center'); for (var i = 0; i < 6; i++) SC.debugStep(0.1); });
  var p0 = await page.evaluate(function () { return SC.renderer.info.programs.length; });
  var PARTS = await page.evaluate(function () { return { parts: SCENE3D.PLAYER_PARTS, def: SCENE3D.PLAYER_DEFAULT }; });
  CATS.forEach(function (c) { if (!PARTS.parts[c] || PARTS.parts[c].length < 4 || PARTS.parts[c].length > 6) fails.push('PLAYER_PARTS.' + c + ' 는 4~6 개여야 한다'); if (!PARTS.parts[c].some(function (p) { return p.id === PARTS.def[c]; })) fails.push('PLAYER_DEFAULT.' + c + ' 가 목록에 없다'); });
  if (PARTS.parts.acc[0].id !== 'none') fails.push('acc 첫 항목은 none');

  async function shot(name) { var f = path.join(OUT, name); await page.locator('#scene').screenshot({ path: f }); var u = uniq(f); console.log('  📷 ' + name + '  (고유 색 ' + u + ')'); if (u > 62) fails.push(name + ' 고유 색 ' + u + ' > 62'); return f; }
  async function cropBuf(cx, cy) {   /* 캐릭터 둘레 CROP×CROP CSS px (원점은 아트 픽셀 배수) → PNG 버퍼 */
    var x = Math.round(Math.max(0, Math.min(W - CROP, cx - CROP / 2)) / 2) * 2, y = Math.round(Math.max(0, Math.min(H - CROP, cy - CROP / 2)) / 2) * 2;
    return page.screenshot({ clip: { x: x, y: y, width: CROP, height: CROP } });
  }
  async function crop(name, cx, cy) { var f = path.join(OUT, name); fs.writeFileSync(f, await cropBuf(cx, cy)); console.log('  📷 ' + name); return f; }
  function plScreen(y) { return page.evaluate(function (yy) { var p = SC.player(); return SC.screenOf(p.at[0], yy, p.at[2]); }, y == null ? PL_H / 2 : y); }
  function save(name, buf) { var f = path.join(OUT, name); fs.writeFileSync(f, buf); console.log('  📷 ' + name + '  (' + (buf.length / 1024).toFixed(1) + ' KB)'); return f; }
  function setPlayer(cfg) { return page.evaluate(function (c) { var l = SC.setPlayer(c); for (var i = 0; i < 3; i++) SC.debugStep(0.1); return { look: l, calls: SC.stats().calls, geos: SC.renderer.info.memory.geometries }; }, cfg); }

  /* 1. 다락 쉬는 자리 (낮) + 2× 크롭 + 얼굴 크롭 + 깜빡임 프레임 */
  var a = await page.evaluate(function () { return { pl: SC.player(), stats: SC.stats() }; });
  console.log('attic:', JSON.stringify(a.pl), 'calls', a.stats.calls, 'programs', a.stats.programs);
  if (a.pl.place !== 'attic' || !a.pl.visible || a.pl.walking) fails.push('다락 시작: 내 캐릭터가 다락 쉬는 자리에 보여야 한다 ' + JSON.stringify(a.pl));
  if (a.stats.calls > 150) fails.push('다락 드로우콜 ' + a.stats.calls + ' > 150');
  if (JSON.stringify(a.pl.look) !== JSON.stringify(PARTS.def)) fails.push('player().look 이 기본값이어야 한다 ' + JSON.stringify(a.pl.look));
  await shot('pl-attic-day.png');
  await page.evaluate(function () { SC.zoomStep(6); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  var c = await plScreen(); await crop('pl-attic-close.png', c.x, c.y);
  c = await plScreen(HEAD_Y); var faceBuf = await cropBuf(c.x, c.y); save('pl-face-close.png', faceBuf);
  var faceIm = decodeBuf(faceBuf), fc = census(faceIm), tot = faceIm.w * faceIm.h, pct = function (k) { return 100 * (fc[k] || 0) / tot; };
  console.log('face census:', top(fc, 12), '| skin %', pct(SKIN).toFixed(1), 'white %', pct(WHITE).toFixed(1), 'olive %', pct(OLIVE).toFixed(1), 'brow %', pct(BROW).toFixed(1));
  if (uniqIm(faceIm) > 62) fails.push('pl-face-close 고유 색 ' + uniqIm(faceIm) + ' > 62');
  if (pct(SKIN) < 8) fails.push('얼굴 크롭: 살결 칸 ' + hex(SKIN) + ' 이 8 % 이상이어야 한다 (' + pct(SKIN).toFixed(1) + ')');
  if (!(pct(WHITE) >= 3 && pct(WHITE) <= 25)) fails.push('얼굴 크롭: 흰자 칸 ' + hex(WHITE) + ' 이 3~25 % 여야 한다 (' + pct(WHITE).toFixed(1) + ') — 큰 눈(피드백 6) 둘 + 깃, 흰자 ≠ 살결');
  if (pct(OLIVE) > 3) fails.push('얼굴 크롭: 금발이 올리브 ' + hex(OLIVE) + ' 로 떴다 (' + pct(OLIVE).toFixed(1) + ' %)');
  await page.evaluate(function () { SC.debugPlayerBlink(0.12); SC.debugStep(0.01); });
  var blinkIm = decodeBuf(await cropBuf(c.x, c.y)), bc = census(blinkIm); save('pl-blink.png', grid([[faceBuf, await cropBuf(c.x, c.y)]]));
  console.log('blink census:', 'white', fc[WHITE] || 0, '→', bc[WHITE] || 0, '| brow', fc[BROW] || 0, '→', bc[BROW] || 0);
  if (!((fc[WHITE] || 0) - (bc[WHITE] || 0) >= 400)) fails.push('깜빡임 프레임: 흰자(두 눈 ≈ 1000 px, 깃은 그대로)가 400 px 이상 줄어야 한다 ' + (fc[WHITE] || 0) + ' → ' + (bc[WHITE] || 0));
  if (!((bc[BROW] || 0) - (fc[BROW] || 0) >= 200)) fails.push('깜빡임 프레임: 눈썹 색 감은 눈 선이 200 px 이상 늘어야 한다 ' + (fc[BROW] || 0) + ' → ' + (bc[BROW] || 0));
  await page.evaluate(function () { for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  var open2 = census(decodeBuf(await cropBuf(c.x, c.y)));
  if ((open2[WHITE] || 0) < (fc[WHITE] || 0) * 0.8) fails.push('깜빡임 뒤 흰자가 돌아와야 한다 ' + (fc[WHITE] || 0) + ' → ' + (open2[WHITE] || 0));
  await page.evaluate(function () { SC.zoomStep(0); SC.setTime(22.5, true); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  await shot('pl-attic-night.png');
  await page.evaluate(function () { SC.setTime(14, true); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  /* 모르는 id → 기본값 · 위치 유지 */
  var unk = await page.evaluate(function () { var before = SC.player().at; var l = SC.setPlayer({ hair: 'zzz', eyes: 'round', nope: 1 }); return { look: l, pl: SC.player(), before: before }; });
  if (unk.look.hair !== 'bob' || unk.pl.look.hair !== 'bob' || unk.look.nope || unk.pl.at[0] !== unk.before[0]) fails.push('setPlayer: 모르는 id 는 기본값, 위치 유지 ' + JSON.stringify(unk));
  await setPlayer(PARTS.def);

  /* 2. 문 톡 → 걷기 스트립 (walkFirst): 문은 걷는 동안 닫혀 있어야 한다 */
  await page.evaluate(function () { window.__res = null; window.__ev = []; SC.goRoom('play', { walkFirst: true, onDoor: function (e) { __ev.push(e.act + '@' + SC.view()); } }).then(function (r) { __res = r; }); });
  var frames = [], walkLog = [];
  for (var i = 0; i < FRAMES; i++) {
    var m = await page.evaluate(function (o) { SC.debugStep(o.dt); var p = SC.player(), mo = SC.motion(); return { pl: p, door: mo.doorAttic, dq: mo.dq, scr: SC.screenOf(p.at[0], o.hy, p.at[2]) }; }, { dt: STEP, hy: PL_H / 2 });
    walkLog.push({ at: m.pl.at, walking: m.pl.walking, frame: m.pl.frame, yaw: m.pl.yaw, door: m.door });
    if (!m.pl.walking && !walkLog.some(function (w, j) { return j < walkLog.length - 1 && !w.walking; })) await shot('pl-attic-door.png');
    frames.push(await cropBuf(m.scr.x, m.scr.y));
  }
  save('pl-walk-strip.png', strip(frames));
  console.log('walk:', JSON.stringify(walkLog.map(function (w) { return [w.at[0], w.at[2], w.walking ? 'w' + w.frame : '-', w.yaw, w.door]; })));
  if (!walkLog.some(function (w) { return w.walking; })) fails.push('walkFirst: 내 캐릭터가 걸어야 한다');
  if (walkLog.some(function (w) { return w.walking && w.door > 0; })) fails.push('걷는 동안 문이 열렸다');
  var fr = walkLog.filter(function (w) { return w.walking; }).map(function (w) { return w.frame; });
  if (!(fr.indexOf(1) >= 0 && fr.indexOf(3) >= 0)) fails.push('걸음 4프레임 중 왼발(1) · 오른발(3) 이 모두 나와야 한다 ' + JSON.stringify(fr));
  var dw = walkLog.filter(function (w) { return !w.walking; });
  if (!dw.length || Math.abs(dw[0].yaw - 90) > 0.5) fails.push('문 앞에 도착해 문(+x) 을 봐야 한다 ' + JSON.stringify(dw[0]));
  if (!walkLog.some(function (w) { return !w.walking && w.door > 0; })) fails.push('걷기가 끝난 뒤 문이 열려야 한다 (24 칸 안)');
  /* 문 열림 → 전환 → 닫힘 → 쉬는 자리까지 */
  var res = null, guard = 0;
  while (guard++ < 80 && !res) res = await page.evaluate(function () { SC.debugStep(0.1); return __res; });
  var atDoor = await page.evaluate(function () { return { pl: SC.player(), ev: __ev, res: __res, view: SC.view() }; });
  console.log('arrived:', JSON.stringify(atDoor));
  if (!atDoor.res || !atDoor.res.ok || atDoor.view !== 'play') fails.push('goRoom(play, walkFirst) 가 ok 로 풀려야 한다 ' + JSON.stringify(atDoor.res));
  if (atDoor.pl.place !== 'play' || atDoor.pl.group !== 'play') fails.push('놀이방 도착: 내 캐릭터가 놀이방 그룹에 ' + JSON.stringify(atDoor.pl));
  for (i = 0; i < 25; i++) await page.evaluate(function () { SC.debugStep(0.1); });
  var b = await page.evaluate(function () { return { pl: SC.player(), stats: SC.stats() }; });
  console.log('play:', JSON.stringify(b.pl), 'calls', b.stats.calls, 'programs', b.stats.programs);
  if (b.pl.walking || b.pl.pending || Math.abs(b.pl.at[0] - 0.15) > 0.01 || Math.abs(b.pl.at[2] - 0.45) > 0.01) fails.push('놀이방 쉬는 자리에 서 있어야 한다 ' + JSON.stringify(b.pl));
  if (b.stats.calls > 60) fails.push('놀이방 드로우콜 ' + b.stats.calls + ' > 60');
  if (b.stats.programs !== p0) fails.push('셰이더 프로그램 수가 늘었다 ' + p0 + ' → ' + b.stats.programs);
  await shot('pl-play-day.png');
  await page.evaluate(function () { SC.zoomStep(6); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  c = await plScreen(); await crop('pl-play-close.png', c.x, c.y);

  /* 2b. 파츠 시트 (놀이방 2×, 빈 바닥): 범주마다 기본 cfg 에서 하나씩 바꿔 96×96 크롭 → 격자. 드로우콜 불변 · 칸 고유 색 ≤ 62 · 지오메트리 dispose 확인 */
  var g0 = await page.evaluate(function () { return SC.renderer.info.memory.geometries; }), calls0 = b.stats.calls, rows = [], cellU = [];
  for (var ci = 0; ci < CATS.length; ci++) {
    var cat = CATS[ci], row = [];
    await page.evaluate(function (deg) { SC.debugPlayerYaw(deg); for (var i = 0; i < 3; i++) SC.debugStep(0.1); }, cat === 'hair' ? b.pl.yaw + 135 : null);   /* 머리 줄만 옆 45° 뒤쪽이 보이는 각도 (주인 11-08: 정면 2× 에선 6개가 거의 같아 보였다) — 뒷머리 길이가 스타일을 가른다 */
    for (var oi = 0; oi < PARTS.parts[cat].length; oi++) {
      var cfg = Object.assign({}, PARTS.def); cfg[cat] = PARTS.parts[cat][oi].id;
      var r = await setPlayer(cfg);
      if (r.calls !== calls0) fails.push('파츠 ' + cat + '=' + cfg[cat] + ' 에서 드로우콜 ' + r.calls + ' ≠ 기본 ' + calls0);
      if (r.look[cat] !== cfg[cat]) fails.push('setPlayer 가 ' + cat + '=' + cfg[cat] + ' 를 받아야 한다 ' + JSON.stringify(r.look));
      var sc = await plScreen(CAT_CY[cat]), buf = await cropBuf(sc.x, sc.y), u = uniqIm(decodeBuf(buf)); cellU.push(u);
      if (u > 62) fails.push('파츠 시트 ' + cat + '=' + cfg[cat] + ' 고유 색 ' + u + ' > 62');
      row.push(buf);
    }
    rows.push(row);
  }
  var g1 = (await setPlayer(PARTS.def)).geos;
  console.log('parts sheet: cells', cellU.length, 'uniq max', Math.max.apply(null, cellU), '| geometries', g0, '→', g1);
  if (g1 > g0 + 7) fails.push('setPlayer 전 옵션 뒤 지오메트리 ' + g0 + ' → ' + g1 + ' (옛 지오메트리 dispose 안 됨)');
  var sheet = grid(rows);
  if (sheet.length <= 60 * 1024) { save('pl-parts-sheet.png', sheet); var su = uniq(path.join(OUT, 'pl-parts-sheet.png')); if (su > 96) fails.push('pl-parts-sheet 고유 색 ' + su + ' > 96'); }
  else { console.log('  pl-parts-sheet.png 가 ' + (sheet.length / 1024).toFixed(0) + ' KB → 범주별 7장으로'); rows.forEach(function (r, i) { save('pl-parts-' + CATS[i] + '.png', grid([r])); }); try { fs.unlinkSync(path.join(OUT, 'pl-parts-sheet.png')); } catch (e) {} }

  /* 2c. 머리 8방향 (1×) + 4방향 (2×, 머리 중심): 긴 머리 커튼 · 포니테일 꼬리 · 웨이브 덩어리는 정면 한 장으로 판단할 수 없다 */
  var turn1 = [], turn2 = [];
  for (var hi = 0; hi < PARTS.parts.hair.length; hi++) {
    var hcfg = Object.assign({}, PARTS.def, { hair: PARTS.parts.hair[hi].id }), r1 = [], r2 = [];
    await page.evaluate(function () { SC.zoomStep(0); SC.debugStep(0.1); }); await setPlayer(hcfg);
    for (var d = 0; d < 360; d += 45) { await page.evaluate(function (deg) { SC.debugPlayerYaw(deg); SC.debugStep(0.1); SC.debugStep(0.1); }, d); var s1 = await plScreen(); r1.push(await cropBuf(s1.x, s1.y)); }
    await page.evaluate(function () { SC.zoomStep(6); SC.debugStep(0.1); });
    for (d = 0; d < 360; d += 90) { await page.evaluate(function (deg) { SC.debugPlayerYaw(deg); SC.debugStep(0.1); SC.debugStep(0.1); }, d); var s2 = await plScreen(0.95); r2.push(await cropBuf(s2.x, s2.y)); }
    turn1.push(r1); turn2.push(r2);
  }
  save('pl-hair-turn.png', grid(turn1)); save('pl-hair-turn-2x.png', grid(turn2));
  var yawBack = await page.evaluate(function () { SC.debugPlayerYaw(null); SC.zoomStep(0); for (var i = 0; i < 6; i++) SC.debugStep(0.1); return SC.player().yaw; });
  if (Math.abs(yawBack - b.pl.yaw) > 0.5) fails.push('debugPlayerYaw(null) 뒤 다시 카메라 쪽(' + b.pl.yaw + '°)을 봐야 한다 ' + yawBack);
  await setPlayer(PARTS.def);

  /* 2d. 초상 (playerPortrait): 머리 6종, navy 배경 → 64×64 × 6 띠. 빈 캔버스가 아니어야 한다 */
  if (await page.evaluate(function () { return typeof SC.playerPortrait === 'function'; })) {
    var ports = [];
    for (hi = 0; hi < PARTS.parts.hair.length; hi++) {
      var pd = await page.evaluate(function (h) { SC.setPlayer(Object.assign({}, SCENE3D.PLAYER_DEFAULT, { hair: h })); var cv = SC.playerPortrait({ bg: 'navy' }); var w = cv.width, hh = cv.height, p = SC.player(); return { url: cv.toDataURL('image/png'), w: w, h: hh, pl: p, calls: SC.stats().calls }; }, PARTS.parts.hair[hi].id);
      var pbuf = Buffer.from(pd.url.split(',')[1], 'base64'), pim = decodeBuf(pbuf), pu = uniqIm(pim);
      if (pd.w !== 64 || pd.h !== 64) fails.push('초상은 64×64 ' + pd.w + '×' + pd.h);
      if (pu < 6) fails.push('초상(' + PARTS.parts.hair[hi].id + ') 이 비었다 (고유 색 ' + pu + ')');
      if (pd.pl.walking || Math.abs(pd.pl.at[0] - 0.15) > 0.01) fails.push('초상을 찍은 뒤 캐릭터 상태가 그대로여야 한다 ' + JSON.stringify(pd.pl));
      ports.push(pbuf);
    }
    save('pl-portrait.png', grid([ports], 2));
    var pstat = await page.evaluate(function () { var p = SC.player(); var t = SC.stats(); return { look: p.look, calls: t.calls, progs: SC.renderer.info.programs.length }; });
    if (pstat.progs !== p0) fails.push('초상 뒤 프로그램 수 ' + p0 + ' → ' + pstat.progs);
    await setPlayer(PARTS.def);
    var after = await page.evaluate(function () { for (var i = 0; i < 3; i++) SC.debugStep(0.1); return { calls: SC.stats().calls, vis: SC.player().visible }; });
    if (after.calls !== calls0 || !after.vis) fails.push('초상 뒤 장면 드로우콜·보임이 그대로여야 한다 ' + JSON.stringify(after) + ' vs ' + calls0);
  } else console.log('  (playerPortrait 없음 — 건너뜀)');

  /* 3. 돌아오기: 놀이방 문 앞까지 걷고 → 다락 → 쉬는 자리 */
  await page.evaluate(function () { window.__res = null; SC.goRoom('attic', { walkFirst: true }).then(function (r) { __res = r; }); });
  res = null; guard = 0;
  while (guard++ < 120 && !res) res = await page.evaluate(function () { SC.debugStep(0.1); return __res; });
  for (i = 0; i < 25; i++) await page.evaluate(function () { SC.debugStep(0.1); });
  var d2 = await page.evaluate(function () { return { pl: SC.player(), res: __res, view: SC.view(), programs: SC.renderer.info.programs.length }; });
  console.log('back:', JSON.stringify(d2));
  if (!d2.res || !d2.res.ok || d2.view !== 'attic' || d2.pl.place !== 'attic' || d2.pl.walking || Math.abs(d2.pl.at[0] - 1.65) > 0.01) fails.push('다락으로 돌아와 쉬는 자리에 ' + JSON.stringify(d2));
  if (d2.programs !== p0) fails.push('왕복 뒤 프로그램 수 ' + p0 + ' → ' + d2.programs);
  /* 4. 모션 감소: 걷기 없이 바로 */
  await page.evaluate(function () { SC.setReducedMotion(true); window.__res = null; window.__walked = false; SC.goRoom('play', { walkFirst: true }).then(function (r) { __res = r; }); });
  for (i = 0; i < 12; i++) await page.evaluate(function () { SC.debugStep(0.1); if (SC.player().walking) window.__walked = true; });   /* 걷기 Promise 는 마이크로태스크라 evaluate 사이에 풀린다 */
  var rm = await page.evaluate(function () { return { walked: __walked, res: __res, pl: SC.player(), view: SC.view() }; });
  console.log('reduced:', JSON.stringify(rm));
  if (rm.walked || !rm.res || !rm.res.ok || rm.view !== 'play' || rm.pl.walking) fails.push('모션 감소: 걷기 없이 바로 ' + JSON.stringify(rm));

  console.log('errors:', errs.length ? errs : 'none');
  fails.forEach(function (f) { console.error('  FAIL ' + f); });
  await browser.close();
  console.log(fails.length ? fails.length + ' failed' : 'all ok', '· shots → ' + OUT);
  process.exit(errs.length || fails.length ? 1 : 0);
})();
