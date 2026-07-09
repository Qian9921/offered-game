const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await p.goto('http://localhost:5173/', { waitUntil:'domcontentloaded' });
  await sleep(1800);
  await p.evaluate(async () => { window.__game.scene.start('WorldScene', { career:'programmer', act:1 }); await new Promise(r=>setTimeout(r,3000)); });
  const pos = async () => p.evaluate(() => { const ws=window.__game.scene.getScene('WorldScene'); return {x:Math.round(ws.player.x), y:Math.round(ws.player.y)}; });
  const start = await pos();
  // 各方向按住 1.5s，记录位移
  const res = { start };
  for (const [dir,key] of [['left','KeyA'],['right','KeyD'],['up','KeyW'],['down','KeyS']]) {
    await p.keyboard.down(key); await sleep(1500); await p.keyboard.up(key); await sleep(200);
    res[dir] = await pos();
  }
  // 越界检查:x/y 应在 [0,1280]/[0,960]
  const inBounds = res.left.x>=0 && res.right.x<=1280 && res.up.y>=0 && res.down.y<=960;
  console.log(JSON.stringify(res));
  console.log('inBounds:', inBounds, '| moved:', res.left.x!==start.x||res.up.y!==start.y);
  await p.screenshot({ path:'/tmp/collmove.png' });
  await b.close();
})();
