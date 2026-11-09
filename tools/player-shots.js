#!/usr/bin/env node
/* tools/player-shots.js — 내 캐릭터 증거 (docs/SCENE.md "내 캐릭터" · docs/PLAYER_PARTS.md §5). SwiftShader 로 WebGL 강제, 360×326 장면 @2x, p=2 (exterior-shots 와 같은 독립 하네스).
 *   node tools/player-shots.js [palette]   # 기본 apollo
 * → tests/evidence/player/pl-attic-day.png (다락 쉬는 자리) · pl-attic-close.png (2× 확대 크롭) · pl-face-close.png (2× 얼굴 크롭 — 사람 얼굴 자기 점검, **놀이방** 빈 바닥에서: 다락 쉬는 자리는 거울 코너 문짝이 왼눈을 가린다) · pl-blink.png (다락 2× 얼굴 크롭 뜬 눈 · 감은 눈 1프레임) · pl-attic-night.png (밤 자체광)
 *   · pl-walk-strip.png (문 톡 → 문 앞까지 걷기 → 문 열림, 0.1 s × 24 칸, 캐릭터를 따라가는 96×96 CSS px 크롭) · pl-attic-door.png (문 앞에 서서 문을 본다 — 문짝에 안 가린다) · pl-play-day.png (놀이방 쉬는 자리) · pl-play-close.png
 *   · pl-parts-sheet.png (파츠 시트: 줄 = 범주(전체 10: 머리 · 머리 색 · 눈 · 눈 색 · 코 · 입 · 볼 · 옷 · 신발 · 악세사리, UI 순서) · 칸 = 옵션(기본 cfg 에서 하나씩 바꿈), 놀이방 2× 96×96 크롭 — 머리 줄은 옆 45° 뒤쪽 각도(뒷머리 길이가 보이게), 얼굴 범주는 머리 중심, 옷은 몸통, 신발은 발 중심; 몸 범주 5줄(머리 · 머리 색 · 옷 · 신발 · 악세사리)만; 칸은 눈 뜬 프레임) · pl-parts-face.png (같은 크롭으로 얼굴 범주 5줄: 눈 · 눈 색 · 코 · 입 · 볼)
 *   · pl-parts-hair.png (머리 6종 × (정면 · 옆 90° · 뒤 180°) 2× 128 px 크롭 — 꼭대기부터 긴 머리 끝까지 한 칸에) · pl-hair-turn.png (머리 6종 × 8방향 1×) · pl-hair-turn-2x.png (머리 6종 × 8방향 2×, 머리 중심 — 눈 튀어나옴은 여기서 판정)
 *   · pl-portrait.png (playerPortrait 64×64: 1줄 머리 6종 · 2줄 악세사리 6종, navy 배경)
 *   · pl-stick-walk-strip.png (스틱 입력 setPlayerInput 화면 왼쪽으로 0.1 s × 12 칸, 2× 크롭 — 뒤로 남는 발자국이 보여야 한다, brief MOVE.md)
 * 검사: 샷마다 고유 색 ≤ 62(시트 칸마다 ≤ 62, 합친 시트 ≤ 96) · 다락 드로우콜 ≤ 150 · 놀이방 ≤ 60 · 셰이더 프로그램 수가 부팅과 같음(내 캐릭터 툰·눈 재질은 문어 툰과 프로그램을 나눠 쓴다) · 모든 파츠 조합에서 드로우콜이 기본값과 같음(메시 수 불변)
 *   · setPlayer 전 옵션 뒤 renderer.info.memory.geometries ≤ 시작 + 7(옛 지오메트리 dispose) · textures 가 시작과 같음(눈 아틀라스는 다시 그릴 뿐 새 텍스처가 아니다) · 모르는 id → 기본값 · 얼굴 색 집계(살결 #e7d5b3 ≠ 흰색 #ebede9, 흰색 0.3~8 % = 글린트 + 깃 — 눈은 흰자 없는 홍채 콩이라 상한은 눈 텍스처가 빠져 흰 네모가 된 상태(≥ 11 %)를 잡는다, 금발 #de9e41 ≥ 8 %, 올리브 #d0da91 로 뜨지 않음) · 깜빡임 프레임에 홍채 색이 줄고 감은 눈 선 색이 늚
 *   · **눈 튀어나옴(11-09)**: 머리 6종 × 8방향(1×) · 8방향(2×) 칸마다 눈 켠 · 눈 끈(debugPlayerEyes) · 캐릭터 숨긴(debugPlayerHide) 세 프레임을 비교 — 눈 픽셀(켬 ≠ 끔) 가운데 캐릭터 픽셀(끔 ≠ 숨김: 머리 · 몸 · 윤곽 잉크)도 아니고 4-이웃에도 캐릭터가 없는 픽셀(= 윤곽 밖으로 1 px 이상 나온 눈) 이 0 이어야 한다. 윤곽선 위에 걸친 눈 픽셀(이웃이 캐릭터)은 'rim' 으로 집계만(옆 90° 에서 눈이 얇은 선으로 보이는 것)
 *   · 초상 12장 모두 0행은 배경만(머리 꼭대기·모자·귀가 안 잘림) · walkFirst 로 문이 걷기 뒤에 열림 · 스틱 12 칸 내내 walking · 발자국 수 증가(≥ 5) · 자국 픽셀(발자국 메시 숨김 전후 차, 2× 1단 ≥ 40 · 2단 ≥ 16 · 1× 1단 ≥ 12 · 2단 ≥ 6) · 드로우콜 ≤ 기준 + 2 · 놓으면 멈춤 · 2.3 s 뒤 자국 0 · 콘솔/페이지 에러 0. 어기면 exit 1.
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
var CATS = ['hair', 'hairColor', 'eyes', 'eyeColor', 'nose', 'mouth', 'cheek', 'outfit', 'shoes', 'acc'];   /* 파츠 시트 줄 순서 = 설정 시트 UI 순서 */
var FACE_CATS = ['eyes', 'eyeColor', 'nose', 'mouth', 'cheek'];   /* 얼굴 범주 → pl-parts-face.png */
var CAT_CY = { hair: 0.84, hairColor: 0.95, eyes: 0.95, eyeColor: 0.95, nose: 0.95, mouth: 0.95, cheek: 0.95, acc: 0.95, outfit: 0.45, shoes: 0.35 };   /* 2× 크롭(0.89 m)은 키 1.22~1.38 을 다 못 담는다 — 범주마다 보여야 할 곳을 가운데에 (머리 줄은 꼭대기 1.28 이 들게 0.84 → 0.395~1.285, 뒷머리 길이 전체는 pl-parts-hair 128 px 크롭이 맡는다) */
var SKIN = 0xe7d5b3, WHITE = 0xebede9, IRIS = 0x602c2c, OLIVE = 0xd0da91, BROW = 0xbe772b, BLONDE = 0xde9e41;   /* 실광 모델 칸 (docs/PLAYER_PARTS.md §0.1·§2.2): 살결 · 흰색(글린트·깃) · 기본 눈 색 흑갈색 #6a3a30 의 화면 칸 · v0 금발이 뜨던 올리브 · 금발의 감은 눈 선 색(#b8742e 의 앞면 — 눈썹은 피드백 6 으로 없음) · 금발 #e8a93a 의 앞면 */

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
  CATS.forEach(function (c) { if (!PARTS.parts[c] || PARTS.parts[c].length < 3 || PARTS.parts[c].length > 6) fails.push('PLAYER_PARTS.' + c + ' 는 3~6 개여야 한다'); if (!PARTS.parts[c].some(function (p) { return p.id === PARTS.def[c]; })) fails.push('PLAYER_DEFAULT.' + c + ' 가 목록에 없다'); });
  ['acc', 'nose', 'mouth', 'cheek'].forEach(function (c) { if (PARTS.parts[c][0].id !== 'none') fails.push(c + ' 첫 항목은 none (없음을 고를 수 있어야 한다 — 주인 11-08 "입을 없애자")'); });
  if (Object.keys(PARTS.parts).sort().join() !== CATS.slice().sort().join()) fails.push('PLAYER_PARTS 범주가 시트 줄(CATS)과 같아야 한다 ' + Object.keys(PARTS.parts).join());

  async function shot(name) { var f = path.join(OUT, name); await page.locator('#scene').screenshot({ path: f }); var u = uniq(f); console.log('  📷 ' + name + '  (고유 색 ' + u + ')'); if (u > 62) fails.push(name + ' 고유 색 ' + u + ' > 62'); return f; }
  async function cropBuf(cx, cy, size) {   /* 캐릭터 둘레 size×size CSS px (기본 CROP, 원점은 아트 픽셀 배수) → PNG 버퍼 */
    size = size || CROP;
    var x = Math.round(Math.max(0, Math.min(W - size, cx - size / 2)) / 2) * 2, y = Math.round(Math.max(0, Math.min(H - size, cy - size / 2)) / 2) * 2;
    return page.screenshot({ clip: { x: x, y: y, width: size, height: size } });
  }
  async function crop(name, cx, cy) { var f = path.join(OUT, name); fs.writeFileSync(f, await cropBuf(cx, cy)); console.log('  📷 ' + name); return f; }
  function plScreen(y) { return page.evaluate(function (yy) { var p = SC.player(); return SC.screenOf(p.at[0], yy, p.at[2]); }, y == null ? PL_H / 2 : y); }
  function save(name, buf) { var f = path.join(OUT, name); fs.writeFileSync(f, buf); console.log('  📷 ' + name + '  (' + (buf.length / 1024).toFixed(1) + ' KB)'); return f; }
  function setPlayer(cfg) { return page.evaluate(function (c) { var l = SC.setPlayer(c); SC.debugPlayerBlink(0); for (var i = 0; i < 3; i++) SC.debugStep(0.1); return { look: l, calls: SC.stats().calls, geos: SC.renderer.info.memory.geometries }; }, cfg); }   /* 깜빡임을 9 s 미뤄 시트 칸이 감은 눈 프레임에 찍히지 않게 (후드 칸이 눈을 감고 찍혀 '옷이 눈을 바꾸는' 것처럼 보였다) */

  /* 1. 다락 쉬는 자리 (낮) + 2× 크롭 + 얼굴 크롭 + 깜빡임 프레임 */
  var a = await page.evaluate(function () { return { pl: SC.player(), stats: SC.stats() }; });
  console.log('attic:', JSON.stringify(a.pl), 'calls', a.stats.calls, 'programs', a.stats.programs);
  if (a.pl.place !== 'attic' || !a.pl.visible || a.pl.walking) fails.push('다락 시작: 내 캐릭터가 다락 쉬는 자리에 보여야 한다 ' + JSON.stringify(a.pl));
  if (a.stats.calls > 150) fails.push('다락 드로우콜 ' + a.stats.calls + ' > 150');
  if (JSON.stringify(a.pl.look) !== JSON.stringify(PARTS.def)) fails.push('player().look 이 기본값이어야 한다 ' + JSON.stringify(a.pl.look));
  await shot('pl-attic-day.png');
  await page.evaluate(function () { SC.zoomStep(6); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  var c = await plScreen(); await crop('pl-attic-close.png', c.x, c.y);
  c = await plScreen(HEAD_Y); c.x += 8; var faceBuf = await cropBuf(c.x, c.y);   /* 다락 얼굴 크롭(집계·깜빡임 비교용, pl-blink 왼 칸): 쉬는 자리 왼쪽의 거울 코너 문짝이 장면 안에서 왼눈 바깥 4~5 텍셀을 가린다 — 크롭 중심을 옮겨도 가림은 그대로라(판정 1회차 +8 → +16 시도) 판정용 pl-face-close.png 는 아래 놀이방 2×(빈 바닥)에서 찍는다 (FACE_V3 §8-1 의 두 번째 길) */
  var faceIm = decodeBuf(faceBuf), fc = census(faceIm), tot = faceIm.w * faceIm.h, pct = function (k) { return 100 * (fc[k] || 0) / tot; };
  console.log('face census:', top(fc, 12), '| skin %', pct(SKIN).toFixed(1), 'white %', pct(WHITE).toFixed(1), 'olive %', pct(OLIVE).toFixed(1), 'brow %', pct(BROW).toFixed(1));
  if (uniqIm(faceIm) > 62) fails.push('pl-face-close 고유 색 ' + uniqIm(faceIm) + ' > 62');
  if (pct(SKIN) < 8) fails.push('얼굴 크롭: 살결 칸 ' + hex(SKIN) + ' 이 8 % 이상이어야 한다 (' + pct(SKIN).toFixed(1) + ')');
  if (!(pct(WHITE) >= 0.3 && pct(WHITE) <= 8)) fails.push('얼굴 크롭: 흰색 칸 ' + hex(WHITE) + ' 이 0.3~8 % 여야 한다 (' + pct(WHITE).toFixed(1) + ') — 글린트 둘 + 깃(≈ 4 %), 흰색 ≠ 살결 · 상한은 map 이 빠져 흰 네모가 된 눈(≥ 11 %)을 잡는다');
  if (pct(OLIVE) > 3) fails.push('얼굴 크롭: 금발이 올리브 ' + hex(OLIVE) + ' 로 떴다 (' + pct(OLIVE).toFixed(1) + ' %)');
  if (pct(BLONDE) < 8) fails.push('얼굴 크롭: 금발 칸 ' + hex(BLONDE) + ' 이 8 % 이상이어야 한다 (' + pct(BLONDE).toFixed(1) + ') — 살결 #e7d5b3 와 두 칸 갈린 머리칼 (리뷰 11-08: #e8c170 은 살결과 한 덩이였다)');
  await page.evaluate(function () { SC.debugPlayerBlink(0.12); SC.debugStep(0.01); });
  var blinkIm = decodeBuf(await cropBuf(c.x, c.y)), bc = census(blinkIm); save('pl-blink.png', grid([[faceBuf, await cropBuf(c.x, c.y)]]));
  console.log('blink census:', 'iris', fc[IRIS] || 0, '→', bc[IRIS] || 0, '| white', fc[WHITE] || 0, '→', bc[WHITE] || 0, '| brow', fc[BROW] || 0, '→', bc[BROW] || 0);
  if (!((fc[IRIS] || 0) - (bc[IRIS] || 0) >= 600)) fails.push('깜빡임 프레임: 홍채 색(두 눈 콩 ≈ 47 텍셀 × 16 px × 2, 문짝에 가린 왼눈 가장자리 빼고)이 600 px 이상 줄어야 한다 ' + (fc[IRIS] || 0) + ' → ' + (bc[IRIS] || 0));
  if (!((fc[WHITE] || 0) - (bc[WHITE] || 0) >= 80)) fails.push('깜빡임 프레임: 글린트(눈마다 5 텍셀 × 16 px, 깃은 그대로)가 80 px 이상 줄어야 한다 ' + (fc[WHITE] || 0) + ' → ' + (bc[WHITE] || 0));
  if (!((bc[BROW] || 0) - (fc[BROW] || 0) >= 40)) fails.push('깜빡임 프레임: 감은 눈 선(머리색 한 칸 어둡게, 8 아트px × 2 = 64 px)이 40 px 이상 늘어야 한다 ' + (fc[BROW] || 0) + ' → ' + (bc[BROW] || 0));
  await page.evaluate(function () { for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  var open2 = census(decodeBuf(await cropBuf(c.x, c.y)));
  if ((open2[IRIS] || 0) < (fc[IRIS] || 0) * 0.9) fails.push('깜빡임 뒤 눈(홍채 색)이 돌아와야 한다 ' + (fc[IRIS] || 0) + ' → ' + (open2[IRIS] || 0));
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
  await page.evaluate(function () { for (var i = 0; i < 30 && SC.player().footprints; i++) SC.debugStep(0.1); });   /* 쉬는 자리로 걸어온 발자국이 사라질 때까지 (기준 드로우콜은 자국 없는 값) */
  var b = await page.evaluate(function () { return { pl: SC.player(), stats: SC.stats() }; });
  console.log('play:', JSON.stringify(b.pl), 'calls', b.stats.calls, 'programs', b.stats.programs);
  if (b.pl.walking || b.pl.pending || Math.abs(b.pl.at[0] - 0.15) > 0.01 || Math.abs(b.pl.at[2] - 0.45) > 0.01) fails.push('놀이방 쉬는 자리에 서 있어야 한다 ' + JSON.stringify(b.pl));
  if (b.stats.calls > 60) fails.push('놀이방 드로우콜 ' + b.stats.calls + ' > 60');
  if (b.stats.programs !== p0) fails.push('셰이더 프로그램 수가 늘었다 ' + p0 + ' → ' + b.stats.programs);
  await shot('pl-play-day.png');
  await page.evaluate(function () { SC.zoomStep(6); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  c = await plScreen(); await crop('pl-play-close.png', c.x, c.y);
  c = await plScreen(HEAD_Y); await crop('pl-face-close.png', c.x, c.y);   /* 2× 얼굴 크롭(판정용): 놀이방 빈 바닥이라 문짝·거울이 눈을 안 가린다 (다락 쉬는 자리는 거울 코너 문짝이 왼눈을 가렸다 — 판정 1회차) */

  /* 2b. 파츠 시트 (놀이방 2×, 빈 바닥): 범주마다 기본 cfg 에서 하나씩 바꿔 96×96 크롭 → 격자. 드로우콜 불변 · 칸 고유 색 ≤ 62 · 지오메트리 dispose 확인 */
  var g0 = await page.evaluate(function () { return SC.renderer.info.memory.geometries; }), t0 = await page.evaluate(function () { return SC.renderer.info.memory.textures; }), calls0 = b.stats.calls, rows = [], cellU = [];
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
  var g1 = (await setPlayer(PARTS.def)).geos, t1 = await page.evaluate(function () { return SC.renderer.info.memory.textures; });
  console.log('parts sheet: cells', cellU.length, 'uniq max', Math.max.apply(null, cellU), '| geometries', g0, '→', g1, '| textures', t0, '→', t1);
  if (g1 > g0 + 7) fails.push('setPlayer 전 옵션 뒤 지오메트리 ' + g0 + ' → ' + g1 + ' (옛 지오메트리 dispose 안 됨)');
  if (t1 !== t0) fails.push('setPlayer 전 옵션 뒤 텍스처 수 ' + t0 + ' → ' + t1 + ' (눈 아틀라스는 하나를 다시 그려야 한다)');
  /* 시트 둘: pl-parts-sheet.png = 몸 범주(머리 · 머리 색 · 옷 · 신발 · 악세사리) · pl-parts-face.png = 얼굴 범주(눈 · 눈 색 · 코 · 입 · 볼). 열 줄을 한 장에 담으면 60 KB 를 넘는다 (11-09) */
  [['pl-parts-sheet.png', CATS.filter(function (c) { return FACE_CATS.indexOf(c) < 0; })], ['pl-parts-face.png', FACE_CATS]].forEach(function (sh) {
    var buf = grid(sh[1].map(function (c) { return rows[CATS.indexOf(c)]; })); save(sh[0], buf);
    var su = uniq(path.join(OUT, sh[0])); if (su > 96) fails.push(sh[0] + ' 고유 색 ' + su + ' > 96');
    if (buf.length > 60 * 1024) fails.push(sh[0] + ' 가 ' + (buf.length / 1024).toFixed(0) + ' KB > 60 KB');
  });

  /* 2b-2. 머리 시트 pl-parts-hair.png: 머리 6종 × (정면 · 옆 90° · 뒤 180°) 2× 128 px 크롭(머리 중심 0.78 → y 0.19~1.37: 꼭대기부터 긴 머리 끝 0.28 까지) — 96 px 시트 줄은 꼭대기나 뒷머리 끝이 잘려 6종이 갈리지 않았다 (리뷰 11-08) */
  var hrows = [], hi;
  for (hi = 0; hi < PARTS.parts.hair.length; hi++) {
    await setPlayer(Object.assign({}, PARTS.def, { hair: PARTS.parts.hair[hi].id }));
    var hr = [];
    for (var ai = 0; ai < 3; ai++) { await page.evaluate(function (deg) { SC.debugPlayerYaw(deg); SC.debugStep(0.1); SC.debugStep(0.1); }, b.pl.yaw + [0, 90, 180][ai]); var hs = await plScreen(0.78); hr.push(await cropBuf(hs.x, hs.y, 128)); }
    hrows.push(hr);
  }
  save('pl-parts-hair.png', grid(hrows));
  await page.evaluate(function () { SC.debugPlayerYaw(null); });
  /* 2c. 머리 8방향 (1×) + 8방향 (2×, 머리 중심): 긴 머리 커튼 · 포니테일 꼬리 · 웨이브 덩어리는 정면 한 장으로 판단할 수 없다. 칸마다 눈 튀어나옴 집계(머리 주석) — 카메라 요 45° 라 d 45 = 정면, d 0 · 90 = 45° 돌림, d 315 · 135 = 옆 90°, d 270 · 180 = 뒤 135° */
  var turn1 = [], turn2 = [], eyeOut = [], eyeRim = 0, eyeN = 0;
  async function eyeCheck(cx, cy, label) {   /* 눈 켬 / 눈 끔 / 캐릭터 숨김 세 프레임 → 눈 픽셀 · 캐릭터 밖 눈 픽셀(out) · 윤곽에 걸친 눈 픽셀(rim) */
    var on = await cropBuf(cx, cy);
    await page.evaluate(function () { SC.debugPlayerEyes(false); SC.debugStep(0.01); }); var off = await cropBuf(cx, cy);
    await page.evaluate(function () { SC.debugPlayerHide(true); SC.debugStep(0.01); }); var gone = await cropBuf(cx, cy);
    await page.evaluate(function () { SC.debugPlayerHide(false); SC.debugPlayerEyes(true); SC.debugStep(0.01); });
    var a = decodeBuf(on), bI = decodeBuf(off), cI = decodeBuf(gone), A = DPR * 2, w = a.w / A | 0, h = a.h / A | 0, eye = 0, out = 0, rim = 0;   /* 아트 픽셀 단위(1 아트px = p 2 × DPR 2 = 4 장치px, 크롭 원점은 4 의 배수)로 센다 — 장치 픽셀로 세면 1 아트px 선의 바깥 3/4 이 '이웃 없음' 이 된다 */
    function k(im, x, y) { var i = (y * A * im.w + x * A) * im.bpp; return (im.px[i] << 16) | (im.px[i + 1] << 8) | im.px[i + 2]; }
    function body(x, y) { return k(bI, x, y) !== k(cI, x, y); }   /* 눈을 꺼도 캐릭터(머리 · 몸 · 윤곽 잉크 · 접지 그림자)가 차지한 아트 픽셀 */
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (k(a, x, y) === k(bI, x, y)) continue; eye++;
      if (body(x, y)) continue;
      var near = (x > 0 && body(x - 1, y)) || (x < w - 1 && body(x + 1, y)) || (y > 0 && body(x, y - 1)) || (y < h - 1 && body(x, y + 1));
      if (near) rim++; else out++;
    }
    eyeN += eye; eyeRim += rim; if (out) eyeOut.push(label + ':' + out);
    return on;
  }
  await page.evaluate(function () { SC.setReducedMotion(true); });   /* 돌려보기 동안 숨쉬기(8 fps 스텝 1 px)를 끈다 — 눈 켬/끔 두 프레임 사이에 몸 윤곽이 1 px 흔들리면 눈 픽셀로 잘못 센다. 요 회전은 즉시 */
  for (hi = 0; hi < PARTS.parts.hair.length; hi++) {
    var hcfg = Object.assign({}, PARTS.def, { hair: PARTS.parts.hair[hi].id }), r1 = [], r2 = [];
    await page.evaluate(function () { SC.zoomStep(0); SC.debugStep(0.1); }); await setPlayer(hcfg);
    for (var d = 0; d < 360; d += 45) { await page.evaluate(function (deg) { SC.debugPlayerYaw(deg); SC.debugStep(0.1); SC.debugStep(0.1); }, d); var s1 = await plScreen(); r1.push(await eyeCheck(s1.x, s1.y, hcfg.hair + '/1x/' + d)); }
    await page.evaluate(function () { SC.zoomStep(6); SC.debugStep(0.1); });
    for (d = 0; d < 360; d += 45) { await page.evaluate(function (deg) { SC.debugPlayerYaw(deg); SC.debugStep(0.1); SC.debugStep(0.1); }, d); var s2 = await plScreen(0.95); r2.push(await eyeCheck(s2.x, s2.y, hcfg.hair + '/2x/' + d)); }
    turn1.push(r1); turn2.push(r2);
  }
  await page.evaluate(function () { SC.setReducedMotion(false); });
  console.log('eye protrusion: eye px', eyeN, '| rim', eyeRim, '| outside', eyeOut.length ? eyeOut.join(' ') : 0);
  if (eyeOut.length) fails.push('눈이 머리 윤곽 밖으로 나왔다 (머리/배율/요: 픽셀 수) ' + eyeOut.join(' '));
  if (eyeN < 96 * 20 / 16) fails.push('눈 픽셀이 너무 적다 ' + eyeN + ' (눈 텍스처가 안 보인다?)');
  save('pl-hair-turn.png', grid(turn1)); save('pl-hair-turn-2x.png', grid(turn2));
  var yawBack = await page.evaluate(function () { SC.debugPlayerYaw(null); SC.zoomStep(0); for (var i = 0; i < 6; i++) SC.debugStep(0.1); return SC.player().yaw; });
  if (Math.abs(yawBack - b.pl.yaw) > 0.5) fails.push('debugPlayerYaw(null) 뒤 다시 카메라 쪽(' + b.pl.yaw + '°)을 봐야 한다 ' + yawBack);
  await setPlayer(PARTS.def);

  /* 2d. 초상 (playerPortrait): 머리 6종 + 악세사리 6종, navy 배경 → 64×64 × 6 두 줄. 빈 캔버스가 아니어야 하고 0행은 배경만(머리 꼭대기 · 모자 · 귀가 잘리지 않는다 — 리뷰 11-08: hw 1.3 은 밀짚모자 윗부분이 잘렸다) */
  if (await page.evaluate(function () { return typeof SC.playerPortrait === 'function'; })) {
    var ports = [], pacc = [];
    var portOf = async function (patch, label) {
      var pd = await page.evaluate(function (c) {
        SC.setPlayer(Object.assign({}, SCENE3D.PLAYER_DEFAULT, c)); var cv = SC.playerPortrait({ bg: 'navy' }), N = cv.width, d = cv.getContext('2d').getImageData(0, 0, N, cv.height).data;
        var bg = [d[(N - 1) * N * 4], d[(N - 1) * N * 4 + 1], d[(N - 1) * N * 4 + 2]], top = 0;   /* 왼쪽 아래 구석 = 배경 */
        for (var x = 0; x < N; x++) { var k = x * 4; if (d[k] !== bg[0] || d[k + 1] !== bg[1] || d[k + 2] !== bg[2]) top++; }
        return { url: cv.toDataURL('image/png'), w: N, h: cv.height, pl: SC.player(), top: top }; }, patch);
      var pbuf = Buffer.from(pd.url.split(',')[1], 'base64'), pu = uniqIm(decodeBuf(pbuf));
      if (pd.w !== 64 || pd.h !== 64) fails.push('초상은 64×64 ' + pd.w + '×' + pd.h);
      if (pu < 6) fails.push('초상(' + label + ') 이 비었다 (고유 색 ' + pu + ')');
      if (pd.top) fails.push('초상(' + label + ') 0행에 배경 아닌 픽셀 ' + pd.top + ' — 머리 꼭대기·모자가 잘린다');
      if (pd.pl.walking || Math.abs(pd.pl.at[0] - 0.15) > 0.01) fails.push('초상을 찍은 뒤 캐릭터 상태가 그대로여야 한다 ' + JSON.stringify(pd.pl));
      return pbuf;
    };
    for (hi = 0; hi < PARTS.parts.hair.length; hi++) ports.push(await portOf({ hair: PARTS.parts.hair[hi].id }, '머리 ' + PARTS.parts.hair[hi].id));
    for (var ac = 0; ac < PARTS.parts.acc.length; ac++) pacc.push(await portOf({ acc: PARTS.parts.acc[ac].id }, '악세사리 ' + PARTS.parts.acc[ac].id));
    save('pl-portrait.png', grid([ports, pacc], 2));
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
  /* 3b. 스틱 걷기 스트립 (brief MOVE.md): 다락 쉬는 자리에서 setPlayerInput 화면 왼쪽(−x +z, 빈 바닥)으로 0.1 s × 12 칸, 2× 크롭 — 뒤로 발자국이 남는다 (12 칸 = 1.2 s → 자국 ≤ 2.1 s 라 다 보인다).
     검사: 걷는 동안 walking · input · 발자국 수가 늘어난다 · 놓으면 멈춘다(walking false) · 2.3 s 뒤 자국 0 · 드로우콜은 자국 +1 안 · 프로그램 그대로. 자국이 실제로 그려지는지는 스트립을 눈으로 본다 (잉크색 반투명 → 바닥 널보다 어두운 칸) */
  /* 쉬는 자리(1.65, −0.1)에서 화면 왼쪽으로 가면 앞의 다락 문짝과 가운데 문어가 자국을 가린다 → 문어는 창가로, 캐릭터는 빈 뒤쪽 바닥(0.8, −1.5)에서 출발 (상자 둘레 x ≥ 1.23 밖) */
  var calls0s = await page.evaluate(function () { SC.jumpTo('window'); SC.debugPlayerAt(0.8, -1.5); SC.zoomStep(6); for (var i = 0; i < 30 && SC.player().footprints; i++) SC.debugStep(0.1); var mx = 0; for (i = 0; i < 6; i++) { SC.debugStep(0.1); mx = Math.max(mx, SC.stats().calls); } return mx; });   /* 자국 0 · 기준 드로우콜 = 가만히 6칸 최대 (불꽃·깜빡임 프레임 차 포함) */
  var sframes = [], slog = [];
  await page.evaluate(function () { SC.setPlayerInput({ x: -1, y: 0 }); });
  for (i = 0; i < 12; i++) {
    var sm = await page.evaluate(function (o) { SC.debugStep(o.dt); var p = SC.player(); return { pl: p, calls: SC.stats().calls, scr: SC.screenOf(p.at[0], 0, p.at[2]) }; }, { dt: STEP });
    slog.push({ at: sm.pl.at, walking: sm.pl.walking, moving: sm.pl.moving, frame: sm.pl.frame, input: sm.pl.input, foot: sm.pl.footprints, calls: sm.calls });
    sframes.push(await cropBuf(sm.scr.x + 24, sm.scr.y - 16, 128));   /* 발밑 기준, 자국이 남는 뒤쪽(화면 오른쪽 위)으로 치우친 128 px 크롭 */
  }
  save('pl-stick-walk-strip.png', strip(sframes));
  /* 3c. 자국이 실제로 그려지는지 (리뷰 11-09: 개수만 세면 팔레트 스냅에 다 먹혀도 통과했다): 마지막 칸 프레임에서 footprints 메시만 숨겨 한 프레임(debugStep(1e-6) — 0 은 기본 dt 로 떨어져 장면이 움직인다) 더 찍고,
     instanceMatrix 의 자국 자리마다 ±R device px 창에서 Δ>8 인 픽셀 수를 센다 — 2×: 1단(배율 1) ≥ 40 · 2단(0.75) ≥ 16 · 1×: 1단 ≥ 12 · 2단 ≥ 6. 캐릭터 몸(발밑 ±36 px · 위 140 px)과 겹치는 자국은 제외 */
  async function fpVisible(label, R, need0, need1) {
    var A = decodeBuf(await page.screenshot());
    var info = await page.evaluate(function () {
      var fp = SC.scene.getObjectByName('footprints'), a = fp.instanceMatrix.array, out = [], p = SC.player(), ps = SC.screenOf(p.at[0], 0, p.at[2]);
      for (var i = 0; i < fp.count; i++) { var x = a[i * 16 + 12], y = a[i * 16 + 13], z = a[i * 16 + 14], s = Math.hypot(a[i * 16], a[i * 16 + 2]), sc = SC.screenOf(x, y, z); out.push({ x: +x.toFixed(2), z: +z.toFixed(2), s: +s.toFixed(2), sx: sc.x, sy: sc.y }); }
      fp.visible = false; SC.debugStep(1e-6); return { list: out, pl: ps, calls: SC.stats().calls };
    });
    var B = decodeBuf(await page.screenshot());
    await page.evaluate(function () { SC.scene.getObjectByName('footprints').visible = true; SC.debugStep(1e-6); });
    var rows = [], bad = [];
    info.list.forEach(function (f) {
      var cx = Math.round(f.sx * DPR), cy = Math.round(f.sy * DPR), dxs = cx - info.pl.x * DPR, dys = info.pl.y * DPR - cy;
      if (Math.abs(dxs) <= 36 && dys >= -12 && dys <= 140) { rows.push('(' + f.x + ',' + f.z + ')s' + f.s + ':몸'); return; }
      var n = 0;
      for (var y = cy - R; y <= cy + R; y++) for (var x = cx - R; x <= cx + R; x++) { if (x < 0 || y < 0 || x >= A.w || y >= A.h) continue; var i = (y * A.w + x) * A.bpp, d = Math.max(Math.abs(A.px[i] - B.px[i]), Math.abs(A.px[i + 1] - B.px[i + 1]), Math.abs(A.px[i + 2] - B.px[i + 2])); if (d > 8) n++; }
      var k = f.s > 0.9 ? 0 : f.s > 0.6 ? 1 : 2, need = k === 0 ? need0 : k === 1 ? need1 : 0;
      rows.push('(' + f.x + ',' + f.z + ')s' + f.s + ':' + n + 'px'); if (n < need) bad.push('(' + f.x + ',' + f.z + ') 배율 ' + f.s + ' → ' + n + ' px < ' + need);
    });
    console.log('footprints ' + label + ':', rows.join('  '), '| calls', info.calls);
    if (!info.list.length) fails.push('발자국 그림 검사(' + label + '): 자국이 하나도 없다');
    if (bad.length) fails.push('발자국이 그림에 안 보인다(' + label + ', 팔레트 스냅에 먹힘): ' + bad.join(' · '));
  }
  await fpVisible('2x', 8, 40, 16);
  await page.evaluate(function () { SC.zoomStep(0); SC.debugStep(1e-6); });
  await fpVisible('1x', 5, 12, 6);
  await page.evaluate(function () { SC.zoomStep(6); SC.debugStep(1e-6); });
  var sEnd = await page.evaluate(function () { SC.setPlayerInput(null); SC.debugStep(0.05); var a = SC.player(); for (var i = 0; i < 24; i++) SC.debugStep(0.1); return { stop: a, later: SC.player(), progs: SC.renderer.info.programs.length }; });
  console.log('stick:', JSON.stringify(slog.map(function (w) { return [w.at[0], w.at[2], w.walking ? 'w' + w.frame : '-', w.foot, w.calls]; })), 'stop', JSON.stringify(sEnd.stop.at), sEnd.stop.walking, 'later foot', sEnd.later.footprints);
  if (!slog.every(function (w) { return w.walking && w.moving && w.input && w.input[0] === -1; })) fails.push('스틱: 12 칸 내내 walking · moving · input [-1,0] 이어야 한다 ' + JSON.stringify(slog.map(function (w) { return [w.walking, w.moving, w.input]; })));
  var sd = Math.hypot(slog[11].at[0] - 0.8, slog[11].at[2] + 1.5);
  if (!(Math.abs(sd - 1.44) < 0.1 && slog[11].at[0] < 0.8 && slog[11].at[2] > -1.5)) fails.push('스틱 화면 왼쪽 1.2 s → 월드 −x +z 로 ≈ 1.44 m 가야 한다 (' + sd.toFixed(3) + ')');
  if (!(slog[11].foot >= 5 && slog.every(function (w, j) { return j === 0 || w.foot >= slog[j - 1].foot; }))) fails.push('스틱: 발자국이 걸음마다 늘어야 한다 (0.1 s 칸은 디딤 프레임을 건너뛰기도 해 12 칸에 5 개 이상) ' + JSON.stringify(slog.map(function (w) { return w.foot; })));
  if (Math.max.apply(null, slog.map(function (w) { return w.calls; })) > calls0s + 2) fails.push('스틱 걷기 드로우콜 ' + Math.max.apply(null, slog.map(function (w) { return w.calls; })) + ' > 기준 ' + calls0s + ' + 2 (발자국은 인스턴스 한 메시 = 뷰티 1 + 노멀 1)');
  if (sEnd.stop.walking || sEnd.later.footprints !== 0) fails.push('스틱을 놓으면 멈추고 2.3 s 뒤 자국 0 ' + JSON.stringify([sEnd.stop.walking, sEnd.later.footprints]));
  if (sEnd.progs !== p0) fails.push('스틱 걷기 뒤 프로그램 수 ' + p0 + ' → ' + sEnd.progs);
  await page.evaluate(function () { SC.zoomStep(0); SC.jumpTo('center'); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
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
