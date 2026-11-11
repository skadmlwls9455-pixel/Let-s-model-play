/* POST /api/lang/<방 열쇠> { lang: "ko"|"en"|"ja"|"de"|"fr"|"es"|"auto" } → { ok, lang, pin } — 사람이 방의 언어를 정한다 (게임 설정 › 내 Claude 와 연결).
   여섯 중 하나면 고정 (pin — 모델이 look_room 의 lang 으로 바꾸지 못한다), auto 면 고정을 풀고 Claude 대화의 언어를 따라간다 (store.setRoomLang).
   이 사이트에서만 (Origin). 모델은 이 길로 올 수 없다 — 언어를 정하는 것은 사람의 몫 */
'use strict';
var ST = require('../../mcp/store.js');
function send(res, status, obj) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }

module.exports = async function lang(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'method' }); }
  var origin = req.headers.origin, host = String(req.headers.host || '');
  if (!origin || (function () { try { return new URL(origin).host !== host; } catch (e) { return true; } })()) return send(res, 403, { ok: false, error: 'origin' });   /* 브라우저 (게임 화면) 에서만 */
  var key = (req.query && req.query.key) || String(req.url || '').split('?')[0].split('/').pop();
  if (Array.isArray(key)) key = key[0];
  if (!ST.validKey(key)) return send(res, 404, { ok: false, error: 'no_room' });
  var body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body.lang !== 'string') return send(res, 400, { ok: false, error: 'lang' });
  var store = (module.exports._store || ST.blobStore)();
  try {
    var r = await ST.setRoomLang(store, key, body.lang);
    if (!r) return send(res, 404, { ok: false, error: 'no_room' });
    if (r.error) return send(res, 400, { ok: false, error: 'lang' });
    return send(res, 200, { ok: true, lang: r.lang, pin: r.pin });
  } catch (e) {
    console.error('lang: storage', e && e.name);
    return send(res, 502, { ok: false, error: 'storage' });
  }
};
