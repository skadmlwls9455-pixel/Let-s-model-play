/* 일주 캐릭터 120개 (60 일주 × 여 · 남) — 펜으로 슥 그린 선 + 마른 붓으로 어긋나게 얹은 칠.
 *
 * 화풍: 선은 일정한 굵기에 손떨림 · 끊김을 남기고, 칠은 몸에만 납작하게 (얼굴은 종이 그대로).
 *       칠은 선에서 살짝 어긋나고(판화처럼), 비스듬한 붓 자국으로 종이가 가늘게 비친다. 그라데이션 · 그림자 없음.
 * 조립: 지지(12) → 동물마다 제 몸 모양 (같은 틀을 돌려 쓰지 않는다)
 *       천간(10) → 몸 색 (갑을 푸른 · 병정 붉은 · 무기 황금 · 경신 흰 · 임계 검은) + 곁에 뜬 작은 표시 하나
 *       성별      → 여: 진주 머리띠 / 남: 목에 두른 수건
 * 좌표: 한 마리는 대략 x -100..100, y -125..100 (바닥 ≈ y 90). 대부분 왼쪽을 본다.
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};
  var D = BJ.draw, G = BJ.ganji;
  var r1 = D.r1;

  var SW = 3.2;     /* 펜선 굵기 (거의 일정) */
  var CREAM = '#FFF8EA';

  /* 천간 색 — 노란 종이 위에서 서로 헷갈리지 않게 */
  var COLORS = { wood: '#6E9BD6', fire: '#E5532F', earth: '#FFE49A', metal: '#FFFCF4', water: '#2E2826' };
  function palette(el, mode, ink, paper) {
    if (mode === 'line') return { body: null, face: paper, ink: ink, paper: paper, eye: ink };
    return { body: COLORS[el] || COLORS.wood, face: CREAM, ink: ink, paper: paper, eye: ink };
  }

  /* ── 손떨림: 일주 · 성별마다 정해진 흔들림 (그릴 때마다 바뀌지 않게) ── */
  function rng(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }
  function jit(rand, pts, amt) {
    return pts.map(function (p) { return [p[0] + (rand() - 0.5) * amt, p[1] + (rand() - 0.5) * amt]; });
  }

  function Pen(c) {
    var rand = rng(c.index * 131 + (c.gender === 'm' ? 7 : 3) + 11), out = [];
    function dash() {   /* 군데군데 끊긴 선 */
      var a = 70 + rand() * 90, b = 3 + rand() * 4, e = 40 + rand() * 80, f = 2 + rand() * 4;
      return ' stroke-dasharray="' + r1(a) + ' ' + r1(b) + ' ' + r1(e) + ' ' + r1(f) + '" stroke-dashoffset="' + r1(rand() * 60) + '"';
    }
    var pen = {
      rand: rand,
      /* 닫힌 몸 조각: fill = 'body' | 'paper' | 'none' | 색, streak = 붓 자국을 넣을 타원 [cx, cy, rx, ry] */
      part: function (pts, fill, opt) {
        opt = opt || {};
        var p = jit(rand, pts, opt.jit == null ? 2.2 : opt.jit), d = D.curve(p, true, opt.tension);
        var col = fill === 'body' ? c.p.body : fill === 'paper' ? c.p.face : fill === 'none' ? null : fill;
        if (col) {
          var off = fill === 'paper' ? [0, 0] : [r1(2 + rand() * 2.5), r1(1 + rand() * 2)];
          out.push('<path d="' + d + '" fill="' + col + '" stroke="none"' + (off[0] ? ' transform="translate(' + off[0] + ' ' + off[1] + ')"' : '') + '/>');
          if (fill === 'body' && opt.streak) streaks(opt.streak, off);
        }
        if (opt.line !== false) out.push('<path d="' + d + '" fill="none" stroke="' + c.p.ink + '" stroke-width="' + SW + '"' + dash() + '/>');
        return pen;
      },
      /* 열린 선 */
      line: function (pts, w, tension) {
        var d = D.curve(jit(rand, pts, 1.6), false, tension);
        out.push('<path d="' + d + '" fill="none" stroke="' + c.p.ink + '" stroke-width="' + (w || SW) + '"/>');
        return pen;
      },
      raw: function (s) { out.push(s); return pen; },
      /* 머리 묶음: 머리는 몸보다 크게 (기준점을 두고 키운다) */
      open: function (h) { out.push('<g transform="translate(' + h[0] + ' ' + h[1] + ') scale(' + h[2] + ') translate(' + (-h[0]) + ' ' + (-h[1]) + ')">'); return pen; },
      close: function () { out.push('</g>'); return pen; },
      dot: function (x, y, r, col) { out.push(D.circle(r1(x + (rand() - 0.5)), r1(y + (rand() - 0.5)), r, col || c.p.eye)); return pen; },
      done: function () { return out.join(''); }
    };
    /* 마른 붓 자국: 칠 위로 종이색 가는 줄이 비스듬히 지나간다 (타원 안에서만 — 몸 밖으로는 나가지 않게) */
    function streaks(e, off) {
      if (!c.p.body) return;
      var n = 4 + Math.floor(rand() * 3), cx = e[0] + +off[0], cy = e[1] + +off[1];
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n * 2 - 1 + (rand() - 0.5) * 0.18, x0 = cx + t * e[2];   /* 세로로 살짝 기운 줄 */
        var h = e[3] * Math.sqrt(Math.max(0, 1 - t * t)) * (0.55 + rand() * 0.4);
        if (h < 6) continue;
        var y0 = cy - h + rand() * h * 0.3, y1 = cy + h - rand() * h * 0.4, k = 0.18;
        out.push('<path d="M' + r1(x0 + (y0 - cy) * k) + ' ' + r1(y0) + 'L' + r1(x0 + (y1 - cy) * k) + ' ' + r1(y1) + '" stroke="' + c.p.paper + '" stroke-width="' + r1(1 + rand() * 1.6) + '" opacity="' + r1(55 + rand() * 40) / 100 + '"/>');
      }
    }
    return pen;
  }

  /* ── 얼굴: 작은 점 눈, 짧은 선 입 (코 · 입은 거의 생략) ── */
  function face(pen, c, f) {
    /* f: { eye:[x,y], eye2:[x,y]?, mouth:[x,y]?, nose:[x,y]? } */
    var shut = c.stem % 3 === 1;   /* 몇몇은 눈을 감은 듯 짧은 선 */
    [f.eye, f.eye2].forEach(function (e) {
      if (!e) return;
      if (shut) pen.line([[e[0] - 3.5, e[1] + 0.5], [e[0], e[1] + 2.2], [e[0] + 3.5, e[1] + 0.5]], 2.4);
      else pen.dot(e[0], e[1], 2.6);
    });
    if (f.nose) pen.dot(f.nose[0], f.nose[1], 2.1);
    if (f.mouth) pen.line([[f.mouth[0] - 3, f.mouth[1]], [f.mouth[0], f.mouth[1] + 1.6], [f.mouth[0] + 3, f.mouth[1]]], 2.2);
    /* 볼: 주색 짧은 빗금 두 개 */
    if (f.cheek && c.mode !== 'line') {
      var x = f.cheek[0], y = f.cheek[1];
      pen.raw('<path d="M' + r1(x - 4) + ' ' + r1(y + 2) + 'l3 -5M' + r1(x + 1) + ' ' + r1(y + 2) + 'l3 -5" stroke="#E86A45" stroke-width="2" opacity=".8"/>');
    }
  }

  /* ── 성별: 여 = 진주 머리띠, 남 = 목에 두른 수건 ── */
  function genderMark(pen, c, a) {
    if (c.gender === 'f') {
      var t = a.band;
      pen.open(a.head);   /* [cx, cy, r, from, to] 머리 윤곽을 따라 진주 */
      for (var i = 0; i < 5; i++) {
        var ang = (t[3] + (t[4] - t[3]) * i / 4) * Math.PI / 180;
        pen.raw(D.circle(r1(t[0] + Math.cos(ang) * t[2]), r1(t[1] + Math.sin(ang) * t[2]), 2.7, CREAM, c.p.ink, 1.8));
      }
      pen.close();
    } else {
      var n = a.neck;   /* [x, y, w, rot] */
      var col = c.mode === 'line' ? c.p.paper : '#FFF2D6';
      pen.raw('<g transform="translate(' + n[0] + ' ' + n[1] + ') rotate(' + (n[3] || 0) + ')">' +
        '<path d="M' + (-n[2]) + ' -4Q0 3 ' + n[2] + ' -4L' + (n[2] - 2) + ' 4Q0 10 ' + (-n[2] + 2) + ' 4Z" fill="' + col + '" stroke="' + c.p.ink + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M' + (n[2] * 0.3) + ' 5l4 11l5 -3l-2 -9" fill="' + col + '" stroke="' + c.p.ink + '" stroke-width="2.4" stroke-linejoin="round"/></g>');
    }
  }

  /* ── 천간 표시: 곁에 뜬 작은 기호 하나 + 반짝 선 두 개 ── */
  function stemMark(pen, c, at) {
    var x = at[0], y = at[1], ink = c.p.ink, acc = c.mode === 'line' ? 'none' : c.p.body, s = '';
    function L(d, w) { return '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="' + (w || 2.4) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
    function F(d, col) { return '<path d="' + d + '" fill="' + col + '" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/>'; }
    var leaf = c.mode === 'line' ? 'none' : '#7FB069', sun = c.mode === 'line' ? 'none' : '#F7A23C';
    switch (c.stem) {
      case 0: s = L('M0 12V-2') + F('M0 -16L9 -1H-9Z', leaf); break;                                     /* 갑: 곧은 나무 */
      case 1: s = F('M0 -4C-6 -14 -14 -6 -4 -1C-14 4 -6 12 0 4C6 12 14 4 4 -1C14 -6 6 -14 0 -4Z', c.mode === 'line' ? 'none' : '#F39A86') + L('M0 4V14'); break; /* 을: 꽃 */
      case 2: s = F('M0 -7A7 7 0 1 1 0 7A7 7 0 1 1 0 -7Z', sun) + L('M0 -13V-11M0 11V13M-13 0H-11M11 0H13M-9 -9L-8 -8M9 9L8 8M9 -9L8 -8M-9 9L-8 8', 2.2); break; /* 병: 해 */
      case 3: s = F('M-4 14V0H4V14Z', CREAM) + F('M0 -2C-5 -7 -2 -11 0 -15C2 -11 5 -7 0 -2Z', sun); break;  /* 정: 촛불 */
      case 4: s = F('M-14 10L-4 -8L2 0L6 -5L14 10Z', leaf); break;                                         /* 무: 산 */
      case 5: s = F('M-9 4H9L6 14H-6Z', '#C98A5A') + L('M0 4V-6') + F('M0 -4C-8 -6 -9 -12 -8 -13C-3 -12 0 -9 0 -4Z', leaf) + F('M0 -6C6 -9 9 -14 8 -15C3 -14 0 -11 0 -6Z', leaf); break; /* 기: 화분 새싹 */
      case 6: s = L('M-8 12L8 -12', 2.6) + L('M-11 5L-1 12') + F('M5 -13L10 -16L9 -9Z', CREAM); break;     /* 경: 칼 */
      case 7: s = F('M0 -12L9 -3L0 12L-9 -3Z', CREAM) + L('M-9 -3H9M-4 -3L0 12M4 -3L0 12', 1.8); break;    /* 신: 보석 */
      case 8: s = L('M-14 0C-10 -6 -6 -6 -3 0C0 6 4 6 7 0C9 -4 12 -5 14 -2', 2.6) + L('M-10 8C-7 4 -4 4 -1 8C2 12 5 12 8 8', 2.2); break; /* 임: 물결 */
      default: s = F('M-6 -10C-10 -3 -10 2 -6 3C-2 2 -2 -3 -6 -10Z', c.mode === 'line' ? 'none' : '#9CC4E8') + F('M6 -2C2 5 2 10 6 11C10 10 10 5 6 -2Z', c.mode === 'line' ? 'none' : '#9CC4E8'); /* 계: 빗방울 */
    }
    pen.raw('<g transform="translate(' + x + ' ' + y + ') rotate(' + r1((pen.rand() - 0.5) * 14) + ')">' + s + '</g>');
    /* 반짝 선 (참고 그림의 ‘ \\ ’ 같은 기척) */
    pen.raw('<path d="M' + (x - 22) + ' ' + (y - 6) + 'l-6 -5M' + (x - 20) + ' ' + (y + 4) + 'l-8 -1" stroke="' + (c.mode === 'line' ? ink : '#E86A45') + '" stroke-width="2.2" stroke-linecap="round"/>');
  }

  /* 네 다리 (서 있는 짐승): 가는 두 선, 발끝은 살짝 열린 채 */
  function leg(pen, x, y0, y1, w, fill) {
    pen.part([[x - w, y0], [x + w, y0], [x + w * 0.8, y1], [x - w * 0.9, y1]], fill || 'body', { jit: 1.4, tension: 0.4 });
  }

  /* ─────────────── 열두 짐승 (제 몸 모양으로) ─────────────── */
  var ANIMALS = {
    rat: function (pen, c) {
      var H = [-36, -28, 1.3];
      pen.line([[38, 78], [72, 84], [92, 62], [84, 40], [70, 46]], SW);                                   /* 긴 꼬리 */
      pen.part([[-18, -6], [24, -16], [48, 18], [46, 62], [30, 88], [-22, 88], [-38, 58], [-34, 18]], 'body', { streak: [8, 40, 30, 40] });
      pen.line([[-30, 42], [-22, 50], [-12, 48]], 2.6);                                                    /* 앞발 */
      pen.open(H);
      pen.part([[-28, -62], [-12, -66], [-6, -52], [-14, -42], [-28, -46]], 'paper');                     /* 귀 */
      pen.open(H);
      pen.part([[-74, -16], [-54, -42], [-28, -52], [-8, -38], [-6, -12], [-28, 0], [-56, -4]], 'paper');  /* 머리 */
      pen.line([[-74, -12], [-90, -18]], 1.8).line([[-74, -8], [-88, -2]], 1.8);
      face(pen, c, { eye: [-44, -26], nose: [-74, -15], cheek: [-36, -12] });
      pen.close();
      return { head: H, band: [-30, -26, 30, 200, 280], neck: [-22, -2, 16, 20], mark: [62, -66] };
    },
    ox: function (pen, c) {
      var H = [-60, -24, 1.25];
      [-34, -16, 36, 54].forEach(function (x, i) { leg(pen, x, 40, 90, 7, i % 2 ? 'body' : 'body'); });
      pen.line([[66, 4], [78, 30], [76, 52]], SW).part([[70, 50], [82, 50], [80, 62], [70, 60]], 'body', { jit: 1 });
      pen.part([[-46, -14], [42, -20], [70, -2], [68, 46], [-38, 50], [-56, 24]], 'body', { streak: [10, 16, 48, 26] });
      pen.open(H);
      pen.line([[-72, -42], [-84, -58], [-80, -72]], SW).line([[-52, -44], [-44, -60], [-48, -72]], SW);  /* 뿔 */
      pen.part([[-92, -6], [-90, -34], [-68, -48], [-46, -42], [-40, -14], [-54, 8], [-82, 10]], 'paper'); /* 머리 */
      pen.part([[-96, -10], [-92, 4], [-72, 8], [-68, -6]], 'paper', { jit: 1 });                         /* 주둥이 */
      pen.dot(-88, -2, 1.8).dot(-78, -1, 1.8);
      face(pen, c, { eye: [-72, -24], eye2: [-54, -26], cheek: [-60, -12] });
      pen.close();
      return { head: H, band: [-66, -24, 24, 205, 320], neck: [-46, 4, 16, -10], mark: [62, -64] };
    },
    tiger: function (pen, c) {
      var H = [-60, -26, 1.25];
      [-40, -22, 34, 52].forEach(function (x) { leg(pen, x, 34, 90, 7); });
      pen.line([[64, 6], [88, -6], [96, -34], [86, -50]], SW);                                            /* 치켜든 꼬리 */
      pen.part([[-52, -6], [40, -14], [66, 4], [62, 40], [-44, 42], [-60, 20]], 'body', { streak: [6, 14, 46, 22] });
      pen.line([[0, -10], [4, 6], [-2, 18]], 2.6).line([[20, -12], [24, 4], [18, 16]], 2.6).line([[40, -10], [44, 6]], 2.6); /* 줄무늬 */
      pen.open(H);
      pen.part([[-80, -54], [-70, -66], [-62, -52]], 'paper', { jit: 1 }).part([[-50, -58], [-38, -64], [-36, -48]], 'paper', { jit: 1 });
      pen.part([[-92, -18], [-86, -48], [-60, -58], [-36, -46], [-32, -18], [-50, 2], [-78, 2]], 'paper');
      pen.line([[-64, -56], [-62, -46]], 2.2).line([[-52, -56], [-54, -46]], 2.2);                        /* 이마 왕 */
      face(pen, c, { eye: [-72, -28], eye2: [-50, -30], nose: [-62, -14], mouth: [-62, -6], cheek: [-80, -12] });
      pen.close();
      return { head: H, band: [-62, -28, 28, 205, 320], neck: [-44, 2, 16, -8], mark: [36, -74] };
    },
    rabbit: function (pen, c) {
      var H = [-28, -30, 1.2];
      pen.part([[-14, -4], [26, -6], [46, 30], [44, 70], [28, 88], [-26, 88], [-38, 56], [-30, 18]], 'body', { streak: [8, 44, 28, 36] });
      pen.part([[38, 58], [54, 52], [58, 68], [44, 76]], c.p.body ? CREAM : 'none', { jit: 1 });          /* 꼬리 */
      pen.line([[-26, 46], [-16, 54], [-6, 52]], 2.6);
      pen.open(H);
      pen.part([[-36, -48], [-46, -96], [-38, -118], [-26, -104], [-22, -52]], 'paper');                  /* 귀 */
      pen.part([[-14, -48], [-6, -100], [6, -114], [10, -96], [0, -48]], 'paper');
      pen.line([[-36, -60], [-37, -92]], 2).line([[-6, -60], [0, -94]], 2);
      pen.part([[-62, -20], [-52, -50], [-24, -56], [-2, -40], [0, -14], [-22, 0], [-50, -2]], 'paper');
      face(pen, c, { eye: [-40, -28], nose: [-60, -18], cheek: [-34, -14] });
      pen.close();
      return { head: H, band: [-30, -26, 30, 205, 300], neck: [-22, 0, 16, 18], mark: [56, -70] };
    },
    dragon: function (pen, c) {
      var H = [-40, -28, 1.25];
      pen.line([[36, 80], [70, 86], [94, 64], [90, 30], [76, 20]], SW + 0.6);                               /* 꼬리 */
      pen.line([[90, 30], [98, 20], [86, 22]], 2.4);
      pen.part([[-16, -8], [26, -18], [50, 16], [48, 62], [32, 88], [-22, 88], [-38, 58], [-32, 16]], 'body', { streak: [8, 40, 30, 40] });
      pen.line([[26, -14], [34, -24], [38, -8], [46, -16], [48, 2], [56, -2], [52, 14]], 2.6, 0.2);           /* 등 비늘 */
      pen.line([[-30, 40], [-20, 50], [-10, 46]], 2.6);
      pen.open(H);
      pen.line([[-40, -50], [-46, -72], [-56, -78]], SW).line([[-46, -66], [-36, -74]], 2.4);                /* 뿔 */
      pen.line([[-22, -50], [-20, -72], [-28, -80]], SW).line([[-20, -66], [-10, -70]], 2.4);
      pen.part([[-86, -24], [-70, -46], [-36, -54], [-10, -40], [-8, -14], [-30, 0], [-64, -6], [-86, -10]], 'paper');
      pen.line([[-86, -14], [-100, -26], [-104, -12]], 1.8);                                                 /* 수염 */
      face(pen, c, { eye: [-44, -30], nose: [-80, -20], cheek: [-36, -16] });
      pen.close();
      pen.close();
      return { head: H, band: [-34, -28, 28, 210, 300], neck: [-22, -2, 16, 18], mark: [64, -64] };
    },
    snake: function (pen, c) {
      var H = [-22, -36, 1.35];
      pen.part([[-62, 78], [-40, 62], [20, 60], [62, 70], [64, 86], [20, 94], [-40, 94]], 'body', { streak: [0, 78, 52, 12] });
      pen.part([[-46, 60], [-24, 44], [24, 42], [50, 52], [46, 66], [10, 70], [-36, 70]], 'body', { streak: [2, 56, 38, 10] });
      pen.part([[-6, 48], [-12, 10], [-30, -16], [-24, -30], [-6, -24], [10, 8], [22, 46]], 'body', { streak: [-2, 10, 10, 30] });
      pen.open(H);
      pen.part([[-52, -36], [-36, -54], [-8, -52], [6, -36], [-4, -20], [-28, -16], [-48, -22]], 'paper');
      pen.line([[-52, -28], [-64, -30], [-70, -24]], 1.8).line([[-64, -30], [-70, -36]], 1.8);              /* 혀 */
      face(pen, c, { eye: [-28, -38], eye2: [-12, -38], cheek: [-20, -26] });
      pen.close();
      return { head: H, band: [-22, -32, 24, 200, 320], neck: [-8, -10, 13, 16], mark: [52, -46] };
    },
    horse: function (pen, c) {
      var H = [-64, -56, 1.3];
      [-32, -16, 30, 46].forEach(function (x) { leg(pen, x, 28, 90, 6); });
      pen.line([[58, 0], [72, 24], [70, 52]], SW).line([[62, 6], [80, 30], [80, 50]], 2.2);                 /* 꼬리 */
      pen.part([[-44, -16], [40, -20], [60, 0], [54, 34], [-40, 36], [-52, 10]], 'body', { streak: [6, 8, 44, 22] });
      pen.part([[-46, -8], [-62, -56], [-48, -68], [-30, -30], [-26, -12]], 'body', { streak: [-44, -36, 8, 22] }); /* 목 */
      pen.line([[-46, -66], [-34, -52], [-30, -40], [-24, -26]], 2.6, 0.4).line([[-40, -60], [-28, -50]], 2.2); /* 갈기 */
      pen.open(H);
      pen.part([[-90, -46], [-70, -72], [-50, -74], [-44, -58], [-62, -40], [-84, -30], [-94, -34]], 'paper');
      pen.part([[-58, -74], [-54, -88], [-48, -74]], 'paper', { jit: 1 });
      face(pen, c, { eye: [-62, -60], nose: [-88, -38], cheek: [-70, -48] });
      pen.close();
      return { head: H, band: [-62, -58, 18, 200, 300], neck: [-46, -34, 13, 60], mark: [44, -64] };
    },
    sheep: function (pen, c) {
      var H = [-52, -18, 1.35];
      [-30, -12, 28, 44].forEach(function (x) { leg(pen, x, 40, 90, 5, 'paper'); });
      var wool = [], n = 16;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2, r = i % 2 ? 1 : 1.13;
        wool.push([10 + Math.cos(a) * 58 * r, 14 + Math.sin(a) * 36 * r]);
      }
      pen.part(wool, 'body', { tension: 1.4, streak: [10, 14, 46, 26] });
      pen.open(H);
      pen.part([[-70, -32], [-52, -44], [-34, -36], [-32, -10], [-46, 6], [-66, 2], [-76, -14]], 'paper');
      pen.line([[-40, -40], [-26, -50], [-18, -38], [-26, -30], [-32, -36]], SW, 0.9);                       /* 말린 뿔 */
      face(pen, c, { eye: [-58, -22], nose: [-72, -10], cheek: [-50, -8] });
      pen.close();
      return { head: H, band: [-52, -18, 24, 200, 290], neck: [-40, 4, 14, -12], mark: [62, -54] };
    },
    monkey: function (pen, c) {
      var H = [-22, -28, 1.15];
      pen.line([[36, 80], [76, 78], [92, 52], [80, 28], [64, 34], [70, 46]], SW);                           /* 꼬리 */
      pen.part([[-26, 0], [24, -2], [40, 34], [36, 78], [16, 90], [-30, 90], [-44, 60], [-38, 24]], 'body', { streak: [0, 46, 30, 36] });
      pen.line([[-36, 30], [-48, 58], [-34, 66]], SW);                                                      /* 팔 */
      pen.open(H);
      pen.part([[-60, -36], [-72, -40], [-70, -22], [-58, -22]], 'paper', { jit: 1 }).part([[16, -36], [28, -40], [26, -22], [14, -22]], 'paper', { jit: 1 });
      pen.part([[-58, -34], [-48, -60], [-22, -66], [2, -56], [14, -30], [4, -4], [-22, 4], [-48, -6]], 'body', { streak: [-22, -50, 22, 10] });
      pen.part([[-46, -28], [-36, -40], [-22, -34], [-8, -40], [2, -26], [-4, -6], [-26, 0], [-44, -10]], 'paper', { jit: 1.2 });
      face(pen, c, { eye: [-32, -26], eye2: [-12, -26], mouth: [-22, -12], cheek: [-40, -16] });
      pen.close();
      return { head: H, band: [-22, -32, 36, 210, 330], neck: [-22, 6, 18, 0], mark: [60, -64] };
    },
    rooster: function (pen, c) {
      var H = [-36, -40, 1.25];
      pen.line([[-10, 66], [-12, 90], [-22, 92]], SW).line([[-12, 90], [-4, 92]], 2.4);
      pen.line([[12, 66], [12, 90], [2, 92]], SW).line([[12, 90], [20, 92]], 2.4);
      pen.part([[34, -6], [60, -40], [82, -30], [76, 0], [60, 24]], 'body', { tension: 0.8 });              /* 꽁지 */
      pen.part([[44, 0], [76, -10], [86, 14], [62, 34]], 'body', { tension: 0.8 });
      pen.part([[-30, -12], [20, -16], [52, 10], [44, 54], [12, 70], [-24, 66], [-42, 34]], 'body', { streak: [4, 26, 32, 30] });
      pen.line([[0, 16], [14, 30], [30, 26]], 2.4);                                                         /* 날개 */
      pen.open(H);
      pen.part([[-50, -64], [-44, -78], [-36, -70], [-28, -80], [-22, -64]], c.mode === 'line' ? 'none' : '#E5532F', { jit: 1 }); /* 볏 */
      pen.part([[-56, -30], [-50, -58], [-26, -66], [-12, -50], [-14, -20], [-30, -8], [-48, -14]], 'paper');
      pen.open(H);
      pen.part([[-56, -40], [-74, -34], [-56, -30]], c.mode === 'line' ? 'none' : '#F7A23C', { jit: 0.6 }); /* 부리 */
      face(pen, c, { eye: [-38, -42], cheek: [-32, -28] });
      pen.close();
      return { head: H, band: [-34, -40, 26, 210, 300], neck: [-26, -10, 16, 12], mark: [56, -76] };
    },
    dog: function (pen, c) {
      var H = [-40, -26, 1.3];
      pen.line([[38, 54], [62, 40], [70, 14]], SW + 0.4);                                                   /* 꼬리 */
      pen.part([[-18, -4], [24, -10], [44, 26], [42, 68], [26, 88], [-26, 88], [-40, 56], [-32, 16]], 'body', { streak: [6, 40, 28, 38] });
      pen.line([[-28, 40], [-26, 88]], 2.4).line([[-10, 44], [-8, 88]], 2.4);
      pen.part([[-74, -16], [-62, -46], [-34, -54], [-10, -42], [-6, -14], [-28, 0], [-58, -2]], 'paper');
      pen.part([[-30, -52], [-12, -50], [-6, -24], [-18, -18]], 'body', { jit: 1.2 });                     /* 처진 귀 */
      face(pen, c, { eye: [-44, -30], nose: [-74, -14], mouth: [-62, -4], cheek: [-46, -14] });
      return { head: H, band: [-38, -28, 28, 205, 285], neck: [-22, 0, 16, 16], mark: [60, -68] };
    },
    pig: function (pen, c) {
      var H = [-56, -20, 1.25];
      [-36, -18, 30, 48].forEach(function (x) { leg(pen, x, 42, 88, 7); });
      pen.line([[64, 10], [76, 4], [74, -8], [66, -2], [72, 8]], 2.6, 0.9);                                  /* 말린 꼬리 */
      var b = [], n = 12;
      for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; b.push([6 + Math.cos(a) * 62, 18 + Math.sin(a) * 34]); }
      pen.part(b, 'body', { streak: [8, 18, 48, 24] });
      pen.part([[-56, -40], [-50, -56], [-40, -42]], 'paper', { jit: 1 });
      pen.part([[-84, -8], [-76, -38], [-50, -46], [-30, -34], [-28, -6], [-46, 10], [-72, 8]], 'paper');
      pen.part([[-92, -18], [-80, -22], [-78, -6], [-90, -4]], 'paper', { jit: 0.8 });                     /* 코 */
      pen.dot(-87, -14, 1.6).dot(-84, -9, 1.6);
      face(pen, c, { eye: [-64, -26], eye2: [-46, -28], cheek: [-58, -10] });
      pen.close();
      return { head: H, band: [-56, -18, 30, 210, 300], neck: [-36, 8, 16, -6], mark: [56, -60] };
    }
  };

  /* ─────────────── 조립 ─────────────── */

  /* 캐릭터 한 마리를 <g> 글자로. opts: { ink, paper, mode:'color'|'line', ground } */
  function render(index, gender, opts) {
    opts = opts || {};
    var info = G.ilju(index);
    var ink = opts.ink || '#C93B22', paper = opts.paper || '#F2BE35', mode = opts.mode === 'line' ? 'line' : 'color';
    var c = { index: info.index, stem: info.stem, branch: info.branch, el: info.el, animal: info.animal, gender: gender === 'm' ? 'm' : 'f', mode: mode, p: palette(info.el, mode, ink, paper) };
    var pen = Pen(c), fn = ANIMALS[c.animal] || ANIMALS.rat;
    if (opts.ground) pen.line([[-70, 93], [-20, 95], [30, 92], [70, 94]], 2);
    var a = fn(pen, c);
    genderMark(pen, c, a);
    stemMark(pen, c, a.mark);
    return '<g class="char" stroke-linecap="round" stroke-linejoin="round">' + pen.done() + '</g>';
  }

  /* 썸네일 · 시트용: 혼자 서는 <svg> (종이색 바탕 포함 — 붓 자국이 바탕과 같은 색이어야 해서) */
  function svg(index, gender, opts) {
    opts = opts || {};
    var vb = opts.viewBox || '-108 -128 216 236';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (opts.size ? ' width="' + opts.size + '"' : '') + '>' +
      '<rect x="-108" y="-128" width="216" height="236" fill="' + (opts.paper || '#F2BE35') + '"/>' +
      (opts.filter ? '<g filter="url(#' + opts.filter + ')">' : '<g>') + render(index, gender, opts) + '</g></svg>';
  }

  /* 이미지 프롬프트에 넣을 캐릭터 설명 */
  function describe(index, gender) {
    var info = G.ilju(index), m = gender === 'm';
    return {
      ko: info.ko + '일주 ' + (m ? '남' : '여') + ' — ' + info.title + ' 캐릭터 (' + info.item.ko + '). ' + (m ? '목에 두른 수건' : '진주 머리띠'),
      en: 'a simple hand-drawn ' + info.colorEn + ' ' + info.animalEn + ' character in loose pen lines with dry flat color (' + (m ? 'wearing a small neckerchief' : 'wearing a pearl headband') + '), ' + info.item.en
    };
  }

  BJ.chars = { render: render, svg: svg, describe: describe, palette: palette, SW: SW };
})();
