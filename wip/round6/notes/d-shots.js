/* wip/round6/notes/d-shots.js — lane D shots (not shipped). NODE_PATH=$(npm root -g) node wip/round6/notes/d-shots.js layout
   layout: play room with the booth, default view + 180, day + night, 360x740@2 and 412x915@2.625 -> wip/round6/shots/D/ */
const path = require('path'), fs = require('fs');
const P = require('../../round4/probe-lib.js');
const OUT = path.join(P.ROOT, 'wip/round6/shots/D');
async function room(b, o, hour, yaw, pre) {
  const { ctx, page } = await P.open(b, { w: o.w, h: o.h, dpr: o.dpr, look: { hour: hour, lantern: 4 }, lantern: 4 });
  await page.evaluate(async () => { APP.goRoom('play'); });
  await page.waitForFunction(() => APP.scene.view() === 'play' && !APP.scene.motion().door, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (yaw) { await page.evaluate(y => APP.scene.setLook({ yaw: y }), yaw); await page.waitForTimeout(600); }
  if (pre) await pre(page);
  const el = await page.$('#scene');
  const buf = await el.screenshot();
  await ctx.close();
  return buf;
}
async function layout() {
  const b = await P.launch(), files = [];
  for (const o of [{ w: 360, h: 740, dpr: 2, k: '360' }, { w: 412, h: 915, dpr: 2.625, k: '412' }]) {
    for (const [hour, hk] of [[14, 'day'], [21, 'night']]) for (const yaw of [0, 180]) {
      const f = path.join(OUT, `_layout-${o.k}-${hk}-${yaw}.png`);
      fs.writeFileSync(f, await room(b, o, hour, yaw)); files.push(f); console.log(f);
    }
  }
  await b.close();
  return files;
}
module.exports = { room };
if (require.main === module) {
  const what = process.argv[2] || 'layout';
  ({ layout })[what]().catch(e => { console.error(e); process.exit(1); });
}
