/* GET /api/runner/award?runId=<12 hex>&week=YYYY-Www
 *   그 주가 끝났고(이번 주 > week) 상위 10 안 → { award:'emperor_cape' }
 *   기록이 있으면(이벤트 주) → { award:'paper_crown' } · 없으면 404. 계정 없음: runId 를 가진 기기만 물어볼 수 있다. */
'use strict';
var core = require('../_lib/core.js');

module.exports = async function award(req, res) {
  if (req.method && req.method !== 'GET') return core.send(res, 405, { ok: false, error: 'method' });
  var q = core.query(req), runId = String(core.one(q.runId) || ''), week = String(core.one(q.week) || '');
  if (!/^[0-9a-f]{12}$/.test(runId) || !core.isWeek(week)) return core.send(res, 400, { ok: false, error: 'bad_query' });
  try {
    var b = await core.board(core.getStore(), week), me = b.filter(function (d) { return d.runId === runId; })[0];
    if (!me) return core.send(res, 404, { ok: false, error: 'not_found' });
    var finished = core.weekKey(core.now()) > week;
    if (finished && me.rank <= 10) return core.send(res, 200, { ok: true, award: core.AWARDS.CAPE, rank: me.rank, week: week, final: true });
    if (core.isEventWeek(week)) return core.send(res, 200, { ok: true, award: core.AWARDS.PAPER, rank: me.rank, week: week, final: finished });
    return core.send(res, 404, { ok: false, error: 'no_award' });
  } catch (e) {
    console.error('runner award: list failed', e && e.name);
    core.send(res, 502, { ok: false, error: 'storage' });
  }
};
