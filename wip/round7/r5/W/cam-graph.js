/* 갈래 W 다섯째 바퀴: before.json · after.json (cam-probe) → 360×740 그래프 PNG.  node cam-graph.js before.json after.json <out 폴더>
   칸마다: 위 = 그려진 캐릭터의 화면 자리 (카메라 기준 아트px, 프레임마다 — 톱니 = 떨림), 아래 = 그려진 카메라의 프레임당 걸음 (아트px — 0 위아래로 오가면 땅이 떤다) */
var fs = require('fs'), path = require('path'), { chromium } = require('playwright');
var B = JSON.parse(fs.readFileSync(process.argv[2])), A = JSON.parse(fs.readFileSync(process.argv[3])), OUT = process.argv[4];
var SETS = [['auto', ['yard-stick', 'village-zigzag', 'yard-stick-jank', 'attic-stick']], ['reduce', ['yard-stick', 'village-zigzag', 'beach-stick', 'attic-stick']]];
(async function () {
  var browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  for (var s of SETS) {
    var data = s[1].map(function (k) { return { k: k, b: B[s[0]][k], a: A[s[0]][k] }; });
    await page.setContent('<html><body style="margin:0;background:#fbf6ea;font:11px sans-serif;color:#2a2433"><canvas id=c width=720 height=1480 style="width:360px;height:740px"></canvas></body></html>');
    await page.evaluate(function (o) {
      var c = document.getElementById('c').getContext('2d'); c.scale(2, 2);
      c.fillStyle = '#2a2433'; c.font = 'bold 13px sans-serif'; c.fillText('뛸 때 화면 (' + (o.mode === 'auto' ? '보통' : '모션 줄이기') + ') — 빨강 고치기 전 · 파랑 고친 뒤', 10, 18);
      o.data.forEach(function (d, i) {
        var y0 = 30 + i * 177, W = 340, x0 = 10;
        c.fillStyle = '#2a2433'; c.font = 'bold 11px sans-serif'; c.fillText(d.k, x0, y0 + 10);
        function axisOf(rows) { var mv = rows.map(function (r) { return r.pl; }); var sx = Math.max.apply(null, mv.map(function (p) { return p[0]; })) - Math.min.apply(null, mv.map(function (p) { return p[0]; })), sy = Math.max.apply(null, mv.map(function (p) { return p[1]; })) - Math.min.apply(null, mv.map(function (p) { return p[1]; })); return sy >= sx ? 1 : 0; }
        var k = axisOf(d.b), n = Math.min(240, d.b.length, d.a.length), s0 = 0;
        function plot(rows, col, top, h, f, lo, hi) {
          c.strokeStyle = col; c.lineWidth = 1; c.beginPath();
          for (var j = 0; j < n; j++) { var v = f(rows, j), X = x0 + j / (n - 1) * W, Y = top + h - (v - lo) / Math.max(hi - lo, 1e-6) * h; if (j) c.lineTo(X, Y); else c.moveTo(X, Y); }
          c.stroke();
        }
        function rel(rows, j) { return rows[j].pl[k] - rows[0].pl[k]; }
        function step(rows, j) { return j ? rows[j].cam[k] - rows[j - 1].cam[k] : 0; }
        var all = []; for (var j = 0; j < n; j++) { all.push(rel(d.b, j), rel(d.a, j) + 0); }
        var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
        c.fillStyle = '#efe3c8'; c.fillRect(x0, y0 + 14, W, 90); c.fillRect(x0, y0 + 110, W, 50);
        c.fillStyle = '#66605c'; c.font = '10px sans-serif'; c.fillText('캐릭터 화면 자리 (' + (k ? '세로' : '가로') + ', 아트px)', x0 + 4, y0 + 26); c.fillText('카메라 프레임당 걸음 (−3 ~ 3 아트px)', x0 + 4, y0 + 122);
        c.strokeStyle = '#c2b4a4'; c.beginPath(); c.moveTo(x0, y0 + 135); c.lineTo(x0 + W, y0 + 135); c.stroke();
        plot(d.b, 'rgba(176,74,60,.85)', y0 + 30, 70, rel, lo, hi); plot(d.a, 'rgba(63,102,144,.95)', y0 + 30, 70, rel, lo, hi);
        plot(d.b, 'rgba(176,74,60,.85)', y0 + 112, 46, step, -3, 3); plot(d.a, 'rgba(63,102,144,.95)', y0 + 112, 46, step, -3, 3);
      });
    }, { mode: s[0], data: data });
    await page.screenshot({ path: path.join(OUT, 'graph-' + s[0] + '.png') });
  }
  await browser.close(); console.log('ok');
})().catch(function (e) { console.error(e); process.exit(1); });
