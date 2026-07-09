const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  const p=await b.newPage(); await p.setViewport({width:1920,height:1080});
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await sleep(1800);
  // 正规转场：从 Hub 用真实按钮进 World（scene.start 会替换当前场景）
  await p.evaluate(async()=>{
    window.__game.scene.start('HubScene'); await new Promise(r=>setTimeout(r,1500));
  });
  // 用 Hub 的职业卡逻辑直接 scene.start World（模拟点击）
  await p.evaluate(async()=>{
    const hub=window.__game.scene.getScene('HubScene');
    hub.scene.start('WorldScene',{career:'programmer',deep:true,act:1});
    await new Promise(r=>setTimeout(r,3000));
  });
  // 检查有几个场景在 active/visible
  const active=await p.evaluate(()=> window.__game.scene.getScenes(true).map(s=>s.scene.key));
  console.log('active scenes:', JSON.stringify(active));
  await p.screenshot({path:'/tmp/flowworld.png'});
  await b.close();
})();
