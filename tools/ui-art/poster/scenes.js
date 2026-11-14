/* tools/ui-art/poster/scenes.js — 포스터 장면 배경 9장 (주제마다 한 장, 66×56).
 * 포스터 장면 칸은 300px 포스터에서 264×224 = 66×56 의 4배 → 정수 배로 딱 맞는다 (600px 저장본 = 8배).
 * 위에 방 그림과 스티커가 올라가므로 조용한 중간톤 · 큰 덩어리만. 가운데~왼쪽은 비워 둔다. 외곽선 없음.
 * 한 장 = function (x, y) → Apollo KEY 글자 (모든 칸을 채운다). 점·별은 좌표 해시로 (난수 없음). */
'use strict';
var W = 66, H = 56;
function h(x, y) { return ((x * 73 + y * 151 + x * y * 7) % 97 + 97) % 97; }
function blobAt(x, y, cx, cy, rx, ry) { var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; }
module.exports = {
  W: W, H: H,
  hands: ['손과 물건', function (x, y) {   /* 작업대와 못판 벽 */
    if (y >= 44) return y === 44 ? 'd' : y < 47 ? 'c' : (x % 22 === 5 ? 'a' : 'b');
    if (y === 43) return 'a';
    if (y === 12 || y === 13) return y === 12 ? 'c' : 'b';                       /* 선반 */
    if (y < 12 && x > 44 && x < 62) { if (x > 46 && x < 51 && y > 4) return 'J'; if (x > 52 && x < 56 && y > 6) return '5'; if (x > 57 && x < 61 && y > 3) return 'E'; }   /* 선반 위 실패들 */
    if (x % 13 === 6) return 'd';                                                /* 널빤지 이음 */
    if (y > 16 && y < 40 && x % 6 === 2 && y % 6 === 1) return 'c';              /* 못 구멍 */
    return 'e';
  }],
  sea: ['바다와 생물', function (x, y) {   /* 물속: 빛줄기 · 모래 바닥 · 해초 */
    var sand = 47 + Math.round(Math.sin(x / 7) * 1.5);
    if (y >= sand) return y === sand ? 'f' : (h(x, y) % 9 === 0 ? 'd' : 'e');
    var sw = [[6, 30], [10, 36], [57, 28], [61, 34]];
    for (var i = 0; i < sw.length; i++) { var top = sw[i][1], sx = sw[i][0] + Math.round(Math.sin((y + i * 3) / 3) * 1.2); if (y >= top && (x === sx || x === sx + 1)) return x === sx ? 't' : 's'; }
    if (h(x, y) % 53 === 0 && y < 40) return '7';                                /* 물방울 */
    var ray = (x + y * 0.6) % 22; if (y < 34 && ray < 4 && y < 34 - ray) return y < 12 ? '7' : '6';
    return y < 9 ? '6' : y < 22 ? '5' : y < 38 ? '4' : '3';
  }],
  sky: ['하늘과 날씨', function (x, y) {   /* 넓은 하늘 · 구름 · 먼 언덕 */
    var hill = 46 - Math.round(Math.sin(x / 9 + 1) * 3 + Math.sin(x / 4) * 1);
    if (y >= hill) return y === hill ? 'v' : y < hill + 4 ? 'u' : 't';
    if (blobAt(x, y, 12, 12, 9, 3.2) || blobAt(x, y, 17, 9.5, 6, 3.2) || blobAt(x, y, 52, 20, 10, 3) || blobAt(x, y, 47, 17.5, 5, 3) || blobAt(x, y, 30, 33, 7, 2.2)) return y % 7 === 0 ? 'Y' : 'Z';
    return y < 10 ? '5' : y < 24 ? '6' : y < 36 ? '7' : 'Z';
  }],
  signs: ['기호와 언어', function (x, y) {   /* 양피지 벽 + 책꽂이 */
    if (y >= 40) {
      if (y === 40 || y === 55) return 'b'; if (y === 41) return 'a';
      var bx = x % 5, n = Math.floor(x / 5), cols = ['I', '3', 's', 'C', 'N', 'b', '4'], k = cols[(n * 3 + 1) % cols.length], tall = 42 + (n * 5) % 4;
      if (y < tall) return 'a'; return bx === 4 ? 'a' : bx === 0 && y % 6 === 2 ? 'E' : k;
    }
    if (y % 8 === 4 && x > 5 && x < 61 && (x + Math.floor(y / 8) * 3) % 7 < 5 && h(x, Math.floor(y / 8)) % 5 !== 0) return 'e';   /* 옅은 글줄 */
    if (x < 2 || x > 63) return 'e';
    return 'f';
  }],
  numbers: ['수와 모양', function (x, y) {   /* 청사진 모눈 + 옅은 도형 선 */
    var d = Math.hypot(x + 0.5 - 50, y + 0.5 - 20);
    if (Math.abs(d - 13) < 0.6) return '5';
    if (y === 44 && x > 6 && x < 34) return '5'; if (x === 7 && y > 22 && y < 45) return '5'; if (Math.abs((x - 7) - (y - 22) * 1.2) < 0.7 && y > 22 && y < 45) return '5';
    if (x % 8 === 3 || y % 8 === 3) return '4';
    return '3';
  }],
  sounds: ['소리와 리듬', function (x, y) {   /* 해 질 녘 + 물결치는 다섯 줄 */
    if (y >= 48) return y === 48 ? 'N' : 'M';
    for (var i = 0; i < 5; i++) { var ly = 16 + i * 5 + Math.round(Math.sin(x / 8 + i * 0.4) * 2.2); if (y === ly) return 'Q'; }
    if (h(x, y) % 61 === 0 && y < 14) return 'R';
    return y < 12 ? 'N' : y < 30 ? 'O' : 'P';
  }],
  home: ['집과 사람', function (x, y) {   /* 포근한 방: 줄무늬 벽지 · 창 · 마루 */
    if (y >= 46) return y === 46 ? 'c' : (x + Math.floor(y / 3) * 7) % 16 === 0 ? 'a' : 'b';
    if (y >= 38) return y === 38 ? 'd' : y === 45 ? 'a' : 'c';
    if (x >= 44 && x <= 61 && y >= 5 && y <= 26) {
      if (x === 44 || x === 61 || y === 5 || y === 26 || x === 52 || x === 53 || y === 15) return 'c';
      return h(x, y) % 41 === 0 ? 'Z' : y < 15 ? '3' : '2';
    }
    return x % 8 < 3 ? 'd' : 'e';
  }],
  mind: ['생각하는 것', function (x, y) {   /* 밤빛 생각 속: 별 · 큰 소용돌이 */
    var d = Math.hypot(x + 0.5 - 46, y + 0.5 - 24), a = Math.atan2(y + 0.5 - 24, x + 0.5 - 46);
    if (d < 20 && Math.abs(((d - a * 2.4) % 7 + 7) % 7 - 3.5) < 0.7) return 'O';
    var s = h(x, y); if (s === 0 || s === 41) return s ? 'R' : 'Z';
    return y < 18 ? 'M' : y < 40 ? 'N' : 'M';
  }],
  wild: ['들판', function (x, y) {   /* 들판: 하늘 · 언덕 · 굽은 길 · 들꽃 */
    var hill = 30 - Math.round(Math.sin(x / 10) * 3 + Math.sin(x / 5 + 2) * 1.2);
    if (y < hill) return blobAt(x, y, 50, 10, 9, 3) || blobAt(x, y, 44, 8, 5, 2.6) ? 'Z' : y < 12 ? '6' : '7';
    var px = 33 + Math.sin(y / 6) * 9 + (y - 30) * 0.2, pw = 1.5 + (y - hill) * 0.16;
    if (Math.abs(x - px) < pw) return y % 5 === 0 ? 'd' : 'e';
    var f = h(x, y); if (y > hill + 3 && f === 7) return 'R'; if (y > hill + 3 && f === 23) return 'Z'; if (y > hill + 3 && f === 55) return 'F';
    return y < hill + 3 ? 'v' : y < 44 ? 'u' : 't';
  }]
};
