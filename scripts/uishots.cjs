const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await p.goto('http://localhost:5173/?s=HubScene', { waitUntil:'domcontentloaded' });
  await sleep(2500);
  await p.screenshot({ path: '/tmp/ui_hub.png' });
  await p.evaluate(() => { localStorage.clear(); window.__game.scene.start('OpeningScene'); });
  await sleep(2500);
  await p.screenshot({ path: '/tmp/ui_opening.png' });
  // HUD 特写
  await p.evaluate(() => { window.__game.scene.start('WorldScene', { career:'programmer', act:1 }); });
  await sleep(2500);
  await p.screenshot({ path: '/tmp/ui_hud.png', clip: { x: 0, y: 0, width: 620, height: 200 } });
  await b.close();
})();
