// 第一分钟真实体验:标题→开场(测评/跳过)→选职业→选方向→进办公室
const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  const p=await b.newPage(); await p.setViewport({width:1920,height:1080});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await sleep(2200);
  await p.evaluate(()=>localStorage.clear());
  let ok=0,bad=0; const t=(n,c)=>{c?ok++:bad++;console.log((c?'✓ ':'✗ ')+n);};

  // 用回车开始(标题默认选中"重新开始"，回车 → 新游戏选槽面板)
  await p.keyboard.press('Enter'); await sleep(1200);
  // 新游戏面板出现后，点第一个槽位开始
  await p.evaluate(()=>{
    const ts=window.__game.scene.getScene('TitleScene');
    if(!ts)return;
    // 找含"槽位 1"的文字，点其附近的交互矩形
    const all=[];const walk=(l)=>l.forEach(o=>{all.push(o);if(o.list)walk(o.list);});
    walk(ts.children.list);
    const slot=all.find(o=>o.text&&o.text.includes('槽位 1'));
    if(!slot)return;
    const rect=all.find(o=>o.type==='Rectangle'&&o.input&&o.input.enabled&&Math.abs(o.x-slot.x)<10&&Math.abs(o.y-slot.y)<10);
    if(rect)rect.emit('pointerdown');
  });
  await sleep(1600);
  const sc1=await p.evaluate(()=>{
    for(const k of ['OpeningScene','HubScene']){const s=window.__game.scene.getScene(k);
      if(s&&s.scene.isActive())return k;}
    return null;});
  t(`回车后进入 ${sc1}`, sc1==='OpeningScene'||sc1==='HubScene');
  await p.screenshot({path:'/tmp/m2_opening.png'});

  // OpeningScene: 捏人→测评/跳过 多步流程。UI 在 container 里,递归收集可交互元素,点最下方按钮
  if(sc1==='OpeningScene'){
    for(let i=0;i<40;i++){
      const now=await p.evaluate(()=>{
        const h=window.__game.scene.getScene('HubScene');
        if(h&&h.scene.isActive())return 'hub';
        const o=window.__game.scene.getScene('OpeningScene');
        if(!o||!o.scene.isActive())return 'other';
        const cands=[];
        const walk=(list)=>list.forEach(x=>{
          if(x.input&&x.input.enabled&&x.visible!==false)cands.push(x);
          if(x.list)walk(x.list);});
        walk(o.children.list);
        if(!cands.length)return 'none';
        // 取全局 y 最大(最下方)
        const gy=(x)=>{let y=x.y,p2=x.parentContainer;while(p2){y+=p2.y;p2=p2.parentContainer;}return y;};
        cands.sort((a,b)=>gy(b)-gy(a));
        cands[0].emit('pointerdown');
        return 'opening';});
      if(now==='hub')break;
      await sleep(450);
    }
  }
  const sc2=await p.evaluate(()=>{const h=window.__game.scene.getScene('HubScene');return h&&h.scene.isActive();});
  t('到达职业选择 Hub', sc2);
  await p.screenshot({path:'/tmp/m3_hub.png'});

  // 点程序员卡(左上第一张,startX+cardW/2≈?) — 通过场景对象直接找
  await p.evaluate(()=>{const h=window.__game.scene.getScene('HubScene');
    // 找到写着"程序员"的文字→点它下面的卡(同位置的 Rectangle)
    const txt=h.children.list.find(o=>o.text==='程序员');
    const rect=h.children.list.filter(o=>o.type==='Rectangle'&&o.input&&o.input.enabled)
      .sort((a,b)=>Math.hypot(a.x-txt.x,a.y-txt.y)-Math.hypot(b.x-txt.x,b.y-txt.y))[0];
    rect.emit('pointerdown');});
  await sleep(800);
  await p.screenshot({path:'/tmp/m4_spec.png'});
  const spec=await p.evaluate(()=>{const h=window.__game.scene.getScene('HubScene');
    const texts=[]; h.children.list.forEach(o=>{if(o.text)texts.push(o.text);});
    return texts.join('|');});
  t('细分方向弹窗出现(开发/测试)', spec.includes('开发工程师')&&spec.includes('测试工程师'));

  // 点"开发工程师"卡
  await p.evaluate(()=>{const h=window.__game.scene.getScene('HubScene');
    const txt=h.children.list.filter(o=>o.text&&o.text.includes('开发工程师')).pop();
    const rects=h.children.list.filter(o=>o.type==='Rectangle'&&o.input&&o.input.enabled&&o.depth>=50);
    const rect=rects.sort((a,b)=>Math.hypot(a.x-txt.x,a.y-txt.y)-Math.hypot(b.x-txt.x,b.y-txt.y))[0];
    rect.emit('pointerdown');});
  await sleep(3600);
  const world=await p.evaluate(()=>{const w=window.__game.scene.getScene('WorldScene');
    return {active:w&&w.scene.isActive(), sub:w?w.subRole:null, guide:w&&w.guideText?w.guideText.text:''};});
  t('进入办公室(subRole=dev)', world.active&&world.sub==='dev');
  t('新人报到引导语显示', world.guide.includes('报到'));
  await p.screenshot({path:'/tmp/m5_world.png'});

  console.log(`\n${ok} passed, ${bad} failed | pageerrors: ${errs.length}`);
  errs.slice(0,5).forEach(e=>console.log(' ',e));
  await b.close(); process.exit(bad||errs.length?1:0);
})();
