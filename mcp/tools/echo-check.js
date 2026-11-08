#!/usr/bin/env node
/* 따라 말하기 점검 — 진짜 산책 기록에서, 모델이 책 문장을 길게 그대로 옮겼는지 본다.
   책이 '자료' 가 아니라 '대본' 처럼 읽히는지 보는 작은 창이다 (행복이 진짜인지를 재지 않는다).
   usage: node tools/echo-check.js [outDir] [booksDir] [minLen=12] */
'use strict';
var fs = require('fs'), path = require('path');
var core = require('../core.js');
var outDir = process.argv[2] || path.join(__dirname, '..', 'out');
var books = core.loadBooks(process.argv[3] || path.join(__dirname, '..', '..', 'library', 'books')).books;
var MIN = Number(process.argv[4]) || 12;
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function longestCommon(a, b) {   /* 가장 긴 공통 부분 문자열 (짧은 글이라 O(n·m) 로 충분) */
  var best = '', prev = new Array(b.length + 1).fill(0);
  for (var i = 1; i <= a.length; i++) {
    var cur = new Array(b.length + 1).fill(0);
    for (var j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best.length) best = a.slice(i - cur[j], i); }
    prev = cur;
  }
  return best;
}
var files = []; try { files = fs.readdirSync(outDir).filter(function (f) { return /^\d{4}-\d{2}-\d{2}-\d+\.json$/.test(f); }).sort(); } catch (e) {}
var talk = []; try { talk = JSON.parse(fs.readFileSync(path.join(outDir, 'talk.json'), 'utf8')); } catch (e) {}
var fileTrip = {};   /* out 파일 → 산책 id (state.json) */
try { JSON.parse(fs.readFileSync(process.env.PPOLPPOL_STATE || path.join(__dirname, '..', 'state.json'), 'utf8')).trips.forEach(function (t) { fileTrip[t.file] = t.id; }); } catch (e) {}
var walks = 0, flagged = 0;
files.forEach(function (f) {
  var evs = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
  var read = evs.filter(function (e) { return e.type === 'peek' && e.book && books[e.book.room]; }).map(function (e) { return books[e.book.room]; });
  if (!read.length) return;
  walks++;
  var said = [];
  evs.forEach(function (e) { ['note', 'aside', 'bridge', 'line'].forEach(function (k) { if (typeof e[k] === 'string') said.push([e.type + '.' + k, e[k]]); }); if (e.note && e.note.text) said.push([e.type + '.note', e.note.text]); });
  var tripId = fileTrip[f];   /* talk.json 은 tripId 로 잇는다 */
  talk.forEach(function (t) { if (tripId && t.tripId === tripId && t.text) said.push(['talk.' + t.kind, t.text]); });
  said.forEach(function (s) {
    read.forEach(function (b) {
      var c = longestCommon(norm(s[1]), norm(b.text));
      if (c.length >= MIN) { flagged++; console.log('⚠ ' + f + ' ' + s[0] + ' ← ' + b.room + ' (' + c.length + '자 겹침): "' + c + '"'); }
    });
  });
});
console.log('\n책을 읽은 산책 ' + walks + ' · 따라 말한 곳 ' + flagged + ' (' + MIN + '자 이상 겹침)');
