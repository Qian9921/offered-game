// e2e：完整游戏主动脉——办公室→下班→出租屋→睡觉→通勤→第二天办公室(任务链/项目/subRole保真)
const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  const p=await b.newPage(); await p.setViewport({width:1920,height:1080});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await sleep(1800);
  let ok=0,bad=0; const t=(n,c)=>{c?ok++:bad++;console.log((c?'✓ ':'✗ ')+n);};
  const ev=fn=>p.evaluate(fn);

  // Day1: 进世界(test岗) → 做完第一环 → 项目+12
  await ev(async()=>{ localStorage.clear(); localStorage.setItem('wdwtb_onboarded','1');
    window.__game.scene.start('WorldScene',{career:'programmer',subRole:'test',act:1});
    await new Promise(r=>setTimeout(r,3200)); });
  await ev(()=>{const w=window.__game.scene.getScene('WorldScene');
    w._story.phase='working';
    const chen=w.npcs.find(n=>n.id==='senior');
    w._interactSenior(chen); w.dialogueActive=false;          // 接 test_c1
    w.questSystem.progress('talk','zhao');
    w.questSystem.progress('minigame','work');
    w._interactSenior(chen); w.dialogueActive=false;});        // 交付
  const d1=await ev(()=>{const w=window.__game.scene.getScene('WorldScene');
    return {done:!!w.questSystem.completed['test_c1'], progress:w.projectSystem.progress, day:w.daySystem?w.daySystem.day:1};});
  t('Day1 交付 test_c1 项目+12', d1.done && d1.progress===12);

  // 下班回家 → HomeScene
  await ev(()=>{const w=window.__game.scene.getScene('WorldScene'); w._doGoHome();});
  await sleep(1500);
  const home=await ev(()=>{const h=window.__game.scene.getScene('HomeScene');
    return {active:h&&h.scene.isActive(), day:h?h.day:0};});
  t('下班进入出租屋', home.active);

  // 睡觉 → 通勤
  await ev(()=>{const h=window.__game.scene.getScene('HomeScene'); h._sleep();});
  await sleep(1600);
  const com=await ev(()=>{const c=window.__game.scene.getScene('CommuteScene');
    return {active:c&&c.scene.isActive(), day:c?c.day:0};});
  t('睡觉后进入通勤(第2天)', com.active && com.day===2);

  // 通勤 → 办公室 Day2: 走真实 _goWork 通路(玩家点完事件后到达的路径)
  await ev(async()=>{const c=window.__game.scene.getScene('CommuteScene');
    if(c&&c.scene.isActive()) c._goWork();
    await new Promise(r=>setTimeout(r,3500));});
  const d2=await ev(()=>{const w=window.__game.scene.getScene('WorldScene');
    if(!w||!w.scene.isActive())return {active:false};
    return {active:true, sub:w.subRole, chain:w.questSystem.order.slice(0,1).join(),
      c1done:!!w.questSystem.completed['test_c1'],
      progress:w.projectSystem?w.projectSystem.progress:0,
      avail:w.questSystem.available({act:w.act}).map(q=>q.id)};});
  t('Day2 回办公室', d2.active===true);
  t('Day2 subRole=test 保真', d2.sub==='test');
  t('Day2 任务链进度保真(c1完成,c2解锁)', d2.c1done && d2.avail.includes('test_c2'));
  t('Day2 项目进度保真(12%)', d2.progress===12);

  console.log(`\n${ok} passed, ${bad} failed | pageerrors: ${errs.length}`);
  errs.slice(0,5).forEach(e=>console.log(' ',e));
  await b.close(); process.exit(bad||errs.length?1:0);
})();
