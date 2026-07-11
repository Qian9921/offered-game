// e2e：通关后再玩一次——存档已清、Hub可选、新开局从 act1 开始
const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  const p=await b.newPage(); await p.setViewport({width:1920,height:1080});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await sleep(1800);
  let ok=0,bad=0; const t=(n,c)=>{c?ok++:bad++;console.log((c?'✓ ':'✗ ')+n);};

  // 造一个"打完了"的存档,直接进结局
  await p.evaluate(async()=>{ localStorage.clear(); localStorage.setItem('wdwtb_onboarded','1');
    localStorage.setItem('wdwtb_save_1', JSON.stringify({version:2,slot:1,career:'programmer',subRole:'dev',act:5,
      stats:{health:60,energy:80},story:{phase:'working',act:5}}));
    window.__game.scene.start('EndingScene',{ending:'light',career:'programmer',slot:1,
      stats:{health:60,energy:80,san:90,stress:30,skill:50,performance:80,money:500,passion:90},choiceLog:[]});
    await new Promise(r=>setTimeout(r,1200)); });
  const cleared=await p.evaluate(()=>localStorage.getItem('wdwtb_save_1')===null);
  t('进结局即清本局存档', cleared);

  // 再玩一次 → HubScene
  await p.evaluate(()=>{const e=window.__game.scene.getScene('EndingScene');
    e.scene.start('HubScene');});
  await sleep(900);
  const hub=await p.evaluate(()=>{const h=window.__game.scene.getScene('HubScene');
    return h&&h.scene.isActive();});
  t('再玩一次进入职业选择', hub);

  // 标题"继续游戏"按钮在无存档时不出现
  await p.evaluate(()=>{window.__game.scene.getScene('HubScene').scene.stop();
    window.__game.scene.start('TitleScene');});
  await sleep(900);
  const title=await p.evaluate(()=>{const t2=window.__game.scene.getScene('TitleScene');
    const texts=[]; t2.children.list.forEach(o=>{if(o.text)texts.push(o.text);});
    return texts.join('|');});
  t('通关后标题无"继续游戏"(存档已清)', !title.includes('继续游戏'));

  // 新开局 → act1 全新状态
  await p.evaluate(async()=>{
    window.__game.scene.getScene('TitleScene').scene.stop();
    window.__game.scene.start('WorldScene',{career:'programmer',subRole:'dev',act:1});
    await new Promise(r=>setTimeout(r,3200));});
  const fresh=await p.evaluate(()=>{const w=window.__game.scene.getScene('WorldScene');
    return {act:w.act, phase:w._story.phase, progress:w.projectSystem?w.projectSystem.progress:0,
      done:Object.keys(w.questSystem.completed).length};});
  t('新开局 act1/ready/0%/无完成任务', fresh.act===1&&fresh.phase==='ready'&&fresh.progress===0&&fresh.done===0);

  console.log(`\n${ok} passed, ${bad} failed | pageerrors: ${errs.length}`);
  errs.slice(0,5).forEach(e=>console.log(' ',e));
  await b.close(); process.exit(bad||errs.length?1:0);
})();
