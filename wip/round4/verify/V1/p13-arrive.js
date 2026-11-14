/* V1 탐침 13: 돌린 채 방을 옮겼을 때 (8 각도 × 다락→놀이방 · 놀이방→다락 · 다락→위층 · 위층→다락 · 다락→마당 · 마당→다락) 도착 3 s 뒤 내 캐릭터가 화면 안에 있나 · 카메라 쪽을 보나 */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const go = async t => { await page.waitForFunction(() => !APP.goResting, null, { timeout: 15000 }).catch(() => {}); const r = await page.evaluate(t => APP.goRoom(t), t); await page.waitForFunction(t => APP.scene.view() === t && !APP.scene.motion().trans && !APP.scene.motion().dq, t, { timeout: 30000 }); return r; };
  const out = [];
  const legs = [['play', 'attic'], ['attic', 'play'], ['loft', 'attic'], ['attic', 'loft'], ['yard', 'attic'], ['attic', 'yard']];
  for (let a = 0; a < 360; a += 45) {
    for (const [to, from] of legs) {
      if (await page.evaluate(() => APP.scene.view()) !== from) await go(from);
      await page.evaluate(a => APP.scene.setYaw(a, true), a);
      await go(to); await page.waitForTimeout(3000);
      const s = await page.evaluate(() => { const y = APP.scene.yawInfo(), c = 45 + y.shown, p = APP.scene.player(), d = Math.atan2(Math.sin((p.yaw - c) * Math.PI / 180), Math.cos((p.yaw - c) * Math.PI / 180)) * 180 / Math.PI;
        const r = document.getElementById('scene').getBoundingClientRect(), sc = APP.scene.screenOf(p.at[0], 0.6, p.at[2]);
        return { face: Math.round(d), x: Math.round(sc.x), y: Math.round(sc.y), inView: sc.x > 10 && sc.x < r.width - 10 && sc.y > 10 && sc.y < r.height - 10, moving: !!p.moving }; });
      out.push(Object.assign({ a, from, to }, s));
      const flag = (!s.inView ? ' OFFSCREEN' : '') + (Math.abs(s.face) > 60 ? ' BACK' : '');
      console.log(a, from + '→' + to, JSON.stringify(s), flag);
      if (flag) await page.screenshot({ path: path.join(__dirname, 'shots', `arrive-${from}-${to}-a${a}.png`) });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'p13.json'), JSON.stringify({ out, errs }, null, 1)); console.log('errs', errs);
  await b.close();
})();
