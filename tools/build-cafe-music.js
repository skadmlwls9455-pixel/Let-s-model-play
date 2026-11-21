#!/usr/bin/env node
/* tools/build-cafe-music.js - 11-21 cafe: writes the TUNES block of js/cafe-music.js from the public-domain typeset MIDI files
 * in wip/round7/cafe-src/ (sources and licence lines: docs/CAFE_MUSIC.md).
 *   node tools/build-cafe-music.js          rewrite the block
 *   node tools/build-cafe-music.js --check  exit 1 if the block is stale
 * One note = [start, length, midi pitch, loudness 1-9], time unit 1/24 of a quarter note.
 * from/to = the excerpt in quarter notes of the source; skip = a stretch left out (a first ending when the repeat is not taken). */
'use strict';
var fs = require('fs'), path = require('path'), MIDI = require('./cafe-midi.js');
var ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'wip', 'round7', 'cafe-src'), OUT = path.join(ROOT, 'js', 'cafe-music.js');
var SPEC = [
  { id: 'lullaby', name: '자장가', by: '브람스', file: 'LullabyBrahms-C.mid', from: 0, to: 47, bpm: 72 },
  { id: 'clair', name: '달빛', by: '드뷔시', file: 'debussy_Ste_Bergamesq_Clair.mid', from: 0, to: 36, bpm: 56 },
  { id: 'traumerei', name: '트로이메라이', by: '슈만', file: 'SchumannOp15No07.mid', from: 0, to: 33, bpm: 54 },
  { id: 'prelude', name: '전주곡 다장조', by: '바흐', file: 'wtk1-prelude1.mid', from: 0, to: 44, bpm: 66 },
  { id: 'entertainer', name: '디 엔터테이너', by: '조플린', file: 'entertainer.mid', from: 0, to: 40, bpm: 60 },
  { id: 'elise', name: '엘리제를 위하여', by: '베토벤', file: 'fur_Elise_WoO59.mid', from: 0, to: 33.75, bpm: 66, skip: [11, 12] },
  { id: 'arabesque', name: '아라베스크 1번', by: '드뷔시', file: 'debussy_Arabesque_1.mid', from: 0, to: 108, bpm: 132 },
  { id: 'chopin', name: '전주곡 마단조', by: '쇼팽', file: 'Chop-28-4.mid', from: 0, to: 49, bpm: 60 }
];
function excerpt(sp) {
  var m = MIDI.parse(path.join(SRC, sp.file)), q = m.div, out = [];
  var vs = m.notes.map(function (n) { return n.v; }), vmin = Math.min.apply(null, vs), vmax = Math.max.apply(null, vs);
  m.notes.forEach(function (n) {
    var b = n.tick / q, e = (n.tick + n.dur) / q;
    if (b < sp.from || b >= sp.to) return;
    if (sp.skip) { if (b >= sp.skip[0] && b < sp.skip[1]) return; if (b >= sp.skip[1]) { b -= sp.skip[1] - sp.skip[0]; e -= sp.skip[1] - sp.skip[0]; } }
    var vel = vmax > vmin ? 3 + Math.round(6 * (n.v - vmin) / (vmax - vmin)) : 6;
    out.push([Math.round((b - sp.from) * 24), Math.max(1, Math.round((e - b) * 24)), n.n, vel]);
  });
  out.sort(function (a, c) { return a[0] - c[0] || a[2] - c[2]; });
  var seen = {}, uniq = out.filter(function (x) { var k = x[0] + ':' + x[2]; if (seen[k]) return false; seen[k] = 1; return true; });   /* same pitch doubled in two voices */
  var len = Math.round((sp.to - sp.from - (sp.skip ? sp.skip[1] - sp.skip[0] : 0)) * 24);
  return { id: sp.id, name: sp.name, by: sp.by, bpm: sp.bpm, len: len, notes: uniq };
}
function block() {
  var lines = SPEC.map(function (sp) {
    var t = excerpt(sp), flat = [];
    t.notes.forEach(function (x) { flat.push(x[0], x[1], x[2], x[3]); });
    return "    { id: '" + t.id + "', name: '" + t.name + "', by: '" + t.by + "', bpm: " + t.bpm + ', len: ' + t.len + ', d: [' + flat.join(',') + '] }';
  });
  return '/* DATA-BEGIN (tools/build-cafe-music.js) */\n  var TUNES = [\n' + lines.join(',\n') + '\n  ];\n  /* DATA-END */';
}
module.exports = { SPEC: SPEC, excerpt: excerpt };
if (require.main === module) {
  var src = fs.readFileSync(OUT, 'utf8'), rx = /\/\* DATA-BEGIN[\s\S]*?\/\* DATA-END \*\//;
  if (!rx.test(src)) { console.error('no DATA block in js/cafe-music.js'); process.exit(1); }
  var next = src.replace(rx, function () { return block(); });
  if (process.argv.indexOf('--check') >= 0) { if (next !== src) { console.error('js/cafe-music.js is stale: run node tools/build-cafe-music.js'); process.exit(1); } console.log('cafe music data is current'); }
  else { fs.writeFileSync(OUT, next); SPEC.forEach(function (sp) { var t = excerpt(sp); console.log(t.id, t.notes.length + ' notes', (t.len / 24 * 60 / t.bpm).toFixed(1) + ' s'); }); }
}
