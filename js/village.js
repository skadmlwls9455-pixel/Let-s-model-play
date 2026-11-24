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
    { id: 'cafe', name: '카페', s0: 30, s1: 37, t0: 3.5, t1: 10, c: [31.4, 8.95], hx: 1.1, hz: 1.2, mir: true, open: true },
    { id: 'plaza', name: '광장', s0: 38, s1: 46, t0: -8, t1: 8, c: [42, 0], hx: 0, hz: 0, mir: false, open: true }
  ];
  var DECK = { s0: 30, s1: 37, t0: 3.5, t1: 7 };
  var STALL = { lx: 2.5, lz: -0.7, hw: 0.25, hd: 0.65, h: 0.42 };   /* 가게 앞 판매대 (건물 안 좌표) — 문어는 그 뒤 (lx 1.8) */
  var STAGE = { c: [43, 4.4], h: 1.4, y: 0.24 };
  var PLAZA = { board: [40.4, -2.9], well: [42.2, 0], benches: [[42.2, -1.9, 0], [42.2, 1.9, 0], [44.9, -4.6, 1]], nets: [45.2, 6.9], rug: [44.55, 2.85, 0.95] };   /* 광장 것들 (폰 화면 폭 6.7 m 안에 들게 가운데 가까이) · benches 셋째 값 1 = z 축으로 긴 것   /* 광장 무대 (x · z 축 네모, 반폭 h) */
  var CAFE = {
    counter: { s0: 32.8, s1: 34.1, t: 6.6, w: 0.5, h: 0.5 },   /* 테라스의 작은 내주는 대 (주문은 안에서 — 부엌 집 문으로 가는 길을 비워 짧게) */
    shelf: { s: 30.4, t0: 4.4, t1: 6.0, d: 0.4, h: 0.7 },
    tables: [{ s: 33.4, t: 4.7, r: 0.36, h: 0.44 }, { s: 35.7, t: 5.6, r: 0.36, h: 0.44 }],
    stools: [[33.4, 3.95], [33.4, 5.45], [35.7, 4.85], [35.7, 6.35]], stoolR: 0.16, stoolH: 0.3,
    seat: { s: 33.4, t: 3.95, aisle: [32.75, 3.95], face: 3 * Math.PI / 4 },   /* 내 자리: 첫 식탁의 길 쪽 걸상 — 식탁을 옆에 두고 (+t 쪽을 보고) 앉는다. 식탁 뒤에 앉히면 기본 각에서 식탁이 몸을 가렸다 */
    cup: { s: 33.4, t: 4.5 }
  };
  /* 11-24 다섯째 바퀴 (주인: "지금 집이 비어있는데 각 문어들이 살았으면 좋겠어" · 미용실 = 내 캐릭터 머리): 새 터 넷 — 숲길 양옆 집 둘 · 광장 양옆 집 하나와 미용실.
     문은 걷는 곳 가장자리를 본다 (lx 1.45 · lz −0.4 — 서는 자리까지 1.5 m 안). 빈 집 (LOTS 의 empty) 은 sleep-2 의 집. C6 의 터 다섯 (LOTS) 은 그대로 */
  var HOME_LOTS = [
    { id: 'home1', name: '숲길 집', s0: 13.4, s1: 17.4, t0: -7.2, t1: -3.4, c: [15.4, -5.3], hx: 1.3, hz: 1.4, mir: false, open: true, seg: 'homes' },
    { id: 'home4', name: '숲길 건너 집', s0: 13.4, s1: 17.4, t0: 3.4, t1: 7.2, c: [15.4, 5.3], hx: 1.3, hz: 1.4, mir: true, open: true, seg: 'homes' },
    { id: 'home3', name: '광장 집', s0: 39.2, s1: 43.2, t0: 8.4, t1: 12.2, c: [41.2, 10.3], hx: 1.3, hz: 1.4, mir: true, open: true, seg: 'plaza' },
    { id: 'salon', name: '미용실', s0: 39.2, s1: 43.2, t0: -12.2, t1: -8.4, c: [41.2, -10.3], hx: 1.3, hz: 1.4, mir: false, open: true, seg: 'plaza' }
  ];
  function lot(id) { var A = LOTS.concat(HOME_LOTS); for (var i = 0; i < A.length; i++) if (A[i].id === id) return A[i]; return null; }
  function at(id, lx, lz) { var L = lot(id); return local(L.c, L.mir, lx, lz); }

  /* 누르는 자리: key · 단추 id · 이름 (aria-label) · 자리 (s, t, y) · 톡 반지름 r · stand = 내 캐릭터가 가서 서는 자리 (걷는 곳 안) */
  var kc = at('clothes', 1.8, -1.0), kg = at('goods', 1.8, -1.0), rc = at('clothes', 2.35, 1.1), rg = at('goods', 2.35, 1.1);   /* 문어는 판매대의 길 쪽 끝 뒤 · 가게를 누르는 자리는 그 반대쪽 (화면에서 44 px 넘게 떨어지게) */
  var SPOTS = [
    { key: 'shopClothes', btn: 'btn-shop-clothes', label: '옷가게', s: rc[0], t: rc[1], y: 0.7, r: 0.5, stand: [rc[0] + 0.3, -2.15] },
    { key: 'shopGoods', btn: 'btn-shop-goods', label: '잡화점', s: rg[0], t: rg[1], y: 0.5, r: 0.5, stand: [rg[0] + 0.3, 2.15] },
    { key: 'cafeSeat', btn: 'btn-cafe-seat', label: '카페 자리', s: CAFE.seat.s, t: CAFE.seat.t, y: 0.4, r: 0.4, stand: CAFE.seat.aisle.slice() },
    { key: 'cafeLp', btn: 'btn-cafe-lp', label: '레코드', s: 30.4, t: 5.2, y: 0.85, r: 0.45, stand: [31.15, 5.2] },
    { key: 'plazaStage', btn: 'btn-plaza-stage', label: '콘테스트 무대', s: STAGE.c[0], t: STAGE.c[1], y: 0.5, r: 0.9, stand: [STAGE.c[0] + 2.0 * K, STAGE.c[1] - 2.0 * K] },
    { key: 'plazaBoard', btn: 'btn-plaza-board', label: '마을 게시판', s: PLAZA.board[0], t: PLAZA.board[1], y: 1.0, r: 0.6, stand: [PLAZA.board[0] + 0.9, PLAZA.board[1]] },
    { key: 'npcClothes', btn: 'btn-npc-clothes', label: '가게 문어', npc: 'clothes', s: kc[0], t: kc[1], y: 0.5, r: 0.45, stand: [kc[0] + 1.45, -2.15] },
    { key: 'npcGoods', btn: 'btn-npc-goods', label: '가게 문어', npc: 'goods', s: kg[0], t: kg[1], y: 0.5, r: 0.45, stand: [kg[0] + 1.45, 2.15] },
    { key: 'npcCafe', btn: 'btn-npc-cafe', label: '가게 문어', npc: 'cafe', s: 33.45, t: 7.45, y: 0.5, r: 0.45, stand: [33.45, 5.85] }
  ];
  function spot(key) { for (var i = 0; i < SPOTS.length; i++) if (SPOTS[i].key === key || SPOTS[i].btn === key) return SPOTS[i]; return null; }

  /* NPC 문어 자리: face = 보는 쪽 (rad, 0 = +z = 화면 왼쪽 아래 · π/2 = +x = 화면 오른쪽 아래) · y = 올라앉은 높이 (가게 문어는 판매대 뒤 발판 위 — 얼굴이 판매대 위로 보이게).
     가게 문어 셋은 판매대 · 계산대 뒤, 잠든 문어 넷은 마을 문 벤치 · 빈 집 현관 · 바닷가 바위 · 부두 발치 (C6) */
  var sp = at('empty', 1.75, -0.45);
  var NPCS = [
    { id: 'clothes', s: kc[0], t: kc[1], y: 0.3, face: Math.PI / 2, r: 0.3 },
    { id: 'goods', s: kg[0], t: kg[1], y: 0.3, face: 0, r: 0.3 },
    { id: 'cafe', s: 33.45, t: 7.45, y: 0.34, face: 0, r: 0.3 },
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
    for (i = 0; i < 3; i++) CIRCLES.push([c.counter.s0 + 0.25 + i * 0.4, c.counter.t, 0.3]);          /* 내주는 대 (길과 나란한 상자 → 원 셋) */
    for (i = 0; i < 3; i++) CIRCLES.push([c.shelf.s, c.shelf.t0 + 0.3 + i * 0.5, 0.28]);                /* 레코드 선반 */
    c.tables.forEach(function (tb) { CIRCLES.push([tb.s, tb.t, tb.r]); });
    c.stools.forEach(function (q) { CIRCLES.push([q[0], q[1], c.stoolR]); });
    [[30, 3.45], [37, 3.45], [30, 7.05], [37, 7.05]].forEach(function (p) { CIRCLES.push([p[0], p[1], 0.07]); });   /* 덱 기둥 넷 */
    CIRCLES.push([PLAZA.board[0], PLAZA.board[1] - 0.42, 0.22], [PLAZA.board[0], PLAZA.board[1] + 0.42, 0.22]);     /* 게시판 (화면 가로로 선 판) */
    CIRCLES.push([PLAZA.well[0], PLAZA.well[1], 0.95]);       /* 우물 */
    CIRCLES.push([PLAZA.nets[0], PLAZA.nets[1], 0.45]);
    CIRCLES.push([BOARD.s, BOARD.t, BOARD.r]);
    CIRCLES.push([36.95, 3.95, 0.08], [36.95, 4.85, 0.08]);   /* 카페 입구 기둥 둘 */
    CIRCLES.push([STAGE.c[0] + (-2.0 + 0.6) * K, STAGE.c[1] + (-2.0 - 0.6) * K, 0.2]);   /* 콘테스트 포스터 판 */
    CIRCLES.push([STAGE.c[0] + (1.75 + 0.25) * K, STAGE.c[1] + (1.75 - 0.25) * K, 0.12], [STAGE.c[0] + (2.55 + 0.25) * K, STAGE.c[1] + (2.55 - 0.25) * K, 0.12]);   /* 공연장 문의 기둥 둘 */                        /* 그물 · 부표 더미 */
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
      var n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, bz - az) / 0.08));
      for (k = 1; k < n; k++) { var q = st(ax + (bx2 - ax) * k / n, az + (bz - az) * k / n); if (!inWalk(q[0], q[1], -0.02)) return false; }
      return true;
    }
    if (!inWalk(from[0], from[1], -0.3) || free(A[0], A[1], B[0], B[1])) return [to.slice()];
    var N = [A, B], near = function (x, z) { return segPt(A[0], A[1], B[0], B[1], x, z) < 3; };
    CS.forEach(function (c) { if (!near(c[0], c[1])) return; for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4 + Math.PI / 8, r = c[2] + 0.12; N.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } });
    BOXES.forEach(function (b) { if (!near((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)) return; var p = BODY + 0.12; N.push([b[0] - p, b[1] - p], [b[2] + p, b[1] - p], [b[0] - p, b[3] + p], [b[2] + p, b[3] + p]); });
    /* 걷는 곳끼리 만나는 자리 (길 ↔ 덱 · 길 ↔ 광장 …) 와 네모의 안쪽 모서리도 거쳐 갈 점이다 — 없으면 ㄱ 자로 꺾인 길 (광장 → 카페, 덱 → 잡화점) 을 못 찾고 가장자리에 가서 섰다 (검증 11-21) */
    WALK.forEach(function (a, ai) {
      [[a.s0 + 0.15, a.t0 + 0.15], [a.s0 + 0.15, a.t1 - 0.15], [a.s1 - 0.15, a.t0 + 0.15], [a.s1 - 0.15, a.t1 - 0.15]].forEach(function (c) { N.push(xz(c[0], c[1])); });
      WALK.slice(ai + 1).forEach(function (b) {
        var s0 = Math.max(a.s0, b.s0), s1 = Math.min(a.s1, b.s1), t0 = Math.max(a.t0, b.t0), t1 = Math.min(a.t1, b.t1); if (s1 - s0 < 0.04 || t1 - t0 < 0.04) return;
        var ms = (s0 + s1) / 2, mt = (t0 + t1) / 2, long = s1 - s0 > t1 - t0, n = Math.max(1, Math.min(6, Math.round((long ? s1 - s0 : t1 - t0) / 1.2)));
        for (var k = 0; k <= n; k++) { var u = n ? k / n : 0.5; N.push(long ? xz(s0 + 0.15 + (s1 - s0 - 0.3) * u, mt) : xz(ms, t0 + 0.15 + (t1 - t0 - 0.3) * u)); }
      });
    });
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
  var SEGMENTS = [{ key: 'homes', s0: 11, s1: 19.5 }, { key: 'rowL', s0: 20, s1: 37 }, { key: 'rowR', s0: 20, s1: 38 }, { key: 'street', s0: 17, s1: 38.5 }, { key: 'plaza', s0: 37, s1: 47 }];

  /* ── 들어가는 방 (11-21 밤, 주인: "옷가게 맵을 아예 따로 만들고 마네킹에 입혀진 거를 입어보고 살 수 있는" — 계약 C10). 방 좌표 [m]: 원점 = 바닥 가운데 · 바닥 y 0 ·
     뒷벽 = −x · −z (기본 각에서 보이는 두 벽) · 문은 앞벽 (+z). half = 반폭 [hx, hz] · door = 들어와 서는 자리 · face = 그때 보는 쪽 ·
     slots = 이름 붙은 자리 [x, y, z, 보는 쪽] (마네킹 받침 · 문어 · 거울 …: 다른 갈래가 여기에 그리거나 세운다) ·
     spots = 누르는 자리 { key, btn, label, x, y, z, r, stand: [x, z] } · boxes [x0, z0, x1, z1] · circles [x, z, r] = 부딪힘 · lights = 등 둘 ── */
  var HP = Math.PI / 2;
  function mqSpots() { return [0, 1, 2, 3].map(function (i) { var x = -1.2 + i * 1.05; return { key: 'mq' + i, btn: 'btn-mq-' + i, label: ['첫째', '둘째', '셋째', '넷째'][i] + ' 마네킹', x: x, y: 0.95, z: -1.95, r: 0.42, stand: [x, -1.05] }; }); }
  function shelfSpots() { return [0, 1, 2, 3, 4, 5].map(function (i) { var back = i < 3, x = back ? [-1.75, -0.7, 1.95][i] : -2.3, z = back ? -2.1 : -0.95 + (i - 3) * 1.05; return { key: 'shelf' + i, btn: 'btn-shelf-' + i, label: ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'][i] + ' 선반', x: x, y: 0.95, z: z, r: 0.42, stand: back ? [i === 2 ? x - 0.25 : x, -1.3] : [-1.5, z] }; }); }
  var ROOMS = {
    clothes: { name: '옷가게', half: [3.0, 2.6], wallH: 2.2, door: [1.2, 2.0], face: Math.PI, lights: [[-1.4, 1.9, 0.45], [1.6, 1.9, 0.6]],   /* 11-24 리드 검토: 첫째 등은 왼쪽 거울 쪽으로 (가게 문어 얼굴 앞에 줄과 갓이 걸렸다) */
      slots: { mq0: [-1.2, 0.14, -1.95, 0], mq1: [-0.15, 0.14, -1.95, 0], mq2: [0.9, 0.14, -1.95, 0], mq3: [1.95, 0.14, -1.95, 0],
        mirror: [-2.72, 0, 0.9, HP], mirrorStand: [-1.85, 0, 0.9, -HP], counter: [-2.25, 0.56, -1.75, 0], keeper: [-2.6, 0.44, -2.25, Math.PI / 5], fitting: [-2.3, 0, 2.0, HP], exit: [1.2, 0, 2.45, 0] },
      spots: mqSpots().concat([
        { key: 'roomMirror', btn: 'btn-room-mirror', label: '거울', x: -2.72, y: 0.95, z: 0.9, r: 0.5, stand: [-1.85, 0.9] },
        { key: 'roomCounter', btn: 'btn-room-counter', label: '계산대', x: -1.83, y: 0.7, z: -1.75, r: 0.4, stand: [-2.25, -1.2] },   /* 계산대 앞 왼쪽 (옷걸이와 사이) (문어 · 계산대와 한 줄로 겹치지 않게) */
        { key: 'roomKeeper', btn: 'btn-npc-clothes', label: '가게 문어', x: -2.6, y: 1.1, z: -2.25, r: 0.4, stand: [-1.6, -1.2] },
        { key: 'roomExit', btn: 'btn-room-exit', label: '밖으로', x: 1.2, y: 0.5, z: 2.5, r: 0.5, stand: [1.2, 2.0] }]),
      boxes: [[-2.95, -2.0, -1.45, -1.5], [-2.95, -0.95, -2.55, 0.35], [2.0, 0.25, 2.9, 0.95], [-1.5, 2.2, -0.1, 2.55], [-2.95, 0.6, -2.6, 1.2], [-2.95, 1.55, -1.75, 2.55]],
      circles: [[-1.2, -1.95, 0.4], [-0.15, -1.95, 0.4], [0.9, -1.95, 0.4], [1.95, -1.95, 0.4], [2.7, -2.3, 0.22], [2.7, -0.6, 0.18], [2.75, 1.4, 0.15]] },   /* … 화분 · 모자걸이 · 스탠드 등 */
    cafe: { name: '카페', half: [3.2, 2.6], wallH: 2.2, door: [0.5, 2.0], face: Math.PI, lights: [[0.9, 1.9, -0.9], [-1.2, 1.9, 0.8]],
      slots: { keeper: [0.2, 0.3, -2.25, Math.PI / 5], menu: [-1.2, 1.35, -2.54, 0],   /* 카페 문어는 내주는 자리 바로 뒤 (문에서 화면에 든다) */ pickup: [0.55, 0.58, -1.75, 0], counter: [1.3, 0.56, -1.75, 0], table: [-1.6, 0.46, 0.3, 0], seat: [-0.88, 0.3, 0.3, -HP], aisle: [-0.88, 0, 0.95, Math.PI],
        table1: [1.9, 0.46, 0.3, 0], table2: [2.45, 0.46, 1.7, 0], nap: [2.45, 0.3, 1.05, 0], turntable: [-2.82, 0.8, 1.55, HP], lp: [-2.82, 0.45, 0.6, HP], exit: [0.5, 0, 2.45, 0] },
      spots: [
        { key: 'cafeMenu', btn: 'btn-cafe-menu', label: '차림판', x: -1.2, y: 1.35, z: -2.5, r: 0.55, stand: [-1.2, -1.4] },
        { key: 'cafeCounter', btn: 'btn-cafe-counter', label: '카페 주문', x: 0.55, y: 0.75, z: -1.75, r: 0.4, stand: [0.55, -1.05] },
        { key: 'cafeSeat', btn: 'btn-cafe-seat', label: '카페 자리', x: -0.88, y: 0.45, z: 0.3, r: 0.4, stand: [-0.88, 0.95] },
        { key: 'cafeLp', btn: 'btn-cafe-lp', label: '레코드', x: -2.82, y: 0.85, z: 1.1, r: 0.55, stand: [-2.0, 1.1] },
        { key: 'roomKeeper', btn: 'btn-npc-cafe', label: '가게 문어', x: 0.2, y: 1.0, z: -2.25, r: 0.4, stand: [-0.15, -1.1] },
        { key: 'roomExit', btn: 'btn-room-exit', label: '밖으로', x: 0.5, y: 0.5, z: 2.5, r: 0.5, stand: [0.5, 2.0] }],
      boxes: [[-0.2, -2.0, 3.15, -1.5], [-3.15, -0.25, -2.6, 2.2]],
      circles: [[-1.6, 0.3, 0.36], [1.9, 0.3, 0.36], [2.45, 1.7, 0.36], [-0.88, 0.3, 0.16], [-2.2, 0.3, 0.16], [1.9, -0.4, 0.16], [2.62, 0.3, 0.16], [2.45, 1.05, 0.16], [-2.85, -2.25, 0.25], [-2.85, -0.05, 0.2]] },
    goods: { name: '잡화점', half: [2.6, 2.4], wallH: 2.2, door: [1.9, 1.8],   /* 문은 앞벽 오른쪽 (들어서면 계산대의 문어가 화면에 든다) */ face: Math.PI, lights: [[-0.4, 1.9, -0.4], [1.2, 1.9, 0.6]],
      slots: { keeper: [0.45, 0.44, -2.05, Math.PI / 5], counter: [0.75, 0.56, -1.55, 0], scale: [1.25, 0.58, -1.55, 0], exit: [1.9, 0, 2.25, 0],   /* 11-22 리드 검토: 계산대와 문어를 뒷벽 가운데로 (오른쪽 끝이면 360 화면 가장자리에 걸렸다) — 셋째 선반은 오른쪽으로 */
        shelf0: [-1.75, 0, -2.2, 0], shelf1: [-0.7, 0, -2.2, 0], shelf2: [1.95, 0, -2.2, 0], shelf3: [-2.4, 0, -0.95, HP], shelf4: [-2.4, 0, 0.1, HP], shelf5: [-2.4, 0, 1.15, HP] },
      spots: shelfSpots().concat([
        { key: 'roomCounter', btn: 'btn-room-counter', label: '계산대', x: 1.05, y: 0.7, z: -1.55, r: 0.4, stand: [1.05, -0.85] },
        { key: 'roomKeeper', btn: 'btn-npc-goods', label: '가게 문어', x: 0.45, y: 1.0, z: -2.05, r: 0.4, stand: [0.35, -0.85] },
        { key: 'roomExit', btn: 'btn-room-exit', label: '밖으로', x: 1.9, y: 0.5, z: 2.3, r: 0.5, stand: [1.9, 1.8] }]),
      boxes: [[-0.2, -1.8, 1.35, -1.3], [-2.25, -2.35, -0.2, -1.95], [1.45, -2.35, 2.45, -1.95], [-2.55, -1.45, -2.15, 1.65]],
      circles: [[2.35, 0.6, 0.24], [2.4, 1.15, 0.2], [-0.9, 2.0, 0.24], [-0.45, 2.1, 0.24], [0.3, 2.05, 0.15], [-2.25, 2.05, 0.2]] },   /* 통 둘 · 자루 둘 · 물뿌리개 · 화분 */
    /* 공연장 (주인 11-22 00:05: "카페나 콘테스트도 아예 맵을 따로") — 뒷벽 앞의 높인 무대 (0.3 m) 와 방 안으로 뻗은 길 (캣워크), 막, 조명 둘, 길을 보는 심사석 셋, 구경 벤치 둘, 무대 뒤 구석 (옷걸이 · 거울), 벽의 결과판 */
    hall: { name: '공연장', half: [3.5, 3.0], wallH: 2.4, door: [2.6, 2.4], face: Math.PI, lights: [[0, 2.1, -1.2], [1.4, 2.1, 1.9]],   /* 둘째 등은 길 위가 아니라 문 쪽 (길 위에 선 캐릭터 머리를 가렸다) */
      stage: { x0: -2.3, x1: 2.3, z0: -3.0, z1: -1.55, y: 0.3 }, walk: { x0: -0.5, x1: 0.5, z0: -1.55, z1: 0.75, y: 0.3 }, steps: { z0: 0.75, z1: 1.2 },
      slots: { stage: [0, 0.3, -2.2, 0], catwalk: [0, 0.3, 0.4, 0], wait: [-1.6, 0, 1.9, HP], rack: [-2.9, 0, 1.6, HP], rackStand: [-2.1, 0, 1.6, -HP], mirror: [-3.22, 0, 2.45, HP], board: [-3.44, 1.45, -0.2, HP], boardStand: [-2.55, 0, 0.9, -HP],
        judge0: [2.75, 0.3, -0.75, -HP], judge1: [2.75, 0.3, -0.05, -HP], judge2: [2.75, 0.3, 0.65, -HP], table: [2.15, 0.52, -0.05, -HP], exit: [2.6, 0, 2.85, 0] },
      spots: [
        { key: 'hallStage', btn: 'btn-hall-stage', label: '무대', x: 0, y: 0.6, z: 0.9, r: 0.55, stand: [-0.95, 1.55] },
        { key: 'hallRack', btn: 'btn-hall-rack', label: '옷걸이와 거울', x: -2.9, y: 0.9, z: 1.6, r: 0.5, stand: [-2.1, 1.6] },
        { key: 'hallBoard', btn: 'btn-hall-board', label: '결과판', x: -3.44, y: 1.45, z: -0.2, r: 0.55, stand: [-2.55, 0.9] },
        { key: 'roomExit', btn: 'btn-room-exit', label: '밖으로', x: 2.6, y: 0.5, z: 2.9, r: 0.5, stand: [2.6, 2.4] }],
      boxes: [[-2.3, -2.95, -0.5, -1.55], [0.5, -2.95, 2.3, -1.55], [1.9, -1.15, 2.4, 1.05], [-3.3, -1.1, -2.85, 0.35], [-2.5, -1.1, -2.05, 0.35], [-3.45, 1.15, -2.7, 2.05], [-2.65, 2.5, -1.3, 2.85]],   /* … 무대 뒤 옷걸이 · 가림막 */
      circles: [[-1.25, -1.3, 0.14], [1.25, -1.3, 0.14], [2.75, -0.75, 0.2], [2.75, -0.05, 0.2], [2.75, 0.65, 0.2], [-3.22, 2.45, 0.22], [3.15, 1.6, 0.22]] }
  };
  /* 11-24 다섯째 바퀴: 문어 집 넷 (한 틀 — 침대 뒤 왼쪽 · 식탁과 걸상 둘 · 뒷벽 창 · 깔개 · 오른쪽 벽의 '그 문어의 일' 자리) · 미용실.
     look = 그 집의 색과 일 (장면이 읽는다: wall · floor · quilt · trim · job = 'garden' | 'post' | 'shell' | 'fish'). 사는 문어 자리: table (깬 채 걸상) · bed (자는) */
  function homeRoom(name, look) {
    return { name: name, home: true, look: look, half: [2.2, 2.0], wallH: 2.2, door: [1.3, 1.4], face: Math.PI, lights: [[-0.7, 1.9, -0.3], [1.2, 1.9, 0.7]],
      slots: { bed: [-1.45, 0.44, -1.5, HP], table: [-1.55, 0.32, 0.45, HP], tableTop: [-0.85, 0.5, 0.45, 0], job: [1.85, 0, -0.6, -HP], exit: [1.3, 0, 1.85, 0] },
      spots: [{ key: 'roomExit', btn: 'btn-room-exit', label: '밖으로', x: 1.3, y: 0.5, z: 1.9, r: 0.5, stand: [1.3, 1.4] }],
      boxes: [[-2.15, -1.95, -0.75, -1.05], [1.75, -1.75, 2.15, 0.45]],   /* 침대 · 일 자리 선반 (오른쪽 벽) */
      circles: [[-0.85, 0.45, 0.42], [-1.55, 0.45, 0.17], [-0.85, 1.15, 0.17], [-1.75, 1.55, 0.2]] };   /* 식탁 · 걸상 둘 · 화분 */
  }
  ROOMS.home1 = homeRoom('숲길 집', { wall: 'moss', floor: 'woodL', quilt: 'cream', trim: 'woodD', job: 'garden' });
  ROOMS.home2 = homeRoom('빈 집', { wall: 'slateA', floor: 'woodB', quilt: 'rose', trim: 'slateD', job: 'post' });
  ROOMS.home3 = homeRoom('광장 집', { wall: 'sand', floor: 'white', quilt: 'sky', trim: 'woodA', job: 'shell' });
  ROOMS.home4 = homeRoom('숲길 건너 집', { wall: 'blueD', floor: 'woodA', quilt: 'yellow', trim: 'woodD', job: 'fish' });
  /* 미용실: 뒷벽 가운데 큰 거울과 미용 의자 (거울을 본다) · 왼쪽 세면대와 수건 선반 · 오른쪽 머리 색 병 선반 · 앞 오른쪽 기다리는 벤치. 미용사 (npc 'stylist') 는 의자 오른쪽 */
  ROOMS.salon = { name: '미용실', half: [2.4, 2.1], wallH: 2.3, door: [1.5, 1.5], face: Math.PI, lights: [[-0.3, 2.0, -0.6], [1.3, 2.0, 0.9]],
    slots: { chair: [-0.3, 0.5, -1.15, Math.PI], aisle: [-0.3, 0, -0.35, Math.PI], mirror: [-0.3, 1.25, -2.07, 0], keeper: [0.55, 0, -1.2, -HP + 0.3], stylistWork: [0.3, 0, -1.25, -HP], sink: [-1.7, 0.8, -1.75, 0], bottles: [2.15, 1.0, -1.1, -HP], bench: [1.95, 0.4, 0.15, -HP], exit: [1.5, 0, 1.95, 0] },
    spots: [
      { key: 'salonChair', btn: 'btn-salon-chair', label: '미용 의자', x: -0.3, y: 0.8, z: -1.15, r: 0.45, stand: [-0.3, -0.35] },
      { key: 'roomKeeper', btn: 'btn-npc-stylist', label: '미용사 문어', x: 0.55, y: 1.0, z: -1.2, r: 0.4, stand: [0.75, -0.3] },
      { key: 'roomExit', btn: 'btn-room-exit', label: '밖으로', x: 1.5, y: 0.5, z: 2.0, r: 0.5, stand: [1.5, 1.5] }],
    boxes: [[-0.75, -1.5, 0.15, -0.8], [-2.35, -2.05, -1.05, -1.45], [1.95, -1.6, 2.35, -0.6], [1.75, -0.45, 2.15, 0.75]],   /* 의자 · 세면대 · 병 선반 · 벤치 */
    circles: [[0.55, -1.2, 0.28], [-2.05, 1.65, 0.22]] };   /* 미용사 · 화분 */
  var CAFE_DOOR = [36.95, 4.4];   /* 카페 입구: 덱의 앞 (광장 쪽) 가장자리에 선 문틀 — 길을 걸어 내려오면 정면으로 보인다 (리드 검토 11-22) */
  /* 바깥의 가게 문 (들어가는 단추): 건물 안 좌표 (lx, lz) 의 문 앞 → (s, t) */
  var DOORS = (function () {
    var c = at('clothes', 1.45, 0.3), g2 = at('goods', 1.45, 0.3), f = CAFE_DOOR;
    function homeDoor(key, btn, label, room, lotId) {   /* 문 = 앞벽 (빈 집은 현관 마루 끝) · 서는 자리 = 걷는 곳 가장자리 (|t| 를 걷는 곳 반폭 − 0.15 로) */
      var L = lot(lotId), d = lotId === 'empty' ? at(lotId, 2.55, -0.45) : at(lotId, 1.45, -0.4), w = Math.abs(L.c[0] - 15.4) < 3 ? 3 : L.c[0] > 37 ? 8 : 2.2, sg = L.c[1] < 0 ? -1 : 1;
      return { key: key, btn: btn, label: label, room: room, s: d[0], t: d[1], y: 0.7, r: 0.45, stand: [d[0], sg * (w - (w < 3 ? 0.2 : 0.3))], lot: lotId };
    }
    return [
      { key: 'inClothes', btn: 'btn-in-clothes', label: '옷가게 들어가기', room: 'clothes', s: c[0], t: c[1], y: 0.7, r: 0.45, stand: [c[0] + 0.75, -2.15] },
      { key: 'inGoods', btn: 'btn-in-goods', label: '잡화점 들어가기', room: 'goods', s: g2[0], t: g2[1], y: 0.7, r: 0.45, stand: [g2[0] + 0.75, 2.15] },
      { key: 'inCafe', btn: 'btn-in-cafe', label: '카페 들어가기', room: 'cafe', s: f[0], t: f[1], y: 1.0, r: 0.5, stand: [38.35, f[1] - 0.95] },   /* 11-24 리드 검토: 나오면 무대 뒤틀의 왼쪽 기둥 (t 4.4) · 깃발 줄이 몸 앞에 걸리지 않게 왼쪽에 선다 */
      homeDoor('inHome1', 'btn-in-home-1', '숲길 집 들어가기', 'home1', 'home1'), homeDoor('inHome2', 'btn-in-home-2', '빈 집 들어가기', 'home2', 'empty'),
      homeDoor('inHome3', 'btn-in-home-3', '광장 집 들어가기', 'home3', 'home3'), homeDoor('inHome4', 'btn-in-home-4', '숲길 건너 집 들어가기', 'home4', 'home4'),
      homeDoor('inSalon', 'btn-in-salon', '미용실 들어가기', 'salon', 'salon'),
      { key: 'inHall', btn: 'btn-in-hall', label: '공연장 들어가기', room: 'hall', s: STAGE.c[0] + 2.4 * K, t: STAGE.c[1] + 1.9 * K, y: 0.9, r: 0.5, stand: [STAGE.c[0] + 3.3 * K, STAGE.c[1] + 1.0 * K] }];
  })();
  /* 광장 무대 (주말 콘테스트): 기다리는 자리 · 걷는 길 넷 · 심사 자리 셋 · 시상대 넷 — (s, t) */
  /* 콘테스트의 자리 (공연장 방 안 좌표): 기다리는 곳 (무대 뒤 구석) · 걷는 길 넷 (계단 → 길 끝 → 무대 앞 → 무대 가운데) · 심사 자리 셋 · 시상대 넷 (무대 위, y = 바닥에서) · 경쟁 문어가 기다리는 줄 */
  var SHOW = { room: 'hall', wait: [-1.0, -0.35],   /* 11-24 리드 검토: 기다리는 자리를 길 옆 앞쪽으로 — 길의 네 점이 360 화면에 다 들고, 경쟁 문어 쉬는 자리 (뒤쪽 줄) 와 떨어진다 */ path: [[0, 1.35], [0, 0.3], [0, -1.2], [0, -2.1]],
    judges: [[2.75, -0.75, -HP], [2.75, -0.05, -HP], [2.75, 0.65, -HP]], table: [2.15, -0.05],
    podium: [[0, -2.45, 0.66], [-0.8, -2.45, 0.54], [0.8, -2.45, 0.44], [1.6, -2.45, 0.3]], rivals: [[-0.9, 2.45], [-0.2, 2.45], [0.5, 2.45]] };
  var PLAZA_SHOW = (function () { var c = STAGE.c, K2 = Math.SQRT1_2, P = function (dx, dz) { return [c[0] + (dx + dz) * K2, c[1] + (dx - dz) * K2]; }; return { poster: P(-2.0, 0.6), door: P(2.15, 0.25), doorStand: P(2.15, 1.15) }; })();   /* 광장: 포스터 판 · 공연장으로 들어가는 막 드리운 문 (무대 오른쪽) */
  var EXTRA = ['judge0', 'judge1', 'judge2', 'rival0', 'rival1', 'rival2'];   /* 콘테스트 때만 서는 문어 (npcSet 에 올 수 있는 id — 자리는 SHOW, npcPlace 로 옮긴다) */

  /* 문어 집과 시간표 (11-24 주인 결정): 낮 (7 – 17 시) 은 밖 — 지금의 잠든 자리 (NPCS) · 저녁 (17 – 21 시) 은 집 안 식탁 걸상 · 밤 (21 – 7 시) 은 집 안 침대.
     장면의 npcSet 은 sleep-1 ~ 4 에 room · slot 이 없으면 이 시간표를 장면의 시각으로 쓴다. 집에 없을 때 문은 잠기고 '지금은 ○○에 있다' (dayName — 사실만) */
  var HOMES = {
    'sleep-1': { room: 'home1', door: 'inHome1', dayName: '마을 문 벤치' },
    'sleep-2': { room: 'home2', door: 'inHome2', dayName: '집 앞 마루' },
    'sleep-3': { room: 'home3', door: 'inHome3', dayName: '바닷가 바위' },
    'sleep-4': { room: 'home4', door: 'inHome4', dayName: '부두' }
  };
  function where(id, hour) {   /* → { home: false } (밖, NPCS 자리) | { home: true, room, slot, pose } */
    var H = HOMES[id]; if (!H) return null; var h = ((+hour % 24) + 24) % 24;
    if (h >= 7 && h < 17) return { home: false, dayName: H.dayName };
    return h < 21 && h >= 17 ? { home: true, room: H.room, slot: 'table', pose: 'sit' } : { home: true, room: H.room, slot: 'bed', pose: 'sleep' };
  }
  function homeOf(room) { var o = null; Object.keys(HOMES).forEach(function (id) { if (HOMES[id].room === room) o = id; }); return o; }
  function lockedLine(id) { var H = HOMES[id]; return H ? '문이 잠겨 있다. 지금은 ' + H.dayName + '에 있다.' : ''; }
  var HATS = ['none', 'beret', 'apron', 'cap'], POSES = ['stand', 'sleep'];
  return { xz: xz, st: st, local: local, at: at, lot: lot, spot: spot, npc: npc, inWalk: inWalk,
    WALK: WALK, LOTS: LOTS, DECK: DECK, STALL: STALL, STAGE: STAGE, PLAZA: PLAZA, CAFE: CAFE, SPOTS: SPOTS, NPCS: NPCS, LAMPS: LAMPS, NLAMP: NLAMP, POTS: POTS, BOARD: BOARD, CIRCLES: CIRCLES, BOXES: BOXES, BENCH: BENCH, route: route, ROOMS: ROOMS, HOME_LOTS: HOME_LOTS, HOMES: HOMES, where: where, homeOf: homeOf, lockedLine: lockedLine, DOORS: DOORS, CAFE_DOOR: CAFE_DOOR, SHOW: SHOW, PLAZA_SHOW: PLAZA_SHOW, EXTRA: EXTRA, SEGMENTS: SEGMENTS, HATS: HATS, POSES: POSES };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VILLAGE;
