/* POST /api/runner/submit  { token, inputs:[{t,a}], score, ticks, nick } → { ok, rank, week, runId, award }
 *   검증: 서명 · 30분 안 · 입력 형식(≤ 20000, t 정수 ≥ 0 비감소, a ∈ jd|ju|dd|du, t ≤ ticks)
 *        · 실시간보다 빠를 수 없음(ticks/60 ≤ 경과 초 + 3) · 토큰의 seed/night 로 재시뮬(끝까지 + until=ticks) = 주장한 score·ticks
 *        · 시드당 한 번(runner-ids/{week}/{runId}.json, 덮어쓰기 금지 → 409).
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
  if (age < -5000 || age > core.TOKEN_TTL_MS) return bad(res, 401, 'expired');

  var score = body.score, ticks = body.ticks;
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
    if (e && e.code === 'EEXIST') return bad(res, 409, 'duplicate');
    console.error('runner submit: id put failed', e && e.name);
    return bad(res, 502, 'storage');
  }
  var path = core.encodePath({ week: week, score: score, ticks: ticks, runId: runId, nick: nick });
  try {
    await store.put(path, { nick: nick, score: score, ticks: ticks, at: now, runId: runId, inputsLen: inputs.length });
    var b = await core.board(store, week), me = b.filter(function (d) { return d.runId === runId; })[0];
    var award = core.isEventWeek(week) ? core.AWARDS.PAPER : null;
    return core.send(res, 200, { ok: true, rank: me ? me.rank : null, total: b.length, week: week, runId: runId, nick: nick, score: score, award: award });
  } catch (e2) {
    console.error('runner submit: entry put failed', e2 && e2.name);
    return bad(res, 502, 'storage');
  }
};
