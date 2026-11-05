#!/usr/bin/env node
/* tools/test-api.js — 다락방 달리기 랭킹 API 테스트 (node, 네트워크 없음). 실패하면 exit 1.
 *   npm test   (= node tools/test-api.js)
 * api/runner/*.js 핸들러를 메모리 저장소 + 고정 비밀값 + 주입한 시계로 직접 부른다.
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
delete process.env.RUNNER_EVENT_WEEKS;
var core = require(path.join(ROOT, 'api/_lib/core.js'));
var H = {
  seed: require(path.join(ROOT, 'api/runner/seed.js')),
  submit: require(path.join(ROOT, 'api/runner/submit.js')),
  top: require(path.join(ROOT, 'api/runner/top.js')),
  award: require(path.join(ROOT, 'api/runner/award.js'))
};
var R = core.RUNNER;
var SECRET = 'test-secret-not-real';
core.setSecret(SECRET);

var passes = 0, fails = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }

/* 목 req/res */
async function call(name, opts) {
  opts = opts || {};
  var res = { statusCode: 0, headers: {}, body: '', setHeader: function (k, v) { this.headers[k.toLowerCase()] = v; }, end: function (b) { this.body = b || ''; } };
  var req = { method: opts.method || 'GET', query: opts.query || {}, body: opts.body, url: '/api/runner/' + name };
  await H[name](req, res);
  var json = null; try { json = JSON.parse(res.body); } catch (e) { /* 빈 몸 */ }
  return { status: res.statusCode, json: json, headers: res.headers };
}
var T0 = Date.UTC(2026, 10, 4, 3, 0, 0);   /* 2026-11-04 12:00 KST (수) → 2026-W45 */
var clock = T0;
core.setClock(function () { return clock; });
function token(seed, night, iat) { return core.signToken({ seed: seed, night: night, iat: iat, week: core.weekKey(iat), v: R.VERSION }, SECRET); }

/* 긴 판 만들기: 앞을 보는 봇(tools/test-runner.js 와 같은 방식) → limit 틱 넘게 살아남고, 그 뒤 입력이 없어 곧 부딪힌다 */
function bot(seed, night, limit) {
  var cands = [[['jd', 0], ['ju', 1]], [['jd', 0], ['ju', 6]], [['jd', 0], ['ju', 14]], [['dd', 0], ['du', 40]], [['dd', 0], ['du', 20]]], plan = [];
  for (var t = 0; t < limit; t++) {
    if (!R.simulate(seed, plan, { night: night, until: t + 18 }).dead) continue;
    var best = null, bt = -1;
    cands.forEach(function (c) { var ev = plan.concat(c.map(function (x) { return { t: t + x[1], a: x[0] }; })); var r = R.simulate(seed, ev, { night: night, until: t + 70 }); if (r.ticks > bt) { bt = r.ticks; best = ev; } });
    plan = best;
  }
  plan.sort(function (a, b) { return a.t - b.t; });
  var r = R.simulate(seed, plan, { night: night });
  return { seed: seed, night: night, inputs: plan.filter(function (e) { return e.t <= r.ticks; }), score: r.score, ticks: r.ticks };
}
/* 짧은 무작위 점프 스크립트 (점수를 다양하게) */
function script(rnd) { var ev = [], t = 0; for (var i = 0, n = 2 + rnd() % 12; i < n; i++) { t += 20 + rnd() % 60; ev.push({ t: t, a: 'jd' }, { t: t + 1 + rnd() % 12, a: 'ju' }); t += 14; } return ev; }
function runOf(seed, night, inputs) { var r = R.simulate(seed, inputs, { night: night }); return { seed: seed, night: night, inputs: inputs.filter(function (e) { return e.t <= r.ticks; }), score: r.score, ticks: r.ticks }; }
function body(tok, run, nick, patch) { var b = { token: tok, inputs: run.inputs, score: run.score, ticks: run.ticks, nick: nick }; return Object.assign(b, patch || {}); }

(async function main() {
  var mem = core.memoryStore(); core.setStore(mem);

  console.log('== 0. 주 키 · 경로 코덱 · 토큰');
  check(core.weekKey(T0) === '2026-W45', 'weekKey(2026-11-04 KST) = 2026-W45 (' + core.weekKey(T0) + ')');
  check(core.weekKey(Date.UTC(2026, 10, 8, 14, 59)) === '2026-W45', '일요일 23:59 KST 는 아직 W45');
  check(core.weekKey(Date.UTC(2026, 10, 8, 15, 0)) === '2026-W46', '월요일 00:00 KST 부터 W46');
  check(core.weekKey(Date.UTC(2027, 0, 1, 3)) === '2026-W53', '2027-01-01 은 2026-W53');
  check(core.weekKey(Date.UTC(2027, 0, 4, 3)) === '2027-W01', '2027-01-04 는 2027-W01');
  var p1 = core.encodePath({ week: '2026-W45', score: 25, ticks: 157, runId: 'abcdef012345', nick: '뽈뽈 문어' });
  check(p1 === 'runner/2026-W45/09999975-000157-abcdef012345~' + core.b64u(Buffer.from('뽈뽈 문어')) + '.json', '경로 모양 ' + p1);
  var d1 = core.decodePath(p1);
  check(d1 && d1.score === 25 && d1.ticks === 157 && d1.nick === '뽈뽈 문어' && d1.runId === 'abcdef012345', '경로 왕복');
  check(core.encodePath({ week: 'w', score: 900, ticks: 9, runId: 'a', nick: 'x' }) < core.encodePath({ week: 'w', score: 30, ticks: 9, runId: 'a', nick: 'x' }), '사전순: 높은 점수가 앞');
  check(core.decodePath('runner/2026-W45/../../x.json') === null, '이상한 경로는 null');

  var s = await call('seed', { query: { tz: '540' } });
  check(s.status === 200 && s.json.ok && Number.isInteger(s.json.seed) && s.json.week === '2026-W45', 'seed 200 ' + JSON.stringify(s.json && { seed: s.json.seed, week: s.json.week }));
  check(s.json.night === false, '서울 12:00 → 낮');
  var c = core.readToken(s.json.token, SECRET);
  check(c && c.seed === s.json.seed && c.night === s.json.night && c.iat === T0 && c.week === '2026-W45' && c.v === R.VERSION, '토큰 왕복');
  check(core.readToken(s.json.token, 'other-secret') === null, '다른 키로는 안 읽힘');
  check(s.headers['cache-control'] === 'no-store', 'seed no-store');
  check((await call('seed', { query: { tz: '-300' } })).json.night === true, 'tz -300 (03:00 UTC → 22:00) → 밤');
  check((await call('seed', { query: { tz: '420' } })).json.night === false, 'tz 420 → 10:00 → 낮');
  clock = Date.UTC(2026, 10, 4, 11, 0); check((await call('seed', { query: { tz: '540' } })).json.night === true, '서울 20:00 → 밤 (경계 20 포함)');
  clock = Date.UTC(2026, 10, 4, 10, 0); check((await call('seed', { query: { tz: '540' } })).json.night === false, '서울 19:00 → 아직 저녁 (클라이언트 밤 팔레트 20시와 같게)');
  clock = Date.UTC(2026, 10, 4, 21, 0); check((await call('seed', { query: { tz: '540' } })).json.night === false, '서울 06:00 → 낮 (경계 6 제외)');
  clock = T0;
  var seeds = {}; for (var i = 0; i < 20; i++) seeds[(await call('seed', {})).json.seed] = 1;
  check(Object.keys(seeds).length >= 19, '시드는 매번 다름');
  core.setSecret(null); var oldA = process.env.RUNNER_SECRET, oldB = process.env.BLOB_READ_WRITE_TOKEN; delete process.env.RUNNER_SECRET; delete process.env.BLOB_READ_WRITE_TOKEN;
  check((await call('seed', {})).status === 503, '비밀값이 없으면 503 (알려진 키로 서명하지 않음)');
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_fake';
  check(core.secret() === require('crypto').createHash('sha256').update('ppolppol-runner|vercel_blob_rw_fake').digest('hex'), '키 = sha256(ppolppol-runner|BLOB 토큰)');
  process.env.RUNNER_SECRET = 'explicit'; check(core.secret() === 'explicit', 'RUNNER_SECRET 이 우선');
  if (oldA == null) delete process.env.RUNNER_SECRET; else process.env.RUNNER_SECRET = oldA;
  if (oldB == null) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = oldB;
  core.setSecret(SECRET);

  console.log('== 1. 맞는 판은 받는다 (라이브 기록 + 봇 판)');
  var live = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/evidence/runner-live-run.json'), 'utf8'));
  var liveRun = { seed: live.seed, night: live.night, inputs: live.inputs, score: live.score, ticks: live.ticks };
  console.log('   라이브 기록: ' + live.end + ' · ' + live.ticks + ' 틱 · ' + live.score + '점');
  if (live.end !== 'hit') {   /* 중간에 닫은 판(quit)은 끝까지 재시뮬하면 틱이 달라서 받지 않는다 → 같은 시드의 부딪힌 판으로 바꿔 쓴다 */
    var rq = await call('submit', { method: 'POST', body: body(token(live.seed, live.night, T0 - 60000 - 7), liveRun, 'quit') });
    check(rq.status === 422 && rq.json.error === 'mismatch', '중간에 닫은 판(quit)은 받지 않음 ' + JSON.stringify(rq.json));
    liveRun = runOf(live.seed, live.night, live.inputs);
    liveRun.inputs = live.inputs.filter(function (e) { return e.t <= liveRun.ticks; });
  }
  var tLive = token(live.seed, live.night, T0 - 60000);
  var r1 = await call('submit', { method: 'POST', body: body(tLive, liveRun, '뽈뽈') });
  check(r1.status === 200 && r1.json.ok && r1.json.rank === 1 && r1.json.week === '2026-W45' && r1.json.award === 'paper_crown' && /^[0-9a-f]{12}$/.test(r1.json.runId), '라이브 기록 통과, 1등, 종이 왕관 ' + JSON.stringify(r1.json));
  check(r1.json.runId === core.runIdOf(tLive), 'runId = sha256(token) 앞 12');
  var stored = mem.read(core.encodePath({ week: '2026-W45', score: liveRun.score, ticks: liveRun.ticks, runId: r1.json.runId, nick: '뽈뽈' }));
  check(stored && Object.keys(stored).sort().join(',') === 'at,inputsLen,nick,runId,score,ticks', '저장 필드만: ' + JSON.stringify(stored));
  check(!/ip|agent|ua/i.test(JSON.stringify(stored)), 'IP·UA 없음');
  var r1b = await call('submit', { method: 'POST', body: JSON.stringify(body(tLive, liveRun, '뽈뽈')) });
  check(r1b.status === 200 && r1b.json.runId === r1.json.runId && r1b.json.rank === r1.json.rank && r1b.json.total === 1 && r1b.json.nick === '뽈뽈', '같은 토큰·같은 판 다시 보내기 → 200 같은 결과 (멱등) ' + JSON.stringify(r1b.json));
  var other = runOf(live.seed, live.night, []);   /* 같은 토큰으로 다른 판 */
  var r1c = await call('submit', { method: 'POST', body: body(tLive, other, '뽈뽈') });
  check(other.score !== liveRun.score && r1c.status === 409 && r1c.json.error === 'duplicate', '같은 토큰(시드)에 다른 판 → 409 ' + JSON.stringify(r1c.json));
  check((await core.board(mem, '2026-W45')).length === 1, '다시 보내기·다른 판 뒤에도 순위표엔 한 줄');

  var long = bot(4242, false, 900);
  console.log('   봇 판: ' + long.ticks + ' 틱 · ' + long.score + '점 · 입력 ' + long.inputs.length);
  check(long.ticks > 900, '봇 판이 15초 넘게 감');
  var tLong = token(long.seed, long.night, T0 - 5 * 60000);
  var r2 = await call('submit', { method: 'POST', body: body(tLong, long, 'bot one') });
  check(r2.status === 200 && r2.json.rank === 1, '긴 판이 1등으로 올라감 ' + JSON.stringify(r2.json));

  console.log('== 2. 거절');
  var tA = token(long.seed, long.night, T0 - 5 * 60000 + 1);   /* 다른 토큰 (같은 시드) */
  async function rej(label, b, status, err) { var r = await call('submit', { method: 'POST', body: b }); check(r.status === status && r.json.error === err, label + ' → ' + status + ' ' + err + ' (' + r.status + ' ' + JSON.stringify(r.json) + ')'); }
  await rej('점수 부풀림', body(tA, long, 'x', { score: long.score + 1 }), 422, 'mismatch');
  await rej('틱 부풀림', body(tA, long, 'x', { ticks: long.ticks + 1 }), 422, 'mismatch');
  await rej('틱 줄임(중간에 끊은 척)', body(tA, long, 'x', { ticks: long.ticks - 30, score: R.simulate(long.seed, long.inputs, { night: false, until: long.ticks - 30 }).score, inputs: long.inputs.filter(function (e) { return e.t <= long.ticks - 30; }) }), 422, 'mismatch');
  var tampered = long.inputs.slice(); tampered.splice(3, 2);
  await rej('입력 조작', body(tA, long, 'x', { inputs: tampered }), 422, 'mismatch');
  await rej('밤/낮 바꾼 토큰 없이 다른 시드', body(token(long.seed + 1, false, T0 - 300000), long, 'x'), 422, 'mismatch');
  await rej('꼬리 입력 (t > ticks)', body(tA, long, 'x', { inputs: long.inputs.concat([{ t: long.ticks + 5, a: 'jd' }]) }), 400, 'bad_inputs');
  await rej('t 감소', body(tA, long, 'x', { inputs: [{ t: 5, a: 'jd' }, { t: 3, a: 'ju' }] }), 400, 'bad_inputs');
  await rej('t 음수', body(tA, long, 'x', { inputs: [{ t: -1, a: 'jd' }] }), 400, 'bad_inputs');
  await rej('t 소수', body(tA, long, 'x', { inputs: [{ t: 1.5, a: 'jd' }] }), 400, 'bad_inputs');
  await rej('모르는 동작', body(tA, long, 'x', { inputs: [{ t: 1, a: 'xx' }] }), 400, 'bad_inputs');
  var many = []; for (var k = 0; k < 20001; k++) many.push({ t: 0, a: k % 2 ? 'ju' : 'jd' });
  await rej('입력 20001개', body(tA, long, 'x', { inputs: many }), 400, 'bad_inputs');
  await rej('점수 문자열', body(tA, long, 'x', { score: String(long.score) }), 400, 'bad_numbers');
  var parts = tA.split('.');
  await rej('서명 틀림', body(parts[0] + '.' + core.b64u(Buffer.alloc(32, 7)), long, 'x'), 401, 'bad_token');
  var forged = JSON.parse(core.unb64u(parts[0]).toString()); forged.seed = 1;
  await rej('몸통 바꾼 토큰', body(core.b64u(Buffer.from(JSON.stringify(forged))) + '.' + parts[1], long, 'x'), 401, 'bad_token');
  await rej('다른 키로 서명', body(core.signToken({ seed: long.seed, night: false, iat: T0 - 300000, week: '2026-W45' }, 'evil'), long, 'x'), 401, 'bad_token');
  await rej('토큰 없음', body(undefined, long, 'x'), 401, 'bad_token');
  await rej('너무 빠름 (iat = 지금)', body(token(long.seed, false, T0), long, 'x'), 400, 'too_fast');
  await rej('너무 빠름 (경과 < 틱/60 − 3)', body(token(long.seed, false, T0 - Math.floor((long.ticks / 60 - 4) * 1000)), long, 'x'), 400, 'too_fast');
  await rej('만료 (31분)', body(token(long.seed, false, T0 - 31 * 60000), long, 'x'), 401, 'expired');
  await rej('미래 iat', body(token(long.seed, false, T0 + 60000), long, 'x'), 401, 'expired');
  var rOld = await call('submit', { method: 'POST', body: body(core.signToken({ seed: long.seed, night: false, iat: T0 - 300000, week: '2026-W45', v: 'runner-0' }, SECRET), long, 'x') });
  check(rOld.status === 400 && rOld.json.error === 'old_version', '옛 VERSION 토큰 거절');
  check((await call('submit', { method: 'GET' })).status === 405, 'GET submit → 405');
  check((await call('submit', { method: 'POST', body: 'not json' })).json.error === 'bad_json', '깨진 JSON → bad_json');
  var r3 = await call('submit', { method: 'POST', body: body(tA, long, 'again') });
  check(r3.status === 200 && r3.json.rank === 1, '거절들 뒤에도 같은 토큰으로 정상 제출은 된다 (거절은 기록을 안 남김) ' + JSON.stringify(r3.json));

  console.log('== 3. 순위표 (5판 + 앞의 판)');
  mem = core.memoryStore(); core.setStore(mem);
  var runs = [], seen = {};
  var rnd = R.mulberry32(45);
  for (var sd = 1; runs.length < 5 && sd < 500; sd++) { var rr = runOf(sd, false, script(rnd)); if (!seen[rr.score]) { seen[rr.score] = 1; runs.push(rr); } }
  check(runs.length === 5, '점수가 다른 5판');
  var nicks = ['하나', 'two', '셋 3', 'four_4', '다섯-5'];
  for (var j = 0; j < runs.length; j++) {
    var rs = await call('submit', { method: 'POST', body: body(token(runs[j].seed, false, T0 - 120000 - j), runs[j], nicks[j]) });
    check(rs.status === 200, '판 ' + j + ' 받음 (' + runs[j].score + '점)');
  }
  var sameScore = runOf(runs[0].seed, false, runs[0].inputs);   /* 같은 점수·같은 틱 두 번째 판 (다른 토큰) */
  await call('submit', { method: 'POST', body: body(token(sameScore.seed, false, T0 - 130000), sameScore, '동점') });
  var top = await call('top', {});
  var want = runs.map(function (r) { return r.score; }).concat([sameScore.score]).sort(function (a, b) { return b - a; });
  check(top.status === 200 && top.json.week === '2026-W45' && top.json.total === 6, 'top 200, 6판 ' + JSON.stringify(top.json && top.json.total));
  check(JSON.stringify(top.json.top.map(function (r) { return r.score; })) === JSON.stringify(want), '점수 내림차순 ' + JSON.stringify(top.json.top.map(function (r) { return r.score; })));
  check(top.json.top.every(function (r, i) { return r.rank === i + 1 && typeof r.nick === 'string' && typeof r.at === 'string'; }), 'rank 1..n · nick · at');
  check(top.json.top.some(function (r) { return r.nick === '셋 3'; }) && top.json.top.some(function (r) { return r.nick === '다섯-5'; }), '닉네임 그대로 (공백·- 포함)');
  check(/s-maxage=15/.test(top.headers['cache-control']), 'top Cache-Control s-maxage=15');
  check((await call('top', { query: { week: '2026-W44' } })).json.total === 0, '지난주는 비어 있음');
  check((await call('top', { query: { week: '../../etc' } })).status === 400, '이상한 week → 400');
  for (var m = 0; m < 22; m++) await call('submit', { method: 'POST', body: body(token(runs[m % 5].seed, false, T0 - 200000 - m), runs[m % 5], 'm' + m) });
  check((await call('top', {})).json.top.length === 20, '상위 20 까지만');

  console.log('== 4. 상 (주가 바뀔 때)');
  mem = core.memoryStore(); core.setStore(mem);
  clock = Date.UTC(2026, 10, 8, 14, 0);   /* 일요일 23:00 KST, W45 */
  var ids = [];
  for (var n = 0; n < 12; n++) {
    var rn = runOf(1000 + n * 7, false, script(rnd));
    var rsub = await call('submit', { method: 'POST', body: body(token(rn.seed, false, clock - 60000 - n), rn, 'p' + n) });
    ids.push({ runId: rsub.json.runId, score: rn.score });
  }
  var brd = (await call('top', {})).json.top;
  var first = ids.filter(function (x) { return x.score === brd[0].score; })[0].runId;
  var b12 = await core.board(mem, '2026-W45'), eleventh = b12[10].runId, tenth = b12[9].runId;
  var a0 = await call('award', { query: { runId: first, week: '2026-W45' } });
  check(a0.status === 200 && a0.json.award === 'paper_crown' && a0.json.final === false, '주 안에서는 1등도 아직 종이 왕관 ' + JSON.stringify(a0.json));
  clock = Date.UTC(2026, 10, 8, 15, 0, 1);   /* 월요일 00:00:01 KST, W46 — 일요일에 받은 토큰이 아직 30분 살아 있다 */
  var a1w = await call('award', { query: { runId: first, week: '2026-W45' } });
  check(a1w.status === 200 && a1w.json.award === 'paper_crown' && a1w.json.final === false, '월 00:00:01: 늦은 판이 아직 올 수 있어 망토는 아직 (final:false) ' + JSON.stringify(a1w.json));
  process.env.RUNNER_EVENT_WEEKS = '2026-W50';
  var a11w = await call('award', { query: { runId: eleventh, week: '2026-W45' } });
  check(a11w.status === 200 && a11w.json.award === null && a11w.json.final === false, '월 00:00:01, 이벤트 주 아님: 404 대신 아직 모름 (final:false) ' + JSON.stringify(a11w.json));
  delete process.env.RUNNER_EVENT_WEEKS;
  clock = Date.UTC(2026, 10, 8, 15, 30, 4);
  check((await call('award', { query: { runId: first, week: '2026-W45' } })).json.final === false, '월 00:30:04 까지는 final:false');
  clock = Date.UTC(2026, 10, 8, 15, 30, 6);   /* 월요일 00:30:06 KST: W45 토큰은 모두 만료 → 순위가 굳음 */
  var a1 = await call('award', { query: { runId: first, week: '2026-W45' } });
  check(a1.status === 200 && a1.json.award === 'emperor_cape' && a1.json.rank === 1 && a1.json.final === true, '주가 닫히면 1등 → 황제 망토 ' + JSON.stringify(a1.json));
  check((await call('award', { query: { runId: tenth, week: '2026-W45' } })).json.award === 'emperor_cape', '10등 → 황제 망토');
  var a11 = await call('award', { query: { runId: eleventh, week: '2026-W45' } });
  check(a11.status === 200 && a11.json.award === 'paper_crown' && a11.json.rank === 11, '11등 → 종이 왕관 ' + JSON.stringify(a11.json));
  check((await call('award', { query: { runId: 'ffffffffffff', week: '2026-W45' } })).status === 404, '없는 runId → 404');
  check((await call('award', { query: { runId: first, week: '2026-W44' } })).status === 404, '다른 주 → 404');
  check((await call('award', { query: { runId: 'nothex', week: '2026-W45' } })).status === 400, '이상한 runId → 400');
  check((await call('top', {})).json.week === '2026-W46' && (await call('top', {})).json.total === 0, '월요일엔 이번 주 순위가 새로 시작');
  check(a11.json.final === true, '닫힌 주의 11등 종이 왕관은 final');
  process.env.RUNNER_EVENT_WEEKS = '2026-W50';
  check((await call('award', { query: { runId: eleventh, week: '2026-W45' } })).status === 404, '이벤트 주가 아니면 11등은 404');
  check((await call('award', { query: { runId: first, week: '2026-W45' } })).json.award === 'emperor_cape', '이벤트 주가 아니어도 상위 10 은 망토');
  delete process.env.RUNNER_EVENT_WEEKS;

  console.log('== 5. 닉네임');
  var NS = [
    ['  뽈뽈 문어  ', '뽈뽈 문어'], ['abc_DEF-123', 'abc_DEF-123'], ['열두글자를넘는아주긴닉네임이에요', '열두글자를넘는아주긴닉네'],
    ['', '익명 문어'], ['   ', '익명 문어'], [null, '익명 문어'], [42, '익명 문어'], ['<script>', 'script'], ['😀🐙', '익명 문어'],
    ['문어\n\t둘', '문어 둘'], ['a    b', 'a b'], ['https://evil.example', '익명 문어'], ['www.spam.com', '익명 문어'], ['visit spam.kr', '익명 문어'],
    ['씨발', '익명 문어'], ['F u c k', '익명 문어'], ['bad_shit_', '익명 문어'], ['병 신', '익명 문어'], ['01012345678', '익명 문어'],
    ['ㅋㅋ문어', 'ㅋㅋ문어'], ['Mr. Octo', 'Mr Octo'], ['새끼 문어', '새끼 문어'], ['Ünïcode', 'ncode']
  ];
  NS.forEach(function (c) { var got = core.sanitizeNick(c[0]); check(got === c[1], 'nick ' + JSON.stringify(c[0]) + ' → ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(c[1]) + ')'); });
  check(core.BLOCK.length <= 30, '금칙어 ≤ 30 (' + core.BLOCK.length + ')');
  NS.forEach(function (c) { var g = core.sanitizeNick(c[0]); check(Array.from(g).length >= 1 && Array.from(g).length <= 12, '길이 1–12: ' + g); });

  console.log('== 5b. 닉네임: 보이지 않는 글자 · 한글 채움 문자');
  var NI = [
    ['\u3164\u3164\u3164', '익명 문어'], ['뽈뽈\u3164문어', '뽈뽈 문어'], ['씨\u3164발', '익명 문어'], ['\u3164씨발\u3164', '익명 문어'],
    ['\u115F\u1160\uFFA0', '익명 문어'], ['\u2800\u2800', '익명 문어'], ['씨\u2800발', '익명 문어'], ['병\uFFA0신', '익명 문어'],
    ['\u200B\u200C\u200D\u2060\uFEFF', '익명 문어'], ['씨\u200B발', '익명 문어'], ['f\u200Du\u00ADck', '익명 문어'], ['f\u034Fuck', '익명 문어'],
    ['문\u202E어', '문어'], ['문어\uFE0F', '문어'], ['\u3164 \u3000 \u00A0', '익명 문어'], ['ht\u200Btps://evil', '익명 문어'], ['ㅋ\u3164ㅋ', 'ㅋ ㅋ']
  ];
  NI.forEach(function (c) { var got = core.sanitizeNick(c[0]); check(got === c[1], 'nick ' + JSON.stringify(c[0]) + ' → ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(c[1]) + ')'); });
  NS.concat(NI).forEach(function (c) { var g = core.sanitizeNick(c[0]); check(core.sanitizeNick(g) === g && !/[\u115F\u1160\u3164\uFFA0\u2800\u200B-\u200F\uFEFF]/.test(g), '정리는 멱등 · 빈칸 글자 없음: ' + JSON.stringify(g)); });
  mem = core.memoryStore(); core.setStore(mem); clock = T0;
  await mem.put(core.encodePath({ week: '2026-W45', score: 50, ticks: 300, runId: 'aaaaaaaaaaaa', nick: '\u3164\u3164' }), {});   /* 규칙 전에 저장된 블롭 */
  await mem.put(core.encodePath({ week: '2026-W45', score: 40, ticks: 300, runId: 'bbbbbbbbbbbb', nick: '씨\u3164발' }), {});
  var tLeg = (await call('top', {})).json;
  check(tLeg.total === 2 && tLeg.top[0].nick === '익명 문어' && tLeg.top[1].nick === '익명 문어', '이미 저장된 채움 문자 닉네임도 top 에서는 정리해서 보여 줌 ' + JSON.stringify(tLeg.top.map(function (r) { return r.nick; })));
  var nsub = runOf(31, false, []);
  var rNick = await call('submit', { method: 'POST', body: body(token(31, false, T0 - 60000), nsub, '씨\u3164발') });
  check(rNick.status === 200 && rNick.json.nick === '익명 문어', '채움 문자로 금칙어 우회 → 익명 문어 ' + JSON.stringify(rNick.json));

  console.log('== 6. 다시 보내기 (멱등) · 중간에 끊긴 쓰기');
  mem = core.memoryStore(); core.setStore(mem); clock = T0;
  var realPut = mem.put, putN = 0, failAt = 2;
  mem.put = async function (p, j) { putN++; if (putN === failAt) { var e = new Error('BlobServiceNotAvailable'); e.name = 'BlobServiceNotAvailable'; throw e; } return realPut.call(mem, p, j); };
  var pw = runOf(7, false, []), tPw = token(7, false, T0 - 60000), bPw = body(tPw, pw, 'retry');
  var w1 = await call('submit', { method: 'POST', body: bPw });
  check(w1.status === 502 && w1.json.error === 'storage', '표시만 쓰고 기록 쓰기 실패 → 502 ' + JSON.stringify(w1.json));
  check(await mem.head(core.idPath('2026-W45', core.runIdOf(tPw))) && (await core.board(mem, '2026-W45')).length === 0, '(표시는 있고 순위표엔 없음)');
  var mk = mem.read(core.idPath('2026-W45', core.runIdOf(tPw)));
  check(mk && mk.score === pw.score && mk.ticks === pw.ticks, '표시에 이 토큰의 판(score·ticks)을 적어 둠 ' + JSON.stringify(mk));
  var pw2 = null; for (var k6 = 10; k6 < 300 && !pw2; k6++) { var x6 = runOf(7, false, [{ t: k6, a: 'jd' }, { t: k6 + 5, a: 'ju' }]); if (x6.score !== pw.score) pw2 = x6; }
  var wX = await call('submit', { method: 'POST', body: body(tPw, pw2, 'other run') });
  check(wX.status === 409 && wX.json.error === 'duplicate' && (await core.board(mem, '2026-W45')).length === 0, '끊긴 뒤 같은 토큰으로 다른 판 → 409, 그 판을 이어 쓰지 않음 ' + JSON.stringify(wX.json));
  var w2 = await call('submit', { method: 'POST', body: bPw });
  check(w2.status === 200 && w2.json.rank === 1 && w2.json.total === 1 && w2.json.runId === core.runIdOf(tPw), '다시 보내면 이어서 써서 200 (409 아님) ' + JSON.stringify(w2.json));
  var w3 = await call('submit', { method: 'POST', body: body(tPw, pw, 'other name') });
  check(w3.status === 200 && w3.json.runId === w2.json.runId && w3.json.rank === 1 && w3.json.nick === 'retry' && (await core.board(mem, '2026-W45')).length === 1, '또 보내면(닉네임 바꿔도) 저장된 결과 그대로, 한 줄 ' + JSON.stringify(w3.json));
  mem.put = realPut;
  clock = T0 + 31 * 60000;   /* 응답을 잃고 토큰 만료 뒤에 다시 보냄 */
  var w4 = await call('submit', { method: 'POST', body: bPw });
  check(w4.status === 200 && w4.json.runId === w2.json.runId && w4.json.rank === 1, '만료 뒤라도 이미 올라간 같은 판이면 200 ' + JSON.stringify(w4.json));
  var w5 = await call('submit', { method: 'POST', body: body(tPw, pw, 'x', { score: pw.score + 1 }) });
  check(w5.status === 401 && w5.json.error === 'expired', '만료 뒤 다른 판은 그대로 401 expired ' + JSON.stringify(w5.json));
  var tNo = token(8, false, T0 - 60000), pNo = runOf(8, false, []);
  var w6 = await call('submit', { method: 'POST', body: body(tNo, pNo, 'x') });
  check(w6.status === 401 && w6.json.error === 'expired' && !(await mem.head(core.idPath('2026-W45', core.runIdOf(tNo)))), '만료된 새 판은 401, 아무것도 안 씀');
  clock = T0;
  /* 같은 runId 가 두 줄(동시에 다시 보내며 닉네임이 달랐던 경우) → 순위표엔 한 줄 */
  await mem.put(core.encodePath({ week: '2026-W45', score: pw.score, ticks: pw.ticks, runId: w2.json.runId, nick: 'zz dup' }), {});
  var bd = await core.board(mem, '2026-W45');
  check(bd.length === 1 && bd[0].rank === 1, '같은 runId 는 순위표에 한 줄 ' + bd.length);
  /* 기록 쓰기가 EEXIST(같은 경로가 이미 있음)여도 성공으로 */
  mem = core.memoryStore(); core.setStore(mem);
  var tE = token(9, false, T0 - 60000), pE = runOf(9, false, []);
  await mem.put(core.encodePath({ week: '2026-W45', score: pE.score, ticks: pE.ticks, runId: core.runIdOf(tE), nick: 'same' }), {});
  var wE = await call('submit', { method: 'POST', body: body(tE, pE, 'same') });
  check(wE.status === 200 && wE.json.rank === 1 && wE.json.total === 1, '표시 없이 기록만 있던 경우도 200 한 줄 ' + JSON.stringify(wE.json));
  /* 동시에: 먼저 표시를 쓴 요청이 아직 기록을 쓰는 중에 같은 토큰으로 다른 판이 오면 409 (먼저 온 판만 남음) */
  mem = core.memoryStore(); core.setStore(mem); clock = T0;
  var rp = mem.put, slow = true;
  mem.put = async function (p, j) { if (/^runner\//.test(p) && slow) { slow = false; await new Promise(function (r) { setTimeout(r, 30); }); } return rp.call(mem, p, j); };
  var both = await Promise.all([call('submit', { method: 'POST', body: body(tPw, pw, 'first') }),
    new Promise(function (r) { setTimeout(r, 5); }).then(function () { return call('submit', { method: 'POST', body: body(tPw, pw2, 'second') }); })]);
  var rawR = await mem.list('runner/2026-W45/');
  check(both[0].status === 200 && both[0].json.score === pw.score && both[0].json.nick === 'first', '먼저 온 판은 200, 제 점수·닉네임 그대로 ' + JSON.stringify(both[0].json));
  check(both[1].status === 409 && both[1].json.error === 'duplicate' && rawR.length === 1, '쓰는 중에 온 다른 판은 409, 기록 1개 ' + JSON.stringify(both[1].json) + ' raw ' + rawR.length);
  var again = await call('submit', { method: 'POST', body: body(tPw, pw, 'first') });
  check(again.status === 200 && again.json.score === pw.score, '그 뒤 먼저 온 판을 다시 보내면 200 ' + JSON.stringify(again.json));
  mem.put = rp;
  /* 점수가 안 적힌 옛 표시({runId, at})는 예전처럼 이어 쓴다 · 표시를 못 읽으면 502 (다시 시도) */
  mem = core.memoryStore(); core.setStore(mem);
  var tL = token(11, false, T0 - 60000), pL = runOf(11, false, []);
  await mem.put(core.idPath('2026-W45', core.runIdOf(tL)), { runId: core.runIdOf(tL), at: T0 - 30000 });
  var wL = await call('submit', { method: 'POST', body: body(tL, pL, 'legacy') });
  check(wL.status === 200 && wL.json.rank === 1, '옛 표시 + 기록 없음 → 이어 써서 200 ' + JSON.stringify(wL.json));
  var tU = token(12, false, T0 - 60000), pU = runOf(12, false, []);
  await mem.put(core.idPath('2026-W45', core.runIdOf(tU)), { runId: core.runIdOf(tU), at: T0, score: pU.score, ticks: pU.ticks });
  mem.read = function () { return null; };
  var wU = await call('submit', { method: 'POST', body: body(tU, pU, 'u') });
  mem.read = function () { throw new Error('BlobServiceNotAvailable'); };
  var wU2 = await call('submit', { method: 'POST', body: body(tU, pU, 'u') });
  check(wU.status === 502 && wU2.status === 502 && (await core.board(mem, '2026-W45')).length === 1, '표시를 못 읽으면 502, 아무것도 안 씀 ' + wU.status + '/' + wU2.status);

  console.log('== 7. 주 경계: 늦게 온 판 · 망토는 10개까지');
  mem = core.memoryStore(); core.setStore(mem);
  clock = Date.UTC(2026, 10, 8, 14, 50);   /* 일 23:50 KST */
  var rnd7 = R.mulberry32(9), seen7 = {}, wk = [];
  for (var sd7 = 1; wk.length < 10 && sd7 < 400; sd7++) {
    var r7 = runOf(sd7, false, script(rnd7)); if (seen7[r7.score] || r7.score > 60) continue; seen7[r7.score] = 1;
    var s7 = await call('submit', { method: 'POST', body: body(token(sd7, false, clock - 60000), r7, 'p' + wk.length) });
    if (s7.status === 200) wk.push(s7.json.runId);
  }
  check(wk.length === 10, 'W45 에 10판');
  var b7 = await core.board(mem, '2026-W45'), tenth7 = b7[9].runId;
  clock = Date.UTC(2026, 10, 8, 15, 5);   /* 월 00:05 KST */
  var e1 = await call('award', { query: { runId: tenth7, week: '2026-W45' } });
  check(e1.status === 200 && e1.json.award === 'paper_crown' && e1.json.final === false, '월 00:05 10등: 아직 망토 아님 (final:false) ' + JSON.stringify(e1.json));
  var best7 = null; for (var s8 = 500; s8 < 900; s8++) { var x8 = runOf(s8, false, script(rnd7)); if (!best7 || x8.score > best7.score) { best7 = x8; best7.seed = s8; } }
  clock = Date.UTC(2026, 10, 8, 15, 20);   /* 월 00:20 KST, 토큰은 일 23:59:30 */
  var late7 = await call('submit', { method: 'POST', body: body(token(best7.seed, false, Date.UTC(2026, 10, 8, 14, 59, 30)), best7, 'late') });
  check(late7.status === 200 && late7.json.week === '2026-W45' && late7.json.rank === 1, '토큰 30분 안의 늦은 판은 그 주로 ' + JSON.stringify(late7.json));
  clock = Date.UTC(2026, 10, 8, 15, 31);   /* 월 00:31 KST: 닫힘 */
  var capes = 0, allIds = wk.concat([late7.json.runId]);
  for (var q7 = 0; q7 < allIds.length; q7++) { var aw = await call('award', { query: { runId: allIds[q7], week: '2026-W45' } }); if (aw.json.award === 'emperor_cape') capes++; check(aw.json.final === true, 'final:true ' + allIds[q7]); }
  check(capes === 10, '망토는 정확히 10개 (' + capes + ')');
  var f10 = await call('award', { query: { runId: tenth7, week: '2026-W45' } });
  check(f10.json.award === 'paper_crown' && f10.json.rank === 11, '밀려난 옛 10등은 종이 왕관 11등 (망토를 미리 받지 않았음) ' + JSON.stringify(f10.json));
  var lateAfter = await call('submit', { method: 'POST', body: body(token(best7.seed + 1000, false, Date.UTC(2026, 10, 8, 14, 59, 59)), runOf(best7.seed + 1000, false, []), 'later') });
  check(lateAfter.status === 401 && (await core.board(mem, '2026-W45')).length === 11, '닫힌 뒤엔 W45 토큰으로 못 씀 (순위 굳음)');
  check(core.weekClosed('2026-W45', Date.UTC(2026, 10, 8, 15, 30, 4)) === false && core.weekClosed('2026-W45', Date.UTC(2026, 10, 8, 15, 30, 6)) === true, 'weekClosed 경계 = 월 00:30:05 KST');

  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
