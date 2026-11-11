#!/usr/bin/env node
/* tools/export-site.js — 배포에 나갈 파일만 한 폴더에 모은다 (README '배포').
 *
 *   node tools/export-site.js            # → public/
 *   node tools/export-site.js <폴더>     # → 그 폴더 (tools/test-export.js 는 임시 폴더로 부른다)
 *
 * Vercel 이 이 스크립트를 빌드 명령으로 돌리고 (vercel.json buildCommand), 나온 폴더만 정적 파일로 낸다 (outputDirectory).
 * 저장소의 나머지 — 설계 문서 · 주인 결정 기록 · 스킬 · 도구 · 시험 · 하던 일 — 는 배포되지 않는다.
 * api/ 함수는 Vercel 이 저장소 뿌리에서 따로 묶는다 (mcp/ · js/ · library/ 를 거기서 읽는다). 여기서는 건드리지 않는다.
 * 게임 파일은 옮기지 않는다. 복사일 뿐이라 시험 · 다른 작업 · 함수는 지금 자리를 그대로 쓴다.
 *
 * 의존성 없음 (node 내장만) · 같은 저장소면 같은 결과 (이름 순) · 빈 폴더에서 시작 (예전 결과는 지운다).
 * 끝에 한 줄: 파일 수 · 바이트. 꼭 있어야 하는 파일이 없거나, 싣는 폴더 안에 정하지 않은 파일이 있으면 exit 1 (배포가 멈춘다).
 *
 * 그림 · 소리 · 쪽을 새로 넣을 때:
 *   · 이미 싣는 폴더 (TAKE) 안의 아는 종류 (TYPES) 면 여기서 할 일은 없다. 목록 (manifest.json) 에 넣거나 쪽 · 스타일 · 스크립트가 가리키면 따라 나간다
 *     (아무도 안 가리키는 파일이 실리면 tools/test-export.js 가 알려 준다).
 *   · 만드는 사람만 보는 파일이면 LEAVE 에 한 줄 (까닭과 함께).
 *   · 맨 위에 새 폴더 · 파일 (새 쪽 포함) 이면 TAKE 나 PRIVATE 에 한 줄 — 안 적으면 싣지 않고, tools/test-export.js 가 '정해 달라' 고 멈춘다.
 */
'use strict';
var fs = require('fs'), path = require('path');

var ROOT = path.resolve(__dirname, '..');

/* ── 싣는 것: [경로, 까닭]. '/' 로 끝나면 폴더 통째 (아래 LEAVE 는 빼고) ── */
var TAKE = [
  ['index.html',   '본 게임. 주소 /'],
  ['cook.html',    '부엌. /cook.html · /cook.html?sound=1'],
  ['credits.html', "'만든 것들': 남의 소리 · 글꼴 · three.js 크레딧과 저작권 줄. 설정 맨 아래와 부엌 조리대에서 간다"],
  ['css/',         '화면 모양'],
  ['js/',          '게임 스크립트'],
  ['assets/',      '그림. 목록은 assets/manifest.json'],
  ['audio/',       '음악 · 효과음. 목록은 audio/manifest.json (.ogg 와 .m4a 둘 다: 브라우저가 읽을 수 있는 쪽을 받는다)'],
  ['foley/',       '부엌의 녹음 소리. 목록은 foley/manifest.json'],
  ['vendor/',      'three.js · Galmuri 글꼴 · MCP 엽서 화면 스크립트, 그리고 그 라이선스 글 (라이선스가 같이 내라고 한다)']
];

/* ── 싣는 폴더 안에서 빼는 것: [무늬, 까닭]. 무늬는 넷뿐 — 'a/b/' 그 폴더 아래 전부 · '*.확장자' 어디서든 · '.*' 점 파일 · 'a/b.c' 그 파일 ── */
var LEAVE = [
  ['*.md',                  '만드는 사람이 읽는 글 (README · 소리 목록 · 출처 원장 foley/CREDITS.md). 플레이어가 보는 크레딧은 credits.html'],
  ['.*',                    '점 파일 (.gitignore · .DS_Store)'],
  ['assets/ref/',           '그림 참고 자료. 게임이 읽지 않는다'],
  ['assets/poster/',        '포스터 그림 낱장. 게임은 js/poster-art-data.js 에 든 같은 그림을 쓴다 (tools/make-poster-art.js 가 둘 다 만든다)'],
  ['audio/src/',            '소리를 만드는 원본 (파이썬 · 악보 · 조각 목록)'],
  ['audio/docs/',           '소리 조사 노트'],
  ['audio/soundboard.html', '소리를 들어 보는 개발용 쪽'],
  ['foley/listen.html',     '부엌 소리를 들어 보는 개발용 쪽'],
  ['js/play.js',            '컵 놀이 시제품 (play.html) 전용. 본 게임에 이으면 이 줄과 아래 두 줄 · PRIVATE 의 play.html 을 같이 본다'],
  ['css/play.css',          '컵 놀이 시제품 (play.html) 전용'],
  ['js/play-stickers.js',   '달리기 · 헤엄 반응 스티커. 아직 어느 쪽도 싣지 않는 스크립트 — 게임에 이으면 이 줄을 지운다']
];

/* ── 싣는 폴더 안에서 실어도 되는 종류. 여기 없는 종류가 있으면 (LEAVE 에도 없으면) 멈춘다 — 모르는 것을 말없이 싣지도, 말없이 빼지도 않는다.
      .html 과 .txt 는 일부러 없다: 쪽은 TAKE 에 하나씩 적고 (폴더 안의 .html 은 개발용 쪽이기 쉽다), 글 파일은 라이선스 글만 싣는다 (다른 .txt 는 메모이기 쉽다) ── */
var TYPES = ['.css', '.js', '.json', '.svg', '.png', '.woff2', '.ogg', '.m4a'];
var LICENCE_TEXT = /^(?:[A-Z0-9]+-)?LICENSE(?:\.txt)?$/;   /* LICENSE · THREE-LICENSE.txt · GALMURI-LICENSE.txt */

/* ── 꼭 있어야 하는 것 (없으면 exit 1): 쪽 셋 · 목록 셋 · 라이선스 글 셋 · 뼈대 ── */
var MUST = [
  'index.html', 'cook.html', 'credits.html',
  'css/style.css', 'js/app.js', 'js/audio.js', 'js/cook.js',
  'assets/manifest.json', 'audio/manifest.json', 'foley/manifest.json',
  'vendor/three.min.js', 'vendor/THREE-LICENSE.txt',
  'vendor/fonts/galmuri.css', 'vendor/fonts/GALMURI-LICENSE.txt',
  'vendor/mcp-apps/LICENSE'
];

/* ── 저장소 맨 위에서 싣지 않는 것: [경로, 까닭]. 스크립트는 TAKE 만 보므로 여기 없어도 실리지 않는다.
      적어 두는 까닭: 맨 위에 새 폴더 · 파일이 생기면 tools/test-export.js 가 TAKE 인지 PRIVATE 인지 정해 달라고 멈춘다 ── */
var PRIVATE = [
  ['docs/',             '설계 문서 · 주인 결정 기록 · 조사 · 증거 사진'],
  ['.claude/',          '스킬'],
  ['.github/',          'CI 설정'],
  ['tools/',            '만드는 · 재는 · 시험하는 도구 (이 스크립트도)'],
  ['tests/',            '시험 증거'],
  ['wip/',              '하던 일 보관'],
  ['mcp/',              'MCP 서버 코드. api/ 함수가 읽는다 — 정적 파일로는 내지 않는다'],
  ['api/',              'Vercel 함수. Vercel 이 저장소 뿌리에서 따로 만든다 (/api/... 주소는 그대로)'],
  ['library/',          '문어가 읽는 책 · 카드. api/mcp 함수가 읽는다 (vercel.json includeFiles) — 브라우저는 읽지 않는다'],
  ['play.html',         '컵 놀이 시제품. 본 게임 어디에서도 가지 않는다 (docs/PLAY_PROTO.md). 시험은 저장소에서 그대로 돈다'],
  ['README.md',         '저장소 설명'],
  ['package.json',      'npm 설정 (함수 의존성 · 시험 명령)'],
  ['package-lock.json', 'npm 잠금 파일'],
  ['vercel.json',       '배포 설정'],
  ['.gitignore',        'git 설정'],
  ['.mcp.json',         '로컬 MCP 설정'],
  ['node_modules/',     '설치된 의존성'],
  ['dist/',             '한 파일 묶음 (tools/bundle.js). 로컬에서만 만든다'],
  ['public/',           '이 스크립트가 만든 결과']
];

/* ── (나중) 줄이기 · 읽기 어렵게 하기는 여기 한 곳 ──
   주인 11-10: "역공학 방지도 나중에 해야할 거 같은데." 지금은 아무것도 하지 않는다 — 모든 파일을 바이트 그대로 복사한다.
   넣게 되면 이 함수만 바꾼다: rel (예: 'js/app.js') 과 원본 바이트를 받아 내보낼 바이트를 돌려준다.
   그때 지킬 것: 남의 파일 (vendor/) 과 라이선스 글은 그대로 · 결과는 넣을 때마다 같아야 한다 · tools/test-export.js 를 전부 다시 돌린다
   (그 시험의 '원본과 바이트 그대로' 는 바꾸는 종류만 풀어 주고, c 의 '가리키는 곳' 은 바뀐 글로 다시 본다). */
function transform(rel, bytes) { return bytes; }

function slash(p) { return p.split(path.sep).join('/'); }
function leaveRule(rel) {   /* rel 을 빼는 LEAVE 줄 (없으면 null) */
  var base = rel.slice(rel.lastIndexOf('/') + 1);
  for (var i = 0; i < LEAVE.length; i++) {
    var pat = LEAVE[i][0];
    if (pat === '.*') { if (rel.split('/').some(function (seg) { return seg[0] === '.'; })) return LEAVE[i]; }
    else if (pat.slice(0, 2) === '*.') { if (base.length > pat.length - 1 && base.slice(-(pat.length - 1)) === pat.slice(1)) return LEAVE[i]; }
    else if (pat.slice(-1) === '/') { if (rel.indexOf(pat) === 0) return LEAVE[i]; }
    else if (rel === pat) return LEAVE[i];
  }
  return null;
}
function shippable(rel) {
  var base = rel.slice(rel.lastIndexOf('/') + 1), dot = base.lastIndexOf('.');
  return LICENCE_TEXT.test(base) || (dot > 0 && TYPES.indexOf(base.slice(dot).toLowerCase()) >= 0);
}
function byName(a, b) { return a < b ? -1 : a > b ? 1 : 0; }   /* 로캘과 상관없는 순서 */

/* 저장소를 읽어 무엇을 실을지 정한다 (아무것도 쓰지 않는다).
   → { files: ['index.html', ...] 이름 순, left: [{ rel, why }], unknown: [싣는 폴더 안의 정하지 않은 파일], missing: [없는 것] } */
function plan(root) {
  root = root || ROOT;
  var files = [], left = [], unknown = [], missing = [];
  function walk(dirRel) {
    fs.readdirSync(path.join(root, dirRel), { withFileTypes: true }).map(function (e) { return e.name; }).sort(byName).forEach(function (name) {
      var rel = dirRel + name, st = fs.lstatSync(path.join(root, rel));
      if (st.isDirectory()) {
        var rule = leaveRule(rel + '/');
        if (rule) left.push({ rel: rel + '/', why: rule[1] }); else walk(rel + '/');
        return;
      }
      var r = leaveRule(rel);
      if (r) left.push({ rel: rel, why: r[1] });
      else if (!st.isFile() || !shippable(rel)) unknown.push(rel);   /* 바로 가기 (symlink) · 모르는 종류 */
      else files.push(rel);
    });
  }
  TAKE.forEach(function (t) {
    var rel = t[0], isDir = rel.slice(-1) === '/', abs = path.join(root, rel), st = null;
    try { st = fs.statSync(abs); } catch (e) { st = null; }
    if (!st || (isDir ? !st.isDirectory() : !st.isFile())) { missing.push(rel); return; }
    if (isDir) walk(rel); else files.push(rel);
  });
  files.sort(byName);
  MUST.forEach(function (m) { if (files.indexOf(m) < 0 && missing.indexOf(m) < 0) missing.push(m); });
  return { files: files, left: left, unknown: unknown, missing: missing };
}

/* 지워도 되는 폴더인가: 없거나 · 비었거나 · 예전에 내보낸 것만 들어 있을 때만 (저장소 뿌리나 js/ 같은 곳을 실수로 지우지 않게).
   → 안 되면 까닭 한 줄, 되면 null */
function safeToEmpty(out, root) {
  function within(dir, p) { var r = path.relative(dir, p); return r === '' || (r.split(path.sep)[0] !== '..' && !path.isAbsolute(r)); }
  if (within(out, root)) return '저장소 뿌리나 그 위 폴더로는 내보내지 않는다';
  if (within(root, out)) {
    var top = path.relative(root, out).split(path.sep)[0];
    var used = TAKE.concat(PRIVATE).map(function (t) { return t[0].replace(/\/$/, ''); }).filter(function (n) { return n !== 'public'; });
    if (used.indexOf(top) >= 0) return "'" + top + "' 는 저장소가 쓰는 자리다. 다른 폴더를 골라 줘";
  }
  var names; try { names = fs.readdirSync(out); } catch (e) { return null; }   /* 없음 → 새로 만든다 */
  var ours = TAKE.map(function (t) { return t[0].replace(/\/$/, ''); });
  var odd = names.filter(function (n) { return ours.indexOf(n) < 0 && n !== '.DS_Store'; });   /* 파인더가 떨어뜨리는 .DS_Store 하나만 봐준다 (폴더째 지우고 새로 만든다). 다른 점 이름 (.git 같은 것) 은 남의 것이라 멈춘다 */
  return odd.length ? '그 폴더에 내보낸 것이 아닌 게 있다 (' + odd.slice(0, 3).join(', ') + (odd.length > 3 ? ' …' : '') + '). 지우지 않고 멈춘다' : null;
}

/* 내보낸다. → { files, bytes, out, byTop } · 문제면 Error (message 가 그대로 안내 글) */
function run(outDir, opts) {
  opts = opts || {};
  var root = opts.root || ROOT, out = path.resolve(outDir || path.join(root, 'public'));
  var p = plan(root);
  if (p.missing.length) throw new Error('꼭 있어야 하는 것이 없다: ' + p.missing.join(', '));
  if (p.unknown.length) throw new Error('싣는 폴더 안에 정하지 않은 파일이 있다 (' + p.unknown.length + '개): ' + p.unknown.slice(0, 8).join(', ') + (p.unknown.length > 8 ? ' …' : '') +
    '\n  게임이 쓰는 새 종류면 tools/export-site.js 의 TYPES 에, 만드는 사람만 보는 파일이면 LEAVE 에 한 줄을 넣는다 (새 쪽 .html 은 TAKE 에).');
  var no = safeToEmpty(out, root);
  if (no) throw new Error(no + ' (' + out + ')');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  var bytes = 0, byTop = {};
  p.files.forEach(function (rel) {
    var data = transform(rel, fs.readFileSync(path.join(root, rel))), dst = path.join(out, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, data);
    bytes += data.length;
    var top = rel.indexOf('/') < 0 ? '(pages)' : rel.slice(0, rel.indexOf('/') + 1), t = byTop[top] || (byTop[top] = { files: 0, bytes: 0 });
    t.files++; t.bytes += data.length;
  });
  return { files: p.files.length, bytes: bytes, out: out, byTop: byTop, list: p.files, left: p.left };
}

module.exports = { ROOT: ROOT, TAKE: TAKE, LEAVE: LEAVE, TYPES: TYPES, LICENCE_TEXT: LICENCE_TEXT, MUST: MUST, PRIVATE: PRIVATE, plan: plan, run: run, transform: transform };

if (require.main === module) {
  try {
    var r = run(process.argv[2]);
    Object.keys(r.byTop).sort(byName).forEach(function (k) { console.log('  ' + (k + '          ').slice(0, 10) + String(r.byTop[k].files).padStart(5) + ' files ' + String(r.byTop[k].bytes).padStart(10) + ' bytes'); });
    var shown = slash(path.relative(process.cwd(), r.out));
    console.log('export-site: ' + r.files + ' files, ' + r.bytes + ' bytes -> ' + (shown && shown.slice(0, 2) !== '..' ? shown : slash(r.out)) + '/');
  } catch (e) {
    console.error('export-site: ' + (e && e.message || e));
    process.exit(1);
  }
}
