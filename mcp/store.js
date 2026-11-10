/* mcp/store.js — 원격 뽈뽈 방 저장소 (방 열쇠마다 상태 · 산책 기록)
 *
 *   rooms/<열쇠>/meta.json   { v, created, name?, hour, calls }   — 방이 있다는 표지 + 시간당 호출 수
 *   rooms/<열쇠>/state.json  core.js 의 S (메모·대화·산책 목록)
 *   rooms/<열쇠>/out/<날짜>-<n>.json · talk.json   게임이 그대로 재생하는 이벤트 배열
 *
 * 어댑터 { read(path) → text|null, write(path, text), list(prefix) → [path] }
 *   - fileStore(dir): 로컬 (mcp/rooms, 커밋하지 않음)
 *   - blobStore(): Vercel Blob, 비공개 (access 'private') — 주소를 알아도 토큰 없이는 못 읽는다
 *   - memoryStore(): 테스트
 */
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var KEY_RE = /^[A-Za-z0-9_-]{32,64}$/;   /* newKey() 는 32자 (24바이트 = 192비트) */
function newKey() { return crypto.randomBytes(24).toString('base64url'); }
function validKey(k) { return typeof k === 'string' && KEY_RE.test(k); }
function safeName(n) { return /^[A-Za-z0-9._-]{1,80}$/.test(n) && n.indexOf('..') < 0; }

function memoryStore() {
  var m = new Map();
  return {
    kind: 'memory',
    read: async function (p) { return m.has(p) ? m.get(p) : null; },
    write: async function (p, t) { m.set(p, String(t)); },
    list: async function (prefix) { return Array.from(m.keys()).filter(function (k) { return k.indexOf(prefix) === 0; }).sort(); },
    _map: m
  };
}

function fileStore(dir) {
  return {
    kind: 'file',
    read: async function (p) { try { return fs.readFileSync(path.join(dir, p), 'utf8'); } catch (e) { return null; } },
    write: async function (p, t) {
      var f = path.join(dir, p); fs.mkdirSync(path.dirname(f), { recursive: true });
      var tmp = f + '.tmp'; fs.writeFileSync(tmp, String(t)); fs.renameSync(tmp, f);
    },
    list: async function (prefix) {
      var d = path.join(dir, prefix);
      try { return fs.readdirSync(d).filter(function (f) { return !/\.tmp$/.test(f); }).map(function (f) { return prefix + f; }).sort(); } catch (e) { return []; }
    }
  };
}

function blobStore() {
  function sdk() { return require('@vercel/blob'); }
  return {
    kind: 'blob',
    read: async function (p) {
      var r = await sdk().get(p, { access: 'private', useCache: false }).catch(function (e) {
        if (e && (e.name === 'BlobNotFoundError' || e instanceof sdk().BlobNotFoundError)) return null; throw e;
      });
      if (!r || r.statusCode !== 200 || !r.stream) return null;
      var rd = r.stream.getReader(), parts = [], c;
      while (!(c = await rd.read()).done) parts.push(Buffer.from(c.value));
      return Buffer.concat(parts).toString('utf8');
    },
    write: async function (p, t) {
      await sdk().put(p, String(t), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    },
    list: async function (prefix) {
      var out = [], cursor;
      for (var page = 0; page < 10; page++) {
        var r = await sdk().list({ prefix: prefix, cursor: cursor, limit: 1000 });
        r.blobs.forEach(function (b) { out.push(b.pathname); });
        if (!r.hasMore || !r.cursor) break;
        cursor = r.cursor;
      }
      return out.sort();
    }
  };
}

function roomPath(key, name) {
  if (!validKey(key)) throw new Error('bad key');
  if (name === 'out/') { /* 산책 기록 폴더 (목록용) */ }
  else if (name && name.indexOf('out/') === 0) { if (!safeName(name.slice(4))) throw new Error('bad name'); }
  else if (name && !safeName(name)) throw new Error('bad name');
  return 'rooms/' + key + '/' + (name || '');
}
function parse(t) { try { return t == null ? null : JSON.parse(t); } catch (e) { return null; } }

/* 방 만들기: 열쇠는 서버가 만든다 (사람·모델이 고르지 않는다 → 짐작할 수 없다) */
async function createRoom(store, opts) {
  opts = opts || {};
  var key = newKey(), now = new Date().toISOString();
  var meta = { v: 1, created: now, hour: null, calls: 0 };
  if (typeof opts.name === 'string' && opts.name.trim()) meta.name = opts.name.trim().slice(0, 12);
  var lang = require('./i18n.js').norm(opts.lang); if (lang) meta.lang = lang;   /* 방의 언어 (게임이 기기 언어를 보낸다). 없으면 모델이 look_room 으로 한 번 정한다 */
  await store.write(roomPath(key, 'meta.json'), JSON.stringify(meta));
  return key;
}
async function readMeta(store, key) { return validKey(key) ? parse(await store.read(roomPath(key, 'meta.json'))) : null; }
async function readState(store, key) { return parse(await store.read(roomPath(key, 'state.json'))); }

module.exports = { memoryStore: memoryStore, fileStore: fileStore, blobStore: blobStore, newKey: newKey, validKey: validKey,
  roomPath: roomPath, createRoom: createRoom, readMeta: readMeta, readState: readState, parse: parse, KEY_RE: KEY_RE };
