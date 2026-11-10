/* ═══════════════════════════════════════════════════════════════════
   뽈뽈 문어 — js/poster-art.js (전역 POSTER_ART) · 포스터에 붙는 픽셀 그림 (docs/POSTER_ART.md)

   포스터 앞면에 위키 사진 대신 그 방(세부 주제)의 픽셀 그림을 붙인다. 방 66장 + 주제 9장 (32×32, Apollo 팔레트, 장면 외곽선 규칙).
   그림은 js/poster-art-data.js 에 data URI 로 들어 있다 (node tools/make-poster-art.js 가 만든다) — 포스터 SVG 는
   그림으로 굽힐 때(3D 벽 텍스처 · 날아가는 포스터 · PNG 저장) 밖의 파일을 못 읽으므로, 주소 대신 그림 자체를 넣는다. file:// 에서도 그대로.

   고르는 순서 (forTrip): ① 기억한 방의 그림 (poster.sticker = 방 id · 없으면 기억한 정류장 id)
                         ② 그 방·정류장의 주제 그림 (도서관 밖 글을 기억했을 때 — 방 그림이 없다)
                         ③ 포스터 장면(poster.scene)의 주제 그림 → 그것도 없으면 들판 그림
   쪽지(집에 있던 날)와 복원된 옛 포스터에는 붙이지 않는다 (예전에도 사진이 없었다).
   그림은 그 방이 무엇인지 보여 주는 삽화일 뿐이다 — 문어가 무엇을 봤다·읽었다는 기록이 아니다. 읽은 글·출처·사진 출처는 일기(뒷면)에 그대로 남는다.
   일반 스크립트 · 모듈 없음. app.js 보다 먼저 싣는다 (poster-art-data.js → poster-art.js → app.js).
   ═══════════════════════════════════════════════════════════════════ */
var POSTER_ART = (function () {
  'use strict';
  var D = (typeof POSTER_ART_DATA !== 'undefined' && POSTER_ART_DATA) || (typeof require === 'function' ? require('./poster-art-data.js') : { room: {}, corner: {} });
  var SIZE = 32;
  function uri(b) { return b ? 'data:image/png;base64,' + b : null; }
  function room(id) { return id && Object.prototype.hasOwnProperty.call(D.room, id) ? uri(D.room[id]) : null; }
  function corner(id) { return id && Object.prototype.hasOwnProperty.call(D.corner, id) ? uri(D.corner[id]) : null; }

  /* trip → { kind: 'room' | 'corner', id, src } | null.  world = WORLD (방 → 주제를 찾을 때만 쓴다, 없어도 된다) */
  function forTrip(trip, world) {
    var p = trip && trip.poster; if (!p || p.type === 'note' || trip.by === 'legacy') return null;
    var r = trip.receipt, rem = r && r.stops && r.rememberedIdx >= 0 ? r.stops[r.rememberedIdx] : null;
    var ids = [p.sticker, rem && rem.id, rem && rem.node && rem.node.id], i, src;
    for (i = 0; i < ids.length; i++) if ((src = room(ids[i]))) return { kind: 'room', id: ids[i], src: src };
    var nd = world && world.nodes && p.sticker ? world.nodes[p.sticker] : null;
    var cs = [nd && nd.corner, rem && rem.corner, p.scene, 'wild'];
    for (i = 0; i < cs.length; i++) if ((src = corner(cs[i]))) return { kind: 'corner', id: cs[i], src: src };
    return null;
  }

  /* 칸(x, y, w, h) 가운데에 정수 배로 놓은 <image> 한 줄. 붙일 그림이 없으면 ''. 칸이 32px 보다 작으면 칸에 맞춰 줄인다 */
  function svg(trip, x, y, w, h, world) {
    var a = forTrip(trip, world); if (!a) return '';
    var m = Math.min(w, h), k = m >= SIZE ? Math.floor(m / SIZE) : m / SIZE, s = SIZE * k;
    var ix = x + (w - s) / 2, iy = y + (h - s) / 2;
    return '<image class="poster-art" data-art="' + a.kind + ':' + a.id + '" href="' + a.src + '" x="' + ix.toFixed(1) + '" y="' + iy.toFixed(1) + '" width="' + s.toFixed(1) + '" height="' + s.toFixed(1) +
      '" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/>';
  }

  return { SIZE: SIZE, room: room, corner: corner, forTrip: forTrip, svg: svg,
    rooms: function () { return Object.keys(D.room); }, corners: function () { return Object.keys(D.corner); } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = POSTER_ART;
