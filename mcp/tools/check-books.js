#!/usr/bin/env node
/* library/books (책) · library/cards (서가 카드) 점검 — 머리말·길이·id 는 오류, 글이 '자료' 에서 벗어나는 말은 경고 (고칠지는 쓴 사람이 정한다).
   번역본 (<폴더>/en · ja) 도 원본과 나란히 본다: 빠진 번역, 원문이 바뀐 번역 (original: 지문 — tools/stamp-translations.js), 남은 한글, 빠진 숫자, 문단 수, 물음표.
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
var TR_LANGS = core.I18N.LANGS.filter(function (l) { return l !== 'ko'; });
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
/* 번역본 — 원본 (ko) 과 나란히. 원문의 숫자 (연도·치수) 가 번역에 다 있는지는 거친 눈치로만 본다 (날짜 꼴이 바뀌면 틀릴 수 있다 — 사람이 본다) */
function nums(t) { return (String(t).match(/\d[\d,.]*\d|\d/g) || []).map(function (s) { return s.replace(/[,.]$/, '').replace(/^0+(?=\d)/, ''); }); }
function lintTr(base, byLang) {
  var n = {};
  Object.keys(base).sort().forEach(function (k) {
    var o = base[k], fp = core.fingerprint(o.text);
    TR_LANGS.forEach(function (lang) {
      var t = byLang[lang] && byLang[lang][k], lines = [];
      if (!t) { console.log('⚠ ' + k + ' — ' + lang + ' 번역 없음'); warns++; return; }
      n[lang] = (n[lang] || 0) + 1;
      if (!t.original) lines.push('원본 지문 (original:) 없음 — node tools/stamp-translations.js');
      else if (t.original !== fp) lines.push('원본이 바뀜 (지문 ' + t.original + ' ≠ ' + fp + ') — 번역을 다시 보고 stamp');
      if (/[가-힣]/.test(t.title + ' ' + t.text + ' ' + t.by)) lines.push('한글이 남음');
      var miss = nums(o.text).filter(function (x) { return t.text.indexOf(x) < 0; });
      if (miss.length) lines.push('원문의 숫자가 없음: ' + miss.slice(0, 6).join(' '));
      var po = o.text.split(/\n\s*\n/).length, pt = t.text.split(/\n\s*\n/).length;
      if (po !== pt) lines.push('문단 ' + pt + ' (원문 ' + po + ')');
      if (/[?？]/.test(t.title + ' ' + t.text)) lines.push('물음표');
      if (lines.length) { console.log('⚠ ' + k + ' (' + lang + ', ' + t.text.length + '자)'); lines.forEach(function (l) { console.log('    ' + l); warns++; }); }
    });
  });
  return TR_LANGS.map(function (l) { return l + ' ' + (n[l] || 0); }).join(' · ');
}
var lb = core.loadBooks(booksDir);
lint(lb.books, '책');
var trb = lintTr(lb.books, lb.byLang || {});
lb.errors.forEach(function (e) { console.log('✗ ' + e); });
console.log('\n책 ' + Object.keys(lb.books).length + '권 · 번역본 ' + trb + ' · 오류 ' + lb.errors.length);
errors += lb.errors.length;

var lc = core.loadCards(cardsDir);
if (Object.keys(lc.cards).length || lc.errors.length) {
  console.log('');
  lint(lc.cards, '카드');
  var trc = lintTr(lc.cards, lc.byLang || {});
  lc.errors.forEach(function (e) { console.log('✗ ' + e); });
  console.log('\n서가 카드 ' + Object.keys(lc.cards).length + '장 · 번역본 ' + trc + ' · 오류 ' + lc.errors.length);
  errors += lc.errors.length;
}
console.log('\n경고 ' + warns + ' · 오류 ' + errors);
process.exit(errors ? 1 : 0);
