#!/usr/bin/env node
/*
 * bundle.js — 뽈뽈 문어 단일 파일 번들러 (node, 의존성 없음)
 *
 * 사용법:  node tools/bundle.js            → dist/ppolppol.html
 *
 * 하는 일
 *  1. index.html 을 읽는다.
 *  2. <link rel="stylesheet" href="css/style.css"> 를 <style>…</style> 로 인라인.
 *  3. <script src="js/world.js|brain.js|app.js"> 를 순서대로 <script>…</script> 로 인라인.
 *     (vendor/three.min.js, js/scene3d.js 같은 다른 로컬 스크립트도 index.html 에 있으면 그대로 인라인한다.)
 *  4. assets/manifest.json 의 모든 에셋을 data: URI 로 바꾼 사본을
 *     window.ASSETS_INLINE = {...} 로 app.js 앞에 끼워 넣는다 (app.js 는 이 값이 있으면 fetch 대신 쓴다).
 *  5. dist/ppolppol.html 로 쓴다.
 *
 * index.html 이 아직 없으면 안내만 출력하고 exit 0.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'ppolppol.html');
const MANIFEST = path.join(ROOT, 'assets', 'manifest.json');

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
// 인라인된 코드 안의 '</script>' / '</style>' 가 문서를 끊지 않게 한다.
function safeScript(code) {
  return code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}
function safeStyle(css) {
  return css.replace(/<\/(style)/gi, '<\\/$1');
}
function toDataURI(rel) {
  const abs = path.join(ROOT, rel);
  const ext = path.extname(rel).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(abs);
  if (ext === '.svg') {
    // SVG 는 utf8 + percent-encoding 이 base64 보다 보통 더 작다
    const txt = buf.toString('utf8')
      .replace(/\r?\n\s*/g, ' ')
      .replace(/"/g, "'")
      .replace(/[<>#%{}\\^`|]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
    return `data:${mime};charset=utf8,${txt}`;
  }
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function buildInlineManifest() {
  if (!fs.existsSync(MANIFEST)) {
    console.warn('[bundle] assets/manifest.json 없음 — 에셋 인라인 생략 (node tools/make-placeholders.js 먼저)');
    return null;
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const inline = {};
  let missing = 0;
  for (const key of Object.keys(manifest)) {
    const entry = manifest[key];
    if (!entry || typeof entry.src !== 'string') continue;
    if (!exists(entry.src)) { console.warn(`[bundle] 에셋 파일 없음: ${key} → ${entry.src}`); missing++; continue; }
    inline[key] = { src: toDataURI(entry.src), w: entry.w, h: entry.h };
    if (entry.note) inline[key].note = entry.note;
  }
  if (missing) console.warn(`[bundle] ${missing}개 에셋을 건너뜀`);
  return inline;
}

function bundle() {
  if (!fs.existsSync(INDEX)) {
    console.log('[bundle] index.html 이 아직 없어서 번들을 만들지 않았어. index.html 이 생기면 다시 실행해 줘: node tools/bundle.js');
    return 0;
  }
  let html = fs.readFileSync(INDEX, 'utf8');
  const report = { css: [], js: [], assets: 0 };

  // 1) 스타일시트 인라인
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const m = tag.match(/href=["']([^"']+)["']/i);
    if (!m) return tag;
    const href = m[1];
    if (/^(https?:)?\/\//i.test(href) || href.startsWith('data:')) return tag; // 외부(Google Fonts 등)는 그대로
    if (!exists(href)) { console.warn(`[bundle] css 없음: ${href}`); return tag; }
    report.css.push(href);
    return `<style data-inlined="${href}">\n${safeStyle(readText(href))}\n</style>`;
  });

  // 2a) vendor 스크립트: onerror 속성 안에 '>' 가 있어 일반 정규식이 못 잡으므로 먼저 처리
  html = html.replace(/<script\s+src=["'](vendor\/[^"']+)["'][\s\S]*?<\/script>/gi, (tag, src) => {
    if (!exists(src)) { console.warn(`[bundle] vendor 없음: ${src}`); return tag; }
    report.js.push(src);
    return `<script data-inlined="${src}">\n${safeScript(readText(src))}\n</script>`;
  });
  // 2) 로컬 스크립트 인라인 (순서 유지)
  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, pre, src, post) => {
    if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return tag; // CDN 폴백 등 외부는 그대로
    if (/type=["']module["']/i.test(pre + post)) { console.warn(`[bundle] module 스크립트는 금지: ${src}`); return tag; }
    if (!exists(src)) { console.warn(`[bundle] js 없음: ${src}`); return tag; }
    report.js.push(src);
    const code = safeScript(readText(src));
    return `<script data-inlined="${src}">\n${code}\n</script>`;
  });

  // 3) 에셋 인라인: window.ASSETS_INLINE 을 app.js 앞에 (app.js 가 없으면 </head> 앞에)
  const inline = buildInlineManifest();
  if (inline) {
    report.assets = Object.keys(inline).length;
    const assetTag = `<script data-inlined="assets/manifest.json">\nwindow.ASSETS_INLINE = ${safeScript(JSON.stringify(inline))};\n</script>\n`;
    const appTagRe = /<script data-inlined="js\/app\.js">/;
    if (appTagRe.test(html)) {
      html = html.replace(appTagRe, (t) => assetTag + t);
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, assetTag + '</head>');
    } else {
      html = assetTag + html;
    }
  }

  // 4) 쓰기
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`[bundle] ${path.relative(ROOT, OUT)} (${kb} KB) — css ${report.css.length}, js ${report.js.length} [${report.js.join(', ')}], assets ${report.assets}`);
  return 0;
}

if (require.main === module) {
  try {
    process.exit(bundle());
  } catch (e) {
    console.error('[bundle] 실패:', e && e.message ? e.message : e);
    process.exit(1);
  }
}
module.exports = { bundle, toDataURI };
