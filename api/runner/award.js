/* GET /api/runner/award?runId=<12 hex>&week=YYYY-Www
 *   그 주가 닫혔고(core.weekClosed: 그 주 토큰이 모두 만료된 월 00:30:05 KST 부터) 상위 10 안 → { award:'emperor_cape', final:true }
 *   기록이 있으면(이벤트 주) → { award:'paper_crown', final: 닫혔나 } · 아직 안 닫힌 주 → { award:null, final:false }
 *   지금 판 순위표에 없으면 옛 판(runner-1) 순위표도 본다 (11-15). 없으면 404. final:false 는 "아직 바뀔 수 있음" → 클라이언트는 나중에 다시 묻는다. 계정 없음: runId 를 가진 기기만 물어볼 수 있다. */
'use strict';
var core = require('../_lib/core.js');

module.exports = async function award(req, res) {
  if (req.method && req.method !== 'GET') return core.send(res, 405, { ok: false, error: 'method' });
  var q = core.query(req), runId = String(core.one(q.runId) || ''), week = String(core.one(q.week) || '');
  if (!/^[0-9a-f]{12}$/.test(runId) || !core.isWeek(week)) return core.send(res, 400, { ok: false, error: 'bad_query' });
  try {
    var b = await core.board(core.getStore(), week), me = b.filter(function (d) { return d.runId === runId; })[0];
    /* 11-15: 지금 판(runner-2) 순위표에 없으면 옛 판(runner-1) 순위표에서 — 바꾸기 전에 올린 판도 망토를 받는다 (runId 는 토큰 해시라 겹치지 않는다) */
    if (!me && core.RUNNER.VERSION !== 'runner-1') { b = await core.board(core.getStore(), week, 'runner-1'); me = b.filter(function (d) { return d.runId === runId; })[0]; }
    if (!me) return core.send(res, 404, { ok: false, error: 'not_found' });
    var finished = core.weekClosed(week);   /* 주가 바뀐 직후 30분은 늦게 온 판이 아직 들어올 수 있다 → 순위가 굳은 뒤에만 final */
    if (finished && me.rank <= 10) return core.send(res, 200, { ok: true, award: core.AWARDS.CAPE, rank: me.rank, week: week, final: true });
    if (core.isEventWeek(week)) return core.send(res, 200, { ok: true, award: core.AWARDS.PAPER, rank: me.rank, week: week, final: finished });
    if (!finished) return core.send(res, 200, { ok: true, award: null, rank: me.rank, week: week, final: false });
    return core.send(res, 404, { ok: false, error: 'no_award' });
  } catch (e) {
    console.error('runner award: list failed', e && e.name);
    core.send(res, 502, { ok: false, error: 'storage' });
  }
};
