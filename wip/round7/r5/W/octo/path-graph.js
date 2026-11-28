/* 갈래 W 다섯째 바퀴: 문어 길 (위에서 본 다락) — oct-path-probe 결과 둘 (고치기 전 · 뒤) → 360×740 PNG.
   node path-graph.js before.json after.json out.png
   칸마다 가구 발자국 (회색 · 계단 짙게) · 고치기 전 발자취 (빨강) · 고친 뒤 (파랑, 폴짝 구간 굵게). 화면 구도가 아니라 바닥을 위에서 (x → 오른쪽 · z → 아래) */
var fs = require('fs'), { chromium } = require('playwright');
var B = JSON.parse(fs.readFileSync(process.argv[2])), A = JSON.parse(fs.readFileSync(process.argv[3])), OUT = process.argv[4];
var PICK = ['tight: furniture around octopus → door', 'pocket (legal): crate→door', 'enclosed door (legal): door→window', 'depart, door enclosed (legal)'];
var LAYOUT = {   /* 그 시험의 배치 (가구 발자국 — 프로브와 같은 값) */
  'tight: furniture around octopus → door': { sofa: [-0.7, 0.2, 0, 1], crate: [0.8, -0.1, 90, 1] },
  'pocket (legal): crate→door': { sofa: [-1.92, -0.5, 0, 1], crate: [-0.6, -1.9, 0, 1] },
  'enclosed door (legal): door→window': { crate: [0.78, -1.95, 0, 1], sofa: [2.2, -1.09, 90, 1.2] },
  'depart, door enclosed (legal)': { crate: [0.78, -1.95, 0, 1], sofa: [2.2, -1.09, 90, 1.2] } };
function foot(id, v) { var w = id === 'sofa' ? 0.42 : 0.52, d = id === 'sofa' ? 0.68 : 0.44, a = (v[2] || 0) * Math.PI / 180, k = v[3] || 1, hw = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d) * k, hd = (Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d) * k; return [v[0] - hw, v[0] + hw, v[1] - hd, v[1] + hd, id]; }
var STATIC = [[-2.32, -1.37, 2.78, 3.44, '계단'], [1.235, 1.385, -2.395, -1.935, '지도'], [-2.5, -2.02, -2.5, -1.54, '상자 더미'], [-2.45, -1.9, 1.23, 1.62, '화분']];
(async function () {
  var data = PICK.map(function (k) { var b = B.filter(function (r) { return r.name === k; })[0], a = A.filter(function (r) { return r.name === k; })[0]; return { k: k, b: b, a: a, rects: Object.keys(LAYOUT[k]).map(function (id) { return foot(id, LAYOUT[k][id]); }) }; });
  var browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  await page.setContent('<html><body style="margin:0;background:#fbf6ea;font:11px sans-serif"><canvas id=c width=720 height=1480 style="width:360px;height:740px"></canvas></body></html>');
  await page.evaluate(function (o) {
    var c = document.getElementById('c').getContext('2d'); c.scale(2, 2);
    c.fillStyle = '#2a2433'; c.font = 'bold 13px sans-serif'; c.fillText('문어 길 (다락을 위에서) — 빨강 전 · 파랑 뒤', 10, 18);
    c.font = '10px sans-serif'; c.fillText('굵은 파랑 = 폴짝 (가구 위로) · 점 = 출발 · 위 파란 띠 = 문', 10, 31);
    o.data.forEach(function (d, i) {
      var col = i % 2, row = (i - col) / 2, X0 = 8 + col * 176, Y0 = 40 + row * 266, W = 170, S = W / 6;   /* 바닥 −2.5 ~ 3.5 m */
      function px(x) { return X0 + (x + 2.5) * S; } function pz(z) { return Y0 + 34 + (z + 2.5) * S; }
      c.fillStyle = '#2a2433'; c.font = 'bold 10px sans-serif'; var t = d.k.split(':'); c.fillText(t[0], X0, Y0 + 10); c.font = '10px sans-serif'; c.fillText((t[1] || '').trim(), X0, Y0 + 23);
      c.fillStyle = '#efe3c8'; c.fillRect(px(-2.5), pz(-2.5), 6 * S, 6 * S);
      c.strokeStyle = '#c2b4a4'; c.strokeRect(px(-2.15), pz(-2.15), 5.3 * S, 5.3 * S);
      o.statics.forEach(function (r) { c.fillStyle = r[4] === '계단' ? '#66605c' : '#b0a292'; c.fillRect(px(r[0]), pz(r[2]), (r[1] - r[0]) * S, (r[3] - r[2]) * S); });
      d.rects.forEach(function (r) { c.fillStyle = r[4] === 'sofa' ? '#a04838' : '#8a5a3c'; c.globalAlpha = 0.85; c.fillRect(px(r[0]), pz(r[2]), (r[1] - r[0]) * S, (r[3] - r[2]) * S); c.globalAlpha = 1; c.fillStyle = '#fbf6ea'; c.font = '9px sans-serif'; c.fillText(r[4] === 'sofa' ? '소파' : '상자', px(r[0]) + 2, pz(r[2]) + 10); });
      c.fillStyle = '#3f6690'; c.fillRect(px(1.5), pz(-2.5) - 3, 0.9 * S, 3);   /* 문 */
      function trail(r, color, w) {   /* 폴짝 (몸이 0.3 m 넘게 뜬 곳) 은 굵게 */
        if (!r || !r.trail || !r.trail.length) return; c.strokeStyle = color;
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (var j = 1; j < r.trail.length; j++) { var p = r.trail[j], q = r.trail[j - 1], hop = (p[2] || 0) > 0.3 || (q[2] || 0) > 0.3; c.lineWidth = hop ? w * 2.5 : w; c.beginPath(); c.moveTo(px(q[0]), pz(q[1])); c.lineTo(px(p[0]), pz(p[1])); c.stroke(); }
        c.fillStyle = color; var p0 = r.trail[0]; c.beginPath(); c.arc(px(p0[0]), pz(p0[1]), 3, 0, 7); c.fill();
      }
      trail(d.b, 'rgba(176,74,60,.9)', 2); trail(d.a, 'rgba(63,102,144,.95)', 2);
      c.fillStyle = '#2a2433'; c.font = '10px sans-serif';
      c.fillText('전: 뚫은 프레임 ' + (d.b ? d.b.bad : '?') + ' · 가장 좁은 틈 ' + (d.b ? d.b.minClear : '?') + ' m', X0, pz(3.5) + 14);
      c.fillText('뒤: 뚫은 프레임 ' + (d.a ? d.a.bad : '?') + ' · 몸 최고 ' + (d.a ? d.a.maxHop : '?') + ' m', X0, pz(3.5) + 27);
    });
  }, { data: data, statics: STATIC });
  await page.screenshot({ path: OUT }); await browser.close(); console.log('ok');
})().catch(function (e) { console.error(e); process.exit(1); });
