/* 11-21 cafe: reads a standard MIDI file (format 0/1) into plain notes. Node only (build + tests). */
'use strict';
var fs = require('fs');
function parse(file) {
  var b = fs.readFileSync(file), p = 0;
  function u32() { var v = b.readUInt32BE(p); p += 4; return v; }
  function u16() { var v = b.readUInt16BE(p); p += 2; return v; }
  function vlq() { var v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 127); } while (c & 128); return v; }
  if (b.toString('latin1', 0, 4) !== 'MThd') throw new Error('not midi: ' + file);
  p = 8; u16(); var ntr = u16(), div = u16();
  var notes = [], tempos = [], sigs = [], keys = [];
  for (var t = 0; t < ntr; t++) {
    if (b.toString('latin1', p, p + 4) !== 'MTrk') throw new Error('bad track');
    p += 4; var end = p + u32() + 4; p = end - (end - p) + 0; var len = b.readUInt32BE(p - 4); end = p + len;
    var tick = 0, run = 0, on = {};
    while (p < end) {
      tick += vlq();
      var st = b[p];
      if (st & 128) { p++; if (st < 240) run = st; } else st = run;
      var hi = st & 240, ch = st & 15;
      if (st === 255) {
        var type = b[p++], l = vlq();
        if (type === 0x51) tempos.push({ tick: tick, us: (b[p] << 16) | (b[p + 1] << 8) | b[p + 2] });
        if (type === 0x58) sigs.push({ tick: tick, n: b[p], d: 1 << b[p + 1] });
        if (type === 0x59) keys.push({ tick: tick, sf: b.readInt8(p), minor: b[p + 1] });
        p += l;
      } else if (st === 240 || st === 247) { p += vlq(); }
      else if (hi === 0x90 || hi === 0x80) {
        var n = b[p++], v = b[p++], k = ch + ':' + n;
        if (hi === 0x90 && v > 0) { if (!on[k]) on[k] = []; on[k].push({ tick: tick, v: v }); }
        else if (on[k] && on[k].length) { var o = on[k].shift(); notes.push({ tick: o.tick, dur: tick - o.tick, n: n, v: o.v, tr: t, ch: ch }); }
      } else if (hi === 0xC0 || hi === 0xD0) p += 1;
      else p += 2;
    }
    p = end;
  }
  notes.sort(function (a, c) { return a.tick - c.tick || a.n - c.n; });
  tempos.sort(function (a, c) { return a.tick - c.tick; });
  return { div: div, notes: notes, tempos: tempos, sigs: sigs, keys: keys };
}
module.exports = { parse: parse };
if (require.main === module) {
  var N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  process.argv.slice(2).forEach(function (f) {
    var m = parse(f), last = m.notes[m.notes.length - 1];
    console.log(f.split('/').pop(), 'div', m.div, 'notes', m.notes.length, 'beats', ((last.tick + last.dur) / m.div).toFixed(1),
      'sig', JSON.stringify(m.sigs.slice(0, 2)), 'key', JSON.stringify(m.keys.slice(0, 1)),
      'bpm', m.tempos.slice(0, 6).map(function (t) { return (t.tick / m.div).toFixed(1) + ':' + Math.round(6e7 / t.us); }).join(' '), 'tempos', m.tempos.length);
    console.log('  ', m.notes.slice(0, 26).map(function (n) { return (n.tick / m.div).toFixed(2) + N[n.n % 12] + (Math.floor(n.n / 12) - 1); }).join(' '));
  });
}
