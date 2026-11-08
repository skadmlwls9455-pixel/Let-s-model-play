#!/usr/bin/env node
/* mcp/test/run.js — 카드 9 검수 (네트워크 없이. 위키 fetch 는 stub, 진짜 MCP 왕복은 stdio 로 서버를 띄워서)
 *   cd mcp && npm test
 */
'use strict';
var fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
var core = require('../core.js');
var WORLD = require('../../js/world.js');
var BRAIN = require('../../js/brain.js');
BRAIN.setWorld(WORLD);

var fails = 0, passes = 0, sizes = {};
function check(c, msg) { if (c) passes++; else { fails++; console.error('  FAIL ' + msg); } }
function section(n) { console.log('== ' + n); }
function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'ppol-')); }
function measure(name, out) { var b = Buffer.byteLength(JSON.stringify(out)); sizes[name] = Math.max(sizes[name] || 0, b); return out; }

/* 위키 stub: '모자' 읽힘, '없는문서' 없음, 그 밖은 네트워크 실패 */
function stubWiki(title, opts) {
  var long = opts && opts.sentences > 2;
  if (title === '모자' || title === '깃털') return Promise.resolve({ ok: true, title: title, extract: long ? (title + '는(은) 길게 읽은 글. ').repeat(40) : title + '는(은) … 요약 두 문장.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(title),
    thumb: { url: 'https://upload.wikimedia.org/x.jpg', w: 10, h: 10 }, links: ['깃펜', '장식'] });
  if (title === '나쁜출처') return Promise.resolve({ ok: true, title: title, extract: '…', url: 'https://evil.example/wiki/x', thumb: null, links: [] });
  if (title === '없는문서') return Promise.resolve({ ok: false, reason: 'missing' });
  return Promise.resolve({ ok: false, reason: 'network' });
}
var clock = Date.parse('2026-11-08T10:00:00+09:00');
function mk(dir) { return new core.Octopus({ dir: dir, fetchWiki: stubWiki, now: function () { return new Date(clock); }, name: '뚜루' }); }
var HUMAN_KEYS = ['together', 'withUser', 'items', 'pocket', 'cooking', 'kept', 'swim', 'user', 'userItems', 'picked'];
function humanKeys(o) {
  var bad = [];
  (function walk(x) { if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { if (HUMAN_KEYS.indexOf(k) >= 0) bad.push(k); walk(x[k]); }); })(o);
  return bad;
}

async function unit() {
  var dir = tmp(), o = mk(dir), outs = [];
  function keep(name, x) { outs.push(x); return measure(name, x); }

  section('look_room · meet (처음 한 번, watch·stop)');
  var lr = keep('ppolppol_look_room', o.lookRoom({}));
  check(lr.decision && lr.decision.point === 'meet', 'meet 이 처음 look_room 에 걸린다');
  check(lr.decision.menu.indexOf('watch') >= 0 && lr.decision.menu.indexOf('stop') >= 0, 'meet menu 에 watch·stop');
  check(lr.decision.facts.name === '뚜루', 'meet facts 에 이름');
  var a1 = o.answer({ id: lr.decision.id, action: 'say', line: '안녕, 나는 뚜루야. 사실은 Claude 야.' });
  check(a1.ok, 'meet 답하기');
  check(!o.lookRoom({}).decision, 'meet 은 두 번 묻지 않는다');
  var talk = JSON.parse(fs.readFileSync(path.join(dir, 'out/talk.json'), 'utf8'));
  check(talk[0].kind === 'intro' && talk[0].by === 'model' && talk[0].text === '안녕, 나는 뚜루야. 사실은 Claude 야.', 'intro 원문 그대로 S.talk 모양');

  section('산책 왕복 · status 정직');
  var d = keep('ppolppol_depart', o.depart({ hint: '모자의 역사' }));
  var libAll = Object.keys(d.library).map(function (k) { return d.library[k]; }).join(', ').split(', ');
  check(d.tripId && libAll.length === 16 && !libAll.some(function (x) { return /^door_out /.test(x); }), 'depart: 모퉁이별 library 한 줄 (밖의 문 제외)');
  check(!('hint' in d) && o.S.running.events[0].hint === '' && o.S.running.events[0].followHint === false, '힌트는 받지 않는다 (결정 18) — 넣어도 이벤트 hint 는 빈 글');
  check(o.depart({}).error, '나가 있는 동안 depart 두 번은 오류 (finish 로 끝내라고 안내)');
  var again = await o.go({});
  check(again.tripId === d.tripId && again.walking === true && !again.error, '도구 depart 를 다시 불러도 오류 없이 지금 산책 (go)');
  var p1 = keep('ppolppol_peek', await o.peek({ tripId: d.tripId, target: { kind: 'room', id: 'hat' }, note: '챙이 생각보다 넓었어' }));
  check(p1.status === 'read' && /^https:\/\/ko\.wikipedia\.org\/wiki\//.test(p1.source), 'room + 위키 성공 → read, 출처는 ko 위키');
  var p2 = keep('ppolppol_peek', await o.peek({ tripId: d.tripId, target: { kind: 'wiki', title: '없는문서' } }));
  check(p2.status === 'failed' && !p2.material, '위키 문서 없음 → failed, 지어낸 요약 없음');
  var p3 = await o.peek({ tripId: d.tripId, target: { kind: 'wiki', title: '아무거나' } });
  check(p3.status === 'failed', '네트워크 실패 → failed');
  var p4 = await o.peek({ tripId: d.tripId, target: { kind: 'room', id: 'button' } });
  check(p4.status === 'builtin' && p4.clue, 'room + fetch 실패 → builtin (책장 메모)');
  var p5 = await o.peek({ tripId: d.tripId, target: { kind: 'url', url: 'https://example.org/x' } });
  check(p5.status === 'simulated', 'url → simulated');
  var p6 = await o.peek({ tripId: d.tripId, target: { kind: 'room', id: 'slow_room' } });
  check(p6.status === 'none', '느린 글의 방 → none');
  var p7 = await o.peek({ tripId: d.tripId, target: { kind: 'wiki', title: '나쁜출처' } });
  check(p7.status === 'failed', 'ko.wikipedia 가 아닌 출처 → read 로 올리지 않음');
  check((await o.peek({ tripId: d.tripId, target: { kind: 'room', id: 'nope' } })).error, '없는 방 id 는 오류');

  section('finish — 이유·메모 없이도 · chat 두 번까지');
  var f = keep('ppolppol_finish', o.finish({ tripId: d.tripId, remember: { stopIdx: 0, line: '모자 보러 갔다가' }, note: { text: '조개 소리가 궁금해', about: { kind: 'node', id: 'shell' } } }));
  check(f.ok && f.saved, 'finish 성공');
  var evs = JSON.parse(fs.readFileSync(path.join(dir, f.saved), 'utf8'));
  check(evs.map(function (e) { return e.type; }).join() === 'depart,peek,peek,peek,peek,peek,peek,peek,return,remember,hang_poster,wrap_up', '이벤트 순서 PROTOCOL §1');
  check(evs[0].hint === '' && evs[0].followHint === false, '출발 이벤트에 힌트 없음');
  check(!('reason' in evs[8]) && !('reaction' in evs[11]), '안 준 이유·반응은 비워 둔다');
  check(evs[1].note === '챙이 생각보다 넓었어' && evs[2].note === undefined, '기웃 메모는 모델이 쓴 것만');
  check(f.decision && f.decision.point === 'chat' && f.decision.round === 1 && f.decision.menu.join() === 'say,watch,stop', 'chat 1 이 finish 결과에');
  check(f.decision.asker === 'game', 'chat 물음은 게임이 정한 것이라고 적힌다 (사람이 물은 척 안 함)');
  var c2 = o.answer({ id: f.decision.id, action: 'watch' });
  check(c2.decision && c2.decision.round === 2, 'chat 2');
  var c3 = o.answer({ id: c2.decision.id, action: 'say', line: '깃털 끝이 갈라져 있었어' });
  check(c3.ok && !c3.decision, 'chat 상한 2 — 세 번째는 묻지 않는다');
  check(o.answer({ id: 'dp_x', action: 'say' }).error, '걸린 물음 없으면 오류 (답 안 해도 된다는 말)');

  section('재생 — 게임 두뇌(BRAIN.replay)로');
  var rp = BRAIN.replay(evs, { by: 'mcp', dateKey: '2026-11-08', seq: 1, name: '뚜루', now: new Date(clock), state: {} });
  check(rp && rp.receipt && rp.receipt.stops.length === 7, 'replay: 정류장 7');
  check(rp.noteOut && rp.noteOut.text === '조개 소리가 궁금해', 'replay: wrap_up.note → noteOut 그대로');
  check(rp.posterHung === true && rp.reactionBy !== 'demo-rules', 'replay: 포스터 걸림, 반응을 데모가 대신 고르지 않음');
  check(rp.receipt.stops[0].noteBy === 'model', 'replay: 기웃 메모 noteBy model');

  section('뽈뽈 도서관 — library/books');
  var bdir = tmp();
  var longText = '문어의 신경세포는 약 5억 개이고 그중 3분의 2가 다리에 있다고 알려져 있다. '.repeat(12).trim();
  fs.writeFileSync(path.join(bdir, 'octopus_nerves.md'), '---\nroom: octopus_nerves\ntitle: 다리가 생각하는 동물\nby: 이 방 주인\nwritten: 2026-11-10\n---\n' + longText + '\n');
  fs.writeFileSync(path.join(bdir, 'hat.md'), '---\nroom: hat\ntitle: 모자\nby: 이 방 주인\n---\n모자는 아주 오래전부터 머리를 가리는 데 썼다. 너는 이걸 좋아하게 될 거야.\n');
  fs.writeFileSync(path.join(bdir, 'nobody.md'), '---\nroom: tide\n---\n쓴 사람이 없는 책\n');
  fs.writeFileSync(path.join(bdir, 'ghost.md'), '---\nroom: no_such_room\nby: 누구\n---\n없는 방\n');
  fs.writeFileSync(path.join(bdir, '_template.md'), '---\nroom: 방id\n---\n틀\n');
  var ob = new core.Octopus({ dir: tmp(), booksDir: bdir, fetchWiki: stubWiki, now: function () { return new Date(clock); } });
  check(Object.keys(ob.books).sort().join() === 'hat,octopus_nerves', '책 2권만 (by 없음·없는 방·_틀 은 건너뜀)');
  check(ob.bookErrors.length === 2 && ob.bookErrors.some(function (e) { return /by/.test(e); }) && ob.bookErrors.some(function (e) { return /no_such_room/.test(e); }), '건너뛴 이유가 남는다');
  ob.depart({});
  var pb = await ob.peek({ target: { kind: 'room', id: 'octopus_nerves' } });
  check(pb.status === 'builtin' && pb.book && pb.book.by === '이 방 주인' && pb.book.title === '다리가 생각하는 동물', '책이 있는 방: status builtin + book (누가 썼는지와 함께)');
  check(pb.book.more === true && pb.book.text.length === core.BOOK_HEAD + 1, '긴 책은 앞 500자 + … , more 표시');
  var pbm = await ob.peek({ target: { kind: 'room', id: 'octopus_nerves' }, more: true });
  check(pbm.book.text === longText && !pbm.book.more, 'more 면 책 전부');
  var ph = await ob.peek({ target: { kind: 'room', id: 'hat' } });
  check(ph.book && ph.wiki === '모자' && ph.status === 'builtin', '위키가 있는 방이면 위키로 가는 길 (wiki) 도 같이');
  var evb = ob.S.running.events.filter(function (e) { return e.type === 'peek'; });
  check(evb[0].book && evb[0].book.room === 'octopus_nerves' && evb[0].status === 'builtin', '기록: peek.book {room, by}');
  var fb = ob.finish({});
  var evbs = JSON.parse(fs.readFileSync(path.join(ob.outDir, path.basename(fb.saved)), 'utf8'));
  var rpb = BRAIN.replay(evbs, { by: 'mcp', dateKey: '2026-11-08', seq: 1, name: '뚜루', now: new Date(clock), state: {} });
  check(rpb && rpb.receipt.stops.length === 3 && rpb.receipt.stops.every(function (x) { return x.status === 'builtin'; }), '책 산책도 게임 두뇌로 재생된다');
  check(rpb.receipt.stops[0].book && rpb.receipt.stops[0].book.title === '다리가 생각하는 동물' && rpb.receipt.stops[0].book.by === '이 방 주인', '재생 정류장에 책 제목·쓴 사람');
  fs.writeFileSync(path.join(bdir, 'slow.md'), '---\nroom: slow_room\nby: 누구\n---\n느린 글\n');
  check(core.loadBooks(bdir).errors.some(function (e) { return /slow_room/.test(e); }), '읽을 것이 없는 방엔 책을 두지 않는다');
  var big = core.parseBook('---\nroom: hat\nby: 누구\n---\n' + 'ㄱ'.repeat(core.BOOK_MAX + 1), 'big.md');
  check(big.error && /이하/.test(big.error), '1200자 넘으면 오류');
  var lint = cp.spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'check-books.js'), bdir], { encoding: 'utf8' });
  check(/문어에게 말 걸기/.test(lint.stdout) && /느낄 것 정해 주기/.test(lint.stdout) && lint.status === 1, 'check-books: 말 걸기·느낌 정해 주기 경고, 깨진 책은 오류');

  section('옆길 다리 글은 모델에게 안 간다');
  var on = new core.Octopus({ dir: tmp(), fetchWiki: stubWiki, now: function () { return new Date(clock); } });
  on.depart({});
  var pn = await on.peek({ target: { kind: 'room', id: 'octopus_nerves' } });
  check(!('nearby' in pn) && JSON.stringify(pn).indexOf('엉키지') < 0, 'peek 결과에 nearby·다리 글 없음');
  on.finish({});

  section('오늘 열린 방 — 날짜로 정해진다');
  var lib1 = o.library(), libAll1 = Object.keys(lib1).map(function (k) { return lib1[k]; }).join(', ').split(', ');
  check(libAll1.length === 16 && JSON.stringify(o.library()) === JSON.stringify(lib1), '모퉁이마다 2개 · 같은 날은 같다');
  var oNext = new core.Octopus({ dir: tmp(), fetchWiki: stubWiki, now: function () { return new Date(clock + 86400000); } });
  check(JSON.stringify(oNext.library()) !== JSON.stringify(lib1), '다음 날은 바뀐다');
  section('구조 — first 로 나가며 바로 기웃 · more · tripId 생략');
  var g = await o.go({ first: { kind: 'wiki', title: '모자' } });
  check(g.tripId && g.peek && g.peek.status === 'read' && g.peek.material.length <= 160, 'depart first: 왕복 한 번에 첫 기웃');
  var pm = await o.peek({ target: { kind: 'wiki', title: '깃털' }, more: true });
  check(pm.status === 'read' && pm.material.length > 160 && pm.material.length <= 600, 'peek more: 모델에게만 더 길게 (≤600)');
  check(o.S.running.events[2].source.extract.length <= 160, 'more 여도 기록 source.extract 는 160자');
  var fg = o.finish({ tomorrow: '내일은 깃털 얘기' });
  check(fg.ok && fg.saved, 'tripId 없이 finish (나가 있는 산책 하나)');
  check(JSON.parse(fs.readFileSync(path.join(dir, fg.saved), 'utf8')).filter(function (e) { return e.type === 'wrap_up'; })[0].memo.tomorrow === '내일은 깃털 얘기', 'tomorrow → wrap_up.memo.tomorrow (PROTOCOL 모양 그대로)');
  if (fg.decision) o.answer({ id: fg.decision.id, action: 'stop' });

  section('메모 — setDown 한 것은 depart·look_room 에 안 나온다');
  var d2 = o.depart({});
  check(d2.notes && d2.notes.head === core.NOTES_HEAD && d2.notes.notes[0].text === '조개 소리가 궁금해' && d2.notes.notes[0].by === 'model', 'depart 에 활성 메모 + 머리말 + by');
  o.finish({});
  var lr2 = o.lookRoom({}), d2b = o.depart({});
  check(lr2.notes && !d2b.notes, '메모는 한 차례에 한 번 — look_room 이 보였으면 depart 엔 없음');
  check(!('lately' in lr2), 'look_room 에 코드가 만든 쏠림 문장 (lately) 없음');
  check(!/\(\d+\)/.test(JSON.stringify(d2b.library)), 'library 에 가 본 횟수 없음');
  o.finish({});
  var d2c = o.depart({});
  check(d2c.notes && d2c.notes.notes[0].id === d2.notes.notes[0].id, 'look_room 없이 나가면 depart 에 메모');
  d2 = d2c;
  var noteId = d2.notes.notes[0].id;
  var f2 = o.finish({ tripId: d2.tripId, setDown: noteId });
  check(f2.ok && !f2.posterId, '정류장 없는 finish 도 성공, 포스터 없음');
  var lr2 = o.lookRoom({});
  check(!lr2.notes, 'look_room: 내려놓은 메모 안 나옴 (있다는 말도 없음)');
  check(!o.depart({}).notes, 'depart: 내려놓은 메모 안 나옴');
  o.finish({ tripId: o.S.running.id });
  check(o.lookRoom({ archived: true }).archived.some(function (n) { return n.id === noteId; }), 'archived:true 일 때만 보관 메모');

  section('집 · 빈 차례');
  var sh = keep('ppolppol_stay_home', o.stayHome({}));
  var shEv = JSON.parse(fs.readFileSync(path.join(dir, sh.saved), 'utf8'));
  check(shEv.length === 1 && shEv[0].type === 'stay_home' && !shEv[0].activity, '아무것도 안 고른 집: 이벤트 하나, 지어낸 활동 없음');
  check(sh.decision && sh.decision.q === '뭐 했어?', '집에 있는 날 chat 은 뭐 했어?');
  var et = keep('ppolppol_empty_turn', o.emptyTurn());
  check(et.ok && !et.decision, '빈 차례: 대화 없음');
  var talk2 = JSON.parse(fs.readFileSync(path.join(dir, 'out/talk.json'), 'utf8'));
  check(talk2.some(function (t) { return t.kind === 'chat' && t.by === 'fallback' && t.text === null; }), '답하지 않고 지나간 chat 은 fallback 으로만');

  section('식탁 — finish 뒤에만 · 상한');
  o.putDish('미역탕', 4);
  var d3 = o.depart({});
  check(!d3.decision, '산책 시작에 식탁 안 물음');
  check(!(await o.peek({ tripId: d3.tripId, target: { kind: 'room', id: 'hat' } })).decision, '산책 중엔 식탁 안 물음');
  var f3 = o.finish({ tripId: d3.tripId });
  check(f3.decision.point === 'chat', 'finish 결과엔 chat (식탁을 finish 안에 끼우지 않는다)');
  var t1 = o.answer({ id: f3.decision.id, action: 'stop' });
  check(t1.decision && t1.decision.point === 'table' && t1.decision.menu.indexOf('watch') >= 0 && t1.decision.menu.indexOf('stop') >= 0, 'chat 그만 뒤 식탁 (watch·stop 포함)');
  check(t1.decision.offer.name === '미역탕' && humanKeys(t1.decision).length === 0, '식탁엔 그 한 접시만');
  measure('ppolppol_answer', t1);
  o.answer({ id: t1.decision.id, action: 'taste', line: '짭짤해' });
  o.putDish('죽', 1);
  check(!o.lookRoom({}).decision, '30초 안에 두 번째 식탁 → 안 물음');
  check(!o.S.table.offer, '상한 넘은 접시는 기록 없이 사라짐 (식탁엔 그대로라는 뜻)');

  section('사람 키 0개');
  check(outs.every(function (x) { return humanKeys(x).length === 0; }), '모든 도구 결과에 사람 키 0');
  check(fs.readdirSync(path.join(dir, 'out')).every(function (fn) { return humanKeys(JSON.parse(fs.readFileSync(path.join(dir, 'out', fn), 'utf8'))).length === 0; }), '기록 파일에도 사람 키 0');
}

/* 진짜 MCP 왕복: 서버를 stdio 로 띄워 SDK 클라이언트로 부른다 (위키 안 건드리는 길만) */
async function protocol() {
  section('MCP stdio 왕복');
  var { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  var { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  var dir = tmp();
  var tr = new StdioClientTransport({ command: process.execPath, args: [path.join(__dirname, '..', 'server.js')], stderr: 'ignore',
    env: Object.assign({}, process.env, { PPOLPPOL_STATE: path.join(dir, 'state.json'), PPOLPPOL_OUT: path.join(dir, 'out') }) });
  var c = new Client({ name: 'test', version: '0' });
  await c.connect(tr);
  var instr = c.getInstructions() || '';
  check(instr.indexOf(core.FIXED_SENTENCE) >= 0, 'instructions 에 고정 문장');
  var tools = (await c.listTools()).tools;
  check(tools.length === 7, '도구 7개 (산책 6 + answer)');
  check(tools.every(function (t) { return t.title && t.annotations && typeof t.annotations.readOnlyHint === 'boolean' && typeof t.annotations.destructiveHint === 'boolean'; }), '모든 도구에 title·readOnlyHint·destructiveHint');
  function j(r) { return JSON.parse(r.content[0].text); }
  var lr = j(await c.callTool({ name: 'ppolppol_look_room', arguments: {} }));
  check(lr.decision && lr.decision.point === 'meet', 'stdio: look_room + meet');
  var d = j(await c.callTool({ name: 'ppolppol_depart', arguments: {} }));
  var p = j(await c.callTool({ name: 'ppolppol_peek', arguments: { tripId: d.tripId, target: { kind: 'url', url: 'https://example.org' } } }));
  check(p.status === 'simulated', 'stdio: peek');
  var f = j(await c.callTool({ name: 'ppolppol_finish', arguments: { tripId: d.tripId } }));
  check(f.ok && fs.existsSync(path.join(dir, f.saved)), 'stdio: finish → out 파일');
  var bad = await c.callTool({ name: 'ppolppol_finish', arguments: { tripId: 'trip_zzz' } });
  check(bad.isError === true, 'stdio: 잘못된 tripId 는 isError');
  var defs = Buffer.byteLength(JSON.stringify(tools)), ib = Buffer.byteLength(instr);
  console.log('  (도구 정의 ' + defs + ' B · instructions ' + ib + ' B)');
  check(defs < 5000, '도구 정의 5,000 B 미만 (연결해 두면 모든 대화에 실린다)');
  check(!tools.some(function (t) { return /hint/i.test(JSON.stringify(t.inputSchema)); }), '어느 도구에도 hint 입력 없음');
  await c.close();
}

function gitClean() {
  section('git — state.json·out/ 이 올라가지 않는다');
  var root = path.join(__dirname, '..', '..');
  var ig = cp.spawnSync('git', ['check-ignore', 'mcp/state.json', 'mcp/out/x.json', 'mcp/node_modules/x'], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n');
  check(ig.length === 3, 'state.json · out/ · node_modules 무시됨');
}

(async function () {
  await unit();
  await protocol();
  gitClean();
  console.log('\n도구별 최대 반환 크기 (바이트):');
  Object.keys(sizes).forEach(function (k) { console.log('  ' + k + ': ' + sizes[k]); });
  console.log('\n' + passes + ' 통과, ' + fails + ' 실패');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
