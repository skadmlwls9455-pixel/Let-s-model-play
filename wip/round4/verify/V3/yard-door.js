/* V3 · 마당 → 집 문 (진짜 손가락): 마당에 간 뒤 현관 단추를 톡 → 다락으로 돌아오나. 돌아오는 동안 APP.room 을 적는다 */
const L = require('./lib.js');
const SPOT = { 'btn-yard': 'atticYard', 'btn-yard-door': 'yardAttic', 'btn-door': 'atticPlay' };
async function spot(page, id) {
  const pt = await page.evaluate(a => {
    const b = document.getElementById(a.id); if (!b) return { err: 'none' }; const r = b.getBoundingClientRect();
    const F = [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9];
    for (const fy of F) for (const fx of F) { const x = r.left + r.width * fx, y = r.top + r.height * fy; const k = APP.scene.pickAt(x, y); if (k && k.kind === 'spot' && k.id === a.k) return { x, y, hit: true, hidden: b.hidden, r: [r.left, r.top, r.width, r.height] }; }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: false, hidden: b.hidden, r: [r.left, r.top, r.width, r.height], pick: APP.scene.pickAt(r.left + r.width / 2, r.top + r.height / 2) };
  }, { id, k: SPOT[id] });
  console.log('spot', id, JSON.stringify(pt));
  if (pt.x != null) await L.tap(page, pt.x, pt.y);
  return pt;
}
(async () => {
  const b = await L.launch();
  const hour = +(process.argv[2] || 14);
  const { page, log } = await L.open(b, { lantern: 5, look: { hour } });
  await spot(page, 'btn-yard');
  await page.waitForFunction(() => APP.room === 'yard', null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await L.shot(page, 'yard-' + hour);
  const rooms = [];
  const pt = await spot(page, 'btn-yard-door');
  for (let i = 0; i < 30; i++) { rooms.push(await page.evaluate(() => APP.room + '|' + (document.getElementById('btn-yard-door') || {}).hidden)); await page.waitForTimeout(500); }
  console.log('rooms after door tap', rooms.join(' '));
  await L.shot(page, 'yard-door-after-' + hour);
  if (!/attic/.test(rooms[rooms.length - 1])) {
    /* 두 번째 톡 */
    const pt2 = await spot(page, 'btn-yard-door'); await page.waitForTimeout(4000);
    console.log('after 2nd tap', await page.evaluate(() => APP.room));
    /* 마우스 클릭 */
    await page.mouse.click(pt2.x, pt2.y); await page.waitForTimeout(4000);
    console.log('after mouse click', await page.evaluate(() => APP.room));
    await page.evaluate(() => document.getElementById('btn-yard-door').click()); await page.waitForTimeout(4000);
    console.log('after button.click()', await page.evaluate(() => APP.room));
  }
  console.log('errors', JSON.stringify(log.errors.filter(e => !/wikipedia|ERR_FAILED/.test(e))));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
