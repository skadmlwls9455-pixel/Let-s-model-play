/* POST /api/mcp/<방 열쇠> — 원격 뽈뽈 방 (claude.ai 웹 · 모바일 · Desktop 커스텀 커넥터). 몸통은 mcp/http.js */
'use strict';
var path = require('path');
var H = require('../../mcp/http.js');
var ST = require('../../mcp/store.js');

module.exports = async function mcp(req, res) {
  var key = (req.query && req.query.key) || (String(req.url || '').split('?')[0].split('/').pop());
  return H.handleMcp(req, res, {
    store: ST.blobStore(), key: Array.isArray(key) ? key[0] : key,
    booksDir: path.join(process.cwd(), 'library', 'books'),
    appOrigin: 'https://' + String(req.headers.host || '').replace(/[^A-Za-z0-9.:-]/g, '')   /* 엽서 화면이 이 사이트의 vendor/mcp-apps 를 불러온다 */
  });
};
