/* 관성 중 단추 톡: 느린 swiftshader 에선 CDP 손가락 사이가 수백 ms 라 관성이 안 생긴다 → 페이지 안에서 합성 PointerEvent 로 8 ms 간격 밀기 → 관성 중 sew 칸 톡 */
const P = require('../probe-lib.js');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { lantern: 5 });
  await page.evaluate(() => APP.goRoom('loft'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-sew'); return e && !e.hidden; }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => APP.scene.zoomTo(54)); await page.waitForTimeout(600);
  const r = await page.evaluate(async () => {
    const cv = document.querySelector('#scene3d canvas'); cv.setPointerCapture = function () {}; const wait = ms => { const t = performance.now(); while (performance.now() - t < ms); };
    const ev = (type, x, y, id) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', 120, 200, 7); for (let i = 1; i <= 5; i++) { wait(8); ev('pointermove', 120 - i * 5, 200, 7); } wait(4); ev('pointerup', 95, 200, 7);
    const mode = APP.scene.pan().mode, q = document.getElementById('btn-sew').getBoundingClientRect();
    const x = q.x + q.width / 2, y = q.y + q.height / 2, k = APP.scene.pickAt(x, y);
    ev('pointerdown', x, y, 8); ev('pointerup', x, y, 8);
    return { mode, pick: k, open: document.getElementById('sew-sheet').open, after: APP.scene.pan().mode };
  });
  console.log(JSON.stringify(r));
  await b.close();
  process.exit(r.mode === 'coast' && r.open ? 0 : 1);
})();
