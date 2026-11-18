/* ═══════════════════════════════════════════════════════════════════
   뽈뽈 문어 — js/poster-art.js (전역 POSTER_ART) · 포스터에 붙는 픽셀 그림 (docs/POSTER_ART.md)

   포스터 앞면에 위키 사진 대신 그 방(세부 주제)의 픽셀 그림을 붙인다. 방 66장 + 주제 9장 (32×32, Apollo 팔레트, 장면 외곽선 규칙).
   그림은 js/poster-art-data.js 에 data URI 로 들어 있다 (node tools/make-poster-art.js 가 만든다) — 포스터 SVG 는
   그림으로 굽힐 때(3D 벽 텍스처 · 날아가는 포스터 · PNG 저장) 밖의 파일을 못 읽으므로, 주소 대신 그림 자체를 넣는다. file:// 에서도 그대로.

   고르는 순서 (forTrip): ① 기억한 방의 그림 (poster.sticker = 방 id · 없으면 기억한 정류장 id)
                         ② 그 방·정류장의 주제 그림 (도서관 밖 글을 기억했을 때 — 방 그림이 없다)
                         ③ 포스터 장면(poster.scene)의 주제 그림 → 그것도 없으면 들판 그림
   집에 있던 날 쪽지는 그날 집 활동(receipt.activity.id)의 그림 8장 중 하나 — 모르는 활동(모델이 쓴 쪽지 등)이면 안 붙인다. 복원된 옛 포스터에도 안 붙인다.
   장면 배경 (sceneSvg): 주제마다 66×56 픽셀 배경 한 장 — 포스터 장면 칸(300px 포스터에서 264×224)에 정수 배로 맞는다.
   들른 곳 줄 (trailSvg): 한 줄 글과 날짜 사이 빈 곳에 그날 들른 정류장의 그림을 들른 순서대로 놓는다 (일기의 정류장 목록 그대로 — 지어내지 않는다).
     기억한 곳 밑에 작은 표시, 못 읽은 곳(문 앞까지만·못 읽음·앉아만 있음)은 흐리게. 자리가 모자라면 앞에서부터 보이는 만큼 + 점 셋.
   도서관 밖 글 (11-18): 방 그림이 없는 글(위키 글 · 서가 카드)은 전부 같은 들판 그림이라 주제가 달라도 포스터가 똑같았다 → 그 글의 제목에서 나오는 무늬 한 장 (emblem — 같은 제목 = 같은 무늬).
     무늬는 그 글을 그린 것이 아니라 포스터끼리 구별되게 하는 표다. 그릴 때 제목에서 다시 만든다 (저장은 그대로 — 이미 있는 포스터도 다음에 그릴 때 달라진다).
   그림은 그 방이 무엇인지 보여 주는 삽화일 뿐이다 — 문어가 무엇을 봤다·읽었다는 기록이 아니다. 읽은 글·출처·사진 출처는 일기(뒷면)에 그대로 남는다.
   일반 스크립트 · 모듈 없음. app.js 보다 먼저 싣는다 (poster-art-data.js → poster-art.js → app.js).
   ═══════════════════════════════════════════════════════════════════ */
var POSTER_ART = (function () {
  'use strict';
  var D = (typeof POSTER_ART_DATA !== 'undefined' && POSTER_ART_DATA) || (typeof require === 'function' ? require('./poster-art-data.js') : {});
  ['room', 'corner', 'stay', 'scene'].forEach(function (k) { if (!D[k]) D[k] = {}; });
  var SIZE = 32, SCENE_W = 66, SCENE_H = 56;
  function uri(b) { return b ? 'data:image/png;base64,' + b : null; }
  function pick(map, id) { return id && typeof id === 'string' && Object.prototype.hasOwnProperty.call(map, id) ? uri(map[id]) : null; }
  function room(id) { return pick(D.room, id); }
  function corner(id) { return pick(D.corner, id); }
  function stay(id) { return pick(D.stay, id); }
  function scene(id) { return pick(D.scene, id); }
  function img(src, x, y, s, extra) {
    return '<image' + (extra || '') + ' href="' + src + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + s.toFixed(1) + '" height="' + s.toFixed(1) + '" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/>';
  }

  /* 제목 → 무늬 (8×8 칸: 테 1칸 + 안 6×6 좌우 대칭 · Apollo 한 갈래의 세 톤 [짙은 · 가운데 · 옅은]). 무작위 함수를 쓰지 않는다 — 제목 글자에서만 나온다 */
  var RAMPS = [['#253a5e', '#4f8fba', '#a4dddb'], ['#25562e', '#75a743', '#d0da91'], ['#7a4841', '#c09473', '#e7d5b3'], ['#884b2b', '#de9e41', '#e8c170'], ['#752438', '#cf573c', '#da863e'], ['#402751', '#a23e8c', '#df84a5']];
  function emblem(title) {
    var t = String(title == null ? '' : title).replace(/\s+/g, ' ').trim(); if (!t) return null;
    var h = 0x811c9dc5, i, r, c; for (i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } h >>>= 0;
    var a = h, cells = [], on = 0;
    function next() { a = (a + 0x6D2B79F5) | 0; var x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }
    for (r = 0; r < 6; r++) { var row = []; for (c = 0; c < 3; c++) { var v = next(), k = v < 0.42 ? 1 : v < 0.58 ? 2 : 0; if (k) on++; row.push(k); } cells.push(row.concat(row.slice().reverse())); }
    if (!on) cells[2][2] = cells[2][3] = cells[3][2] = cells[3][3] = 1;   /* 빈 무늬는 없다 */
    return { key: h.toString(36), ramp: RAMPS[h % RAMPS.length], cells: cells };
  }
  function emblemSvg(e, x, y, s, extra) {   /* 그림 자리 (한 변 s) 에 8×8 칸 */
    var u = s / 8, f = function (n) { return n.toFixed(2); };
    var out = '<g' + (extra || '') + ' shape-rendering="crispEdges"><rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(s) + '" height="' + f(s) + '" fill="' + e.ramp[0] + '"/><rect x="' + f(x + u) + '" y="' + f(y + u) + '" width="' + f(6 * u) + '" height="' + f(6 * u) + '" fill="' + e.ramp[2] + '"/>';
    e.cells.forEach(function (row, r) { row.forEach(function (v, c) { if (v) out += '<rect x="' + f(x + (c + 1) * u) + '" y="' + f(y + (r + 1) * u) + '" width="' + f(u) + '" height="' + f(u) + '" fill="' + e.ramp[v === 1 ? 0 : 1] + '"/>'; }); });
    return out + '</g>';
  }
  function draw(a, x, y, s, extra, smooth) {   /* 고른 그림 한 장: 무늬면 칸으로 · 아니면 <image> */
    if (a.emblem) return emblemSvg(a.emblem, x, y, s, extra);
    return smooth ? '<image' + (extra || '') + ' href="' + a.src + '" x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + s.toFixed(2) + '" height="' + s.toFixed(2) + '"/>' : img(a.src, x, y, s, extra);
  }

  /* 정류장 하나(일기의 stops[i]) → { kind, id, src }. 방 그림 → 그 주제 그림 → (도서관 밖 글이면 제목 무늬) → 들판 */
  function forStop(st) {
    if (!st) return null;
    var ids = [st.nodeId, st.id, st.node && st.node.id], i, src;
    for (i = 0; i < ids.length; i++) if ((src = room(ids[i]))) return { kind: 'room', id: ids[i], src: src };
    if (st.corner && st.corner !== 'wild' && (src = corner(st.corner))) return { kind: 'corner', id: st.corner, src: src };
    var e = !st.node && !st.nodeId ? emblem(st.title || st.name) : null;   /* 11-18: 도서관 밖 글 (방이 아닌 정류장) */
    if (e) return { kind: 'topic', id: e.key, src: corner('wild'), emblem: e };
    return { kind: 'corner', id: 'wild', src: corner('wild') };
  }

  /* trip → { kind: 'room' | 'corner' | 'stay', id, src } | null.  world = WORLD (방 → 주제를 찾을 때만 쓴다, 없어도 된다) */
  function forTrip(trip, world) {
    var p = trip && trip.poster; if (!p || trip.by === 'legacy') return null;
    var r = trip.receipt, src, i;
    if (p.type === 'note') { var act = r && r.activity && r.activity.id; return (src = stay(act)) ? { kind: 'stay', id: act, src: src } : null; }
    var rem = r && r.stops && r.rememberedIdx >= 0 ? r.stops[r.rememberedIdx] : null;
    var ids = [p.sticker, rem && rem.nodeId, rem && rem.id, rem && rem.node && rem.node.id];
    for (i = 0; i < ids.length; i++) if ((src = room(ids[i]))) return { kind: 'room', id: ids[i], src: src };
    var nd = world && world.nodes && p.sticker ? world.nodes[p.sticker] : null;
    var cs = [nd && nd.corner, rem && rem.corner, p.scene, 'wild'];
    for (i = 0; i < cs.length; i++) if ((src = corner(cs[i]))) {
      var e = cs[i] === 'wild' && !nd ? emblem(p.title || (rem && (rem.title || rem.name))) : null;   /* 11-18: 방 그림도 주제 그림도 없는 글 (도서관 밖) → 제목 무늬. 제목이 없으면 예전처럼 들판 */
      return e ? { kind: 'topic', id: e.key, src: src, emblem: e } : { kind: 'corner', id: cs[i], src: src };
    }
    return null;
  }

  /* 칸(x, y, w, h) 가운데에 정수 배로 놓은 <image> 한 줄. 붙일 그림이 없으면 ''. 칸이 32px 보다 작으면 칸에 맞춰 줄인다 */
  function svg(trip, x, y, w, h, world) {
    var a = forTrip(trip, world); if (!a) return '';
    var m = Math.min(w, h), k = m >= SIZE ? Math.floor(m / SIZE) : m / SIZE, s = SIZE * k;
    return draw(a, x + (w - s) / 2, y + (h - s) / 2, s, ' class="poster-art" data-art="' + a.kind + ':' + a.id + '"');
  }

  /* 작은 포스터(mini: 벽 · 들고 오는 포스터 · 날아가는 포스터)의 그림: 장면 칸 가운데에 칸의 82% 크기로, 부드럽게 줄여서. 붙일 그림이 없으면 '' */
  function miniSvg(trip, x, y, w, h, world) {
    var a = forTrip(trip, world); if (!a) return '';
    var s = Math.min(w, h) * 0.82;
    return draw(a, x + (w - s) / 2, y + (h - s) / 2, s, ' class="poster-art" data-art="' + a.kind + ':' + a.id + '"', true);
  }

  /* 장면 배경: 장면 칸(x, y, w, h)을 덮는 <image>. 가로는 칸 너비에 맞추고 (300px 포스터 = ×4) 넘치는 위아래는 잘린다 (쪽지는 칸이 낮다). 모르는 장면이면 '' */
  function sceneSvg(id, x, y, w, h, smooth) {
    var src = scene(id); if (!src) return '';
    if (smooth) return '<image class="poster-scene" data-scene="' + id + '" href="' + src + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid slice"/>';   /* 작은 포스터: 칸이 66px 보다 좁아 정수 배가 안 된다 → 부드럽게 줄인다 (벽 텍스처는 장면이 다시 픽셀로 만든다) */
    return '<image class="poster-scene" data-scene="' + id + '" href="' + src + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid slice" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/>';
  }

  /* 들른 곳 줄: 칸(x, y, w, h) 가운데에 정류장 그림을 순서대로. 정류장이 둘 미만이거나 자리가 32px 보다 낮으면 '' (한 곳뿐이면 큰 그림과 같은 그림이라 되풀이하지 않는다) */
  var READ = { read: 1, builtin: 1 };
  function trail(trip) {
    var p = trip && trip.poster, r = trip && trip.receipt; if (!p || p.type === 'note' || trip.by === 'legacy' || !r || !r.stops || r.stops.length < 2) return [];
    return r.stops.map(function (st, i) { var a = forStop(st); return { idx: i, kind: a.kind, id: a.id, src: a.src, emblem: a.emblem || null, remembered: i === r.rememberedIdx, read: !!READ[st.status] }; });
  }
  function trailSvg(trip, x, y, w, h) {
    var list = trail(trip); if (!list.length) return '';
    var k = Math.min(2, Math.floor((h - 6) / SIZE)); if (k < 1) return '';
    if (k === 2 && list.length > Math.floor((w + 12) / (SIZE * 2 + 12))) k = 1;   /* 크게 놓으면 다 안 들어갈 때는 작게 (더 많이 보이는 쪽) */
    var s = SIZE * k, gap = 6 * k, fit = Math.max(1, Math.floor((w + gap) / (s + gap))), more = list.length > fit;
    if (more) { fit = Math.max(1, Math.floor((w - 5 * k + gap) / (s + gap))); var rem = list.filter(function (a) { return a.remembered; })[0]; list = list.slice(0, fit); if (rem && rem.idx >= fit) list[fit - 1] = rem; }
    var total = list.length * s + (list.length - 1) * gap + (more ? gap + 5 * k : 0), x0 = x + (w - total) / 2, y0 = y + (h - s - 3 * k) / 2, out = '<g class="poster-trail" data-stops="' + list.length + (more ? '+' : '') + '">';
    list.forEach(function (a, i) {
      var ix = x0 + i * (s + gap);
      if (i) for (var d = 0; d < 2; d++) out += '<rect x="' + (ix - gap + (gap - 3 * k) / 2 + d * 2 * k).toFixed(1) + '" y="' + (y0 + s / 2).toFixed(1) + '" width="' + k + '" height="' + k + '" fill="#a89b80"/>';
      out += draw(a, ix, y0, s, ' data-stop="' + a.kind + ':' + a.id + '"' + (a.read ? '' : ' opacity=".45"'));
      if (a.remembered) out += '<rect class="poster-trail-rem" x="' + (ix + s / 2 - 3 * k).toFixed(1) + '" y="' + (y0 + s + k).toFixed(1) + '" width="' + (6 * k) + '" height="' + (2 * k) + '" fill="#b8402c"/>';
    });
    if (more) for (var e = 0; e < 3; e++) out += '<rect x="' + (x0 + list.length * (s + gap) + e * 2 * k).toFixed(1) + '" y="' + (y0 + s / 2).toFixed(1) + '" width="' + k + '" height="' + k + '" fill="#a89b80"/>';
    return out + '</g>';
  }

  return { SIZE: SIZE, SCENE_W: SCENE_W, SCENE_H: SCENE_H, room: room, corner: corner, stay: stay, scene: scene,
    forTrip: forTrip, forStop: forStop, svg: svg, miniSvg: miniSvg, sceneSvg: sceneSvg, trail: trail, trailSvg: trailSvg, emblem: emblem,
    rooms: function () { return Object.keys(D.room); }, corners: function () { return Object.keys(D.corner); }, stays: function () { return Object.keys(D.stay); }, scenes: function () { return Object.keys(D.scene); } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = POSTER_ART;
