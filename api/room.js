/* POST /api/room → { ok, key, mcp } — 새 뽈뽈 방 (계정 없음). 열쇠는 서버가 만든다.
   남용 막기: 브라우저에서 부를 땐 이 사이트에서만 (Origin), 주소마다 시간당 5개 (인스턴스 메모리), 전체 시간당 ROOMS_PER_HOUR 개 (저장소 셈) */
'use strict';
var ST = require('../mcp/store.js');

var ROOMS_PER_HOUR = Number(process.env.PPOLPPOL_ROOMS_PER_HOUR) || 200;
var made = new Map();
function send(res, status, obj) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }

module.exports = async function room(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'method' }); }
  var host = String(req.headers.host || ''), origin = req.headers.origin;
  if (origin && (function () { try { return new URL(origin).host !== host; } catch (e) { return true; } })()) return send(res, 403, { ok: false, error: 'origin' });
  var ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  var hour = new Date().toISOString().slice(0, 13), k = ip + '|' + hour, n = (made.get(k) || 0) + 1;
  made.set(k, n); if (made.size > 5000) made.clear();
  if (n > 5) return send(res, 429, { ok: false, error: 'slow_down' });
  var store = ST.blobStore();
  try {
    var cp = 'rooms-made/' + hour + '.json', c = ST.parse(await store.read(cp)) || { n: 0 };
    if (c.n >= ROOMS_PER_HOUR) return send(res, 429, { ok: false, error: 'busy' });
    c.n++; await store.write(cp, JSON.stringify(c));
    var key = await ST.createRoom(store, { name: req.body && req.body.name, lang: req.body && req.body.lang });   /* lang: 기기 언어 (ko · en · ja) → 방의 언어 */
    return send(res, 200, { ok: true, key: key, mcp: 'https://' + host + '/api/mcp/' + key });
  } catch (e) {
    console.error('room: storage', e && e.name);
    return send(res, 502, { ok: false, error: 'storage' });
  }
};
