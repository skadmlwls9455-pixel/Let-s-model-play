/* 갈래 W 다섯째 바퀴: 문어가 소파 위로 폴짝 넘는 모습 — 문을 둘러싼 배치 (가구 모드 규칙 안) 에서 출발 의식.
   node hop-strip.js <게임 폴더> <out 폴더>   → hop-NN.png (360×740, 웅크림부터 내려앉을 때까지 5 프레임마다) + hop-crop.json (문어 화면 자리) */
var path = require('path'), fs = require('fs'), { chromium } = require('playwright');
var ROOT = path.resolve(process.argv[2] || '.'), OUT = process.argv[3];
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage(); page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.evaluate(function () {
    var sc = APP.scene; sc.setLayout({ crate: [0.78, -1.95, 0, 1], sofa: [2.2, -1.09, 90, 1.2] }); sc.debugSim(1 / 60, 2); sc.jumpTo('center'); sc.debugSim(1 / 60, 5); sc.debugStep(1 / 60);
    window.__dep = sc.departCeremony();
    for (var f = 0; f < 600 && !sc.octNav().hopNow; f++) sc.debugSim(1 / 60, 1);   /* 폴짝 시작 (웅크림) 까지 */
  });
  var crops = [];
  for (var i = 0; i < 12; i++) {
    var info = await page.evaluate(function () { var sc = APP.scene; sc.debugStep(1 / 60); var o = sc.octNav(), q = sc.screenOf(o.at[0], 0.6, o.at[2]), sq = sc.motion().squashY; sc.debugSim(1 / 60, 4); return { hop: o.hop, hopNow: o.hopNow, sq: sq, x: q.x, y: q.y, at: o.at }; });   /* 찍히는 그림은 debugStep 의 프레임 (debugSim 은 그리지 않는다) */
    var f = path.join(OUT, 'hop-' + String(i).padStart(2, '0') + '.png'); await page.screenshot({ path: f }); crops.push(Object.assign({ file: f }, info));
    if (!info.hopNow && i > 2) break;   /* 내려앉고 난 첫 장까지 */
  }
  fs.writeFileSync(path.join(OUT, 'hop-crop.json'), JSON.stringify(crops));
  await browser.close(); console.log('ok ' + crops.length);
})().catch(function (e) { console.error(e); process.exit(1); });
