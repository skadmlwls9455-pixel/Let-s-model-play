/* GET /api/walks/<방 열쇠>?after=<파일> → { ok, walks: [{ file, events }] } — 게임이 Claude 에서 다녀온 산책을 가져간다 (한 번에 10개까지).
   이 사이트에서만 (Origin 이 있으면 같은 주소여야). 열쇠를 아는 사람만 그 방을 읽는다 (MCP 와 같은 '비밀 링크'). */
'use strict';
var ST = require('../../mcp/store.js');
var FILE_RE = /^(\d{4}-\d{2}-\d{2})-(\d+)\.json$/;
function send(res, status, obj) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }
function order(a, b) { var x = FILE_RE.exec(a), y = FILE_RE.exec(b); return x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : (+x[2]) - (+y[2]); }

module.exports = async function walks(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { ok: false, error: 'method' }); }
  var origin = req.headers.origin, host = String(req.headers.host || '');
  if (origin && (function () { try { return new URL(origin).host !== host; } catch (e) { return true; } })()) return send(res, 403, { ok: false, error: 'origin' });
  var key = (req.query && req.query.key) || String(req.url || '').split('?')[0].split('/').pop();
  if (Array.isArray(key)) key = key[0];
  if (!ST.validKey(key)) return send(res, 404, { ok: false, error: 'no_room' });
  var after = req.query && typeof req.query.after === 'string' && FILE_RE.test(req.query.after) ? req.query.after : null;
  var store = (module.exports._store || ST.blobStore)();
  try {
    if (!(await ST.readMeta(store, key))) return send(res, 404, { ok: false, error: 'no_room' });
    var prefix = ST.roomPath(key, 'out/');
    var names = (await store.list(prefix)).map(function (p) { return p.slice(prefix.length); }).filter(function (n) { return FILE_RE.test(n); }).sort(order);
    if (after) names = names.filter(function (n) { return order(n, after) > 0; });
    var out = [];
    for (var i = 0; i < names.length && out.length < 10; i++) {
      var ev = ST.parse(await store.read(prefix + names[i]));
      if (Array.isArray(ev)) out.push({ file: names[i], events: ev });
    }
    return send(res, 200, { ok: true, walks: out, more: names.length > out.length });
  } catch (e) {
    console.error('walks: storage', e && e.name);
    return send(res, 502, { ok: false, error: 'storage' });
  }
};
