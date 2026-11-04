/* GET /api/runner/top?week=YYYY-Www (기본: 이번 주, Asia/Seoul) → { ok, week, total, top:[{rank, nick, score, at}] } (상위 20) */
'use strict';
var core = require('../_lib/core.js');

module.exports = async function top(req, res) {
  if (req.method && req.method !== 'GET') return core.send(res, 405, { ok: false, error: 'method' });
  var q = core.query(req), week = core.one(q.week) || core.weekKey(core.now());
  if (!core.isWeek(week)) return core.send(res, 400, { ok: false, error: 'bad_week' });
  try {
    var b = await core.board(core.getStore(), week);
    /* 닉네임은 보여 줄 때 한 번 더 정리: 정리 규칙이 생기기 전에 저장된 블롭(예: 한글 채움 문자 U+3164 이름)도 같은 규칙으로 */
    var rows = b.slice(0, 20).map(function (d) { var r = { rank: d.rank, nick: core.sanitizeNick(d.nick), score: d.score }; if (d.uploadedAt) r.at = d.uploadedAt; return r; });
    core.send(res, 200, { ok: true, week: week, total: b.length, top: rows }, 'public, s-maxage=15, stale-while-revalidate=30');
  } catch (e) {
    console.error('runner top: list failed', e && e.name);
    core.send(res, 502, { ok: false, error: 'storage' });
  }
};
