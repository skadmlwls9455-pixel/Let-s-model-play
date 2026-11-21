/* 뽈뽈 문어 — 마을 표 (11-21 7차 갈래 V): 마을과 광장에 서 있는 것들의 자리. DOM 없음 · 시계 없음 · 난수 없음 (node 에서 그대로 시험한다 — tools/test-village.js).
   좌표는 대각 좌표 (s, t) [m]: s = (x + z)/√2 = 집에서 바다 쪽 (화면 아래) · t = (x − z)/√2 = 화면 오른쪽. 계약 C6 (wip/round7/briefs/COMMON.md) 의 배치표를 따른다.
   건물은 마당 집처럼 x · z 축에 맞춰 선다 (등각 마름모). 왼쪽 줄 (t < 0) 은 +x 면이, 오른쪽 줄 (t > 0, mir) 은 +z 면이 가게 앞이다 — 둘 다 기본 각에서 보이고 길 쪽 · 아래쪽을 본다.
   폰 화면은 가로 6.7 m 뿐이라 (길 폭 6 m 가 화면을 다 채운다) 건물은 길에 바짝 붙이고 (길 쪽 모서리 |t| 3.2), 판매대는 길 가장자리 안쪽 (|t| 2.2 ~ 3) 에 내놓는다 —
   길 한가운데를 걸어도 판매대와 가게 문어가 화면 가장자리에 보인다. 문어는 판매대 뒤 (|t| 3.3) 에 선다. */
var VILLAGE = (function () {
  var K = Math.SQRT1_2;
  function xz(s, t) { return [(s + t) * K, (s - t) * K]; }
  function st(x, z) { return [(x + z) * K, (x - z) * K]; }
  /* 건물 안 자리 (lx = 앞쪽, lz = 옆) → (s, t). mir = 오른쪽 줄 (x 와 z 를 바꿔 길 건너편에 비춘 꼴) */
  function local(c, mir, lx, lz) { var o = xz(c[0], c[1]), x = mir ? o[0] + lz : o[0] + lx, z = mir ? o[1] + lx : o[1] + lz; return st(x, z); }

  /* 걷는 곳 (갈래 W 의 WIDE.AREAS 와 같은 숫자 — 내 캐릭터 가운데가 갈 수 있는 곳. 서는 자리 시험과 길 찾기가 쓴다) */
  var WALK = [
    { key: 'road', s0: 5, s1: 20.1, t0: -3, t1: 3 },            /* 숲길 · 마을 문 */
    { key: 'street', s0: 20, s1: 38.1, t0: -2.2, t1: 2.2 },     /* 마을 길 (리드 11-21: 가게 앞이 화면에 들게 ±2.2) */
    { key: 'deck', s0: 30.3, s1: 36.7, t0: 2.1, t1: 6.9 },
    { key: 'plaza', s0: 38, s1: 46.1, t0: -8, t1: 8 },
    { key: 'steps', s0: 46, s1: 49.1, t0: -3, t1: 3 },
    { key: 'beach', s0: 49, s1: 59.7, t0: -12, t1: 12 }
  ];
  function inWalk(s, t, pad) { pad = pad || 0; return WALK.some(function (w) { return s >= w.s0 + pad && s <= w.s1 - pad && t >= w.t0 + pad && t <= w.t1 - pad; }); }

  /* 터: c = 건물 몸 가운데 (s, t) · hx · hz = 몸 반폭 (앞뒤 · 옆) · mir = 오른쪽 줄 */
  var LOTS = [
    { id: 'clothes', name: '옷가게', s0: 22, s1: 28, t0: -10, t1: -3.5, c: [24.6, -5.25], hx: 1.3, hz: 1.4, mir: false, open: true },
    { id: 'goods', name: '잡화점', s0: 22, s1: 28, t0: 3.5, t1: 10, c: [24.6, 5.25], hx: 1.3, hz: 1.4, mir: true, open: true },
    { id: 'empty', name: '빈 집', s0: 30, s1: 36, t0: -10, t1: -3.5, c: [31.8, -5.6], hx: 1.3, hz: 1.4, mir: false, open: false },
    { id: 'cafe', name: '카페', s0: 30, s1: 37, t0: 3.5, t1: 10, c: [33.6, 8.9], hx: 1.1, hz: 1.2, mir: true, open: true },
    { id: 'plaza', name: '광장', s0: 38, s1: 46, t0: -8, t1: 8, c: [42, 0], hx: 0, hz: 0, mir: false, open: true }
  ];
  var DECK = { s0: 30, s1: 37, t0: 3.5, t1: 7 };
  var STALL = { lx: 2.5, lz: -0.7, hw: 0.25, hd: 0.65, h: 0.42 };   /* 가게 앞 판매대 (건물 안 좌표) — 문어는 그 뒤 (lx 1.8) */
  var STAGE = { c: [43, 4.4], h: 1.4, y: 0.24 };
  var PLAZA = { board: [40.4, -2.9], well: [42.2, 0], benches: [[42.2, -1.9, 0], [42.2, 1.9, 0], [44.9, -4.6, 1]], nets: [45.2, 6.9], rug: [44.55, 2.85, 0.95] };   /* 광장 것들 (폰 화면 폭 6.7 m 안에 들게 가운데 가까이) · benches 셋째 값 1 = z 축으로 긴 것   /* 광장 무대 (x · z 축 네모, 반폭 h) */
  var CAFE = {
    counter: { s0: 31.0, s1: 34.0, t: 6.6, w: 0.5, h: 0.5 },
    shelf: { s: 30.4, t0: 4.4, t1: 6.0, d: 0.4, h: 0.7 },
    tables: [{ s: 33.4, t: 4.7, r: 0.36, h: 0.44 }, { s: 35.7, t: 5.6, r: 0.36, h: 0.44 }],
    stools: [[33.4, 3.95], [33.4, 5.45], [35.7, 4.85], [35.7, 6.35]], stoolR: 0.16, stoolH: 0.3,
    seat: { s: 33.4, t: 3.95, aisle: [32.75, 3.95], face: 3 * Math.PI / 4 },   /* 내 자리: 첫 식탁의 길 쪽 걸상 — 식탁을 옆에 두고 (+t 쪽을 보고) 앉는다. 식탁 뒤에 앉히면 기본 각에서 식탁이 몸을 가렸다 */
    cup: { s: 33.4, t: 4.5 }
  };
  function lot(id) { for (var i = 0; i < LOTS.length; i++) if (LOTS[i].id === id) return LOTS[i]; return null; }
  function at(id, lx, lz) { var L = lot(id); return local(L.c, L.mir, lx, lz); }

  /* 누르는 자리: key · 단추 id · 이름 (aria-label) · 자리 (s, t, y) · 톡 반지름 r · stand = 내 캐릭터가 가서 서는 자리 (걷는 곳 안) */
  var kc = at('clothes', 1.8, -0.7), kg = at('goods', 1.8, -0.7), rc = at('clothes', 2.35, 0.9), rg = at('goods', 2.35, 0.9);
  var SPOTS = [
    { key: 'shopClothes', btn: 'btn-shop-clothes', label: '옷가게', s: rc[0], t: rc[1], y: 0.7, r: 0.5, stand: [rc[0] + 0.3, -2.15] },
    { key: 'shopGoods', btn: 'btn-shop-goods', label: '잡화점', s: rg[0], t: rg[1], y: 0.5, r: 0.5, stand: [rg[0] + 0.3, 2.15] },
    { key: 'cafeCounter', btn: 'btn-cafe-counter', label: '카페 주문', s: 33.5, t: 6.6, y: 0.75, r: 0.45, stand: [33.5, 5.85] },
    { key: 'cafeSeat', btn: 'btn-cafe-seat', label: '카페 자리', s: CAFE.seat.s, t: CAFE.seat.t, y: 0.4, r: 0.4, stand: CAFE.seat.aisle.slice() },
    { key: 'cafeLp', btn: 'btn-cafe-lp', label: '레코드', s: 30.4, t: 5.2, y: 0.85, r: 0.45, stand: [31.15, 5.2] },
    { key: 'plazaStage', btn: 'btn-plaza-stage', label: '콘테스트 무대', s: STAGE.c[0], t: STAGE.c[1], y: 0.5, r: 0.9, stand: [STAGE.c[0] + 2.0 * K, STAGE.c[1] - 2.0 * K] },
    { key: 'plazaBoard', btn: 'btn-plaza-board', label: '마을 게시판', s: PLAZA.board[0], t: PLAZA.board[1], y: 1.0, r: 0.6, stand: [PLAZA.board[0] + 0.9, PLAZA.board[1]] },
    { key: 'npcClothes', btn: 'btn-npc-clothes', label: '가게 문어', npc: 'clothes', s: kc[0], t: kc[1], y: 0.5, r: 0.45, stand: [kc[0] + 1.45, -2.15] },
    { key: 'npcGoods', btn: 'btn-npc-goods', label: '가게 문어', npc: 'goods', s: kg[0], t: kg[1], y: 0.5, r: 0.45, stand: [kg[0] + 1.45, 2.15] },
    { key: 'npcCafe', btn: 'btn-npc-cafe', label: '가게 문어', npc: 'cafe', s: 32.2, t: 7.45, y: 0.5, r: 0.45, stand: [32.2, 5.85] }
  ];
  function spot(key) { for (var i = 0; i < SPOTS.length; i++) if (SPOTS[i].key === key || SPOTS[i].btn === key) return SPOTS[i]; return null; }

  /* NPC 문어 자리: face = 보는 쪽 (rad, 0 = +z = 화면 왼쪽 아래 · π/2 = +x = 화면 오른쪽 아래) · y = 올라앉은 높이 (가게 문어는 판매대 뒤 발판 위 — 얼굴이 판매대 위로 보이게).
     가게 문어 셋은 판매대 · 계산대 뒤, 잠든 문어 넷은 마을 문 벤치 · 빈 집 현관 · 바닷가 바위 · 부두 발치 (C6) */
  var sp = at('empty', 1.75, -0.45);
  var NPCS = [
    { id: 'clothes', s: kc[0], t: kc[1], y: 0.3, face: Math.PI / 2, r: 0.3 },
    { id: 'goods', s: kg[0], t: kg[1], y: 0.3, face: 0, r: 0.3 },
    { id: 'cafe', s: 32.2, t: 7.45, y: 0.34, face: 0, r: 0.3 },
    { id: 'sleep-1', s: 20.1, t: -3.6, y: 0.3, face: Math.PI / 2, r: 0.3 },
    { id: 'sleep-2', s: sp[0], t: sp[1], y: 0.3, face: Math.PI / 2, r: 0.3 },
    { id: 'sleep-3', s: 55, t: -9, y: 0.46, face: 0.6, r: 0.3 },      /* 갈래 W 의 넓적 바위 (높이 0.42) 위 — 모래 높이는 장면이 더한다 */
    { id: 'sleep-4', s: 55.3, t: 5.7, y: 0, face: 0.2, r: 0.3 }
  ];
  function npc(id) { for (var i = 0; i < NPCS.length; i++) if (NPCS[i].id === id) return NPCS[i]; return null; }

  /* 길가 소품 (s, t): 가로등 · 화분 */
  var LAMPS = [[21.6, -2.9], [21.6, 2.9], [28.9, -2.9], [28.9, 2.9], [37.3, -2.9], [38.6, 7.2], [45.4, -7.2]];   /* 길가 다섯 (앞 넷은 둘씩 마주 서서 깃발 줄을 건다) · 광장 둘 */
  var NLAMP = 5;
  var POTS = [[23.3, -2.75], [27.9, -2.8], [23.3, 2.75], [29.9, -2.9], [36.4, -2.8], [37.6, 2.7]];
  var BOARD = { s: 30.25, t: 2.85, r: 0.2 };   /* 카페 앞 길가의 세움 간판 (잔 그림) — 길 한가운데를 걸어도 카페가 보이게 */

  /* 부딪힘 (걷는 곳 안이나 그 가장자리에 선 것만): 원 (s, t, r) · x · z 축 네모는 장면이 건물 좌표에서 바로 만든다 (stage · bench · stall) */
  var CIRCLES = [];
  (function () {
    var c = CAFE, i;
    for (i = 0; i <= 5; i++) CIRCLES.push([c.counter.s0 + 0.25 + i * 0.5, c.counter.t, 0.3]);          /* 계산대 (길과 나란한 긴 상자 → 원 여섯) */
    for (i = 0; i < 3; i++) CIRCLES.push([c.shelf.s, c.shelf.t0 + 0.3 + i * 0.5, 0.28]);                /* 레코드 선반 */
    c.tables.forEach(function (tb) { CIRCLES.push([tb.s, tb.t, tb.r]); });
    c.stools.forEach(function (q) { CIRCLES.push([q[0], q[1], c.stoolR]); });
    [[30, 3.45], [37, 3.45], [30, 7.05], [37, 7.05]].forEach(function (p) { CIRCLES.push([p[0], p[1], 0.07]); });   /* 덱 기둥 넷 */
    CIRCLES.push([PLAZA.board[0], PLAZA.board[1] - 0.42, 0.22], [PLAZA.board[0], PLAZA.board[1] + 0.42, 0.22]);     /* 게시판 (화면 가로로 선 판) */
    CIRCLES.push([PLAZA.well[0], PLAZA.well[1], 0.95]);       /* 우물 */
    CIRCLES.push([PLAZA.nets[0], PLAZA.nets[1], 0.45]);
    CIRCLES.push([BOARD.s, BOARD.t, BOARD.r]);                        /* 그물 · 부표 더미 */
    LAMPS.forEach(function (l) { if (inWalk(l[0], l[1], -0.3)) CIRCLES.push([l[0], l[1], 0.06]); });
    NPCS.forEach(function (n) { CIRCLES.push([n.s, n.t, n.r]); });   /* 문어마다 원 하나 (걷는 곳 밖이어도 등록 — 가장자리에서 몸이 겹치지 않게) */
  })();

  /* 부딪힘 네모 [x0, z0, x1, z1] (x · z 축 — 등록부 WIDE_REG.boxes 와 같은 꼴): 판매대 둘 · 무대 · 벤치 셋 */
  var BENCH = { w: 0.4, d: 1.1 };   /* 벤치 (z 축으로 긴 것 기준 — x 축으로 긴 것은 치수를 바꾼다) */
  var BOXES = [];
  (function () {
    function bx(c, hw, hd) { BOXES.push([c[0] - hw, c[1] - hd, c[0] + hw, c[1] + hd]); }
    var a = at('clothes', STALL.lx, STALL.lz), b = at('goods', STALL.lx, STALL.lz);
    bx(xz(a[0], a[1]), STALL.hw, STALL.hd); bx(xz(b[0], b[1]), STALL.hd, STALL.hw);
    bx(xz(STAGE.c[0], STAGE.c[1]), STAGE.h, STAGE.h);
    var s1 = npc('sleep-1'); bx(xz(s1.s, s1.t), BENCH.w / 2, BENCH.d / 2);
    PLAZA.benches.forEach(function (q) { bx(xz(q[0], q[1]), (q[2] ? BENCH.w : BENCH.d) / 2, (q[2] ? BENCH.d : BENCH.w) / 2); });
  })();

  /* 길 찾기 (누른 자리까지 혼자 걸을 때): from · to = (s, t) → 거쳐 갈 점들 [(s, t) …] (끝 점 포함). 곧은 길이 원 · 네모에 막히면 그 둘레의 점들로 돌아간다 (작은 가시성 그래프 — 가까운 장애물만).
     몸 반지름 0.25 를 더해 잰다. 길이 없으면 곧은 길 하나 (걷다 막히면 그 자리에 선다 — 장면의 걷기가 그렇게 끝낸다) */
  var BODY = 0.25;
  function segPt(ax, az, bx2, bz, px, pz) { var dx = bx2 - ax, dz = bz - az, l = dx * dx + dz * dz, u = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0; return Math.hypot(ax + dx * u - px, az + dz * u - pz); }
  function segBox(ax, az, bx2, bz, b, pad) {   /* 선분이 (pad 만큼 키운) 네모를 지나나 */
    var t0 = 0, t1 = 1, d = [bx2 - ax, bz - az], o = [ax, az], lo = [b[0] - pad, b[1] - pad], hi = [b[2] + pad, b[3] + pad];
    for (var i = 0; i < 2; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] <= lo[i] || o[i] >= hi[i]) return false; continue; }
      var u0 = (lo[i] - o[i]) / d[i], u1 = (hi[i] - o[i]) / d[i]; if (u0 > u1) { var w = u0; u0 = u1; u1 = w; }
      t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 >= t1) return false;
    }
    return true;
  }
  function route(from, to, skip) {   /* skip = 이 원 (s, t 가 같은 것) 은 빼고 잰다 (그 문어 · 걸상 앞에 서는 길) */
    var A = xz(from[0], from[1]), B = xz(to[0], to[1]), CS = [], i, j;
    CIRCLES.forEach(function (c) { if (skip && Math.abs(c[0] - skip[0]) < 1e-6 && Math.abs(c[1] - skip[1]) < 1e-6) return; var q = xz(c[0], c[1]); CS.push([q[0], q[1], c[2] + BODY]); });
    function free(ax, az, bx2, bz) {
      for (var k = 0; k < CS.length; k++) if (segPt(ax, az, bx2, bz, CS[k][0], CS[k][1]) < CS[k][2] - 0.02) return false;
      for (k = 0; k < BOXES.length; k++) if (segBox(ax, az, bx2, bz, BOXES[k], BODY - 0.02)) return false;
      var n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, bz - az) / 0.25));
      for (k = 1; k < n; k++) { var q = st(ax + (bx2 - ax) * k / n, az + (bz - az) * k / n); if (!inWalk(q[0], q[1], -0.02)) return false; }
      return true;
    }
    if (!inWalk(from[0], from[1], -0.3) || free(A[0], A[1], B[0], B[1])) return [to.slice()];
    var N = [A, B], near = function (x, z) { return segPt(A[0], A[1], B[0], B[1], x, z) < 3; };
    CS.forEach(function (c) { if (!near(c[0], c[1])) return; for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4 + Math.PI / 8, r = c[2] + 0.12; N.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } });
    BOXES.forEach(function (b) { if (!near((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)) return; var p = BODY + 0.12; N.push([b[0] - p, b[1] - p], [b[2] + p, b[1] - p], [b[0] - p, b[3] + p], [b[2] + p, b[3] + p]); });
    N = N.filter(function (n, k) { if (k < 2) return true; var q = st(n[0], n[1]); return inWalk(q[0], q[1], 0) && free(n[0], n[1], n[0], n[1]); });
    var D = N.map(function () { return Infinity; }), prev = N.map(function () { return -1; }), done = N.map(function () { return false; }); D[0] = 0;
    for (;;) {
      var u = -1; for (i = 0; i < N.length; i++) if (!done[i] && D[i] < Infinity && (u < 0 || D[i] < D[u])) u = i;
      if (u < 0 || u === 1) break; done[u] = true;
      for (j = 0; j < N.length; j++) { if (done[j]) continue; var w = Math.hypot(N[u][0] - N[j][0], N[u][1] - N[j][1]); if (D[u] + w < D[j] && free(N[u][0], N[u][1], N[j][0], N[j][1])) { D[j] = D[u] + w; prev[j] = u; } }
    }
    if (D[1] === Infinity) return [to.slice()];
    var out = []; for (i = 1; i > 0; i = prev[i]) out.unshift(i === 1 ? to.slice() : st(N[i][0], N[i][1]));
    return out;
  }

  /* 가려 숨길 덩어리 (s 범위) */
  var SEGMENTS = [{ key: 'rowL', s0: 20, s1: 37 }, { key: 'rowR', s0: 20, s1: 38 }, { key: 'street', s0: 17, s1: 38.5 }, { key: 'plaza', s0: 37, s1: 47 }];

  var HATS = ['none', 'beret', 'apron', 'cap'], POSES = ['stand', 'sleep'];
  return { xz: xz, st: st, local: local, at: at, lot: lot, spot: spot, npc: npc, inWalk: inWalk,
    WALK: WALK, LOTS: LOTS, DECK: DECK, STALL: STALL, STAGE: STAGE, PLAZA: PLAZA, CAFE: CAFE, SPOTS: SPOTS, NPCS: NPCS, LAMPS: LAMPS, NLAMP: NLAMP, POTS: POTS, BOARD: BOARD, CIRCLES: CIRCLES, BOXES: BOXES, BENCH: BENCH, route: route, SEGMENTS: SEGMENTS, HATS: HATS, POSES: POSES };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VILLAGE;
