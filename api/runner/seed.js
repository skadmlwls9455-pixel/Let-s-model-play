/* GET /api/runner/seed?tz=<분, UTC 에 더하면 현지 시각: 서울 540> → { token, seed, night, iat, week, v }
 *   night = 현지 시각 [20, 6) (클라이언트 밤 팔레트와 같다). seed = crypto 무작위 uint32. 토큰 = base64url(JSON) + '.' + base64url(HMAC-SHA256). */
'use strict';
var crypto = require('crypto');
var core = require('../_lib/core.js');

module.exports = async function seed(req, res) {
  if (req.method && req.method !== 'GET') return core.send(res, 405, { ok: false, error: 'method' });
  var key = core.secret();
  if (!key) return core.send(res, 503, { ok: false, error: 'not_configured' });
  var q = core.query(req), tz = parseInt(core.one(q.tz), 10);
  if (!Number.isFinite(tz) || Math.abs(tz) > 14 * 60) tz = 540;
  var now = core.now(), hour = new Date(now + tz * 60000).getUTCHours();
  var claims = { seed: crypto.randomBytes(4).readUInt32BE(0), night: hour >= 20 || hour < 6, iat: now, week: core.weekKey(now), v: core.RUNNER.VERSION };
  core.send(res, 200, { ok: true, token: core.signToken(claims, key), seed: claims.seed, night: claims.night, iat: claims.iat, week: claims.week, v: claims.v });
};
