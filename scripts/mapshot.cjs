const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERR: '+String(e).slice(0,180)));
  p.on('console', m => { if (m.type()==='error' && !/favicon/.test(m.text())) errors.push('CONSOLE: '+m.text().slice(0,180)); });
  await p.goto('http://localhost:5173/', { waitUntil:'domcontentloaded' });
  await sleep(1800);
  const r = await p.evaluate(async () => {
    window.__game.scene.start('WorldScene', { career:'programmer', act:1 });
    await new Promise(res=>setTimeout(res,3000));
    const ws = window.__game.scene.getScene('WorldScene');
    return { hasMap: !!ws.officeMap, groups: ws.solidGroups?.length, playerX: Math.round(ws.player.x), playerY: Math.round(ws.player.y), npcs: ws.npcs?.length };
  });
  console.log('world:', JSON.stringify(r));
  await p.screenshot({ path: '/tmp/newmap.png' });
  console.log('ERRORS('+errors.length+'):'); errors.slice(0,8).forEach(e=>console.log(e));
  await b.close();
})();
