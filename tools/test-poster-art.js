#!/usr/bin/env node
/* tools/test-poster-art.js — 포스터 픽셀 그림 검사 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-poster-art.js
 *
 * - 도서관의 방 전부(js/world.js)와 주제 9개에 그림이 한 장씩 있다 · 남는 그림도 없다
 * - assets/poster/*.png 는 32×32 이고 js/poster-art-data.js 와 바이트까지 같다 (만든 파일이 낡지 않았다)
 * - 고르는 순서: 방 그림 → 주제 그림 → 들판. 쪽지는 집 활동 그림 8장, 복원된 옛 포스터에는 안 붙인다
 * - 주제 배경 9장 (66×56) · 들른 곳 줄 (순서 · 기억 표시 · 못 읽은 곳 흐리게 · 넘치면 작게 + 점 셋)
 * - <image> 는 정수 배 · 칸 가운데 · data URI (밖의 파일을 안 읽는다)
 * - index.html 이 app.js 보다 먼저 싣는다
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var fails = 0, passes = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }

var WORLD = new Function(fs.readFileSync(path.join(ROOT, 'js/world.js'), 'utf8') + ';return WORLD')();
var A = require('../js/poster-art.js'), DATA = require('../js/poster-art-data.js');
var nodes = Object.keys(WORLD.nodes), corners = Object.keys(WORLD.corners);

nodes.forEach(function (id) { check(!!A.room(id), '방 그림 있음: ' + id + ' (' + WORLD.nodes[id].name + ')'); });
corners.forEach(function (c) { check(!!A.corner(c), '주제 그림 있음: ' + c); });
check(A.rooms().every(function (id) { return !!WORLD.nodes[id]; }), '방 그림 중 도서관에 없는 방 없음: ' + A.rooms().filter(function (id) { return !WORLD.nodes[id]; }).join(','));
check(A.corners().length === corners.length, '주제 그림 ' + corners.length + '장');

/* 그림 파일 = 데이터 파일 */
Object.keys(DATA.room).concat(Object.keys(DATA.corner).map(function (c) { return 'corner_' + c; })).forEach(function (key) {
  var f = path.join(ROOT, 'assets/poster/' + key + '.png');
  if (!fs.existsSync(f)) { check(false, key + '.png 있음'); return; }
  var b = fs.readFileSync(f), want = /^corner_/.test(key) ? DATA.corner[key.slice(7)] : DATA.room[key];
  check(b.readUInt32BE(16) === 32 && b.readUInt32BE(20) === 32, key + '.png 32×32');
  check(b.toString('base64') === want, key + ': poster-art-data.js 와 같다 (다르면 node tools/make-poster-art.js)');
});
var files = fs.readdirSync(path.join(ROOT, 'assets/poster')).filter(function (f) { return /\.png$/.test(f); });
check(files.length === nodes.length + corners.length * 2 + 8, 'assets/poster 그림 수 ' + files.length + ' = 방 ' + nodes.length + ' + 주제 ' + corners.length + ' + 배경 ' + corners.length + ' + 쪽지 8');
/* 같은 그림을 두 번 쓰지 않았다 */
var seen = {}, dup = [];
Object.keys(DATA.room).forEach(function (k) { if (seen[DATA.room[k]]) dup.push(k + '=' + seen[DATA.room[k]]); seen[DATA.room[k]] = k; });
check(!dup.length, '방 그림이 서로 다르다 ' + dup.join(','));

/* 고르는 순서 */
function trip(sticker, scene, o) { return Object.assign({ seed: 1, by: 'demo-rules', poster: { type: 'poster', sticker: sticker, scene: scene } }, o || {}); }
var a = A.forTrip(trip('hat', 'hands'), WORLD);
check(a && a.kind === 'room' && a.id === 'hat' && /^data:image\/png;base64,/.test(a.src), '방을 기억함 → 그 방 그림');
a = A.forTrip(trip('wild', 'wild', { receipt: { stops: [{ id: 'x' }, { id: 'moon', corner: 'sky' }], rememberedIdx: 1 } }), WORLD);
check(a && a.kind === 'room' && a.id === 'moon', 'sticker 가 방이 아니면 기억한 정류장의 방 그림');
a = A.forTrip(trip('베토벤', 'wild', { receipt: { stops: [{ name: '베토벤', corner: 'sounds' }], rememberedIdx: 0 } }), WORLD);
check(a && a.kind === 'corner' && a.id === 'sounds', '도서관 밖 글 → 그 주제 그림');
a = A.forTrip(trip('어딘가', 'sea'), WORLD);
check(a && a.kind === 'corner' && a.id === 'sea', '주제를 모르면 포스터 장면의 주제 그림');
a = A.forTrip(trip('어딘가', '없는장면'), null);
check(a && a.kind === 'corner' && a.id === 'wild', '아무것도 모르면 들판');
check(A.forTrip({ poster: { type: 'note', sticker: 'tea' } }, WORLD) === null, '활동을 모르는 쪽지에는 안 붙인다');
(Array.isArray(WORLD.homeActivities) ? WORLD.homeActivities : Object.keys(WORLD.homeActivities).map(function (k) { return WORLD.homeActivities[k]; })).forEach(function (act) {
  var n = A.forTrip({ poster: { type: 'note' }, receipt: { stops: [], activity: { id: act.id } } }, WORLD);
  check(n && n.kind === 'stay' && n.id === act.id, '쪽지 그림 있음: ' + act.id);
});
check(A.stays().length === 8, '쪽지 그림 8장');
a = A.forTrip(trip('wild', 'wild', { receipt: { stops: [{ nodeId: 'x' }, { nodeId: 'snow', corner: 'sky' }], rememberedIdx: 1 } }), WORLD);
check(a && a.kind === 'room' && a.id === 'snow', '기억한 정류장은 nodeId 로 찾는다 (일기에 저장되는 이름)');
/* 장면 배경 */
corners.forEach(function (c) { check(!!A.scene(c), '배경 있음: ' + c); });
['hands', 'sea'].forEach(function (c) { var b = fs.readFileSync(path.join(ROOT, 'assets/poster/scene_' + c + '.png')); check(b.readUInt32BE(16) === 66 && b.readUInt32BE(20) === 56 && b.toString('base64') === DATA.scene[c], 'scene_' + c + '.png 66×56 = 데이터'); });
var bg = A.sceneSvg('sea', 18, 23.4, 264, 224);
check(/width="264" height="224"/.test(bg) && /href="data:image\/png/.test(bg) && /pixelated/.test(bg), '배경 <image>: 칸을 덮고 data URI');
check(A.sceneSvg('없는장면', 0, 0, 10, 10) === '', '모르는 장면이면 빈 문자열 (예전 벡터 장면으로)');
/* 작은 포스터 (벽 · 들고 오는 · 날아가는) */
var ms = A.miniSvg(trip('hat', 'hands'), 2.88, 3.74, 42.2, 35.8, WORLD), mm = /width="([\d.]+)"/.exec(ms);
check(mm && Math.abs(+mm[1] - 35.8 * 0.82) < 0.02 && /data-art="room:hat"/.test(ms) && !/pixelated/.test(ms), '작은 포스터 그림: 칸의 82% · 부드럽게');
check(!/pixelated/.test(A.sceneSvg('sea', 2, 3, 42, 36, true)) && /data-scene="sea"/.test(A.sceneSvg('sea', 2, 3, 42, 36, true)), '작은 포스터 배경: 부드럽게');
check(A.miniSvg({ poster: { type: 'note' } }, 0, 0, 40, 30, WORLD) === '', '작은 포스터도 붙일 게 없으면 빈 문자열');
/* 들른 곳 줄 */
function walk(stops, rem) { return { by: 'demo-rules', poster: { type: 'poster', sticker: 'hat', scene: 'hands' }, receipt: { stops: stops, rememberedIdx: rem } }; }
var w3 = walk([{ nodeId: 'hat', status: 'read' }, { nodeId: 'feather', status: 'failed' }, { corner: 'sea', status: 'simulated' }, { status: 'none' }], 0), tr = A.trail(w3);
check(tr.map(function (t) { return t.kind + ':' + t.id; }).join() === 'room:hat,room:feather,corner:sea,corner:wild', '들른 순서 그대로 · 방 → 주제 → 들판');
check(tr[0].remembered && tr[0].read && !tr[1].read && !tr[2].read, '기억한 곳 표시 · 못 읽은 곳 구분');
var ts = A.trailSvg(w3, 18, 300, 264, 60);
check((ts.match(/<image/g) || []).length === 4 && (ts.match(/opacity="\.45"/g) || []).length === 3 && (ts.match(/poster-trail-rem/g) || []).length === 1, '줄: 그림 4 · 흐린 것 3 · 기억 표시 1');
check(/width="32\.0"/.test(ts) && !/https?:/.test(ts), '32px 정수 배 · 바깥 주소 없음');
check(/width="64\.0"/.test(A.trailSvg(walk([{ nodeId: 'hat', status: 'read' }, { nodeId: 'key', status: 'read' }], 1), 18, 290, 264, 80)), '자리가 넉넉하고 다 들어가면 64px');
var many = walk('hat quill button umbrella thread knot key lock glass chalk'.split(' ').map(function (id) { return { nodeId: id, status: 'read' }; }), 9), tm = A.trailSvg(many, 18, 290, 264, 80);
check(/width="32\.0"/.test(tm) && /data-stops="\d+\+"/.test(tm) && /room:chalk/.test(tm), '너무 많으면 작게 + 점 셋 · 기억한 곳은 꼭 보인다');
check(A.trailSvg(walk([{ nodeId: 'hat', status: 'read' }], 0), 0, 0, 264, 80) === '', '한 곳뿐이면 줄 없음 (큰 그림과 같다)');
check(A.trailSvg(w3, 0, 0, 264, 30) === '', '자리가 낮으면 줄 없음');
check(A.trailSvg({ poster: { type: 'note' }, receipt: { stops: [{}, {}] } }, 0, 0, 264, 80) === '', '쪽지엔 줄 없음');
check(A.forTrip({ by: 'legacy', poster: { type: 'poster', sticker: 'hat' } }, WORLD) === null, '복원된 옛 포스터에는 안 붙인다');
check(A.forTrip({}, WORLD) === null && A.forTrip(null) === null, '포스터 없으면 null');
check(A.room('constructor') === null && A.corner('toString') === null, '이름이 겹치는 내장 속성에 속지 않는다');

/* <image> */
var s = A.svg(trip('hat', 'hands'), 30, 40, 132, 139, WORLD), m = /x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(s);
check(m && +m[3] === 128 && +m[4] === 128, '132×139 칸 → 128px (×4 정수 배)');
check(m && Math.abs(+m[1] - (30 + 2)) < 0.01 && Math.abs(+m[2] - (40 + 5.5)) < 0.01, '칸 가운데');
check(/href="data:image\/png;base64,/.test(s) && /pixelated/.test(s) && !/https?:/.test(s), 'data URI · 픽셀 그대로 · 바깥 주소 없음');
check(/width="256\.0"/.test(A.svg(trip('hat', 'hands'), 0, 0, 264, 278, WORLD)), '600px 저장본 → ×8');
check(/width="16\.0"/.test(A.svg(trip('hat', 'hands'), 0, 0, 16, 20, WORLD)), '32px 보다 작은 칸은 칸에 맞춘다');
check(A.svg({ poster: { type: 'note' } }, 0, 0, 100, 100, WORLD) === '', '붙일 게 없으면 빈 문자열');
check(/POSTER_ART\.sceneSvg\(/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')) && /POSTER_ART\.trailSvg\(/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')), 'app.js 가 배경·들른 곳 줄을 부른다');

var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), iD = html.indexOf('<script src="js/poster-art-data.js"'), iA = html.indexOf('<script src="js/poster-art.js"'), iApp = html.indexOf('<script src="js/app.js"');   /* 스크립트 태그의 자리로 본다 (주석 속 'js/app.js' 가 앞에 있어도 흔들리지 않게) */
check(iD > 0 && iD < iA && iA < iApp, 'index.html: poster-art-data.js → poster-art.js → app.js');
var app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
check(/POSTER_ART\.svg\(trip/.test(app), 'app.js posterSVG 가 POSTER_ART.svg 를 부른다');
var src = fs.readFileSync(path.join(ROOT, 'js/poster-art.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'tools/ui-art/sculpt.js'), 'utf8') + fs.readdirSync(path.join(ROOT, 'tools/ui-art/poster')).map(function (f) { return fs.readFileSync(path.join(ROOT, 'tools/ui-art/poster', f), 'utf8'); }).join('\n');
check(!/Math\.random/.test(src), 'Math.random 0건 (같은 그림이 늘 같게 나온다)');
/* 넷째 판: 그림은 형태 음영 렌더러로 짓는다 — 다시 지어도 저장된 그림과 바이트까지 같다 (정의와 그림이 어긋나지 않았다) */
(function () {
  var SC = require('./ui-art/sculpt.js'), SPK = require('./ui-art/sprites.js').KEY, zlib = require('zlib');
  function pixels(b64) { var b = Buffer.from(b64, 'base64'), i = 8, idat = []; while (i < b.length) { var len = b.readUInt32BE(i), t = b.toString('ascii', i + 4, i + 8); if (t === 'IDAT') idat.push(b.slice(i + 8, i + 8 + len)); i += 12 + len; } var raw = zlib.inflateSync(Buffer.concat(idat)), px = []; for (var y = 0; y < 32; y++) for (var x = 0; x < 32; x++) { var o = y * 129 + 1 + x * 4; px.push(raw[o + 3] ? '#' + [raw[o], raw[o + 1], raw[o + 2]].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('') : null); } return px; }
  [['hands', 'hat', 'room'], ['numbers', 'knot_theory', 'room'], ['corners', 'sea', 'corner'], ['stay', 'nap', 'stay']].forEach(function (q) {
    var S = new SC.Scene(1); require('./ui-art/poster/' + q[0] + '.js')[q[1]][1](S);
    var want = S.render().keys.map(function (k) { return k ? SPK[k] : null; }), got = pixels(DATA[q[2]][q[1]]);
    check(JSON.stringify(want) === JSON.stringify(got), q[0] + '/' + q[1] + ': 다시 지은 그림 = 저장된 그림');
  });
})();

console.log('test-poster-art: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
