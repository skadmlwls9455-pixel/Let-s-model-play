#!/usr/bin/env node
/* 번역본 머리말에 원본 (ko) 본문의 지문을 적는다: `original: xxxxxxxx` (core.fingerprint). 원문이 바뀌면 check-books 가 "원본이 바뀜" 으로 알려 준다.
   번역을 새로 하거나 다시 본 뒤에 돌린다. 이미 맞는 지문은 그대로 둔다.
   usage: node tools/stamp-translations.js [booksDir] [cardsDir] */
'use strict';
var fs = require('fs'), path = require('path');
var core = require('../core.js');
var dirs = [process.argv[2] || path.join(__dirname, '..', '..', 'library', 'books'), process.argv[3] || path.join(__dirname, '..', '..', 'library', 'cards')];
var HEAD = /^(---\n)([\s\S]*?\n)(---\n?)([\s\S]*)$/;
function body(txt) { var m = HEAD.exec(String(txt).replace(/\r\n/g, '\n')); return m ? m[4].trim() : null; }
var stamped = 0, kept = 0, skipped = 0;
dirs.forEach(function (dir) {
  var files = []; try { files = fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f) && f[0] !== '_'; }); } catch (e) { return; }
  var fp = {};
  files.forEach(function (f) { var b = body(fs.readFileSync(path.join(dir, f), 'utf8')); if (b) fp[f] = core.fingerprint(b); });
  core.I18N.LANGS.forEach(function (lang) {
    if (lang === 'ko') return;
    var sub = path.join(dir, lang), trs = []; try { trs = fs.readdirSync(sub).filter(function (f) { return /\.md$/.test(f) && f[0] !== '_'; }); } catch (e) { return; }
    trs.forEach(function (f) {
      if (!fp[f]) { console.log('✗ ' + lang + '/' + f + ': 원본이 없다'); skipped++; return; }
      var p = path.join(sub, f), txt = fs.readFileSync(p, 'utf8'), m = HEAD.exec(txt.replace(/\r\n/g, '\n'));
      if (!m) { console.log('✗ ' + lang + '/' + f + ': 머리말이 없다'); skipped++; return; }
      var head = m[2], line = 'original: ' + fp[f] + '\n';
      if (head.indexOf(line) >= 0) { kept++; return; }
      head = /^original:.*\n/m.test(head) ? head.replace(/^original:.*\n/m, line) : head.replace(/^lang:/m, line + 'lang:');   /* lang: 바로 앞에 */
      if (head.indexOf(line) < 0) head += line;   /* lang: 줄이 없으면 끝에 */
      fs.writeFileSync(p, m[1] + head + m[3] + m[4]);
      stamped++;
    });
  });
});
console.log('지문 적음 ' + stamped + ' · 이미 맞음 ' + kept + (skipped ? ' · 건너뜀 ' + skipped : ''));
process.exit(skipped ? 1 : 0);
