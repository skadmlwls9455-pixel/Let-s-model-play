/* POST /api/runner/submit  { token, inputs:[{t,a}], score, ticks, nick } → { ok, rank, week, runId, award }
 *   검증: 서명 · 30분 안 · 입력 형식(≤ 20000, t 정수 ≥ 0 비감소, a ∈ jd|ju|dd|du, t ≤ ticks)
 *        · 실시간보다 빠를 수 없음(ticks/60 ≤ 경과 초 + 3) · 토큰의 seed/night 로 재시뮬(끝까지 + until=ticks) = 주장한 score·ticks
 *        · 시드당 한 번(runner-ids/{week}/{runId}.json, 덮어쓰기 금지).
 *   다시 보내기는 멱등: 같은 runId 가 같은 score·ticks 로 이미 순위표에 있으면 그 결과를 200 으로 그대로 (응답을 잃었을 때 · 만료 뒤라도).
 *        같은 runId 인데 다른 점수면 409 duplicate. 표시만 있고 기록이 없으면(지난번에 중간에 실패) 기록을 이어서 쓴다.
 *   저장: { nick, score, ticks, at, runId, inputsLen } — IP·UA 는 저장하지 않는다. */
'use strict';
var core = require('../_lib/core.js');

function bad(res, status, error) { return core.send(res, status, { ok: false, error: error }); }
function validInputs(inputs, ticks) {
  if (!Array.isArray(inputs) || inputs.length > core.MAX_INPUTS) return false;
  var prev = 0;
  for (var i = 0; i < inputs.length; i++) {
    var e = inputs[i];
    if (!e || typeof e !== 'object' || !Number.isInteger(e.t) || e.t < 0 || e.t < prev || e.t > ticks || !core.ACTS[e.a]) return false;
    prev = e.t;
  }
  return true;
}

function okBody(b, d, week) {
  return { ok: true, rank: d ? d.rank : null, total: b.length, week: week, runId: d ? d.runId : null, nick: d ? d.nick : null, score: d ? d.score : null, award: core.isEventWeek(week) ? core.AWARDS.PAPER : null };
}
/* 그 주 순위표에서 이 runId 의 줄 (없으면 null) */
async function find(store, week, runId) {
  var b = await core.board(store, week);
  return { b: b, d: b.filter(function (x) { return x.runId === runId; })[0] || null };
}
function same(d, score, ticks) { return !!d && d.score === score && d.ticks === ticks; }

module.exports = async function submit(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'method');
  var key = core.secret();
  if (!key) return bad(res, 503, 'not_configured');
  var body = await core.readJson(req).catch(function () { return null; });
  if (!body) return bad(res, 400, 'bad_json');

  var tok = core.readToken(body.token, key);
  if (!tok) return bad(res, 401, 'bad_token');
  if (tok.v !== core.RUNNER.VERSION) return bad(res, 400, 'old_version');
  var now = core.now(), age = now - tok.iat;
  var score = body.score, ticks = body.ticks;
  if (age > core.TOKEN_TTL_MS) {   /* 만료: 이미 올라간 같은 판을 다시 보낸 거면 그 결과를 돌려준다 (새로 쓰지는 않는다) */
    var late = await find(core.getStore(), tok.week, core.runIdOf(body.token)).catch(function () { return null; });
    if (late && same(late.d, score, ticks)) return core.send(res, 200, okBody(late.b, late.d, tok.week));
    return bad(res, 401, 'expired');
  }
  if (age < -5000) return bad(res, 401, 'expired');

  if (!Number.isInteger(score) || score < 0 || score >= core.SCORE_CAP || !Number.isInteger(ticks) || ticks < 1 || ticks > core.RUNNER.C.MAX_TICKS) return bad(res, 400, 'bad_numbers');
  if (!validInputs(body.inputs, ticks)) return bad(res, 400, 'bad_inputs');
  if (ticks / 60 > Math.max(0, age) / 1000 + 3) return bad(res, 400, 'too_fast');

  var inputs = body.inputs.map(function (e) { return { t: e.t, a: e.a }; });
  var full = core.RUNNER.simulate(tok.seed, inputs, { night: tok.night });
  var cut = core.RUNNER.simulate(tok.seed, inputs, { night: tok.night, until: ticks });
  if (full.score !== score || full.ticks !== ticks || cut.score !== score || cut.ticks !== ticks) return bad(res, 422, 'mismatch');

  var store = core.getStore(), week = tok.week, runId = core.runIdOf(body.token), nick = core.sanitizeNick(body.nick);
  try {
    await store.put(core.idPath(week, runId), { runId: runId, at: now });
  } catch (e) {
    if (!e || e.code !== 'EEXIST') {
      console.error('runner submit: id put failed', e && e.name);
      return bad(res, 502, 'storage');
    }
    /* 이 토큰은 벌써 한 번 왔다: 같은 판이 순위표에 있으면 그 결과(다시 보내기), 다른 판이면 409, 없으면 지난번 쓰기가 중간에 끊긴 것 → 아래에서 이어 쓴다 */
    var prior;
    try { prior = await find(store, week, runId); } catch (e1) { console.error('runner submit: list failed', e1 && e1.name); return bad(res, 502, 'storage'); }
    if (prior.d) return same(prior.d, score, ticks) ? core.send(res, 200, okBody(prior.b, prior.d, week)) : bad(res, 409, 'duplicate');
  }
  var path = core.encodePath({ week: week, score: score, ticks: ticks, runId: runId, nick: nick });
  try {
    try { await store.put(path, { nick: nick, score: score, ticks: ticks, at: now, runId: runId, inputsLen: inputs.length }); }
    catch (e3) { if (!e3 || e3.code !== 'EEXIST') throw e3; }   /* 같은 경로 = 같은 판·같은 닉네임이 이미 있음 → 그대로 성공 */
    var got = await find(store, week, runId);
    return core.send(res, 200, okBody(got.b, got.d || { rank: null, runId: runId, nick: nick, score: score }, week));
  } catch (e2) {
    console.error('runner submit: entry put failed', e2 && e2.name);
    return bad(res, 502, 'storage');
  }
};
