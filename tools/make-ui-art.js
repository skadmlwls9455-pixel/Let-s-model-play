#!/usr/bin/env node
/* tools/make-ui-art.js — UI 아트 생성기 (docs/UI_ART.md).
 *
 *   node tools/make-ui-art.js            # 스프라이트(아이콘·테두리·말풍선·파티클) PNG + 일러스트(타이틀·로딩) + 미리보기 시트
 *   node tools/make-ui-art.js sprites    # 스프라이트만 (브라우저 없이, zlib 만)
 *   node tools/make-ui-art.js illust     # 일러스트만 (Playwright + SwiftShader WebGL)
 *   node tools/make-ui-art.js sheet      # 미리보기 시트만 → tests/evidence/ui-art/sheet.png
 *   node tools/make-ui-art.js clouds     # 입장 하늘 구름 시트만 (js/clouds.js) → tests/evidence/ui-art/clouds.png
 *
 * 스프라이트: tools/ui-art/sprites.js 의 그리드 → Apollo 색 → (outline 이면) 장면 외곽선 규칙으로 1px 선 → PNG 1x.
 * 일러스트: 게임 장면 렌더러(js/scene3d.js)를 그대로 띄워 구도·시각·표정만 고정해 찍는다 → 아트 픽셀 1x 로 줄여 저장.
 *   그래서 장면과 같은 팔레트·디더·외곽선·블룸이 그대로 나온다. 로고 글자는 Galmuri11 Bold(OFL) 를 정수 배로 찍고 알파를 이진화.
 * 결과 키는 assets/manifest.json 에 **추가만** 한다 (icon.* · fx.* · ui.* · illust.*). 기존 키(souvenir.* 등)는 건드리지 않는다 —
 *   2D 폴백이 souvenir.* 를 8px 로 줄여 그려서, 16px 픽셀 PNG 로 바꾸면 줄일 때 칸이 빠진다. 바꿀지는 UI 쪽에서 정한다.
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var SP = require('./ui-art/sprites.js');
var ROOT = path.resolve(__dirname, '..');
var MODE = process.argv[2] || 'all';
var MANIFEST = path.join(ROOT, 'assets/manifest.json');
var EVID = path.join(ROOT, 'tests/evidence/ui-art');

/* ─────────── PNG 인코더 (RGBA 8-bit, 필터 0) ─────────── */
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { var c = 0xffffffff; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { var l = Buffer.alloc(4), t = Buffer.from(type, 'ascii'), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); }
function encodePNG(w, h, px) {
  var ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function writePNG(rel, w, h, px) { var f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, encodePNG(w, h, px)); }

/* ─────────── 색 (OKLab, js/scene3d.js 와 같은 식) ─────────── */
function s2l(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function hexRgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }); }
function oklab(hex) {
  var c = hexRgb(hex).map(function (v) { return s2l(v / 255); });
  var l = Math.cbrt(0.412221469470763 * c[0] + 0.5363325372617348 * c[1] + 0.0514459932675022 * c[2]);
  var m = Math.cbrt(0.2119034958178252 * c[0] + 0.6806995506452344 * c[1] + 0.1073969535369406 * c[2]);
  var s = Math.cbrt(0.0883024591900564 * c[0] + 0.2817188391361215 * c[1] + 0.6299787016738222 * c[2]);
  return [0.210454268309314 * l + 0.7936177747023054 * m - 0.0040720430116193 * s, 1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411 * s, 0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s];
}
var APOLLO = Object.keys(SP.KEY).map(function (k) { return SP.KEY[k]; });
var APOLLO_LAB = APOLLO.map(oklab);
function nearest(lab) { /* 장면 셰이더와 같은 가중 (L 1, ab 1.3) */
  var best = 1e9, bi = 0;
  APOLLO_LAB.forEach(function (p, i) { var d = Math.pow(lab[0] - p[0], 2) + Math.pow((lab[1] - p[1]) * 1.3, 2) + Math.pow((lab[2] - p[2]) * 1.3, 2); if (d < best) { best = d; bi = i; } });
  return APOLLO[bi];
}
var OUTLINE_CACHE = {};
function outlineOf(hex) { /* 장면 외곽선: 그 색 L 을 깎고 팔레트 스냅 (자기 자신이 나오면 한 단계 더) */
  if (OUTLINE_CACHE[hex]) return OUTLINE_CACHE[hex];
  var lab = oklab(hex), k = 0.62, o = nearest([lab[0] * k, lab[1] * 0.9, lab[2] * 0.9]);
  while (o === hex && k > 0.2) { k -= 0.1; o = nearest([lab[0] * k, lab[1] * 0.9, lab[2] * 0.9]); }
  return (OUTLINE_CACHE[hex] = o);
}

/* ─────────── 그리드 → RGBA ─────────── */
function grid(rows, w, h, name) {
  var px = Buffer.alloc(w * h * 4), cells = [];
  if (rows.length > h) throw new Error(name + ': 줄 ' + rows.length + ' > ' + h);
  for (var y = 0; y < h; y++) {
    var row = rows[y] || '';
    if (row.length > w) throw new Error(name + ': ' + y + '행 길이 ' + row.length + ' > ' + w);
    for (var x = 0; x < w; x++) {
      var ch = row[x] || '.';
      if (ch !== '.' && !SP.KEY[ch]) throw new Error(name + ': 모르는 글자 ' + JSON.stringify(ch) + ' (' + x + ',' + y + ')');
      cells.push(ch === '.' ? null : SP.KEY[ch]);
    }
  }
  return { w: w, h: h, cells: cells };
}
function addOutline(g) { /* 투명 칸 중 4-이웃이 칠해진 칸 → 가장 어두운 이웃의 외곽선 색 */
  var out = g.cells.slice();
  for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) {
    if (g.cells[y * g.w + x]) continue;
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { var X = x + d[0], Y = y + d[1]; return X < 0 || Y < 0 || X >= g.w || Y >= g.h ? null : g.cells[Y * g.w + X]; }).filter(Boolean);
    if (!nb.length) continue;
    nb.sort(function (a, b) { return oklab(a)[0] - oklab(b)[0]; });
    out[y * g.w + x] = outlineOf(nb[0]);
  }
  return { w: g.w, h: g.h, cells: out };
}
function toRGBA(g) {
  var px = Buffer.alloc(g.w * g.h * 4);
  g.cells.forEach(function (c, i) { if (!c) return; var r = hexRgb(c); px[i * 4] = r[0]; px[i * 4 + 1] = r[1]; px[i * 4 + 2] = r[2]; px[i * 4 + 3] = 255; });
  return px;
}
function strip(frames, cw, ch, name, outline) { /* 칸들을 가로로 이어 붙인 한 장 */
  var W = cw * frames.length, px = Buffer.alloc(W * ch * 4);
  frames.forEach(function (rows, f) {
    var g = grid(rows, cw, ch, name + '#' + f); if (outline) g = addOutline(g);
    var p = toRGBA(g);
    for (var y = 0; y < ch; y++) p.copy(px, (y * W + f * cw) * 4, y * cw * 4, (y + 1) * cw * 4);
  });
  return { w: W, h: ch, px: px };
}

/* ─────────── 스프라이트 출력 ─────────── */
var OUT = {};   /* manifest 키 → { src, w, h, note, frames? } */
var NOTES = {
  souvenir: '기념품 픽셀 아이콘 16×16 (장면 외곽선 규칙, Apollo). souvenir.* 플레이스홀더의 픽셀 버전 — 1x·2x 정수 배로만 쓸 것.',
  memory: '기억 코너 아이콘 16×16 — 로그 "기억" 행 · 포스터 열람 기록 줄.',
  log: '산책 로그 행 아이콘 16×16 (도구 라벨·읽기 상태). 실패도 빨강 없이 같은 모양 언어.',
  ui: '대화창 UI 아이콘 16×16 (DIALOGUE_UI §5.9 · 카드 12): ui.backlog = 📜 다시 보기 단추, ui.hand = 너 줄 (내 얼굴 그림이 없을 때).'
};
function fileOf(key, dir) { var parts = key.split('.'); return 'assets/' + dir + '/' + parts.slice(1).join('_') + '.png'; }
function makeSprites() {
  var n = 0;
  Object.keys(SP.ICONS).forEach(function (key) {
    var g = addOutline(grid(SP.ICONS[key], 16, 16, key)), cat = key.split('.')[0];
    var rel = cat === 'souvenir' ? 'assets/icons/souvenir/' + key.slice(9) + '.png' : fileOf(key, 'icons/' + cat);
    writePNG(rel, 16, 16, toRGBA(g)); n++;
    OUT['icon.' + key] = { src: rel, w: 16, h: 16, note: NOTES[cat] };
  });
  Object.keys(SP.FX).forEach(function (key) {
    var fx = SP.FX[key], s = strip(fx.frames, 8, 8, key, false), rel = 'assets/fx/' + key.slice(3) + '.png';
    writePNG(rel, s.w, s.h, s.px); n++;
    OUT[key] = { src: rel, w: s.w, h: s.h, frames: fx.frames.length, cell: 8, note: fx.note + ' — 8×8 칸 ' + fx.frames.length + '개 가로 스트립.' };
  });
  var FNOTE = {
    'ui.frame.dialog': '대화창 9-slice (24×24, 슬라이스 8). 나무 테 + 남색 판 + 호박색 못. CSS: border-image: url() 8 fill / 16px round',
    'ui.frame.paper': '종이 카드 9-slice (포스터 열람·영수증). 위·왼쪽 밝은 줄 = 빛은 위에서',
    'ui.frame.portrait': '초상 틀 9-slice (대화창 왼쪽 64×64 초상 둘레, 안으로 파인 인셋)',
    'ui.bubble.say': '말풍선 보통 9-slice (종이흰 + 남색 1px, 둥근 모서리)',
    'ui.bubble.think': '생각 풍선 9-slice (구름 가장자리 — 혼잣말·기억)',
    'ui.bubble.shout': '외침 풍선 9-slice (가시 가장자리 — happy·놀람)',
    'ui.bubble.whisper': '속삭임 풍선 9-slice (점선, 옅은 청록 — 졸림·잠꼬대)',
    'ui.nameplate': '이름표 9-slice (24×24, 슬라이스 8) — 대사창 왼쪽 위 테두리에 8px 걸친 작은 나무 판 (frame_dialog 와 같은 나무, 판은 어두운 b 라 밝은 글자). 카드 12'
  };
  Object.keys(SP.FRAMES).forEach(function (key) {
    var g = grid(SP.FRAMES[key], 24, 24, key), rel = 'assets/ui/' + key.slice(3).replace('.', '_') + '.png';
    writePNG(rel, 24, 24, toRGBA(g)); n++;
    OUT[key] = { src: rel, w: 24, h: 24, slice: 8, note: FNOTE[key] };
  });
  Object.keys(SP.TAILS).forEach(function (key) {
    var tw = Math.max(8, Math.max.apply(null, SP.TAILS[key].map(function (r) { return r.length; })));   /* 꼬리는 8 칸 이상 (외침 = 10) */
    var g = grid(SP.TAILS[key], tw, 8, key), rel = 'assets/ui/' + key.slice(3).replace('.', '_') + '.png';
    writePNG(rel, tw, 8, toRGBA(g)); n++;
    OUT[key] = { src: rel, w: tw, h: 8, note: /next/.test(key) ? '대화창 "다음" ▼ (next/next2 를 0.5 s 마다 번갈아)' : '말풍선 꼬리 — 풍선 아랫변 가운데, 위 1줄이 풍선 선과 겹친다' };
    if (key === 'ui.next_bob') { OUT[key].frames = 4; OUT[key].cell = 8; OUT[key].note = '대화창 "다음" ▼ 4프레임 (8×8 칸 × 4 가로 띠): 아래로 0·1·2·1 px, 2px 프레임은 1px 납작. 프레임당 180ms, 3바퀴 뒤 0번에서 멈춤 (DIALOGUE_UI §5.9 · 카드 12)'; }
  });
  console.log('sprites: ' + n + ' PNG');
}

/* ─────────── 일러스트 (게임 렌더러로 찍기) ─────────── */
async function makeIllust() {
  var { chromium } = require('playwright');
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
  var errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'tools/ui-art/illust.html'));
  await page.waitForFunction(function () { return window.ILLUST_READY === true; }, null, { timeout: 30000 });
  var shots = await page.evaluate(function () { return window.ILLUST.all(); });
  await browser.close();
  if (errs.length) { console.error('일러스트 페이지 에러:', errs); process.exit(1); }
  shots.forEach(function (s) {
    var buf = Buffer.from(s.data, 'base64'), f = path.join(ROOT, s.src);
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf);
    if (!s.preview) OUT[s.key] = { src: s.src, w: s.w, h: s.h, note: s.note };
    console.log('  🖼 ' + s.src + ' ' + s.w + '×' + s.h + (s.colours != null ? ' · 색 ' + s.colours : ''));
  });
}

/* ─────────── 미리보기 시트 (검증용 스크린샷) ─────────── */
async function makeSheet() {
  var { chromium } = require('playwright');
  var browser = await chromium.launch();
  var page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  await page.addInitScript(function (m) { window.UIART_MANIFEST = m; }, JSON.parse(fs.readFileSync(MANIFEST, 'utf8')));
  await page.goto('file://' + path.join(ROOT, 'tools/ui-art/preview.html'));
  await page.waitForFunction(function () { return window.PREVIEW_READY === true; }, null, { timeout: 20000 });
  fs.mkdirSync(EVID, { recursive: true });
  await page.screenshot({ path: path.join(EVID, 'sheet.png'), fullPage: true });
  await browser.close();
  console.log('  📷 tests/evidence/ui-art/sheet.png');
}

/* ─────────── 구름 시트 (js/clouds.js, 날씨 4 × 시각대 3 × 가까운/먼 층) ─────────── */
async function makeClouds() {
  var { chromium } = require('playwright');
  var browser = await chromium.launch();
  var page = await browser.newPage({ viewport: { width: 1960, height: 600 }, deviceScaleFactor: 1 });
  var errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto('file://' + path.join(ROOT, 'tools/ui-art/clouds.html'));
  await page.waitForFunction(function () { return window.CLOUDS_READY === true; }, null, { timeout: 20000 });
  fs.mkdirSync(EVID, { recursive: true });
  await page.screenshot({ path: path.join(EVID, 'clouds.png'), fullPage: true });
  await browser.close();
  if (errs.length) { console.error('구름 시트 에러:', errs); process.exit(1); }
  console.log('  ☁ tests/evidence/ui-art/clouds.png');
}

function updateManifest() {
  if (!Object.keys(OUT).length) return;
  var man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  Object.keys(OUT).forEach(function (k) {
    man[k] = OUT[k];
  });
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
  console.log('manifest: ' + Object.keys(OUT).length + ' 키 갱신');
}

(async function () {
  if (MODE === 'all' || MODE === 'sprites') makeSprites();
  if (MODE === 'all' || MODE === 'illust') await makeIllust();
  updateManifest();
  if (MODE === 'all' || MODE === 'sheet') await makeSheet();
  if (MODE === 'all' || MODE === 'clouds') await makeClouds();
})().catch(function (e) { console.error(e); process.exit(1); });
