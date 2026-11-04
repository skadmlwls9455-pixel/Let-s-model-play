#!/usr/bin/env node
/*
 * make-placeholders.js — 뽈뽈 문어 플레이스홀더 SVG 생성기 (node, 의존성 없음)
 *
 * 사용법:  node tools/make-placeholders.js
 * 결과:    assets/** 에 SVG 파일들, assets/manifest.json (key → {src, w, h, note})
 *
 * 모든 SVG는 게임의 1x 픽셀 밀도(장면 캔버스 320×240)로 그려지며,
 * shape-rendering="crispEdges" + 정수 좌표로 확대 시 투박한 픽셀처럼 보이게 한다.
 * 나중에 작성자가 같은 크기의 픽셀아트 PNG(블렌더 렌더)로 파일만 바꾼다(docs/ASSETS.md).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

// ---------------------------------------------------------------- palette
// v0 프로토타입 팔레트에서 뽑아 두 테마 사이에서 중립적으로 보이도록 살짝 탈색한 값들.
const P = {
  wood:    '#5a3c1e', // --floor
  wood2:   '#6d4a27',
  wood3:   '#7f5a33',
  woodD:   '#3f2a14',
  woodL:   '#8f6a3f',
  plank:   '#4a3219',
  beam:    '#2f1f0e',
  paper:   '#e5dfd3', // --panel light
  paper2:  '#d9d2c4',
  rim:     '#c5bda8',
  navy:    '#1e2235', // --panel dark
  navy2:   '#252a40',
  night:   '#16182a',
  fg:      '#2a2620',
  muted:   '#7a7262',
  amber:   '#cc8030',
  amberL:  '#f0a040',
  amberD:  '#9a5c14',
  flame:   '#ffd27a',
  rose:    '#9e4858',
  teal:    '#2a6872',
  tealL:   '#3c788e',
  window:  '#bacad8',
  sky:     '#3a4a66',
  skyD:    '#2a3448',
  moss:    '#5f7a3a',
  mossL:   '#7f9a4e',
  mossD:   '#3f5a28',
  cork:    '#b48a5a',
  corkD:   '#8e6a40',
  blanket: '#9e5c58',
  blanket2:'#b87a74',
  glass:   '#8fb8b0',
  // 문어 (DESIGN §7.1 — 빨간 문어 팔레트가 티얼을 대체)
  octBody: '#e8463c',
  octHi:   '#f2a05a',
  octSuck: '#f6c28c',
  octEye:  '#1b1f2e',
  octEyeR: '#fff6ee',
  octMouth:'#8a2a24',
  octDark: '#b8342c',
  // 티얼(v0) — 선택적 보조색으로만
  v0teal:  '#3a7080',
  v0tealL: '#4a7c8e',
};

// ---------------------------------------------------------------- svg helpers
function svg(w, h, body, extra) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"${extra ? ' ' + extra : ''}>\n${body}\n</svg>\n`;
}
function rect(x, y, w, h, fill, more) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${more ? ' ' + more : ''}/>`;
}
function poly(pts, fill, more) {
  return `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${fill}"${more ? ' ' + more : ''}/>`;
}
function circ(cx, cy, r, fill, more) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${more ? ' ' + more : ''}/>`;
}
function ell(cx, cy, rx, ry, fill, more) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${more ? ' ' + more : ''}/>`;
}
function line(x1, y1, x2, y2, stroke, sw, more) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 1}"${more ? ' ' + more : ''}/>`;
}
function g(body, more) { return `<g${more ? ' ' + more : ''}>${body}</g>`; }
function linGrad(id, stops, x1, y1, x2, y2) {
  return `<linearGradient id="${id}" x1="${x1 ?? 0}" y1="${y1 ?? 0}" x2="${x2 ?? 0}" y2="${y2 ?? 1}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') +
    `</linearGradient>`;
}
function radGrad(id, stops, cx, cy, r) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') +
    `</radialGradient>`;
}
// 작은 결정적 PRNG (mulberry32) — 별/빗줄기 배치용
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 픽셀 블록 배열 → rect 들 (chunky)
function px(cells, size, fill, ox, oy) {
  ox = ox || 0; oy = oy || 0;
  return cells.map(([x, y]) => rect(ox + x * size, oy + y * size, size, size, fill)).join('');
}

// ---------------------------------------------------------------- generators
const OUT = {}; // key → { src, w, h, note, body }

function add(key, src, w, h, body, note) {
  OUT[key] = { src, w, h, body, note };
}

// --- bg.room : 2:1 다이메트릭 다락방 모서리 ------------------------------
function genRoom() {
  const W = 320, H = 240;
  // 모서리 세로선 x=160. 바닥 마름모: 왼쪽 벽 바닥선은 (0,120)->(160,200), 오른쪽은 (160,200)->(320,120)
  // 벽 높이 ~ 150. 천장선 왼쭉 (0,-30)->(160,50), 오른쪽 (160,50)->(320,-30)
  let b = '';
  b += `<defs>${linGrad('wallL', [[0, P.wood3], [1, P.wood2]])}${linGrad('wallR', [[0, P.wood2], [1, P.plank]])}${linGrad('floorG', [[0, P.wood], [1, P.woodD]])}</defs>`;
  // 배경(천장 뒤 어둠)
  b += rect(0, 0, W, H, P.beam);
  // 왼쪽 벽
  b += poly([[0, -30], [160, 50], [160, 200], [0, 120]], 'url(#wallL)');
  // 오른쳑 벽
  b += poly([[160, 50], [320, -30], [320, 120], [160, 200]], 'url(#wallR)');
  // 벽 널빤지 선(수평, 2:1 기울기)
  for (let i = 1; i < 6; i++) {
    const yL0 = -30 + i * 25, yL1 = 50 + i * 25;
    b += `<polyline points="0,${yL0} 160,${yL1}" fill="none" stroke="${P.woodD}" stroke-width="1" stroke-opacity=".55"/>`;
    const yR0 = 50 + i * 25, yR1 = -30 + i * 25;
    b += `<polyline points="160,${yR0} 320,${yR1}" fill="none" stroke="${P.woodD}" stroke-width="1" stroke-opacity=".7"/>`;
  }
  // 모서리 기둥
  b += rect(158, 50, 4, 150, P.woodD);
  // 바닥 (마름모; 아래로 삐져나가는 부분은 캔버스에 잘림)
  b += poly([[0, 120], [160, 200], [320, 120], [320, 240], [0, 240]], 'url(#floorG)');
  b += poly([[0, 120], [160, 200], [320, 120], [160, 40 + 240]], P.wood, 'opacity="0"'); // 자리 표시
  // 바닥 널 (2:1 대각선, 두 방향)
  for (let i = -6; i < 14; i++) {
    const x0 = i * 32, y0 = 120 + i * 16 - 8 * 16;
    // 왼쪽 벽과 평행한 널 선: 기울기 +0.5
    b += `<polyline points="${x0},${y0 + 80} ${x0 + 320},${y0 + 80 + 160}" fill="none" stroke="${P.woodD}" stroke-width="1" stroke-opacity=".45"/>`;
  }
  for (let i = -2; i < 12; i++) {
    const x0 = i * 40, y0 = 200 + i * 20;
    b += `<polyline points="${x0},${y0} ${x0 + 320},${y0 - 160}" fill="none" stroke="${P.woodD}" stroke-width="1" stroke-opacity=".25"/>`;
  }
  // 바닥과 벽 접선(밑단 몰딩)
  b += `<polyline points="0,120 160,200 320,120" fill="none" stroke="${P.beam}" stroke-width="3"/>`;
  // 천장 들보 (기울어진, 위쪽)
  b += poly([[0, 8], [320, 8 - 60], [320, 8 - 48], [0, 20]], P.beam);
  b += poly([[0, 20], [320, -40], [320, -36], [0, 24]], P.woodD);
  // 들보 아래 그림자
  b += poly([[0, 24], [320, -36], [320, -20], [0, 40]], P.beam, 'opacity=".35"');
  // 등불 고리 (상단 왼쪽, 등불 위치 ~ (48,40))
  b += rect(47, 14, 2, 10, P.beam);
  // 오른쳑 아래 문틀 (어둠으로 이어짐)
  b += poly([[276, 94], [312, 76], [312, 150], [276, 168]], P.night);
  b += `<polyline points="274,96 274,170" fill="none" stroke="${P.woodD}" stroke-width="4"/>`;
  b += `<polyline points="314,74 314,152" fill="none" stroke="${P.woodD}" stroke-width="4"/>`;
  b += `<polyline points="274,96 314,76" fill="none" stroke="${P.woodD}" stroke-width="4"/>`;
  // 창문 자리 (왼쪽 벽, 72×96 자리; window.* 를 (40,22)에 얹는다) — 살짝 어두운 홈만
  b += poly([[40, 22], [112, 58], [112, 154], [40, 118]], P.woodD, 'opacity=".35"');
  // 전체 비네트
  b += `<defs>${radGrad('vig', [[0.55, '#000000', 0], [1, '#000000', 0.45]], 160, 130, 220)}</defs>`;
  b += rect(0, 0, W, H, 'url(#vig)');
  add('bg.room', 'assets/bg/room.svg', W, H, b,
    '다락방 모서리 배경(2:1 다이메트릭). 창문은 (40,22), 등불 고리는 (48,14), 문틀은 오른쪽 아래.');
}

// --- window.* : 72×96 창틀 + 하늘 ---------------------------------------
function genWindows() {
  const W = 72, H = 96;
  function frame(skyBody, key, note, file) {
    let b = '';
    b += rect(0, 0, W, H, P.woodD);                 // 바깥 틀
    b += rect(4, 4, W - 8, H - 8, P.skyD);          // 하늘 바탕
    b += skyBody;
    // 창살 (십자)
    b += rect(34, 4, 4, H - 8, P.woodD);
    b += rect(4, 46, W - 8, 4, P.woodD);
    // 틀 하이라이트
    b += rect(2, 2, W - 4, 2, P.wood3);
    b += rect(2, 2, 2, H - 4, P.wood3);
    // 창턱
    b += rect(0, H - 8, W, 8, P.wood2);
    b += rect(0, H - 8, W, 2, P.woodL);
    // 유리 반사
    b += rect(8, 8, 2, 30, P.window, 'opacity=".25"');
    b += rect(12, 8, 1, 18, P.window, 'opacity=".2"');
    add(key, file, W, H, b, note);
  }
  // rain
  {
    const r = rng(11);
    let s = `<defs>${linGrad('rainSky', [[0, P.skyD], [1, P.sky]])}</defs>` + rect(4, 4, W - 8, H - 8, 'url(#rainSky)');
    for (let i = 0; i < 26; i++) {
      const x = 5 + Math.floor(r() * 62), y = 5 + Math.floor(r() * 78), l = 5 + Math.floor(r() * 7);
      s += line(x, y, x - 1, y + l, P.window, 1, 'stroke-opacity=".55"');
    }
    frame(s, 'window.rain', '비 오는 창문. 장면 (40,22)에 놓인다. 등불 0~5.', 'assets/window/rain.svg');
  }
  // drizzle
  {
    const r = rng(23);
    let s = `<defs>${linGrad('drzSky', [[0, P.skyD], [1, '#44546e']])}</defs>` + rect(4, 4, W - 8, H - 8, 'url(#drzSky)');
    for (let i = 0; i < 10; i++) {
      const x = 5 + Math.floor(r() * 62), y = 5 + Math.floor(r() * 80), l = 3 + Math.floor(r() * 4);
      s += line(x, y, x, y + l, P.window, 1, 'stroke-opacity=".4"');
    }
    frame(s, 'window.drizzle', '가는 비. 등불 6.', 'assets/window/drizzle.svg');
  }
  // stars
  {
    const r = rng(37);
    let s = `<defs>${linGrad('starSky', [[0, P.night], [1, P.navy2]])}</defs>` + rect(4, 4, W - 8, H - 8, 'url(#starSky)');
    for (let i = 0; i < 14; i++) {
      const x = 6 + Math.floor(r() * 60), y = 6 + Math.floor(r() * 70);
      const big = r() < 0.3;
      s += rect(x, y, 1, 1, P.paper);
      if (big) s += rect(x - 1, y, 1, 1, P.paper, 'opacity=".5"') + rect(x + 1, y, 1, 1, P.paper, 'opacity=".5"') + rect(x, y - 1, 1, 1, P.paper, 'opacity=".5"') + rect(x, y + 1, 1, 1, P.paper, 'opacity=".5"');
    }
    // 작은 달
    s += circ(56, 18, 6, P.paper2) + circ(58, 16, 5, P.navy2);
    frame(s, 'window.stars', '맑은 밤, 별. 등불 7 이후(맑을 때만).', 'assets/window/stars.svg');
  }
}

// --- items ------------------------------------------------------------
function genItems() {
  // moss pot 24×24
  {
    let b = '';
    b += rect(5, 13, 14, 9, P.rose);            // 화분 몸체(테라코타 느낌)
    b += rect(4, 11, 16, 3, '#b86a66');          // 테두리
    b += rect(6, 15, 2, 6, '#7a3a3a', 'opacity=".5"');
    // 이끼 덩어리 (chunky)
    b += px([[2, 0], [3, 0], [4, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2]], 2, P.moss, 4, 4);
    b += px([[2, 0], [3, 0], [1, 1], [2, 1]], 2, P.mossL, 4, 4);
    b += px([[0, 2], [5, 2], [6, 2]], 2, P.mossD, 4, 4);
    b += rect(3, 10, 2, 2, P.mossL) + rect(19, 9, 2, 2, P.moss);
    add('item.moss', 'assets/items/moss.svg', 24, 24, b, '등불 1 — 창턱 위 이끼 화분. 창턱 (64,110) 근처.');
  }
  // crate 56×44 (dimetric box)
  {
    let b = '';
    // 윗면 마름모
    b += poly([[28, 0], [56, 14], [28, 28], [0, 14]], P.woodL);
    // 왼쪽 면
    b += poly([[0, 14], [28, 28], [28, 44], [0, 30]], P.wood);
    // 오른쪽 면
    b += poly([[28, 28], [56, 14], [56, 30], [28, 44]], P.wood2);
    // 판자 선
    b += `<polyline points="0,20 28,34" fill="none" stroke="${P.woodD}" stroke-width="1"/>`;
    b += `<polyline points="0,25 28,39" fill="none" stroke="${P.woodD}" stroke-width="1"/>`;
    b += `<polyline points="28,34 56,20" fill="none" stroke="${P.woodD}" stroke-width="1"/>`;
    b += `<polyline points="28,39 56,25" fill="none" stroke="${P.woodD}" stroke-width="1"/>`;
    b += `<polyline points="14,7 42,21" fill="none" stroke="${P.wood3}" stroke-width="1"/>`;
    // 모서리
    b += `<polyline points="0,14 28,28 56,14" fill="none" stroke="${P.woodD}" stroke-width="1"/>`;
    b += rect(27, 28, 2, 16, P.woodD);
    // 못
    b += rect(4, 18, 1, 1, P.fg) + rect(23, 28, 1, 1, P.fg) + rect(32, 28, 1, 1, P.fg) + rect(51, 18, 1, 1, P.fg);
    add('item.crate', 'assets/items/crate.svg', 56, 44, b, '등불 2 — 바닥 오른쪽 나무 상자. 앵커 crate (214,150) 옆.');
  }
  // candle 16×28
  {
    let b = '';
    b += `<defs>${radGrad('cGlow', [[0, P.flame, 0.6], [1, P.flame, 0]], 8, 8, 8)}</defs>`;
    b += circ(8, 8, 8, 'url(#cGlow)');
    b += rect(5, 12, 6, 14, P.paper);          // 양초 몸
    b += rect(5, 12, 2, 14, P.paper2);
    b += rect(3, 25, 10, 3, P.wood2);           // 받침
    b += rect(3, 25, 10, 1, P.woodL);
    b += rect(7, 10, 2, 2, P.fg);               // 심지
    b += px([[1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [1, 3]], 1, P.amberL, 6, 4);
    b += rect(7, 6, 2, 2, P.flame);
    b += rect(6, 9, 4, 1, P.paper2);           // 흘러내린 초
    add('item.candle', 'assets/items/candle.svg', 16, 28, b, '등불 3 — 상자 위 양초(불꽃 포함). 상자 윗면 중앙에.');
  }
  // blanket 72×36
  {
    let b = '';
    // 납작한 마름모 담요
    b += poly([[36, 2], [70, 19], [36, 34], [2, 19]], P.blanket);
    b += poly([[36, 6], [64, 19], [36, 30], [8, 19]], P.blanket2, 'opacity=".35"');
    // 줄무늬
    for (let i = -2; i <= 2; i++) {
      const dx = i * 8;
      b += `<polyline points="${36 + dx - 20},${19 + dx / 2 - 10 + 10} ${36 + dx + 14},${19 + dx / 2 + 7 - 10 + 10}" fill="none" stroke="${P.paper}" stroke-width="1" stroke-opacity=".35"/>`;
    }
    // 접힌 모서리
    b += poly([[2, 19], [12, 14], [14, 20], [8, 23]], P.blanket2);
    // 가장자리 술
    b += `<polyline points="36,34 70,19" fill="none" stroke="${P.paper}" stroke-width="1" stroke-dasharray="1 2" stroke-opacity=".5"/>`;
    add('item.blanket', 'assets/items/blanket.svg', 72, 36, b, '등불 4 — 바닥 왼쪽 담요(문어 잠자리). 앵커 blanket (120,186).');
  }
  // board 110×80 (코르크 보드, 오른쪽 벽에 걸림 — 2:1 기울기)
  {
    let b = '';
    // 오른쪽 벽에 붙은 평행사변형: 왼쪽 위 (0,27) 오른쭉 위 (110,0)? 2:1 → 110 넓이에 55 높이 차. 세로 60.
    // 간단히: 앞면이 보이도록 살짝만 기울인다 (2:1 → 110×55 가 너무 큼). 20px 기울기 사용.
    b += poly([[0, 20], [110, 0], [110, 60], [0, 80]], P.woodD);                 // 틀
    b += poly([[4, 22], [106, 4], [106, 57], [4, 76]], P.cork);                  // 코르크
    // 코르크 점박이
    const r = rng(5);
    for (let i = 0; i < 70; i++) {
      const x = 5 + Math.floor(r() * 100);
      const ymin = 22 - (x / 110) * 18 + 2, ymax = 76 - (x / 110) * 18 - 2;
      const y = Math.floor(ymin + r() * (ymax - ymin));
      b += rect(x, y, 1, 1, r() < 0.5 ? P.corkD : '#c99c68', 'opacity=".7"');
    }
    // 틀 하이라이트
    b += `<polyline points="0,20 110,0" fill="none" stroke="${P.wood3}" stroke-width="2"/>`;
    b += `<polyline points="0,20 0,80" fill="none" stroke="${P.wood3}" stroke-width="1"/>`;
    // 핀 두 개
    b += rect(14, 28, 2, 2, P.rose) + rect(92, 14, 2, 2, P.teal);
    add('item.board', 'assets/items/board.svg', 110, 80, b, '등불 5 — 코르크 보드(오른쪽 벽). 포스터 썸네일이 이 위에 붙는다. 앵커 board (244,112) 위쪽.');
  }
  // shelf 64×20
  {
    let b = '';
    b += poly([[0, 6], [64, 0], [64, 6], [0, 12]], P.woodL);     // 윗면
    b += poly([[0, 12], [64, 6], [64, 12], [0, 18]], P.wood);    // 앞면
    b += `<polyline points="0,12 64,6" fill="none" stroke="${P.woodD}" stroke-width="1"/>`;
    b += rect(6, 14, 2, 6, P.woodD) + rect(54, 10, 2, 6, P.woodD); // 받침대
    add('item.shelf', 'assets/items/shelf.svg', 64, 20, b, '등불 7 — 선반. 기념품(souvenir.*)이 위에 놓인다.');
  }
  // curtain 80×40
  {
    let b = '';
    b += rect(0, 0, 80, 3, P.woodD);                         // 봉
    b += rect(0, 0, 2, 3, P.woodL) + rect(78, 0, 2, 3, P.woodL);
    // 두 장 (주름)
    for (let s = 0; s < 2; s++) {
      const ox = s === 0 ? 2 : 48;
      for (let i = 0; i < 5; i++) {
        b += rect(ox + i * 6, 3, 6, 37, i % 2 ? P.teal : P.tealL);
      }
      // 밑단 물결
      for (let i = 0; i < 5; i++) b += rect(ox + i * 6 + 2, 38, 2, 2, P.teal);
    }
    // 묶음 끈
    b += rect(14, 26, 8, 2, P.amber) + rect(58, 26, 8, 2, P.amber);
    add('item.curtain', 'assets/items/curtain.svg', 80, 40, b, '등불 8 — 창가 커튼 두 장. 창문 (40,22) 위에 겹친다.');
  }
}

// --- light.lantern0..8 : 320×240 오버레이 --------------------------------
function genLights() {
  for (let lv = 0; lv <= 8; lv++) {
    let b = '';
    if (lv === 0) {
      // 완전 투명 — 빈 그룹만
      b += '<g/>';
    } else {
      const r = 60 + lv * 22;                  // 82 .. 236
      const a = 0.18 + lv * 0.05;              // .23 .. .58
      b += `<defs>${radGrad('glow', [[0, P.amberL, Math.min(0.85, a + 0.15)], [0.45, P.amber, a * 0.6], [1, P.amber, 0]], 48, 40, r)}</defs>`;
      b += rect(0, 0, 320, 240, 'url(#glow)');
    }
    add(`light.lantern${lv}`, `assets/light/lantern${lv}.svg`, 320, 240, b,
      lv === 0 ? '등불 0 — 완전 투명 오버레이.' : `등불 ${lv} — (48,40)에서 퍼지는 호박색 빛. mix-blend-mode: screen 권장.`);
  }
}

// --- lantern.off / on : 24×36 -------------------------------------------
function genLantern() {
  function body(on) {
    let b = '';
    if (on) {
      b += `<defs>${radGrad('lg', [[0, P.flame, 0.55], [1, P.flame, 0]], 12, 20, 14)}</defs>`;
      b += circ(12, 20, 14, 'url(#lg)');
    }
    b += rect(11, 0, 2, 4, P.fg);                       // 고리
    b += rect(8, 4, 8, 3, P.fg);                        // 뚜껑
    b += rect(6, 7, 12, 2, P.fg);
    b += rect(6, 9, 12, 18, on ? P.amber : P.navy2);    // 유리
    b += rect(8, 11, 8, 14, on ? P.amberL : P.navy);
    if (on) {
      b += rect(11, 14, 2, 8, P.flame);
      b += rect(10, 16, 4, 4, P.flame, 'opacity=".7"');
    } else {
      b += rect(11, 18, 2, 4, P.muted);                  // 꺼진 심지
    }
    b += rect(6, 9, 1, 18, P.fg) + rect(17, 9, 1, 18, P.fg) + rect(11, 9, 2, 18, P.fg, 'opacity=".5"');
    b += rect(6, 27, 12, 3, P.fg);                      // 바닥
    b += rect(9, 30, 6, 2, P.fg);
    b += rect(10, 32, 4, 4, P.fg, 'opacity=".6"');
    return b;
  }
  add('lantern.off', 'assets/lantern/off.svg', 24, 36, body(false), '꺼진 등불(등불 0). 고리 (48,14)에 매달림.');
  add('lantern.on', 'assets/lantern/on.svg', 24, 36, body(true), '켜진 등불(등불 1 이상).');
}

// --- souvenir.* : 16×16 ------------------------------------------------
function genSouvenirs() {
  const S = {
    feather: () => px([[8, 1], [7, 2], [8, 2], [9, 2], [6, 3], [7, 3], [8, 3], [9, 3], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [5, 5], [6, 5], [7, 5], [8, 5], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [4, 7], [5, 7], [6, 7], [7, 7], [3, 8], [4, 8], [5, 8], [6, 8], [3, 9], [4, 9], [5, 9], [2, 10], [3, 10], [4, 10], [2, 11], [3, 11], [1, 12], [2, 12], [1, 13], [0, 14]], 1, P.paper)
      + px([[8, 2], [7, 4], [6, 6], [5, 8], [4, 10], [3, 12], [2, 13], [1, 14]], 1, P.muted),
    shell: () => px([[6, 3], [7, 3], [8, 3], [9, 3], [4, 4], [5, 4], [10, 4], [11, 4], [3, 5], [12, 5], [2, 6], [13, 6], [2, 7], [13, 7], [3, 8], [12, 8], [4, 9], [11, 9], [5, 10], [10, 10], [6, 11], [9, 11], [7, 12], [8, 12]], 1, P.rose)
      + px([[5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [6, 10], [7, 10], [8, 10], [9, 10], [7, 11], [8, 11]], 1, '#e8c8bc')
      + px([[7, 5], [6, 7], [8, 7], [7, 9], [5, 6], [9, 6], [10, 8], [4, 8]], 1, P.rose),
    pebble: () => ell(8, 9, 6, 4, '#6a6a72') + ell(7, 8, 4, 2, '#8a8a92') + rect(5, 7, 2, 1, '#a0a0a8'),
    button: () => circ(8, 8, 6, P.teal) + circ(8, 8, 5, P.tealL) + rect(6, 6, 1, 1, P.fg) + rect(9, 6, 1, 1, P.fg) + rect(6, 9, 1, 1, P.fg) + rect(9, 9, 1, 1, P.fg) + rect(5, 5, 1, 1, P.paper, 'opacity=".6"'),
    leaf: () => px([[12, 2], [11, 3], [12, 3], [10, 4], [11, 4], [12, 4], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [3, 10], [4, 10], [5, 10], [6, 10], [3, 11], [4, 11], [2, 12], [3, 12], [1, 13]], 1, P.amber)
      + px([[11, 3], [10, 5], [9, 6], [8, 7], [7, 8], [6, 9], [5, 10], [4, 11], [3, 12], [2, 13], [1, 14]], 1, P.amberD),
    marble: () => `<defs>${radGrad('mb', [[0, '#b8e0ea'], [0.6, P.tealL], [1, P.teal]], 7, 7, 6)}</defs>` + circ(8, 8, 6, 'url(#mb)') + rect(5, 5, 2, 2, P.paper, 'opacity=".8"') + rect(7, 9, 3, 1, P.rose, 'opacity=".6"') + rect(9, 7, 1, 3, P.rose, 'opacity=".6"'),
    yarn: () => circ(8, 9, 6, P.rose) + circ(7, 8, 5, '#b86a76') + `<path d="M3 9 Q8 5 13 9 M3 10 Q8 13 13 10 M8 3 Q5 9 8 15" fill="none" stroke="${P.rose}" stroke-width="1"/>` + rect(12, 2, 3, 1, P.rose) + rect(14, 1, 1, 2, P.rose),
    stamp: () => rect(2, 2, 12, 12, P.paper) + `<rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="${P.paper2}" stroke-width="1" stroke-dasharray="1 1"/>` + rect(4, 4, 8, 8, P.teal) + rect(6, 6, 4, 3, P.amberL) + rect(5, 9, 6, 2, P.tealL),
    matchbox: () => rect(2, 5, 12, 8, P.amberD) + rect(2, 5, 12, 2, P.amber) + rect(4, 8, 8, 3, P.paper) + rect(6, 9, 4, 1, P.rose) + rect(1, 2, 1, 4, P.paper2) + rect(1, 1, 1, 1, P.rose) + rect(3, 2, 1, 4, P.paper2) + rect(3, 1, 1, 1, P.rose),
    key: () => circ(5, 6, 4, P.amber) + circ(5, 6, 2, P.woodD) + rect(8, 5, 7, 2, P.amber) + rect(12, 7, 1, 2, P.amber) + rect(14, 7, 1, 3, P.amber) + rect(4, 3, 2, 1, P.amberL),
    pinecone: () => px([[7, 1], [8, 1], [6, 2], [9, 2], [5, 3], [7, 3], [8, 3], [10, 3], [4, 4], [6, 4], [9, 4], [11, 4], [4, 5], [5, 5], [7, 5], [8, 5], [10, 5], [11, 5], [3, 6], [6, 6], [9, 6], [12, 6], [3, 7], [4, 7], [5, 7], [7, 7], [8, 7], [10, 7], [11, 7], [12, 7], [4, 8], [6, 8], [9, 8], [11, 8], [4, 9], [5, 9], [7, 9], [8, 9], [10, 9], [11, 9], [5, 10], [6, 10], [9, 10], [10, 10], [6, 11], [7, 11], [8, 11], [9, 11], [7, 12], [8, 12]], 1, P.wood) + px([[7, 3], [6, 4], [8, 5], [5, 7], [9, 8], [7, 9], [6, 10], [8, 11]], 1, P.woodL) + rect(7, 13, 2, 2, P.woodD),
    paper_boat: () => poly([[1, 10], [15, 10], [12, 14], [4, 14]], P.paper) + poly([[8, 2], [12, 10], [4, 10]], P.paper2) + rect(8, 2, 1, 8, P.rim) + `<polyline points="1,10 15,10" fill="none" stroke="${P.rim}" stroke-width="1"/>`,
    bell: () => rect(7, 1, 2, 2, P.amberD) + px([[7, 3], [8, 3], [6, 4], [7, 4], [8, 4], [9, 4], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [12, 10]], 1, P.amber) + rect(3, 11, 10, 1, P.amberD) + rect(7, 12, 2, 2, P.amberD) + rect(6, 5, 1, 4, P.amberL),
    map_piece: () => poly([[2, 3], [13, 2], [14, 12], [3, 14]], P.paper2) + `<path d="M4 6 Q7 8 6 11 M9 4 Q10 8 12 10" fill="none" stroke="${P.teal}" stroke-width="1"/>` + rect(7, 7, 1, 1, P.rose) + rect(10, 11, 1, 1, P.rose) + `<path d="M4 5 L5 4 M12 4 L12 5" stroke="${P.muted}" stroke-width="1"/>`,
    chalk: () => `<g transform="translate(8 8) rotate(-35)">${rect(-6, -2, 12, 4, P.paper)}${rect(-6, -2, 12, 1, '#ffffff')}${rect(-6, 1, 12, 1, P.rim)}${rect(5, -2, 1, 4, P.paper2)}</g>` + rect(2, 13, 3, 1, P.rim, 'opacity=".6"'),
    stained_glass: () => poly([[3, 3], [12, 2], [14, 9], [8, 14], [2, 10]], P.glass, 'opacity=".9"') + poly([[5, 4], [10, 4], [8, 8]], '#c8ecea', 'opacity=".7"') + `<polygon points="3,3 12,2 14,9 8,14 2,10" fill="none" stroke="${P.teal}" stroke-width="1"/>`,
  };
  const NAMES = {
    feather: '깃털', shell: '조개', pebble: '조약돌', button: '단추', leaf: '나뭇잎', marble: '유리구슬', yarn: '실뭉치', stamp: '우표',
    matchbox: '성냥갑', key: '열쇠', pinecone: '솔방울', paper_boat: '종이배', bell: '작은 종', map_piece: '지도 조각', chalk: '분필', stained_glass: '색유리',
  };
  for (const id of Object.keys(S)) {
    add(`souvenir.${id}`, `assets/souvenirs/${id}.svg`, 16, 16, S[id](), `기념품 — ${NAMES[id]}. 선반/창턱에 놓이고 포스터 스티커로도 쓸 수 있다.`);
  }
}

// --- scene.* : 108×144 포스터 배경 --------------------------------------
function genScenes() {
  const W = 108, H = 144;
  // 상단 ~35%(0..50), 하단 ~25%(108..144)는 그라디언트만. 도형은 y 52..106 사이에.
  const defs = {
    hands:   [['#e2d6c2', '#c9b59a'], (b) => b
      + rect(20, 70, 68, 28, P.wood2, 'opacity=".75"')              // 탁자
      + rect(20, 70, 68, 3, P.woodL, 'opacity=".8"')
      + rect(36, 58, 14, 12, P.rose, 'opacity=".7"')                 // 실뭉치 상자
      + circ(66, 64, 6, P.teal, 'opacity=".7"')],                    // 단추
    sea:     [['#aac6cc', '#4f8590'], (b) => b
      + `<path d="M0 84 Q14 76 27 84 T54 84 T81 84 T108 84 V106 H0Z" fill="${P.teal}" opacity=".55"/>`
      + `<path d="M0 92 Q14 86 27 92 T54 92 T81 92 T108 92 V106 H0Z" fill="${P.teal}" opacity=".45"/>`
      + poly([[40, 60], [54, 54], [68, 60], [54, 66]], P.paper, 'opacity=".8"')],   // 조개/빛
    sky:     [['#c8d6e6', '#7f98b8'], (b) => b
      + ell(34, 66, 18, 8, P.paper, 'opacity=".85"') + ell(46, 62, 12, 8, P.paper, 'opacity=".85"')
      + ell(74, 86, 16, 7, P.paper, 'opacity=".6"')
      + rect(60, 58, 2, 2, P.paper) + rect(86, 66, 1, 1, P.paper)],
    signs:   [['#e6dccc', '#b9a98f'], (b) => b
      + rect(24, 56, 60, 48, P.paper, 'opacity=".9"')                 // 종이
      + rect(24, 56, 60, 48, 'none', `stroke="${P.rim}" stroke-width="1"`)
      + rect(32, 66, 44, 2, P.muted, 'opacity=".6"') + rect(32, 74, 36, 2, P.muted, 'opacity=".5"')
      + rect(32, 82, 40, 2, P.muted, 'opacity=".5"') + rect(32, 90, 24, 2, P.muted, 'opacity=".4"')
      + rect(70, 92, 8, 8, P.rose, 'opacity=".8"')],                  // 도장
    numbers: [['#e3dfd6', '#9ea4ac'], (b) => b
      + `<polygon points="54,54 86,104 22,104" fill="none" stroke="${P.teal}" stroke-width="2" opacity=".7"/>`
      + `<circle cx="54" cy="84" r="16" fill="none" stroke="${P.amber}" stroke-width="2" opacity=".7"/>`
      + rect(40, 70, 28, 28, 'none', `stroke="${P.rose}" stroke-width="2" opacity=".6"`)],
    sounds:  [['#dcd4e4', '#8a7ca0'], (b) => b
      + `<path d="M8 80 Q20 60 32 80 T56 80 T80 80 T104 80" fill="none" stroke="${P.paper}" stroke-width="2" opacity=".8"/>`
      + `<path d="M8 90 Q20 78 32 90 T56 90 T80 90 T104 90" fill="none" stroke="${P.paper}" stroke-width="1" opacity=".5"/>`
      + rect(50, 56, 3, 22, P.fg, 'opacity=".55"') + ell(47, 79, 5, 3, P.fg, 'opacity=".55"')],   // 음표
    home:    [['#e9dccb', '#a97a52'], (b) => b
      + poly([[54, 54], [92, 76], [16, 76]], P.wood2, 'opacity=".85"')  // 지붕
      + rect(24, 76, 60, 30, P.paper2, 'opacity=".9"')
      + rect(46, 86, 16, 20, P.woodD, 'opacity=".8"')                   // 문
      + rect(30, 82, 10, 10, P.amberL, 'opacity=".9"') + rect(68, 82, 10, 10, P.amberL, 'opacity=".9"')],
    mind:    [['#ddd6e8', '#5a5a86'], (b) => b
      + circ(54, 80, 22, P.paper, 'opacity=".25"') + circ(54, 80, 14, P.paper, 'opacity=".35"')
      + circ(54, 80, 6, P.paper, 'opacity=".8"')
      + rect(30, 60, 2, 2, P.paper, 'opacity=".9"') + rect(80, 96, 2, 2, P.paper, 'opacity=".7"') + rect(84, 58, 1, 1, P.paper)],
    wild:    [['#dfe3cf', '#6f8a5a'], (b) => b
      + `<path d="M0 100 Q27 84 54 100 T108 100 V106 H0Z" fill="${P.moss}" opacity=".7"/>`
      + rect(30, 70, 2, 30, P.mossD, 'opacity=".7"') + rect(70, 64, 2, 36, P.mossD, 'opacity=".7"')
      + circ(31, 66, 6, P.mossL, 'opacity=".9"') + circ(71, 60, 7, P.mossL, 'opacity=".9"')
      + `<text x="54" y="96" font-family="monospace" font-size="18" text-anchor="middle" fill="${P.paper}" opacity=".9">?</text>`],
  };
  for (const key of Object.keys(defs)) {
    const [[c0, c1], draw] = defs[key];
    let b = `<defs>${linGrad('sg', [[0, c0], [1, c1]])}</defs>` + rect(0, 0, W, H, 'url(#sg)');
    b = draw(b);
    // 종이 질감 미세 점
    const r = rng(key.length * 97);
    for (let i = 0; i < 40; i++) {
      b += rect(Math.floor(r() * W), Math.floor(r() * H), 1, 1, '#000000', 'opacity=".05"');
    }
    add(`scene.${key}`, `assets/scenes/${key}.svg`, W, H, b,
      `포스터 배경 — ${key}. 위 35%·아래 25%는 스티커/글자 자리로 비워 둠.`);
  }
}

// --- oct.* : 48×48 문어 단일 프레임 --------------------------------------
function genOctopus() {
  const W = 48, H = 48;
  function octo(opts) {
    const { eyes = 'open', armsDown = true, carry = false, bob = 0, blush = false, zz = false, peek = false } = opts;
    let b = '';
    const cy = 20 + bob;
    // 다리 8개 (짧고 통통한 2x 픽셀 블록)
    const arms = armsDown
      ? [[8, 32], [13, 34], [19, 35], [25, 35], [30, 34], [36, 32], [5, 28], [40, 28]]
      : [[7, 30], [13, 35], [19, 33], [25, 35], [30, 33], [37, 30], [4, 26], [41, 26]];
    arms.forEach(([x, y], i) => {
      const len = 6 + (i % 2) * 2;
      b += rect(x, y - 4, 5, len, P.octBody);
      b += rect(x, y - 4 + len - 2, 5, 2, P.octDark);
      b += rect(x + 1, y - 4 + len - 1, 1, 1, P.octSuck) + rect(x + 3, y - 4 + len - 1, 1, 1, P.octSuck);
    });
    // 몸 (살짝 눌린 원)
    b += ell(24, cy + 6, 16, 14, P.octBody);
    b += ell(24, cy + 6, 16, 14, 'none', `stroke="${P.octDark}" stroke-width="1"`);
    // 하이라이트(왼쪽 위 주황 + 흰 점)
    b += ell(16, cy - 2, 6, 4, P.octHi, 'opacity=".9"');
    b += rect(13, cy - 4, 2, 2, P.octEyeR);
    // 눈
    if (eyes === 'open' || eyes === 'wide') {
      const r = eyes === 'wide' ? 4 : 3;
      b += circ(18, cy + 6, r + 1, P.octEyeR) + circ(30, cy + 6, r + 1, P.octEyeR);
      b += circ(18, cy + 6, r - 1, P.octEye) + circ(30, cy + 6, r - 1, P.octEye);
      b += rect(17, cy + 4, 1, 1, P.octEyeR) + rect(29, cy + 4, 1, 1, P.octEyeR);
    } else if (eyes === 'closed') {
      b += rect(15, cy + 6, 6, 1, P.octEye) + rect(27, cy + 6, 6, 1, P.octEye);
    } else if (eyes === 'happy') {
      b += `<path d="M15 ${cy + 7} Q18 ${cy + 3} 21 ${cy + 7}" fill="none" stroke="${P.octEye}" stroke-width="1.5"/>`;
      b += `<path d="M27 ${cy + 7} Q30 ${cy + 3} 33 ${cy + 7}" fill="none" stroke="${P.octEye}" stroke-width="1.5"/>`;
    }
    // 입
    b += rect(23, cy + 12, 3, 1, P.octMouth);
    if (blush) b += rect(13, cy + 10, 3, 1, P.octHi) + rect(32, cy + 10, 3, 1, P.octHi);
    if (carry) {
      // 들고 있는 포스터
      b += rect(31, 22, 14, 18, P.paper) + rect(31, 22, 14, 18, 'none', `stroke="${P.rim}" stroke-width="1"`);
      b += rect(34, 26, 8, 6, P.tealL, 'opacity=".6"') + rect(34, 34, 6, 1, P.muted);
      b += rect(36, 21, 4, 2, P.amberL, 'opacity=".8"'); // 테이프
    }
    if (zz) {
      b += `<text x="40" y="12" font-family="monospace" font-size="8" fill="${P.muted}">z</text>`;
      b += `<text x="43" y="7" font-family="monospace" font-size="6" fill="${P.muted}">z</text>`;
    }
    if (peek) {
      // 문틀 뒤에서 반만 보임: 오른쭉 절반을 어둠으로 덮는다
      b += rect(26, 0, 22, 48, P.night);
      b += rect(25, 0, 1, 48, P.woodD);
    }
    return b;
  }
  const frames = {
    idle:  [octo({}), '대기(숨쉬기). 앵커에서 서 있음.'],
    walk:  [octo({ armsDown: false, bob: -1 }), '걷기(좌우 미러해서 사용).'],
    carry: [octo({ armsDown: false, carry: true }), '포스터 들고 걷기(door→board).'],
    sleep: [octo({ eyes: 'closed', bob: 3, zz: true }), '잠(색 순환은 CSS hue-rotate로).'],
    happy: [octo({ eyes: 'happy', bob: -3, blush: true, armsDown: false }), '폴짝/우쭐 반응.'],
    peek:  [octo({ eyes: 'wide', peek: true }), '문틀 뒤에서 기웃.'],
  };
  for (const k of Object.keys(frames)) {
    add(`oct.${k}`, `assets/oct/${k}.svg`, W, H, frames[k][0],
      `문어 단일 프레임 — ${frames[k][1]} 앱은 인라인 SVG 문어를 쓰므로 선택 사항. 팔레트는 DESIGN §7.1(빨간 문어).`);
  }
}

// ---------------------------------------------------------------- main
function main() {
  genRoom();
  genWindows();
  genItems();
  genLights();
  genLantern();
  genSouvenirs();
  genScenes();
  genOctopus();

  const manifest = {};
  let n = 0;
  for (const key of Object.keys(OUT)) {
    const { src, w, h, body, note } = OUT[key];
    const abs = path.join(ROOT, src);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, svg(w, h, body, `data-key="${key}"`), 'utf8');
    manifest[key] = { src, w, h };
    if (note) manifest[key].note = note;
    n++;
  }
  const manifestPath = path.join(ASSETS, 'manifest.json');
  // 평평한 맵: key → { src, w, h, note? }. (설명은 assets/README.md 에)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`wrote ${n} placeholder SVGs and ${path.relative(ROOT, manifestPath)}`);
}

if (require.main === module) main();
module.exports = { main };
