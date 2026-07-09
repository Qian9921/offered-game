const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  const p=await b.newPage(); await p.setViewport({width:1920,height:1080});
  // ① 首页 — 清存档看无档态,截全屏
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'domcontentloaded'}); await sleep(2500);
  await p.screenshot({path:'/tmp/d_title.png'});

  // ② 办公室全景 + 打印玩家/NPC 精确坐标 + 判断是否在可行走地板上
  await p.evaluate(async()=>{
    window.__game.scene.start('WorldScene',{career:'programmer',act:1});
    await new Promise(r=>setTimeout(r,3000));
  });
  const info=await p.evaluate(()=>{
    const ws=window.__game.scene.getScene('WorldScene');
    const map=ws.officeMap;
    const g=ws.groundLayer;
    // 判断某像素点是否踩在有地板(非空 tile)且非碰撞
    const check=(x,y)=>{ const t=g.getTileAtWorldXY(x,y); return t? {idx:t.index, collides:!!t.collides} : null; };
    return {
      player:{x:Math.round(ws.player.x),y:Math.round(ws.player.y), floor:check(ws.player.x,ws.player.y)},
      npcs: ws.npcs.map(n=>({id:n.id,x:n.x,y:n.y, floor:check(n.x,n.y)})),
      mapW: map.widthInPixels, mapH: map.heightInPixels,
    };
  });
  console.log(JSON.stringify(info,null,1));
  // 全景（相机拉远看整图 + 玩家 NPC 位置）
  await p.evaluate(()=>{ const ws=window.__game.scene.getScene('WorldScene'); ws.cameras.main.setZoom(0.72); ws.cameras.main.centerOn(640,480); });
  await sleep(1000); await p.screenshot({path:'/tmp/d_fullmap.png'});
  await b.close();
})();
