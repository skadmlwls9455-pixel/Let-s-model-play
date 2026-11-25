/* 저장: 이 브라우저의 IndexedDB (서버로 보내지 않는다).
 *   kv      — 지금 만들던 부적 · 설정 (LLM 주소 등)
 *   designs — 보관함 (만든 부적마다 하나, 뒷면 그림 포함)
 *   assets  — 내가 그린 일주 캐릭터 · 올린 글꼴
 * IndexedDB 를 못 쓰면 (사생활 보호 창 등) 메모리에만 두고, 화면에 알린다.
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};
  var NAME = 'bujeok-gongbang', VER = 1, STORES = ['kv', 'designs', 'assets'];
  var dbp = null, mem = { kv: {}, designs: {}, assets: {} }, usingMemory = false;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve) {
      var done = false;
      function fin(db) { if (!done) { done = true; if (!db) usingMemory = true; resolve(db); } }
      try {
        var rq = indexedDB.open(NAME, VER);
        rq.onupgradeneeded = function () {
          var db = rq.result;
          STORES.forEach(function (s) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); });
        };
        rq.onsuccess = function () { fin(rq.result); };
        rq.onerror = function () { fin(null); };
        rq.onblocked = function () { fin(null); };
        setTimeout(function () { fin(null); }, 4000);
      } catch (e) { fin(null); }
    });
    return dbp;
  }

  function req(store, mode, make) {
    return open().then(function (db) {
      if (!db) { var r0 = make(null); return r0 && typeof r0 === 'object' && 'result' in r0 ? r0.result : undefined; }
      return new Promise(function (resolve, reject) {
        var t, r;
        try { t = db.transaction(store, mode); r = make(t.objectStore(store)); }
        catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(r && 'result' in r ? r.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('저장 취소됨')); };
      });
    });
  }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  var store = {
    get: function (s, k) { return req(s, 'readonly', function (os) { return os ? os.get(k) : { result: clone(mem[s][k]) }; }); },
    put: function (s, k, v) { return req(s, 'readwrite', function (os) { if (!os) { mem[s][k] = clone(v); return null; } return os.put(v, k); }); },
    del: function (s, k) { return req(s, 'readwrite', function (os) { if (!os) { delete mem[s][k]; return null; } return os.delete(k); }); },
    keys: function (s) { return req(s, 'readonly', function (os) { return os ? os.getAllKeys() : { result: Object.keys(mem[s]) }; }); },
    all: function (s) {
      return open().then(function (db) {
        if (!db) return Object.keys(mem[s]).map(function (k) { return { key: k, value: clone(mem[s][k]) }; });
        return new Promise(function (resolve, reject) {
          var out = [], t = db.transaction(s, 'readonly'), cur = t.objectStore(s).openCursor();
          cur.onsuccess = function () { var c = cur.result; if (c) { out.push({ key: c.key, value: c.value }); c.continue(); } };
          t.oncomplete = function () { resolve(out); };
          t.onerror = function () { reject(t.error); };
        });
      });
    },
    memoryOnly: function () { return open().then(function () { return usingMemory; }); },
    /* 브라우저가 공간이 모자랄 때 지우지 않게 부탁 (안 되면 그냥 넘어감) */
    persist: function () { try { if (navigator.storage && navigator.storage.persist) return navigator.storage.persist(); } catch (e) {} return Promise.resolve(false); }
  };

  BJ.store = store;
})();
