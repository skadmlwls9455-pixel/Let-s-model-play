#!/usr/bin/env node
/* library/books (책) · library/cards (서가 카드) 점검 — 머리말·길이·id 는 오류, 글이 '자료' 에서 벗어나는 말은 경고 (고칠지는 쓴 사람이 정한다).
   usage: node tools/check-books.js [booksDir] [cardsDir] */
'use strict';
var path = require('path');
var core = require('../core.js');
var booksDir = process.argv[2] || path.join(__dirname, '..', '..', 'library', 'books');
var cardsDir = process.argv[3] || path.join(__dirname, '..', '..', 'library', 'cards');
var WARN = [
  [/(^|[\s"'(])(너는|너도|너를|너의|네가|네게|문어야|뽈뽈아)/, '문어에게 말 걸기 — 책은 편지가 아니다'],
  [/(즐거울|행복할|행복해질|기쁠|좋아하게 될|좋아할|신기하지|재미있지|설렐)/, '느낄 것 정해 주기'],
  [/(해\s?봐|해야\s?(한다|해)|하세요|가 봐|읽어 봐|기억해|해 보자|해 볼 수 있다)/, '하라고 하기'],
  [/(뽈뽈|이 문어|우리 문어)/, '이 게임의 문어 이야기 — 어떤 문어인지는 문어가 정한다'],
  [/[?？]\s*$/, '질문으로 끝남 — 문어가 계속 쫓게 될 수 있다'],
  [/[?？]/, '본문에 질문 — 심어 둔 질문은 끌림이 된다 (카드)']
];
var warns = 0, errors = 0;
function lint(items, label) {
  Object.keys(items).sort().forEach(function (k) {
    var b = items[k], lines = [];
    if (b.text.length < 150) lines.push('짧음 (' + b.text.length + '자, 150자 이상 권장)');
    WARN.forEach(function (w) {
      var m = w[0].exec(b.text);
      if (m) { var i = Math.max(0, m.index - 12); lines.push(w[1] + ': "…' + b.text.slice(i, m.index + m[0].length + 12).replace(/\n/g, ' ') + '…"'); }
    });
    console.log((lines.length ? '⚠ ' : '✓ ') + k + ' (' + b.text.length + '자, by ' + b.by + ')');
    lines.forEach(function (l) { console.log('    ' + l); warns++; });
  });
}
var lb = core.loadBooks(booksDir);
lint(lb.books, '책');
Object.keys(lb.byLang || {}).forEach(function (l) { lint(lb.byLang[l], '책 ' + l); });   /* 번역본 (library/books/<lang>/) 도 같은 규칙 */
lb.errors.forEach(function (e) { console.log('✗ ' + e); });
console.log('\n책 ' + Object.keys(lb.books).length + '권 · 오류 ' + lb.errors.length);
errors += lb.errors.length;

var lc = core.loadCards(cardsDir);
if (Object.keys(lc.cards).length || lc.errors.length) {
  console.log('');
  lint(lc.cards, '카드');
  Object.keys(lc.byLang || {}).forEach(function (l) { lint(lc.byLang[l], '카드 ' + l); });
  lc.errors.forEach(function (e) { console.log('✗ ' + e); });
  console.log('\n서가 카드 ' + Object.keys(lc.cards).length + '장 · 오류 ' + lc.errors.length);
  errors += lc.errors.length;
}
console.log('\n경고 ' + warns + ' · 오류 ' + errors);
process.exit(errors ? 1 : 0);
