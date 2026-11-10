/* POST /api/far/<방 열쇠> { open: true|false } — 문어가 제안한 '먼 바다 문' 에 사람이 한 번 대답한다 (열어 줘 / 지금은 그대로).
   이 사이트에서만 (Origin). 제안이 걸려 있을 때만 바뀐다 (core.setFar). 모델은 이 길로 대답할 수 없다 — 사람의 동의는 게임 화면에서만 */
'use strict';
var ST = require('../../mcp/store.js');
var core = require('../../mcp/core.js');
function send(res, status, obj) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }

module.exports = async function far(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'method' }); }
  var origin = req.headers.origin, host = String(req.headers.host || '');
  if (!origin || (function () { try { return new URL(origin).host !== host; } catch (e) { return true; } })()) return send(res, 403, { ok: false, error: 'origin' });   /* 브라우저 (게임 화면) 에서만 */
  var key = (req.query && req.query.key) || String(req.url || '').split('?')[0].split('/').pop();
  if (Array.isArray(key)) key = key[0];
  if (!ST.validKey(key)) return send(res, 404, { ok: false, error: 'no_room' });
  var body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body.open !== 'boolean') return send(res, 400, { ok: false, error: 'open' });
  var store = (module.exports._store || ST.blobStore)();
  try {
    if (!(await ST.readMeta(store, key))) return send(res, 404, { ok: false, error: 'no_room' });
    var oct = new core.Octopus({ remote: { initialState: await ST.readState(store, key) } });
    var r = oct.setFar(body.open);
    if (r.error) return send(res, 409, { ok: false, error: 'no_proposal' });
    await store.write(ST.roomPath(key, 'state.json'), JSON.stringify(oct.S));
    return send(res, 200, { ok: true, state: r.state });
  } catch (e) {
    console.error('far: storage', e && e.name);
    return send(res, 502, { ok: false, error: 'storage' });
  }
};
