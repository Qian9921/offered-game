const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  const p=await b.newPage(); await p.setViewport({width:1920,height:1080});
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await sleep(1800);
  await p.evaluate(async()=>{ const ws=window.__game.scene.getScene('WorldScene'); window.__game.scene.start('WorldScene',{career:'programmer',act:1}); await new Promise(r=>setTimeout(r,2800));
    // 把玩家挪到地图正中,相机拉全景看有无残留绿块
    const w=window.__game.scene.getScene('WorldScene'); w.player.setPosition(640,480); w.cameras.main.setZoom(0.75); });
  await sleep(1200); await p.screenshot({path:'/tmp/fullmap.png'});
  await b.close();
})();
