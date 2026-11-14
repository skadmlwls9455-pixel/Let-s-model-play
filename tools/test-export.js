#!/usr/bin/env node
/* tools/test-export.js — 배포에 나가는 묶음 (tools/export-site.js) 을 지킨다. 실패하면 exit 1.
 *   node tools/test-export.js                                    # a · b · c — node 만, 의존성 없음 (npm test · CI 빠른 일)
 *   NODE_PATH=$(npm root -g) node tools/test-export.js --crawl   # a · d — Playwright 로 내보낸 묶음만 띄워 놀아 본다 (test:slow · CI 느린 일)
 *   KEEP=1 …                                                     # 임시 폴더를 지우지 않는다 (끝에 경로를 적는다)
 *   LIST=1 …                                                     # c 가 읽은 '어디 → 무엇' 을 한 줄씩 적는다
 *
 *  a. 내보내기: 임시 폴더로 내보낸다 (명령 그대로) · 끝 줄의 파일 수 · 바이트가 실제와 같다 · 두 번 해도 같은 결과 · 예전 결과는 지우고 시작 ·
 *     지킴이: 꼭 있어야 하는 파일이 없으면 / 싣는 폴더 안에 정하지 않은 종류가 있으면 멈춘다 · 내보낸 것이 아닌 게 든 폴더는 지우지 않는다 ·
 *     폴더를 안 주고 돌리면 (Vercel 이 부르는 그대로) vercel.json 의 outputDirectory 에 생긴다
 *  b. 있어야 할 것 · 없어야 할 것: 꼭 있어야 하는 파일 · 원본과 바이트 그대로 · 저작권 줄 · 쪽은 셋뿐 ·
 *     문서 · 스킬 · 도구 · 시험 · 하던 일 · 서버 코드 · 개발용 쪽 · 원본 그림 · 메모가 없다 (이 파일이 따로 가진 목록 — 내보내기 목록을 잘못 고쳐도 걸린다) ·
 *     저장소 맨 위의 것이 전부 '싣는다 (TAKE) / 안 싣는다 (PRIVATE)' 로 정해져 있다 — 새 폴더를 정하지 않으면 여기서 멈춘다.
 *     (내보내기는 정하지 않은 것을 싣지 않으니 새어 나가지는 않는다. 다만 게임에 필요한 폴더가 말없이 빠지지 않게 시험이 멈춘다) ·
 *     vercel.json 이 이 묶음을 가리킨다 · 묶음 밖의 것을 내게 만들 수 있는 설정이 없다 ("public": true · 처음 보는 열쇠 (rewrites 같은 것) ·
 *     함수 묶음에 문서 · 도구를 넣는 includeFiles) · 함수가 읽는 파일 (includeFiles) 이 그대로 적혀 있고 저장소에 있다 · .gitignore 에 public/
 *  c. 가리키는 곳이 다 있다: 내보낸 쪽 · 스타일 · 스크립트 · 목록 (manifest) 이 가리키는 우리 파일이 묶음에 다 있다
 *     (쪽은 어느 속성이든 주소처럼 생긴 값을 다 본다. 실행 중에 이어 붙이는 주소는 글자 안에 든 폴더 부분과 목록으로 본다 — 아래 DYNAMIC),
 *     그리고 거꾸로: 묶음의 파일은 어딘가에서 가리킨다 (아무도 안 쓰는 파일이 실려 있지 않다)
 *  d. (--crawl) 묶음만 127.0.0.1 에 띄워서: 본 게임 첫 실행 (입장 · 이름 · 소리 켜기 · 산책 한 번 · 앨범 · 포스터) · 설정 맨 아래 링크로 만든 것들 · 돌아가기 · 부엌 한 접시 (소리).
 *     우리 주소로 간 요청이 하나도 실패하지 않고, 콘솔 오류 · 페이지 오류가 없다. 다른 곳 (글꼴 · 위키) 은 막고 위키만 가짜로 답한다.
 *     /api/ 는 이 서버에 없다 (Vercel 함수): 503 으로 답하고 실패로 세지 않고 적기만 한다 — 이 흐름에선 부르지 않는 것이 보통이다.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
var cp = require('child_process');
var EX = require('./export-site.js');

var ROOT = EX.ROOT;
var CRAWL = process.argv.indexOf('--crawl') >= 0;
var TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ppol-export-'));
var SITE = path.join(TMP, 'site');
var passes = 0, fails = 0;
function ok(c, m) { if (c) { passes++; console.log('  ok   ' + m); } else { fails++; console.error('  FAIL ' + m); } }
function some(list, n) { return list.slice(0, n || 6).join(', ') + (list.length > (n || 6) ? ' … (' + list.length + '개)' : ''); }
function walk(dir, base) {   /* → 이름 순 상대 경로 */
  var out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    var rel = (base ? base + '/' : '') + e.name;
    if (e.isDirectory()) out = out.concat(walk(path.join(dir, e.name), rel)); else out.push(rel);
  });
  return out.sort();
}
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function write(root, rel, text) { var f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text == null ? 'x' : text); }
function throwsWith(fn, re) { try { fn(); return false; } catch (e) { return re.test(String(e && e.message)); } }
function names(list) { return list.map(function (t) { return t[0].replace(/\/$/, ''); }); }

/* ───────────────────────── a. 내보내기 ───────────────────────── */
function partA() {
  console.log('\n== a. 내보내기');
  var r = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/export-site.js'), SITE], { encoding: 'utf8' });
  var last = String(r.stdout || '').trim().split('\n').pop() || '', m = /^export-site: (\d+) files, (\d+) bytes -> /.exec(last);
  ok(r.status === 0 && !!m, 'node tools/export-site.js <폴더> → exit 0 · 끝 줄 "' + last.slice(0, 60) + '…"' + (r.status ? ' — ' + String(r.stderr).trim() : ''));
  if (r.status !== 0 || !m) return null;
  var files = walk(SITE), bytes = files.reduce(function (a, f) { return a + fs.statSync(path.join(SITE, f)).size; }, 0);
  ok(+m[1] === files.length && +m[2] === bytes, '끝 줄의 숫자가 실제와 같다 (' + files.length + ' 파일 · ' + bytes + ' 바이트)');

  /* 두 번째: 같은 결과 · 예전 것은 지우고 시작 */
  var site2 = path.join(TMP, 'site2');
  write(site2, 'js/stale-from-last-time.js', 'old');
  var r2 = EX.run(site2), files2 = walk(site2);
  var same = files2.length === files.length && files.every(function (f, i) { return f === files2[i] && sha(path.join(SITE, f)) === sha(path.join(site2, f)); });
  ok(same, '다시 내보내도 같은 파일 · 같은 바이트 (' + r2.files + ' 파일)');
  ok(files2.indexOf('js/stale-from-last-time.js') < 0, '예전 결과에 남아 있던 파일은 지우고 시작한다');
  fs.rmSync(site2, { recursive: true, force: true });

  return files;
}
/* 지킴이 — 작은 가짜 저장소로 (진짜 저장소는 건드리지 않는다) */
function partAGuards() {
  var base = EX.MUST.concat(EX.TAKE.map(function (t) { return t[0]; }).filter(function (p) { return p.slice(-1) !== '/'; })).filter(function (p, i, a) { return a.indexOf(p) === i; }).sort();
  function mini(name) {   /* 꼭 있어야 하는 파일 + TAKE 의 파일 · 폴더만 있는 저장소 */
    var root = path.join(TMP, name);
    base.forEach(function (f) { write(root, f); });
    EX.TAKE.forEach(function (t) { if (t[0].slice(-1) === '/') fs.mkdirSync(path.join(root, t[0]), { recursive: true }); });
    return root;
  }
  var g0 = mini('g0');
  write(g0, 'docs/SECRET.md'); write(g0, 'newfolder/pic.png'); write(g0, 'assets/NOTES.md'); write(g0, 'audio/.DS_Store'); write(g0, 'assets/ref/a.png'); write(g0, 'README.md'); write(g0, 'play.html');
  var o0 = EX.run(path.join(TMP, 'g0-out'), { root: g0 }), l0 = walk(path.join(TMP, 'g0-out'));
  ok(o0.files === base.length && l0.join('|') === base.join('|'),
    '가짜 저장소: 싣는 것만 나온다 — docs/ · 새 폴더 · README.md · play.html · *.md · 점 파일 · assets/ref/ 는 없다 (' + l0.length + ' 파일)');
  var g1 = mini('g1'); fs.rmSync(path.join(g1, 'vendor/THREE-LICENSE.txt'));
  ok(throwsWith(function () { EX.run(path.join(TMP, 'g1-out'), { root: g1 }); }, /없다: .*vendor\/THREE-LICENSE\.txt/) && !fs.existsSync(path.join(TMP, 'g1-out')), '꼭 있어야 하는 파일 (라이선스 글) 이 없으면 멈추고 아무것도 쓰지 않는다');
  var g2 = mini('g2'); fs.rmSync(path.join(g2, 'foley'), { recursive: true });
  ok(throwsWith(function () { EX.run(path.join(TMP, 'g2-out'), { root: g2 }); }, /없다: .*foley\//), '싣는 폴더가 통째로 없어도 멈춘다');
  var g3 = mini('g3'); write(g3, 'assets/sketch.psd'); write(g3, 'audio/todo.txt'); write(g3, 'foley/board.html');
  ok(throwsWith(function () { EX.run(path.join(TMP, 'g3-out'), { root: g3 }); }, /정하지 않은 파일.*\(3개\): assets\/sketch\.psd, audio\/todo\.txt, foley\/board\.html/),
    '싣는 폴더 안의 모르는 종류 (assets/sketch.psd · audio/todo.txt · foley/board.html) 는 말없이 싣지도 빼지도 않고 멈춘다');
  var keep = path.join(TMP, 'not-an-export'); write(keep, 'keep.txt', 'mine');
  var r3 = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/export-site.js'), keep], { encoding: 'utf8' });
  ok(r3.status === 1 && fs.readFileSync(path.join(keep, 'keep.txt'), 'utf8') === 'mine', '내보낸 것이 아닌 게 든 폴더는 지우지 않고 exit 1');
  ok(throwsWith(function () { EX.run(g0, { root: g0 }); }, /뿌리/) && throwsWith(function () { EX.run(path.join(g0, 'js'), { root: g0 }); }, /저장소가 쓰는 자리/) && fs.existsSync(path.join(g0, 'js/app.js')),
    '저장소 뿌리 · 저장소가 쓰는 폴더 (js/) 로는 내보내지 않는다');

  /* 폴더를 안 주고 돌릴 때 — Vercel 이 부르는 그대로다 (vercel.json buildCommand). 결과는 vercel.json 의 outputDirectory 에 생겨야 한다.
     둘이 어긋나면 빌드가 'No Output Directory named "public" found' 로 멈춘다 (새지는 않지만 배포가 안 된다).
     진짜 저장소에 public/ 을 만들지 않으려고, 가짜 저장소에 스크립트를 복사해 그 뿌리에서 돌린다 (스크립트는 제 자리에서 저장소 뿌리를 찾는다.
     스크립트가 다른 파일을 require 하게 되면 그 파일도 여기서 같이 복사한다) */
  var gd = mini('gdef'), outName = String(JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).outputDirectory || '');
  write(gd, 'tools/export-site.js', fs.readFileSync(path.join(ROOT, 'tools/export-site.js')));
  var rd = cp.spawnSync(process.execPath, ['tools/export-site.js'], { cwd: gd, encoding: 'utf8' }), ld = [];
  try { ld = outName ? walk(path.join(gd, outName)) : []; } catch (e) { ld = []; }
  var lastD = String(rd.stdout || '').trim().split('\n').pop() || '';
  ok(rd.status === 0 && ld.join('|') === base.join('|') && lastD.slice(-(outName.length + 4)) === '-> ' + outName + '/',
    "폴더를 안 주면 vercel.json 의 outputDirectory ('" + outName + "') 에 내보낸다 — Vercel 이 찾는 그 폴더 (" + ld.length + ' 파일 · 끝 줄 "' + lastD.slice(0, 60) + '")' +
    (rd.status ? ' — ' + String(rd.stderr).trim() : ''));
}

/* ───────────────────────── b. 있어야 할 것 · 없어야 할 것 ───────────────────────── */
/* 내보내기 목록과 따로 둔다: 저쪽 목록을 잘못 고쳐 (예: docs/ 를 TAKE 에) 새어 나가면 여기서 걸린다 */
var FORBIDDEN = [
  [/^(docs|\.claude|\.github|tools|tests|wip)\//, '문서 · 스킬 · CI · 도구 · 시험 · 하던 일'],
  [/^(mcp|api|library)\//, '서버 쪽 코드와 자료 (함수가 읽는다 — 정적 파일이 아니다)'],
  [/^(node_modules|dist|public)\//, '설치물 · 묶음 · 내보낸 결과'],
  [/(^|\/)\.[^\/]*/, '점 파일 · 점 폴더'],
  [/\.(md|markdown|rst)$/i, '설명 글 · 메모 (종류로)'],
  [/(^|\/)(readme|notes?|todo|changelog)(\.(md|txt|rst|html?))?$/i, '설명 글 · 메모 (이름으로)'],
  [/^(package(-lock)?\.json|vercel\.json|play\.html)$/, '저장소 설정 · 시제품 쪽'],
  [/\.(py|sh|ts|map|patch|diff|orig|bak|log)$/i, '원본 스크립트 · 패치 · 찌꺼기'],
  [/\.(psd|blend|kra|xcf|ase|aseprite|ai|sketch|fig|wav|flac|aiff?|mid|zip|7z|tar|gz)$/i, '그림 · 소리 원본, 묶음 파일'],
  [/^assets\/(ref|poster)\//, '그림 참고 자료 · 포스터 낱장'],
  [/^audio\/(src|docs)\//, '소리 원본 · 조사 노트'],
  [/(^|\/)(evidence|shots|research|briefs?)\//, '시험 증거 · 조사 · 작업 지시'],
  [/(^|\/)(listen|soundboard|preview|bench|demo)[^\/]*\.html$/i, '개발용 쪽']
];
var PAGES = ['cook.html', 'credits.html', 'index.html'];
var NOTICE = /Copyright \d{4} Katherine Nahm\. All rights reserved\./;

/* vercel.json — 묶음만 봐서는 안 보이는 것. 설정 한 줄이 묶음 밖의 것을 내게 만들 수 있다 */
/* 맨 위 열쇠는 아는 것만. 새 열쇠 (rewrites · redirects · routes · cleanUrls · trailingSlash · public …) 는 어떤 주소가 무엇을 내는지를 바꾼다:
   묶음 밖의 것이 나가지 않는지 보고 여기에 넣는다 */
var VERCEL_KEYS = ['$schema', 'buildCommand', 'outputDirectory', 'regions', 'functions', 'headers'];
/* 함수가 읽는 파일: [vercel.json functions 의 열쇠, includeFiles 의 한 토막, 까닭]. 하나라도 빠지면 멈춘다 (빠져도 빌드는 되고, 함수가 말없이 덜 한다) */
var INCLUDE = [
  ['api/runner/*.js',  'js/runner.js',     '달리기 규칙. api/_lib/core.js 가 불러 올라온 판을 같은 규칙으로 다시 돌려 본다'],
  ['api/mcp/[key].js', 'library/books/**', '문어가 읽는 책. 실행 중에 폴더를 읽는다 (api/mcp/[key].js booksDir) — 적어 두지 않으면 함수 묶음에 안 들어간다'],
  ['api/mcp/[key].js', 'library/cards/**', '서가 카드. 같은 까닭 (cardsDir)'],
  ['api/mcp/[key].js', 'js/world.js',      '세계. mcp/core.js · mcp/postcard.js 가 부른다'],
  ['api/mcp/[key].js', 'js/brain.js',      '두뇌. mcp/core.js 가 부른다'],
  ['api/mcp/[key].js', 'js/shelf.js',      "오늘의 서가 목록. mcp/core.js 가 try 안에서 부른다 — 없으면 오류 없이 서가만 빠진다"]
];
/* includeFiles 가 가리켜도 되는 곳: 싣는 폴더 (어차피 나간다) 와 이 서버 쪽 폴더. 그 밖 (docs/ · tools/ · tests/ · wip/ · .claude/ …) 을 함수 묶음에 넣으면
   함수가 그것을 내줄 수 있게 된다 */
var INCLUDE_SERVER = ['api', 'mcp', 'library'];

function topLevel() {   /* 저장소 맨 위에 있는 것 (git 이 아는 것 + 무시하지 않은 새 것). git 이 없으면 폴더를 그대로 읽는다 */
  var r = cp.spawnSync('git', ['-C', ROOT, 'ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  var list = r.status === 0 && r.stdout ? r.stdout.split('\0').filter(Boolean).map(function (f) { return f.split('/')[0]; }) : fs.readdirSync(ROOT).filter(function (n) { return n !== '.git'; });
  return list.filter(function (n, i) { return list.indexOf(n) === i; }).sort();
}
function braces(pat) {   /* '{a,b/**,c}' → ['a', 'b/**', 'c'] (vercel.json includeFiles) */
  var m = /^\{(.*)\}$/.exec(pat); return m ? m[1].split(',') : [pat];
}

function partB(files) {
  console.log('\n== b. 있어야 할 것 · 없어야 할 것');
  var miss = EX.MUST.filter(function (f) { return files.indexOf(f) < 0 || fs.statSync(path.join(SITE, f)).size === 0; });
  ok(!miss.length, '꼭 있어야 하는 파일 ' + EX.MUST.length + '개 (쪽 · 목록 · 라이선스 글) ' + some(miss));
  var diff = files.filter(function (f) { return !fs.existsSync(path.join(ROOT, f)) || sha(path.join(ROOT, f)) !== sha(path.join(SITE, f)); });
  ok(!diff.length, '내보낸 파일은 원본과 바이트 그대로다 (줄이기 단계는 아직 없다) ' + some(diff));
  var htmls = files.filter(function (f) { return /\.html?$/i.test(f); });
  ok(htmls.join('|') === PAGES.join('|'), '쪽은 셋뿐: ' + htmls.join(' · '));
  ok(NOTICE.test(fs.readFileSync(path.join(SITE, 'credits.html'), 'utf8')), "credits.html 에 저작권 줄 'Copyright 2026 Katherine Nahm. All rights reserved.'");

  FORBIDDEN.forEach(function (fb) {
    var hit = files.filter(function (f) { return fb[0].test(f); });
    ok(!hit.length, '없다: ' + fb[1] + (hit.length ? ' — ' + some(hit) : ''));
  });
  var odd = files.filter(function (f) { var b = path.basename(f), e = path.extname(b).toLowerCase(); return PAGES.indexOf(f) < 0 && !EX.LICENCE_TEXT.test(b) && EX.TYPES.indexOf(e) < 0; });
  ok(!odd.length, '실린 것은 쪽 셋 · ' + EX.TYPES.join(' ') + ' · 라이선스 글뿐 ' + some(odd));

  var take = names(EX.TAKE), priv = names(EX.PRIVATE), tops = topLevel();
  var undecided = tops.filter(function (n) { return take.indexOf(n) < 0 && priv.indexOf(n) < 0; });
  ok(!undecided.length, '저장소 맨 위 ' + tops.length + '개가 전부 정해져 있다 (싣는다 ' + tops.filter(function (n) { return take.indexOf(n) >= 0; }).length + ' · 안 싣는다 ' + tops.filter(function (n) { return priv.indexOf(n) >= 0; }).length + ')' +
    (undecided.length ? ' — 정하지 않은 것: ' + undecided.join(', ') + '. tools/export-site.js 의 TAKE (게임이 쓴다) 나 PRIVATE (안 내보낸다) 에 한 줄을 넣는다' : ''));
  ok(!take.some(function (n) { return priv.indexOf(n) >= 0; }), 'TAKE 와 PRIVATE 가 겹치지 않는다');
  var shippedTops = files.map(function (f) { return f.split('/')[0]; }).filter(function (n, i, a) { return a.indexOf(n) === i; }).sort();
  ok(shippedTops.join('|') === take.slice().sort().join('|'), '묶음 맨 위 = TAKE 그대로 (' + shippedTops.join(' · ') + ')');

  var vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  ok(vj.buildCommand === 'node tools/export-site.js' && vj.outputDirectory === 'public', "vercel.json: buildCommand 'node tools/export-site.js' · outputDirectory 'public' (" + vj.buildCommand + ' · ' + vj.outputDirectory + ')');
  ok(vj.public !== true, 'vercel.json 에 "public": true 가 없다 (있으면 배포의 소스 · 빌드 기록 보기 /_src · /_logs 가 누구에게나 열린다)');
  var newKeys = Object.keys(vj).filter(function (k) { return VERCEL_KEYS.indexOf(k) < 0; });
  ok(!newKeys.length, 'vercel.json 맨 위 열쇠는 아는 것뿐 (' + VERCEL_KEYS.join(' · ') + ')' + (newKeys.length ? ' — 처음 보는 열쇠: ' + newKeys.join(', ') +
    '\n       rewrites · redirects · routes · cleanUrls 같은 것은 어떤 주소가 무엇을 내는지를 바꾼다. 묶음 밖의 것이 나가지 않는지 보고 이 파일의 VERCEL_KEYS 에 넣는다' : ''));
  var fnKeys = Object.keys(vj.functions || {}), incOf = [];
  fnKeys.forEach(function (k) { var f = vj.functions[k].includeFiles; (Array.isArray(f) ? f : f ? [f] : []).forEach(function (p) { braces(p).forEach(function (q) { incOf.push([k, q.trim()]); }); }); });
  var inc = incOf.map(function (p) { return p[1]; });
  var incMiss = inc.filter(function (p) {
    var base = p.replace(/\/\*\*.*$/, ''), abs = path.join(ROOT, base);
    try { return p === base ? !fs.statSync(abs).isFile() : !fs.readdirSync(abs).length; } catch (e) { return true; }
  });
  ok(fnKeys.length > 0 && fnKeys.every(function (k) { return /^api\//.test(k); }) && inc.length > 0 && !incMiss.length,
    '함수 ' + fnKeys.length + '개는 api/ 아래 · 함수가 읽는 파일 (includeFiles ' + inc.length + '개) 이 저장소 뿌리에 있다 ' + some(incMiss));
  var incLost = INCLUDE.filter(function (n) { return !incOf.some(function (p) { return p[0] === n[0] && p[1] === n[1]; }); });
  ok(!incLost.length, '함수가 읽는 파일 ' + INCLUDE.length + '개가 includeFiles 에 그대로 적혀 있다' + (incLost.length ? ' — 빠진 것: ' + incLost.map(function (n) { return n[0] + ' ← ' + n[1] + ' (' + n[2] + ')'; }).join(' / ') +
    '\n       정말 안 읽게 됐으면 이 파일의 INCLUDE 에서 그 줄을 지운다' : ''));
  var incTops = names(EX.TAKE.filter(function (t) { return t[0].slice(-1) === '/'; })).concat(INCLUDE_SERVER);
  var incOdd = inc.filter(function (p) { var seg = p.split('/'); return incTops.indexOf(seg[0]) < 0 || seg.indexOf('..') >= 0; });
  ok(!incOdd.length, 'includeFiles 는 싣는 폴더와 서버 쪽 폴더 (' + INCLUDE_SERVER.join(' · ') + ') 안만 가리킨다 — 문서 · 스킬 · 도구 · 시험 · 하던 일을 함수 묶음에 넣지 않는다' +
    (incOdd.length ? ' — ' + some(incOdd) + '\n       함수 묶음에 든 파일은 함수가 내줄 수 있다. 꼭 필요하면 까닭과 함께 이 파일의 INCLUDE_SERVER 를 고친다' : ''));
  var hs = (vj.headers || []).map(function (h) { return h.source; });
  var cors = (vj.headers || []).filter(function (h) { return h.source === '/vendor/mcp-apps/(.*)'; })[0];
  ok(hs.indexOf('/api/((?!runner/top).*)') >= 0 && !!cors && cors.headers.some(function (h) { return h.key === 'Access-Control-Allow-Origin' && h.value === '*'; }) &&
    files.some(function (f) { return /^vendor\/mcp-apps\/.+\.js$/.test(f); }), 'vercel.json headers 그대로: /api/ no-store · /vendor/mcp-apps/ CORS (그 폴더의 스크립트가 묶음에 있다)');
  var gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map(function (l) { return l.trim(); });
  ok(gi.indexOf('/public/') >= 0 || gi.indexOf('public/') >= 0, '.gitignore 에 /public/ (내보낸 결과는 커밋하지 않는다)');
}

/* ───────────────────────── c. 가리키는 곳이 다 있다 ───────────────────────── */
/* JS 글 → 문자열 리터럴 (주석 · 정규식 안의 따옴표에 속지 않는다). ${} 가 든 템플릿은 통째로는 주소가 아니라서 따로 낸다:
   돌려준 배열의 .chunks 에 ${} 사이사이의 글 토막 (`assets/x/${이름}.png` → 'assets/x/' · '.png') */
function jsStrings(src) {
  var out = [], chunks = [], i = 0, n = src.length, prev = '', tpl = [];   /* prev: 바로 앞 토큰 ('' 처음 · 'op' · 'kw' · 'val') · tpl: 열린 ${ 마다 중괄호 깊이 */
  var KW = { 'return': 1, 'typeof': 1, 'instanceof': 1, 'in': 1, 'of': 1, 'new': 1, 'delete': 1, 'void': 1, 'throw': 1, 'case': 1, 'do': 1, 'else': 1, 'yield': 1, 'await': 1 };
  function template() {   /* i 는 ` 바로 뒤 (또는 ${…} 를 닫은 } 바로 뒤): 닫는 ` 나 다음 ${ 까지 */
    var s = '';
    while (i < n) {
      var c = src[i];
      if (c === '\\') { s += src.substr(i, 2); i += 2; continue; }
      if (c === '`') { i++; return { text: s, more: false }; }
      if (c === '$' && src[i + 1] === '{') { i += 2; return { text: s, more: true }; }
      s += c; i++;
    }
    return { text: s, more: false };
  }
  while (i < n) {
    var c = src[i], d = src[i + 1], e, j, s, t;
    if (c === '/' && d === '/') { e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && d === '*') { e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '\'' || c === '"') {
      j = i + 1; s = '';
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { s += src.substr(j, 2); j += 2; } else { s += src[j]; j++; } }
      out.push(s); i = j + 1; prev = 'val'; continue;
    }
    if (c === '`') { i++; t = template(); if (t.more) { tpl.push(0); chunks.push(t.text); } else out.push(t.text); prev = t.more ? 'op' : 'val'; continue; }
    if (c === '{') { if (tpl.length) tpl[tpl.length - 1]++; i++; prev = 'op'; continue; }
    if (c === '}') {
      if (tpl.length && tpl[tpl.length - 1] === 0) { tpl.pop(); i++; t = template(); chunks.push(t.text); if (t.more) tpl.push(0); prev = t.more ? 'op' : 'val'; continue; }
      if (tpl.length) tpl[tpl.length - 1]--;
      i++; prev = 'op'; continue;
    }
    if (c === '/' && (prev === '' || prev === 'op' || prev === 'kw')) {   /* 정규식 (나눗셈이 아니다) */
      j = i + 1; var cls = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break;
        j++;
      }
      j++; while (j < n && /[a-z]/.test(src[j])) j++;
      i = j; prev = 'val'; continue;
    }
    if (/[A-Za-z_$]/.test(c) || c.charCodeAt(0) > 127) {
      j = i + 1; while (j < n && (/[A-Za-z0-9_$]/.test(src[j]) || src.charCodeAt(j) > 127)) j++;
      prev = Object.prototype.hasOwnProperty.call(KW, src.slice(i, j)) ? 'kw' : 'val'; i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(d || ''))) { j = i + 1; while (j < n && /[0-9A-Za-z_.]/.test(src[j])) j++; prev = 'val'; i = j; continue; }
    if (c === ')' || c === ']') { prev = 'val'; i++; continue; }
    if ((c === '+' && d === '+') || (c === '-' && d === '-')) { i += 2; continue; }   /* x++ / 2 는 나눗셈 */
    prev = 'op'; i++;
  }
  out.chunks = chunks;
  return out;
}
/* HTML 글 → 태그 [{ name, attrs }] 와 <script> · <style> 의 속 글. 주석은 건너뛰고, 따옴표 안의 > 에 속지 않는다 */
function htmlParts(html) {
  var tags = [], scripts = [], styles = [], i = 0, n = html.length;
  while ((i = html.indexOf('<', i)) >= 0) {
    if (html.substr(i, 4) === '<!--') { var e = html.indexOf('-->', i + 4); i = e < 0 ? n : e + 3; continue; }
    var m = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(html.substr(i, 64));
    if (!m) { i++; continue; }
    var name = m[1].toLowerCase(), attrs = {}, j = i + m[0].length;
    for (;;) {
      while (j < n && /\s/.test(html[j])) j++;
      if (j >= n) break;
      if (html[j] === '>') { j++; break; }
      if (html[j] === '/') { j++; continue; }
      var a = /^[^\s=>\/]+/.exec(html.substr(j, 256)); if (!a) { j++; continue; }
      var key = a[0].toLowerCase(), val = ''; j += a[0].length;
      while (j < n && /\s/.test(html[j])) j++;
      if (html[j] === '=') {
        j++; while (j < n && /\s/.test(html[j])) j++;
        if (html[j] === '"' || html[j] === '\'') { var q = html[j], z = html.indexOf(q, j + 1); if (z < 0) z = n; val = html.slice(j + 1, z); j = z + 1; }
        else { var u = /^[^\s>]*/.exec(html.substr(j, 2048))[0]; val = u; j += u.length; }
      }
      if (!(key in attrs)) attrs[key] = val;
    }
    tags.push({ name: name, attrs: attrs });
    if (name === 'script' || name === 'style') {
      var close = html.toLowerCase().indexOf('</' + name, j); if (close < 0) close = n;
      (name === 'script' ? scripts : styles).push(html.slice(j, close));
      j = close;
    }
    i = j;
  }
  return { tags: tags, scripts: scripts, styles: styles };
}
function cssUrls(css) {
  var out = [], re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/g, m;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while ((m = re.exec(css))) out.push(m[1] || m[2] || m[3] || m[4] || m[5] || '');
  return out;
}
/* 우리 주소 (README '배포'). 여기로 가는 온전한 주소도 우리 파일을 가리킨다 — og:image 같은 것은 온전한 주소로 적는다 */
var SITE_RE = 'https?:\\/\\/ppolppol-octopus\\.vercel\\.app(?=[\\/?#]|$)';
var OUR_SITE = new RegExp('^' + SITE_RE, 'i'), OUR_SITE_ANYWHERE = new RegExp(SITE_RE, 'gi');
/* 우리 파일을 가리키는 주소인가 → 물음표 · 샵을 뗀 경로, 아니면 null (다른 곳 · data: · 빈 것) */
function localRef(ref) {
  ref = String(ref || '').trim();
  if (OUR_SITE.test(ref)) { ref = ref.replace(OUR_SITE, ''); if (ref[0] !== '/') ref = '/' + ref; }
  if (!ref || ref[0] === '#' || /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.slice(0, 2) === '//') return null;
  ref = ref.replace(/[?#].*$/, '');
  try { ref = decodeURIComponent(ref); } catch (e) { /* 그대로 */ }
  return ref || null;
}
function joinFrom(fromFile, ref) {   /* 그 파일이 있는 폴더 기준 → 묶음 뿌리 기준 경로 ('..' 로 밖에 나가면 null). 폴더로 끝나면 그 폴더의 index.html ('/' · './' → index.html) */
  var p = ref[0] === '/' ? path.posix.normalize(ref.slice(1)) : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), ref));
  if (p.slice(0, 2) === '..') return null;
  p = p.replace(/^\.\//, '');
  return p === '' || p === '.' ? 'index.html' : p.slice(-1) === '/' ? p + 'index.html' : p;
}
var EXT = 'html?|css|js|mjs|json|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|ogg|m4a|mp3|wav|mp4|webm|txt|md|glb|gltf|wasm';
var PATHLIKE = new RegExp('^(?:\\.{0,2}/)*(?:[\\w@~+-][\\w@~+.-]*/)*[\\w@~+-][\\w@~+.-]*\\.(?:' + EXT + ')(?:[?#][\\w=&.%-]*)?$', 'i');
var DIRLIKE = /^(?:[\w-]+\/)+$/;

/* 실행 중에 이어 붙여 만드는 주소 — 글자만 봐서는 파일이 안 나온다. 무엇으로 대신 지키는지 적는다.
   폴더 부분은 어느 것이든 c 가 글자 안에서 찾아 본다 (partC 의 inside: 문자열 · 템플릿 토막 · HTML 조각 안의 '맨 위 폴더/…'): 그 폴더에 실린 파일이 없거나
   내보내지 않는 폴더면 걸린다. 그 폴더 안의 파일 하나하나는 아래처럼 목록으로 지킨다 */
var DYNAMIC = [
  ["img[data-icon] · js/ui-art.js 'assets/icons/' + 이름 + '.png'", 'data-icon 값은 아래에서 파일로 풀어 본다. 나머지 아이콘은 assets/manifest.json 에 다 있고, 그 목록의 파일이 묶음에 다 있는지 본다'],
  ["js/app.js 'assets/light/lantern' + n + '.svg' · 'assets/scenes/' · 'assets/souvenirs/' + id + '.svg'", '같은 주소가 assets/manifest.json 에 있다 (tools/check-world.js 가 세계 쪽 열쇠를 본다) → 목록의 파일을 본다'],
  ["js/cook-stickers.js 'assets/stickers/' + 묶음 + '/' + id + '.png'", 'assets/manifest.json 의 sticker.* (tools/test-cook-stickers.js · test-play-stickers.js 가 그림과 목록을 맞춘다) → 목록의 파일을 본다'],
  ["js/audio.js 'audio/' · 'foley/' + 목록의 files", 'audio/manifest.json · foley/manifest.json 의 소리마다 .ogg 와 .m4a 가 묶음에 있는지 본다'],
  ["index.html 머리의 글꼴 미리 받기 'vendor/fonts/' + 이름 + '.sub.woff2'", 'vendor/fonts/galmuri.css 의 url() 여덟 개를 본다 (같은 파일들)'],
  ["mcp/postcard.js (서버) '/vendor/mcp-apps/app-with-deps-' + 판 + '.js'", '아래에서 그 함수를 불러 나온 주소의 파일이 묶음에 있는지 본다']
];
/* 글자로는 주소처럼 보이지만 우리 파일이 아닌 것: [어느 파일, 문자열, 까닭] */
var NOT_A_FILE = [
  /* 지금은 없다. 예: ['js/world.js', 'Node.js', '위키 글 제목'] */
];
/* 어디서도 가리키지 않지만 실려야 하는 것: [경로, 까닭] */
var UNREFERENCED_OK = [
  ['vendor/mcp-apps/LICENSE', 'MCP 엽서 화면 스크립트의 라이선스 글. 라이선스가 사본과 같이 내라고 한다 (링크는 없다)']
];

function partC(files) {
  console.log('\n== c. 가리키는 곳이 다 있다');
  var have = {}; files.forEach(function (f) { have[f] = 1; });
  var baseNames = {}; files.forEach(function (f) { var b = path.posix.basename(f); (baseNames[b] = baseNames[b] || []).push(f); });
  var used = {}, broken = [], apiRefs = [], counts = { html: 0, css: 0, js: 0, manifest: 0 };
  var take = names(EX.TAKE.filter(function (t) { return t[0].slice(-1) === '/'; })), priv = names(EX.PRIVATE.filter(function (t) { return t[0].slice(-1) === '/'; }));
  function hit(p) { if (have[p]) { used[p] = 1; return true; } return false; }
  var LIST = process.env.LIST === '1';
  function need(from, ref, kind, tries) { counts[kind]++; if (LIST) console.log('   ' + from + ' → ' + ref); if (!tries.some(function (p) { return p && hit(p); })) broken.push(from + ' → ' + ref); }
  /* 글자 안에 든 주소. 'assets/x/이름-' + n + '.png' · '<img src="assets/x/' + … · `assets/x/${이름}.png` 처럼 실행 중에 이어 붙이는 주소는 통째로는 주소가 아니다.
     저장소 맨 위 폴더 이름으로 시작하는 토막을 찾아서: 파일 이름까지 있으면 그 파일이, 아니면 그 폴더 부분에 실린 파일이 있어야 한다. 내보내지 않는 폴더면 걸린다.
     맨 위의 내보내지 않는 파일 이름 (play.html 같은 것) 도 같이 찾는다: '<a href="play.html">' 은 통째로는 주소가 아니다.
     (앞 글자가 주소 글자면 토막의 처음이 아니다 — 'https://다른.곳/assets/x.png' 는 남의 주소다. 우리 주소로 시작하는 온전한 주소는 앞을 떼고 본다) */
  function alt(list) { return list.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'); }
  var privFiles = names(EX.PRIVATE.filter(function (t) { return t[0].slice(-1) !== '/'; }));
  var INSIDE = new RegExp('(^|[^\\w@~+.\\-/])(?:\\.{0,2}/)*((?:' + alt(take.concat(priv)) + ')/[\\w@~+.\\-/]*|(?:' + alt(privFiles) + ')(?![\\w@~+\\-/]|\\.\\w))', 'g');
  function inside(from, s) {
    var m; s = s.replace(OUR_SITE_ANYWHERE, ''); INSIDE.lastIndex = 0;
    while ((m = INSIDE.exec(s))) {
      var p = path.posix.normalize(m[2].replace(/\.+$/, '')), top = p.split('/')[0], dir = p.slice(0, p.lastIndexOf('/') + 1), isFile = PATHLIKE.test(p);
      if (top === 'api') { apiRefs.push([from, p]); continue; }
      if (privFiles.indexOf(p) >= 0) { counts.js++; broken.push(from + ' → ' + p + ' (내보내지 않는 파일)'); continue; }
      if (take.indexOf(top) < 0 && priv.indexOf(top) < 0) continue;
      counts.js++; if (LIST) console.log('   ' + from + ' → ' + p + ' (글자 안' + (isFile ? '' : ': 폴더 ' + dir) + ')');
      if (priv.indexOf(top) >= 0) broken.push(from + ' → ' + p + ' (내보내지 않는 폴더)');
      else if (isFile ? !hit(p) : !files.some(function (f) { return f.indexOf(dir) === 0; })) broken.push(from + ' → ' + p + (isFile ? '' : ' (그 폴더에 실린 파일이 없다)'));
    }
  }
  function fromJs(from, src, scriptDir) {   /* 스크립트의 문자열: 쪽 (뿌리) 기준. './x' 는 스크립트 폴더 기준도 본다. 빗금 없는 이름은 뿌리 → 같은 이름의 파일 */
    var strs = jsStrings(src), ours = from.indexOf('vendor/') !== 0;   /* 남의 코드 (vendor/) 는 글자 안까지는 보지 않는다: 'tools/list' 는 MCP 의 메서드 이름이지 우리 폴더가 아니다 */
    strs.forEach(function (s) {
      if (OUR_SITE.test(s)) s = localRef(s) || s;
      if (s.indexOf('\\') >= 0) { if (ours) inside(from, s); return; }
      if (/^\/?api\/[\w\/-]*$/.test(s)) { apiRefs.push([from, s]); return; }
      if (DIRLIKE.test(s)) {
        var top = s.split('/')[0];
        if (take.indexOf(top) >= 0) { counts.js++; if (LIST) console.log('   ' + from + ' → ' + s + ' (폴더)'); if (!files.some(function (f) { return f.indexOf(s) === 0; })) broken.push(from + ' → ' + s + ' (빈 폴더)'); }
        else if (priv.indexOf(top) >= 0) broken.push(from + ' → ' + s + ' (내보내지 않는 폴더)');
        return;
      }
      if (!PATHLIKE.test(s)) { if (ours) inside(from, s); return; }
      var ref = localRef(s); if (!ref) return;
      var tries = [joinFrom('x', ref)];
      if (ref[0] === '.') tries.push(joinFrom(scriptDir + '/x', ref));
      if (ref.indexOf('/') < 0 && baseNames[ref]) { baseNames[ref].forEach(function (f) { used[f] = 1; }); counts.js++; if (LIST) console.log('   ' + from + ' → ' + s + ' (이름만: ' + baseNames[ref].join(' · ') + ')'); return; }
      need(from, s, 'js', tries);
    });
    if (ours) strs.chunks.forEach(function (s) { inside(from, s); });
  }
  function fromCss(from, css) { cssUrls(css).forEach(function (u) { var ref = localRef(u); if (ref) need(from, u, 'css', [joinFrom(from, ref)]); }); }

  var manifestAssets = JSON.parse(fs.readFileSync(path.join(SITE, 'assets/manifest.json'), 'utf8'));
  files.forEach(function (f) {
    var ext = path.extname(f).toLowerCase();
    if (ext !== '.html' && ext !== '.css' && ext !== '.js') return;
    var text = fs.readFileSync(path.join(SITE, f), 'utf8');
    if (ext === '.css') return fromCss(f, text);
    if (ext === '.js') return fromJs(f, text, path.posix.dirname(f));
    var h = htmlParts(text);
    h.tags.forEach(function (t) {
      var seen = { srcset: 1, imagesrcset: 1, 'data-icon': 1, 'data-asset': 1, style: 1, download: 1 };   /* download 는 받을 때 붙는 이름이지 주소가 아니다 */
      ['src', 'href', 'poster', 'data'].forEach(function (k) { if (k in t.attrs && !(k === 'data' && t.name !== 'object')) { seen[k] = 1; var ref = localRef(t.attrs[k]); if (ref) need(f, t.attrs[k], 'html', [joinFrom(f, ref)]); } });
      ['srcset', 'imagesrcset'].forEach(function (k) { if (t.attrs[k]) t.attrs[k].split(',').forEach(function (part) { var ref = localRef(part.trim().split(/\s+/)[0]); if (ref) need(f, part.trim(), 'html', [joinFrom(f, ref)]); }); });
      if (t.attrs['data-icon']) need(f, 'data-icon="' + t.attrs['data-icon'] + '"', 'html', ['assets/icons/' + t.attrs['data-icon'] + '.png']);
      if (t.attrs['data-asset']) { var a = manifestAssets[t.attrs['data-asset']]; need(f, 'data-asset="' + t.attrs['data-asset'] + '"', 'html', [a && (typeof a === 'string' ? a : a.src)]); }
      if (t.attrs.style) fromCss(f, t.attrs.style);
      /* 그 밖의 속성은 값이 우리 파일 주소처럼 생겼으면 가리키는 곳으로 본다: <meta property="og:image" content="…"> · data-src · xlink:href · action …
         on… 은 스크립트로 읽는다. <meta http-equiv="refresh" content="0; url=…"> 는 url= 뒤를 본다 */
      Object.keys(t.attrs).forEach(function (k) {
        if (seen[k]) return;
        if (/^on[a-z]+$/.test(k)) return fromJs(f + ' ' + k + '="…"', t.attrs[k], path.posix.dirname(f));
        var v = t.name === 'meta' && k === 'content' ? t.attrs[k].replace(/^\s*\d+\s*;\s*url\s*=\s*/i, '') : t.attrs[k], ref = localRef(v);
        if (ref && PATHLIKE.test(ref)) need(f, k + '="' + t.attrs[k] + '"', 'html', [joinFrom(f, ref)]);
      });
    });
    h.scripts.forEach(function (s) { fromJs(f + ' <script>', s, path.posix.dirname(f)); });
    h.styles.forEach(function (s) { fromCss(f, s); });
  });
  ok(counts.html >= 30 && counts.css >= 20 && counts.js >= 20, '쪽 · 스타일 · 스크립트에서 우리 파일을 가리키는 곳 ' + (counts.html + counts.css + counts.js) + '군데를 읽었다 (쪽 ' + counts.html + ' · 스타일 ' + counts.css + ' · 스크립트 ' + counts.js + ')');

  /* 목록 (manifest) */
  var mBad = [];
  Object.keys(manifestAssets).forEach(function (k) { var v = manifestAssets[k], src = typeof v === 'string' ? v : v && (v.src || v.path || v.file || v.url); counts.manifest++; if (!src || !hit(src)) mBad.push('assets/manifest.json ' + k + ' → ' + src); });
  ['audio', 'foley'].forEach(function (dir) {
    var m = JSON.parse(fs.readFileSync(path.join(SITE, dir + '/manifest.json'), 'utf8'));
    (m.sounds || []).forEach(function (s) {
      ['ogg', 'm4a'].forEach(function (fmt) { var p = s.files && s.files[fmt]; counts.manifest++; if (!p || !hit(dir + '/' + p)) mBad.push(dir + '/manifest.json ' + s.id + '.' + fmt + ' → ' + p); });
    });
  });
  ok(counts.manifest > 500 && !mBad.length, '목록 셋 (assets · audio · foley) 이 가리키는 파일 ' + counts.manifest + '개가 다 있다 (소리는 .ogg · .m4a 둘 다) ' + some(mBad, 4));

  /* 서버가 손님 (MCP 호스트) 에게 알려 주는 우리 주소 */
  var post = null; try { post = require(path.join(ROOT, 'mcp/postcard.js')); } catch (e) { post = null; }
  var appUrl = post && post.appScriptUrl ? post.appScriptUrl('https://site.example') : '', appRel = appUrl.replace('https://site.example/', '');
  ok(!!appUrl && hit(appRel), 'MCP 엽서가 불러오는 스크립트가 묶음에 있다 (' + (appRel || 'mcp/postcard.js 를 못 읽음') + ')');

  /* /api/ 주소: 함수라서 묶음에 없다 — 저장소의 api/ 에 그 길이 있는지만 본다 */
  var apiBad = apiRefs.filter(function (r) { var p = r[1].replace(/^\//, '').replace(/\/$/, ''); return !(fs.existsSync(path.join(ROOT, p)) || fs.existsSync(path.join(ROOT, p + '.js'))); });
  ok(!apiBad.length, '스크립트가 부르는 /api/ 길 ' + apiRefs.length + '곳은 묶음이 아니라 저장소의 api/ 함수다 (' + apiRefs.map(function (r) { return r[1]; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).join(' · ') + ') ' +
    some(apiBad.map(function (r) { return r.join(' → '); })));

  var allowed = NOT_A_FILE.map(function (x) { return x[0] + ' → ' + x[1]; });
  var realBroken = broken.filter(function (b) { return !allowed.some(function (a) { return b === a || b.indexOf(a + ' (') === 0; }); });   /* 뒤에 붙는 '(빈 폴더)' 같은 설명은 빼고 견준다 */
  ok(!realBroken.length, '가리키는 우리 파일이 묶음에 다 있다' + (realBroken.length ? ' — 없는 것: ' + some(realBroken, 8) +
    '\n       게임이 쓰는 파일이면 tools/export-site.js 의 TAKE / LEAVE 를 고치고, 주소가 아닌 글자면 이 파일의 NOT_A_FILE 에 까닭과 함께 넣는다' : ''));

  /* 거꾸로: 묶음의 파일은 어딘가에서 가리킨다 */
  PAGES.forEach(function (p) { used[p] = 1; });   /* 쪽은 주소로 바로 들어온다 */
  UNREFERENCED_OK.forEach(function (u) { used[u[0]] = 1; });
  var lone = files.filter(function (f) { return !used[f]; });
  ok(!lone.length, '아무도 안 쓰는 파일이 실려 있지 않다 (' + files.length + '개 모두 쪽 · 스타일 · 스크립트 · 목록이 가리킨다)' + (lone.length ? ' — ' + some(lone, 8) +
    '\n       게임이 쓰면 목록 (assets/manifest.json 등) 에 넣거나 가리키게 하고, 안 쓰면 tools/export-site.js 의 LEAVE 에, 그래도 실려야 하면 이 파일의 UNREFERENCED_OK 에 까닭과 함께 넣는다' : ''));
  console.log('   (이어 붙이는 주소 ' + DYNAMIC.length + '갈래는 목록 · 폴더로 본다 — 이 파일의 DYNAMIC)');
}

/* ───────────────────────── d. 묶음만 띄워 놀아 본다 (--crawl) ───────────────────────── */
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8' };
async function partD() {
  console.log('\n== d. 묶음만 띄워 놀아 본다');
  var http = require('http'), chromium = require('playwright').chromium;
  var served = {}, api = [];
  var srv = await new Promise(function (resolve) {
    var s = http.createServer(function (req, res) {
      var u = decodeURIComponent(String(req.url || '/').split('?')[0]);
      if (/^\/api\//.test(u)) { api.push(req.method + ' ' + u); res.writeHead(503, { 'content-type': 'application/json' }); res.end('{"ok":false}'); return; }
      var f = path.normalize(path.join(SITE, u === '/' ? '/index.html' : u));
      if (f.indexOf(SITE) !== 0) { res.writeHead(403); res.end(); return; }
      fs.stat(f, function (err, st) {
        if (err || !st.isFile()) { served[u] = 404; res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
        served[u] = 200;
        res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' });
        fs.createReadStream(f).pipe(res);
      });
    });
    s.listen(0, '127.0.0.1', function () { resolve(s); });
  });
  var base = 'http://127.0.0.1:' + srv.address().port, bad = [], errors = [];
  var WIKI = { query: { pages: { '1': { pageid: 1, title: 'x', extract: '시험용 요약이야. 가짜 응답이라 실제 내용이 아니다.', links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };
  async function open(browser, url, o) {
    o = o || {};
    var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light', hasTouch: !!o.touch, isMobile: !!o.touch });
    await ctx.addInitScript("window.__ppolAwakeMs = 0; window.__ppolTest = { forceKind: 'out' };");   /* 산책은 늘 나가는 날로 (날짜 시드가 '집에 있는 날 · 빈 차례' 를 골라도 포스터가 생기게) */
    var page = await ctx.newPage();
    page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
    page.on('console', function (m) {
      if (m.type() !== 'error') return;
      var t = m.text(), loc = (m.location() && m.location().url) || '';
      if (loc && loc.indexOf(base) !== 0) return;                                       /* 막아 둔 다른 곳 (글꼴 · 위키) 의 네트워크 줄 */
      if (/Failed to load resource/.test(t) && /\/api\//.test(loc)) return;             /* 함수: 이 서버에 없다 */
      errors.push('console.error: ' + t + (loc ? ' @' + loc.replace(base, '') : ''));
    });
    page.on('response', function (r) { var u = r.url(); if (u.indexOf(base) === 0 && r.status() >= 400 && !/\/api\//.test(u)) bad.push(r.status() + ' ' + u.replace(base, '')); });
    page.on('requestfailed', function (r) { var u = r.url(), why = (r.failure() && r.failure().errorText) || ''; if (u.indexOf(base) === 0 && !/\/api\//.test(u) && !/ERR_ABORTED/.test(why)) bad.push('failed ' + u.replace(base, '') + ' ' + why); });
    await page.route(function (u) { return String(u).indexOf(base) !== 0; }, function (route) {
      var u = route.request().url();
      if (!/^https:\/\/(ko|en)\.wikipedia\.org\//.test(u)) return route.abort();
      var b = JSON.parse(JSON.stringify(WIKI)); b.query.pages['1'].title = decodeURIComponent((u.match(/titles=([^&]+)/) || [])[1] || '모자');
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) });
    });
    await page.goto(base + url, { waitUntil: 'load' });
    return { ctx: ctx, page: page };
  }
  function got(re) { return Object.keys(served).filter(function (u) { return re.test(u) && served[u] === 200; }).length; }
  var browser = await chromium.launch();
  try {
    /* 1. 본 게임: 입장 → 이름 → 소리 켜기 → 산책 한 번 → 앨범 · 포스터 */
    var g = await open(browser, '/?intro=1'), page = g.page;
    await page.waitForFunction(function () { var e = document.getElementById('intro'); return e && e.dataset.phase === 'title'; }, null, { timeout: 60000 });
    await page.waitForTimeout(600);
    await page.mouse.click(180, 400);
    await page.waitForSelector('#name-dialog[open]', { timeout: 30000 });
    await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
    await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
    ok(true, '/ (?intro=1): 입장 연출 → 톡 → 이름 짓기');
    await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
    await page.click('#set-sound');
    var sound = await page.waitForFunction(function () { var s = window.AUDIO && AUDIO.state(); return s && s.started && s.ctx === 'running'; }, null, { timeout: 20000 }).then(function () { return true; }, function () { return false; });
    await page.click('#set-close');
    await page.click('#btn-go');
    await page.waitForTimeout(6000);
    await page.waitForFunction(function () { var b = document.getElementById('btn-go'); if (!b.classList.contains('away')) return true; if (b.classList.contains('can-skip')) { b.click(); return true; } return false; }, null, { timeout: 60000, polling: 50 });
    await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return !b.classList.contains('away') && !(window.APP && APP.goResting); }, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    var st = await page.evaluate(function () { return { mode: APP.sceneMode, trips: APP.state.trips.length, cards: document.querySelectorAll('#album .pcard').length }; });
    ok(st.trips >= 1 && st.cards >= 1, '산책 한 번 → 앨범 카드 ' + st.cards + '장 (장면 ' + st.mode + ')');
    await page.click('#btn-album'); await page.waitForSelector('#album-sheet[open]');
    await page.click('#album .pcard'); await page.waitForSelector('#poster-dialog[open]');
    await page.click('#pd-flip'); await page.waitForTimeout(500);
    await page.click('#pd-close'); await page.waitForSelector('#poster-dialog[open]', { state: 'hidden' });
    if (await page.$('#album-sheet[open]')) { await page.click('#al-close'); await page.waitForSelector('#album-sheet[open]', { state: 'hidden' }); }
    ok(sound && got(/^\/audio\/manifest\.json$/) === 1 && got(/^\/audio\/.+\.(ogg|m4a)$/) >= 3, '소리: 켜짐 · audio/ 목록과 소리 ' + got(/^\/audio\/.+\.(ogg|m4a)$/) + '개를 받았다');
    ok(got(/^\/assets\/manifest\.json$/) === 1 && got(/^\/assets\/icons\//) >= 5 && got(/^\/vendor\/fonts\/.+\.woff2$/) >= 3 && got(/^\/vendor\/three\.min\.js$/) === 1, '그림 목록 · 아이콘 · 글꼴 · three.js 를 받았다');

    /* 만든 것들: 플레이어가 가는 길 그대로 — 설정 맨 아래 링크 → 크레딧 → 돌아가기 */
    await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
    await Promise.all([page.waitForURL(/credits\.html$/, { timeout: 20000 }), page.click('#set-credits')]);
    var cr = await page.evaluate(function () { return { text: document.body.innerText, local: [].map.call(document.querySelectorAll('a[href]'), function (a) { return a.getAttribute('href'); }).filter(function (h) { return !/^[a-z]+:/i.test(h); }) }; });
    ok(NOTICE.test(cr.text), '설정 맨 아래 링크 → /credits.html: 저작권 줄이 보인다');
    var codes = [];
    for (var i = 0; i < cr.local.length; i++) codes.push((await page.request.get(base + '/' + cr.local[i])).status());
    ok(cr.local.length >= 3 && codes.every(function (x) { return x === 200; }), '그 쪽의 우리 링크 ' + cr.local.length + '개가 다 열린다 (' + cr.local.join(' · ') + ')');
    await Promise.all([page.waitForURL(function (u) { return !/credits\.html/.test(String(u)); }, { timeout: 20000 }), page.click('#cr-back')]);
    var home = await page.waitForFunction(function () { return !!window.APP && APP.state.trips.length >= 1; }, null, { timeout: 30000 }).then(function () { return true; }, function () { return false; });
    ok(home, "'돌아가기' → 본 게임 (기록 그대로 · " + page.url().replace(base, '') + ')');
    await g.ctx.close();

    /* 2. 부엌: 소리 켜고 한 접시 */
    var k = await open(browser, '/cook.html?sound=1', { touch: true }), kp = k.page;
    await kp.waitForSelector('#cook-dlg[open]', { timeout: 20000 });
    await kp.touchscreen.tap(180, 200); await kp.waitForTimeout(600);
    await kp.evaluate(function () { return COOK.auto(true); });
    var dish = await kp.waitForFunction(function () { var l = COOK.live(); return l && (l.screen === 'reveal' || (l.stats && l.stats.dishes > 0)); }, null, { timeout: 120000, polling: 200 }).then(function () { return true; }, function () { return false; });
    await kp.waitForTimeout(2500);
    var ks = await kp.evaluate(function () { var a = AUDIO.state(); return { ctx: a.ctx, played: (a.played || []).length, ready: a.cook.ready }; });
    ok(dish, '/cook.html?sound=1: 한 접시를 끝까지 (COOK.auto)');
    ok(ks.ctx === 'running' && ks.ready && ks.played >= 5 && got(/^\/foley\/manifest\.json$/) === 1 && got(/^\/foley\/cook\/.+\.(ogg|m4a)$/) >= 5, '부엌 소리: foley/ 목록과 소리 ' + got(/^\/foley\/cook\/.+\.(ogg|m4a)$/) + '개 · 울린 소리 ' + ks.played + '번');
    ok(got(/^\/assets\/stickers\/cook\/.+\.png$/) >= 1, '반응 스티커 그림 ' + got(/^\/assets\/stickers\/cook\/.+\.png$/) + '장을 받았다');
    await k.ctx.close();

  } catch (e) {
    ok(false, '놀다가 멈췄다 — ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    await browser.close(); srv.close();
  }
  var n404 = Object.keys(served).filter(function (u) { return served[u] !== 200; });
  ok(!bad.length && !n404.length, '우리 주소로 간 요청 ' + Object.keys(served).length + '가지가 하나도 실패하지 않았다 ' + some(bad.concat(n404)));
  ok(!errors.length, '콘솔 오류 · 페이지 오류 0 ' + some(errors, 3));
  console.log('   /api/ 호출 (함수 — 이 서버엔 없어 503 으로 답했다, 실패로 세지 않는다): ' + (api.length ? api.join(', ') : '없음'));
}

(async function main() {
  var t0 = Date.now();
  try {
    var files = partA();
    try { partAGuards(); } catch (e) { ok(false, '지킴이 시험이 멈췄다 — ' + String(e && e.message || e).split('\n')[0]); }
    if (files && !CRAWL) { partB(files); partC(files); }
    if (files && CRAWL) await partD();
  } catch (e) {
    fails++; console.error('  FAIL 시험이 멈췄다 — ' + (e && e.stack || e));
  }
  if (process.env.KEEP === '1') console.log('\n(임시 폴더: ' + TMP + ')'); else fs.rmSync(TMP, { recursive: true, force: true });
  console.log('\n' + (CRAWL ? 'test-export --crawl' : 'test-export') + ': ' + passes + ' passed, ' + fails + ' failed (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(fails ? 1 : 0);
})();
